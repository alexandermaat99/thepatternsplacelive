'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { getPurchaseCostProfit } from '@/lib/in-person-purchase-cost';

export interface InPersonPurchaseRow {
  id: string;
  created_at: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  cost_amount?: number | null;
  profit_amount?: number | null;
  profit_calculation_error?: string | null;
  receipt_email: string;
  payment_method?: string | null;
  inventory_before: number;
  inventory_after: number;
  email_sent: boolean;
  email_error: string | null;
  reversed: boolean;
  reversed_at: string | null;
  name: string | null;
  sale_lines?: Array<{
    sku?: string;
    name?: string | null;
    yards?: number;
    unit_price?: number;
    line_total?: number;
    buy_price_per_yard?: number | null;
    line_cost?: number | null;
    inventory_before?: number;
    inventory_after?: number;
  }> | null;
}

type DisplayLine = {
  sku: string;
  name: string | null;
  yards: number;
  inventoryBefore: number;
  inventoryAfter: number;
};

type PurchaseComputed = {
  lines: DisplayLine[];
  cost: number | null;
  profit: number | null;
  costProfitError: string | null;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d);
  } catch {
    return iso;
  }
}

function ReceiptBadge({ purchase }: { purchase: InPersonPurchaseRow }) {
  if (purchase.email_sent) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400 px-1.5 py-0.5 rounded">
        Sent
      </span>
    );
  }
  if (purchase.email_error) {
    return (
      <span className="inline-flex items-center text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.5 rounded">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
      Not sent
    </span>
  );
}

