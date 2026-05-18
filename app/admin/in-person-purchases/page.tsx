import { createClient } from '@/lib/supabase/server';
import { getCurrentUserWithProfileServer } from '@/lib/auth-helpers-server';
import {
  buyPriceMapFromFabricRows,
  expandSkusForBuyPriceLookup,
  getPurchaseCostProfit,
} from '@/lib/in-person-purchase-cost';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InPersonPurchasesTable } from '@/components/admin/in-person-purchases-table';

export default async function AdminInPersonPurchasesPage() {
  const authData = await getCurrentUserWithProfileServer();
  if (!authData?.user || !authData.profile?.admin) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  // Load recent purchases (admin UI)
  const { data: purchases, error } = await supabase
    .from('in_person_purchases')
    .select(
      `
        id,
        created_at,
        sku,
        name,
        quantity,
        unit_price,
        total_amount,
        cost_amount,
        profit_amount,
        profit_calculation_error,
        receipt_email,
        payment_method,
        inventory_before,
        inventory_after,
        sale_lines,
        email_sent,
        email_error,
        reversed,
        reversed_at
      `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching in-person purchases:', error);
  }

  const rows = (purchases || []) as any[];

  const saleSkus = new Set<string>();
  for (const row of rows) {
    if (row.sku) saleSkus.add(String(row.sku));
    const lines = Array.isArray(row.sale_lines) ? row.sale_lines : [];
    for (const line of lines) {
      if (line?.sku) saleSkus.add(String(line.sku));
    }
  }

  const buyPriceLookupSkus = expandSkusForBuyPriceLookup(saleSkus);
  const { data: fabricPriceRows } =
    buyPriceLookupSkus.length > 0
      ? await supabase.from('fabric').select('sku,buy_price').in('sku', buyPriceLookupSkus)
      : { data: [] as Array<{ sku: string; buy_price: number | null }> };

  const buyPriceBySku = buyPriceMapFromFabricRows(fabricPriceRows || []);
  const buyPriceBySkuRecord = Object.fromEntries(buyPriceBySku.entries());

  const totalCount = rows.length;
  // Revenue should not include reversed sales (reversals restore inventory and represent corrected transactions).
  const totalRevenue = rows.reduce((sum, r) => {
    if (r.reversed) return sum;
    return sum + (Number(r.total_amount) || 0);
  }, 0);
  const totalCost = rows.reduce((sum, r) => {
    if (r.reversed) return sum;
    const { cost } = getPurchaseCostProfit({
      ...r,
      total_amount: Number(r.total_amount),
      buyPriceBySku,
    });
    if (cost == null) return sum;
    return sum + cost;
  }, 0);
  const totalProfit = rows.reduce((sum, r) => {
    if (r.reversed) return sum;
    const { profit } = getPurchaseCostProfit({
      ...r,
      total_amount: Number(r.total_amount),
      buyPriceBySku,
    });
    if (profit == null) return sum;
    return sum + profit;
  }, 0);
  const profitUnknownCount = rows.filter(r => {
    if (r.reversed) return false;
    const { error } = getPurchaseCostProfit({
      ...r,
      total_amount: Number(r.total_amount),
      buyPriceBySku,
    });
    return !!error;
  }).length;
  const reversedCount = rows.filter(r => r.reversed).length;
  const emailErrors = rows.filter(r => r.email_sent === false && r.email_error).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">In-person purchases</h1>
        <p className="text-muted-foreground">
          Receipt emails + inventory audit trail from <code>/admin/fabric</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cost</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">${totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Profit</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">${totalProfit.toFixed(2)}</div>
            {profitUnknownCount > 0 ? (
              <p className="text-[10px] text-muted-foreground mt-1">
                {profitUnknownCount} sale{profitUnknownCount === 1 ? '' : 's'} missing buy price
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Reversed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">{reversedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Email errors
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="text-xl font-bold leading-none">{emailErrors}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <InPersonPurchasesTable purchases={rows as any} buyPriceBySku={buyPriceBySkuRecord} />
        </CardContent>
      </Card>
    </div>
  );
}
