'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/contexts/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  describeShipping,
  formatCents,
  normalizeShippingSettings,
  pointsDiscountFor,
  shippingCentsFor,
  type FabricShippingSettings,
} from '@/lib/fabric-orders';

const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (value: string) => Math.max(0, Math.round((parseFloat(value) || 0) * 100));

export function FabricSettingsForm({ initial }: { initial: FabricShippingSettings }) {
  const { showToast } = useToast();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const preview = normalizeShippingSettings(s);
  const { shipping, pickup, points } = s;

  const setShipping = (patch: Partial<FabricShippingSettings['shipping']>) =>
    setS(prev => ({ ...prev, shipping: { ...prev.shipping, ...patch } }));
  const setPickup = (patch: Partial<FabricShippingSettings['pickup']>) =>
    setS(prev => ({ ...prev, pickup: { ...prev.pickup, ...patch } }));
  const setPoints = (patch: Partial<FabricShippingSettings['points']>) =>
    setS(prev => ({ ...prev, points: { ...prev.points, ...patch } }));
  const pointExample = pointsDiscountFor(preview.points, 1000, 4000);
  const bounded = shipping.tiers.filter(t => t.upToYards != null);
  const open = shipping.tiers.find(t => t.upToYards == null) ?? { upToYards: null, cents: 0 };
  const setTiers = (b: typeof bounded, o: typeof open) => setShipping({ tiers: [...b, o] });

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/fabric/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return showToast(data.error || 'Could not save', 'error');
    setS(data);
    showToast('Fabric settings saved', 'success');
  };

  return (
    <div className="space-y-8">
      {/* Shipping */}
      <section className="space-y-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Shipping (US)</h2>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={shipping.enabled} onCheckedChange={v => setShipping({ enabled: v })} />
            {shipping.enabled ? 'On' : 'Off'}
          </label>
        </div>

        <div className="space-y-2">
          <Label>Price by total yards in the order</Label>
          <p className="text-xs text-muted-foreground">
            One row = a flat rate. Add rows to charge more for bigger orders (heavier packages).
          </p>
          {bounded.map((tier, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-14">Up to</span>
              <Input
                type="number" min="0.25" step="0.25" className="w-24"
                value={tier.upToYards ?? ''}
                onChange={e => {
                  const next = [...bounded];
                  next[i] = { ...tier, upToYards: parseFloat(e.target.value) || 0 };
                  setTiers(next, open);
                }}
              />
              <span>yd →</span>
              <span>$</span>
              <Input
                type="number" min="0" step="0.01" className="w-24"
                value={dollars(tier.cents)}
                onChange={e => {
                  const next = [...bounded];
                  next[i] = { ...tier, cents: toCents(e.target.value) };
                  setTiers(next, open);
                }}
              />
              <Button type="button" size="icon" variant="ghost" aria-label="Remove tier"
                onClick={() => setTiers(bounded.filter((_, j) => j !== i), open)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-14">{bounded.length ? 'Above' : 'Any size'}</span>
            {bounded.length > 0 && <span className="w-24 text-muted-foreground">{bounded[bounded.length - 1].upToYards} yd</span>}
            <span>{bounded.length ? '→' : ''}</span>
            <span>$</span>
            <Input
              type="number" min="0" step="0.01" className="w-24"
              value={dollars(open.cents)}
              onChange={e => setTiers(bounded, { upToYards: null, cents: toCents(e.target.value) })}
            />
          </div>
          <Button type="button" size="sm" variant="outline"
            onClick={() => {
              const last = bounded[bounded.length - 1]?.upToYards ?? 0;
              setTiers([...bounded, { upToYards: last + 3, cents: open.cents }], open);
            }}>
            <Plus className="h-4 w-4 mr-1" /> Add tier
          </Button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shipping.freeOverCents != null}
              onChange={e => setShipping({ freeOverCents: e.target.checked ? 10000 : null })} />
            Free shipping when fabric subtotal is at least
          </label>
          {shipping.freeOverCents != null && (
            <div className="flex items-center gap-2 text-sm pl-6">
              <span>$</span>
              <Input type="number" min="0" step="1" className="w-28"
                value={dollars(shipping.freeOverCents)}
                onChange={e => setShipping({ freeOverCents: toCents(e.target.value) })} />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="estimate">Delivery estimate (shown to customers)</Label>
          <Input id="estimate" value={shipping.estimate} onChange={e => setShipping({ estimate: e.target.value })} />
        </div>

        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <p className="font-medium">Preview</p>
          <p className="text-muted-foreground">{describeShipping(preview)}.</p>
          <ul className="text-muted-foreground">
            {[
              { yards: 1, cents: 1000 },
              { yards: 3, cents: 3600 },
              { yards: 6, cents: 7200 },
              { yards: 10, cents: 12000 },
            ].map(ex => (
              <li key={ex.yards}>
                {ex.yards} yd ({formatCents(ex.cents)} of fabric): shipping{' '}
                <strong>{formatCents(shippingCentsFor(preview, 'ship', ex.cents, ex.yards))}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pickup */}
      <section className="space-y-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Local pickup</h2>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={pickup.enabled} onCheckedChange={v => setPickup({ enabled: v })} />
            {pickup.enabled ? 'On' : 'Off'}
          </label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="area">Pickup area</Label>
          <Input id="area" value={pickup.area} onChange={e => setPickup({ area: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="instructions">Pickup instructions (shown at checkout and in emails)</Label>
          <Input id="instructions" value={pickup.instructions} onChange={e => setPickup({ instructions: e.target.value })} />
        </div>
      </section>

      {/* Pattern points */}
      <section className="space-y-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pattern points on fabric</h2>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={points.enabled} onCheckedChange={v => setPoints({ enabled: v })} />
            {points.enabled ? 'On' : 'Off'}
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Signed-in shoppers can use their points for money off fabric. Points never reduce what a
          designer earns: they only apply to fabric.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ppd">Points per $1 off</Label>
            <Input
              id="ppd"
              type="number"
              min={1}
              value={points.pointsPerDollar}
              onChange={e => setPoints({ pointsPerDollar: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxpct">Max % of the fabric subtotal</Label>
            <Input
              id="maxpct"
              type="number"
              min={1}
              max={100}
              value={points.maxPercentOfFabric}
              onChange={e => setPoints({ maxPercentOfFabric: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Example: with 1,000 points and {formatCents(4000)} of fabric, a shopper gets{' '}
          {formatCents(pointExample.discountCents)} off for {pointExample.points} points. A pattern
          purchase earns 10 points ({formatCents(Math.floor(1000 / preview.points.pointsPerDollar))}).
        </p>
      </section>

      <Button onClick={save} disabled={saving || (!shipping.enabled && !pickup.enabled)} size="lg">
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
      {!shipping.enabled && !pickup.enabled && (
        <p className="text-sm text-destructive">Turn on at least one of shipping or pickup.</p>
      )}
    </div>
  );
}