function ReverseButton({
  purchase,
  reversingId,
  onReverse,
  className = '',
  size = 'sm',
}: {
  purchase: InPersonPurchaseRow;
  reversingId: string | null;
  onReverse: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const height = size === 'md' ? 'h-9 px-4 text-sm' : 'h-8 px-3 text-xs';
  return (
    <button
      type="button"
      disabled={purchase.reversed || reversingId === purchase.id}
      onClick={e => {
        e.stopPropagation();
        onReverse(purchase.id);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-rose-600 text-white hover:bg-rose-700 ${height} ${className}`}
    >
      {purchase.reversed ? 'Reversed' : reversingId === purchase.id ? 'Reversing…' : 'Reverse'}
    </button>
  );
}

function purchaseSummary(lines: DisplayLine[]) {
  const totalYards = lines.reduce((sum, l) => sum + l.yards, 0);
  if (lines.length === 1) {
    const line = lines[0];
    const label = line.name || line.sku;
    return { title: label, subtitle: `${line.yards} yd · ${line.sku}` };
  }
  return {
    title: `${lines.length} fabrics`,
    subtitle: `${totalYards} yd total`,
  };
}

function FinancialGrid({
  total,
  cost,
  profit,
  costProfitError,
  compact = false,
}: {
  total: number;
  cost: number | null;
  profit: number | null;
  costProfitError: string | null;
  compact?: boolean;
}) {
  const labelClass = compact
    ? 'text-[10px] text-muted-foreground uppercase'
    : 'text-xs text-muted-foreground uppercase';
  const valueClass = compact
    ? 'font-semibold tabular-nums text-sm'
    : 'font-semibold tabular-nums text-base';

  return (
    <div>
      <div className={`grid grid-cols-3 gap-2 text-center ${compact ? '' : 'sm:gap-3'}`}>
        <div className="rounded-md bg-muted/30 px-2 py-1.5">
          <div className={labelClass}>Total</div>
          <div className={valueClass}>{formatCurrency(total)}</div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5">
          <div className={labelClass}>Cost</div>
          <div className={`${valueClass} font-medium`}>
            {costProfitError ? '—' : cost != null ? formatCurrency(cost) : '—'}
          </div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5">
          <div className={labelClass}>Profit</div>
          <div className={valueClass}>
            {costProfitError ? '—' : profit != null ? formatCurrency(profit) : '—'}
          </div>
        </div>
      </div>
      {costProfitError ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">{costProfitError}</p>
      ) : null}
    </div>
  );
}

function LineItemsList({
  purchaseId,
  lines,
  variant = 'compact',
}: {
  purchaseId: string;
  lines: DisplayLine[];
  variant?: 'compact' | 'detailed';
}) {
  return (
    <ul className={variant === 'detailed' ? 'space-y-2' : 'space-y-2'}>
      {lines.map((line, idx) => (
        <li
          key={`${purchaseId}-line-${idx}`}
          className={
            variant === 'detailed'
              ? 'grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md border bg-muted/20 px-3 py-2.5'
              : 'rounded-md bg-muted/40 px-2.5 py-2 space-y-0.5'
          }
        >
          {variant === 'detailed' ? (
            <>
              <div className="min-w-0">
                <div className="font-medium text-sm leading-snug">{line.name || line.sku}</div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5">{line.sku}</div>
              </div>
              <div className="text-right text-sm shrink-0">
                <div className="font-medium tabular-nums">{line.yards} yd</div>
                <div className="text-xs font-mono text-muted-foreground mt-0.5">
                  {line.inventoryBefore} → {line.inventoryAfter}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-sm leading-snug">{line.name || line.sku}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{line.sku}</span>
                <span>{line.yards} yd</span>
                <span className="font-mono">
                  Inv {line.inventoryBefore} → {line.inventoryAfter}
                </span>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function PurchaseMeta({
  purchase,
  layout = 'stack',
}: {
  purchase: InPersonPurchaseRow;
  layout?: 'stack' | 'grid';
}) {
  if (layout === 'grid') {
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Payment</dt>
          <dd className="font-medium">{purchase.payment_method ? purchase.payment_method.toUpperCase() : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Receipt</dt>
          <dd>
            <ReceiptBadge purchase={purchase} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="break-all text-sm">{purchase.receipt_email}</dd>
        </div>
      </dl>
    );
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
      <dt className="text-muted-foreground">Payment</dt>
      <dd>{purchase.payment_method ? purchase.payment_method.toUpperCase() : '—'}</dd>
      <dt className="text-muted-foreground">Email</dt>
      <dd className="break-all">{purchase.receipt_email}</dd>
    </dl>
  );
}

export function InPersonPurchasesTable({
  purchases,
  buyPriceBySku = {},
}: {
  purchases: InPersonPurchaseRow[];
  buyPriceBySku?: Record<string, number | null>;
}) {
  const buyPriceMap = new Map(Object.entries(buyPriceBySku));
  const router = useRouter();
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const getDisplayLines = (purchase: InPersonPurchaseRow): DisplayLine[] => {
    const raw = Array.isArray(purchase.sale_lines) ? purchase.sale_lines : [];
    const lines = raw
      .map(line => ({
        sku: String(line?.sku ?? '').trim(),
        name: line?.name ?? null,
        yards: Number(line?.yards),
        inventoryBefore: Number(line?.inventory_before),
        inventoryAfter: Number(line?.inventory_after),
      }))
      .filter(line => line.sku && Number.isFinite(line.yards) && line.yards > 0);

    if (lines.length > 0) return lines;

    return [
      {
        sku: purchase.sku,
        name: purchase.name,
        yards: Number(purchase.quantity),
        inventoryBefore: Number(purchase.inventory_before),
        inventoryAfter: Number(purchase.inventory_after),
      },
    ];
  };

  const computePurchase = (p: InPersonPurchaseRow): PurchaseComputed => {
    const lines = getDisplayLines(p);
    const { cost, profit, error: costProfitError } = getPurchaseCostProfit({
      ...p,
      buyPriceBySku: buyPriceMap,
    });
    return { lines, cost, profit, costProfitError };
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReverse = async (purchaseId: string) => {
    const ok = window.confirm(
      'Reverse this in-person sale? Inventory will be restored if it still matches.'
    );
    if (!ok) return;

    try {
      setReversingId(purchaseId);
      const res = await fetch('/api/fabric/reverse-in-person-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reverse sale');
      }

      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to reverse sale');
    } finally {
      setReversingId(null);
    }
  };

  if (purchases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No in-person purchases yet.</p>
      </div>
    );
  }

  const renderMobileCard = (p: InPersonPurchaseRow) => {
    const { lines, cost, profit, costProfitError } = computePurchase(p);
    const expanded = expandedIds.has(p.id);
    const summary = purchaseSummary(lines);

    return (
      <div
        key={p.id}
        className={`rounded-lg border bg-card overflow-hidden ${p.reversed ? 'opacity-70' : ''}`}
      >
        <div className="flex items-stretch gap-2 p-3">
          <button
            type="button"
            onClick={() => toggleExpanded(p.id)}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs text-muted-foreground">{formatShortDate(p.created_at)}</span>
                <ReceiptBadge purchase={p} />
                {p.reversed ? (
                  <span className="text-[10px] font-medium text-rose-600">Reversed</span>
                ) : null}
              </div>
              <div className="font-medium text-sm leading-snug truncate">{summary.title}</div>
              <div className="text-xs text-muted-foreground truncate">{summary.subtitle}</div>
            </div>
            <div className="shrink-0 text-right pl-1">
              <div className="text-sm font-semibold tabular-nums">{formatCurrency(p.total_amount)}</div>
              {!expanded && profit != null && !costProfitError ? (
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  +{formatCurrency(profit)} profit
                </div>
              ) : null}
            </div>
          </button>
          <ReverseButton
            purchase={p}
            reversingId={reversingId}
            onReverse={handleReverse}
            className="self-center"
          />
        </div>

        {expanded ? (
          <div className="border-t px-3 pb-3 pt-2 space-y-3 text-sm">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Items
              </div>
              <LineItemsList purchaseId={p.id} lines={lines} variant="compact" />
            </div>
            <FinancialGrid
              total={p.total_amount}
              cost={cost}
              profit={profit}
              costProfitError={costProfitError}
              compact
            />
            <PurchaseMeta purchase={p} layout="stack" />
            {p.reversed && p.reversed_at ? (
              <p className="text-xs text-rose-600">
                Reversed on {new Date(p.reversed_at).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderTabletCard = (p: InPersonPurchaseRow) => {
    const { lines, cost, profit, costProfitError } = computePurchase(p);
    const expanded = expandedIds.has(p.id);
    const summary = purchaseSummary(lines);

    return (
      <div
        key={p.id}
        className={`rounded-lg border bg-card overflow-hidden ${p.reversed ? 'opacity-70' : ''}`}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-stretch gap-3">
            <button
              type="button"
              onClick={() => toggleExpanded(p.id)}
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
              aria-expanded={expanded}
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{formatShortDate(p.created_at)}</span>
                  {p.payment_method ? (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {p.payment_method.toUpperCase()}
                    </span>
                  ) : null}
                  <ReceiptBadge purchase={p} />
                  {p.reversed ? (
                    <span className="text-xs font-medium text-rose-600">Reversed</span>
                  ) : null}
                </div>
                <div className="text-base font-semibold leading-snug">{summary.title}</div>
                <div className="text-sm text-muted-foreground">{summary.subtitle}</div>
              </div>
              <div className="shrink-0 text-right pl-1">
                <div className="text-sm font-semibold tabular-nums">
                  {formatCurrency(p.total_amount)}
                </div>
                {!expanded && profit != null && !costProfitError ? (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    +{formatCurrency(profit)} profit
                  </div>
                ) : null}
              </div>
            </button>
            <ReverseButton
              purchase={p}
              reversingId={reversingId}
              onReverse={handleReverse}
              size="md"
              className="self-center"
            />
          </div>

          <div className="rounded-md bg-muted/25 border px-3 py-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Customer email
            </div>
            <a
              href={`mailto:${p.receipt_email}`}
              className="text-sm font-medium break-all text-foreground hover:underline mt-0.5 block"
            >
              {p.receipt_email}
            </a>
          </div>

          {expanded ? (
            <div className="space-y-4 pt-3 border-t">
              <FinancialGrid
                total={p.total_amount}
                cost={cost}
                profit={profit}
                costProfitError={costProfitError}
              />

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Items sold
                </div>
                <LineItemsList purchaseId={p.id} lines={lines} variant="detailed" />
              </div>

              {p.reversed && p.reversed_at ? (
                <p className="text-sm text-rose-600">
                  Reversed on {new Date(p.reversed_at).toLocaleDateString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Phone: compact collapsible cards */}
      <div className="md:hidden space-y-2">{purchases.map(renderMobileCard)}</div>

      {/* Tablet / iPad: collapsible cards; customer email always visible */}
      <div className="hidden md:block xl:hidden space-y-3">{purchases.map(renderTabletCard)}</div>

      {/* Desktop: full table */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">SKU</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Qty</th>
              <th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Cost</th>
              <th className="pb-3 font-medium">Profit</th>
              <th className="pb-3 font-medium">Payment</th>
              <th className="pb-3 font-medium">Receipt Email</th>
              <th className="pb-3 font-medium">Inventory</th>
              <th className="pb-3 font-medium">Receipt</th>
              <th className="pb-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {purchases.map(p => {
              const { lines, cost, profit, costProfitError } = computePurchase(p);
              return (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors align-top"
                >
                  <td className="py-2 text-muted-foreground whitespace-nowrap">
                    {formatShortDate(p.created_at)}
                  </td>
                  <td className="py-2 font-medium whitespace-nowrap">
                    <div className="space-y-1">
                      {lines.map((line, idx) => (
                        <div key={`${p.id}-sku-${idx}`} className="font-mono">
                          {line.sku}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 font-medium">
                    <div className="space-y-1">
                      {lines.map((line, idx) => (
                        <div key={`${p.id}-name-${idx}`}>{line.name || line.sku}</div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground whitespace-nowrap">
                    <div className="space-y-1">
                      {lines.map((line, idx) => (
                        <div key={`${p.id}-qty-${idx}`}>{line.yards}</div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 font-medium whitespace-nowrap">
                    {formatCurrency(p.total_amount)}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {costProfitError ? (
                      <span className="text-xs text-amber-700 dark:text-amber-300 max-w-[140px] inline-block leading-tight">
                        {costProfitError}
                      </span>
                    ) : cost != null ? (
                      <span className="text-muted-foreground">{formatCurrency(cost)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {costProfitError ? (
                      <span className="text-muted-foreground">—</span>
                    ) : profit != null ? (
                      <span className="font-medium">{formatCurrency(profit)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground whitespace-nowrap">
                    {p.payment_method ? p.payment_method.toUpperCase() : '—'}
                  </td>
                  <td className="py-2">
                    <div className="max-w-[220px] truncate">{p.receipt_email}</div>
                  </td>
                  <td className="py-2 text-muted-foreground">
                    <div className="space-y-1 whitespace-nowrap">
                      {lines.map((line, idx) => (
                        <div key={`${p.id}-inv-${idx}`} className="font-mono">
                          {line.inventoryBefore} → {line.inventoryAfter}
                        </div>
                      ))}
                    </div>
                    {p.reversed && p.reversed_at ? (
                      <div className="text-xs text-rose-600 mt-1 whitespace-normal">
                        Reversed ({new Date(p.reversed_at).toLocaleDateString()})
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <ReceiptBadge purchase={p} />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <ReverseButton
                      purchase={p}
                      reversingId={reversingId}
                      onReverse={handleReverse}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
