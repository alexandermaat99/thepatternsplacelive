import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(req: NextRequest) {
  try {
    const { purchaseId } = await req.json();
    if (!purchaseId || typeof purchaseId !== 'string') {
      return NextResponse.json({ error: 'purchaseId is required' }, { status: 400 });
    }

    // Verify admin (using user cookies)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Perform inventory + purchase reversal with service role (bypass RLS)
    const supabaseAdmin = createServiceRoleClient();

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('in_person_purchases')
      .select(
        'id, reversed, sku, quantity, inventory_after, inventory_before, sale_lines'
      )
      .eq('id', purchaseId)
      .maybeSingle();

    if (purchaseError) {
      return NextResponse.json({ error: 'Failed to load purchase' }, { status: 500 });
    }

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    if (purchase.reversed) {
      return NextResponse.json({ error: 'Already reversed' }, { status: 409 });
    }

    type SaleLineSnapshot = {
      sku: string;
      yards: number;
      inventory_after: number;
    };
    const saleLinesRaw = Array.isArray(purchase.sale_lines) ? purchase.sale_lines : [];
    const saleLines: SaleLineSnapshot[] = saleLinesRaw
      .map((line: any) => ({
        sku: String(line?.sku ?? '').trim(),
        yards: Number(line?.yards),
        inventory_after: Number(line?.inventory_after),
      }))
      .filter(
        (line: SaleLineSnapshot) =>
          line.sku.length > 0 &&
          Number.isFinite(line.yards) &&
          line.yards > 0 &&
          Number.isFinite(line.inventory_after)
      );

    // Backward compatibility: older rows had one sku+quantity snapshot only.
    const linesToReverse: SaleLineSnapshot[] =
      saleLines.length > 0
        ? saleLines
        : (() => {
            const restoreQuantity = Number(purchase.quantity);
            const currentShouldBe = Number(purchase.inventory_after);
            if (!purchase.sku || !Number.isFinite(restoreQuantity) || !Number.isFinite(currentShouldBe)) {
              return [];
            }
            return [{ sku: purchase.sku, yards: restoreQuantity, inventory_after: currentShouldBe }];
          })();

    if (linesToReverse.length === 0) {
      return NextResponse.json({ error: 'Invalid purchase record' }, { status: 500 });
    }

    // Pre-check all lines before mutating inventory.
    for (const line of linesToReverse) {
      const { data: fabricRow, error: fabricError } = await supabaseAdmin
        .from('fabric')
        .select('current_quantity')
        .eq('sku', line.sku)
        .maybeSingle();

      if (fabricError || !fabricRow) {
        return NextResponse.json(
          { error: `Unable to verify inventory for ${line.sku}` },
          { status: 409 }
        );
      }
      if (Number(fabricRow.current_quantity) !== Number(line.inventory_after)) {
        return NextResponse.json(
          { error: 'Inventory mismatch; cannot safely reverse this sale' },
          { status: 409 }
        );
      }
    }

    // Restore each SKU line using optimistic match against expected current quantity.
    for (const line of linesToReverse) {
      const newQty = Number(line.inventory_after) + Number(line.yards);
      const { error: invUpdateError, data: invUpdateData } = await supabaseAdmin
        .from('fabric')
        .update({ current_quantity: newQty })
        .eq('sku', line.sku)
        .eq('current_quantity', line.inventory_after)
        .select('sku,current_quantity')
        .maybeSingle();

      if (invUpdateError || !invUpdateData) {
        return NextResponse.json(
          { error: 'Inventory mismatch; cannot safely reverse this sale' },
          { status: 409 }
        );
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('in_person_purchases')
      .update({
        reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_by: user.id,
      })
      .eq('id', purchaseId)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to mark purchase reversed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reverse in-person purchase error:', error);
    return NextResponse.json(
      { error: 'An error occurred while reversing the sale' },
      { status: 500 }
    );
  }
}

