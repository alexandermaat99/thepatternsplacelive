'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  EMPTY_FABRIC_REQUIREMENTS,
  FABRIC_TYPE_LABELS,
  type FabricRequirements,
  type FabricType,
} from '@/lib/fabric-requirements';

/**
 * "Fabric needed" fields for a listing: copy from the pattern's yardage chart.
 * Optional; `null` = not filled in.
 */
export function FabricRequirementsInput({
  value,
  onChange,
}: {
  value: FabricRequirements | null;
  onChange: (value: FabricRequirements | null) => void;
}) {
  const enabled = value !== null;
  const v = value ?? EMPTY_FABRIC_REQUIREMENTS;
  const set = (patch: Partial<FabricRequirements>) => onChange({ ...v, ...patch });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={enabled}
          onChange={e => onChange(e.target.checked ? EMPTY_FABRIC_REQUIREMENTS : null)}
        />
        <span>
          <span className="font-medium">Fabric needed</span>{' '}
          <span className="text-xs text-muted-foreground">(recommended for sewing patterns)</span>
          <span className="block text-xs text-muted-foreground">
            Copy it from your pattern&apos;s yardage chart. Buyers see it on your listing, and it lets
            them buy the right amount of fabric with your pattern.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="space-y-4 pl-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fabric-type">Fabric type</Label>
              <select
                id="fabric-type"
                value={v.fabricType}
                onChange={e => set({ fabricType: e.target.value as FabricType })}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {(Object.keys(FABRIC_TYPE_LABELS) as FabricType[]).map(t => (
                  <option key={t} value={t}>{FABRIC_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fabric-width">Yardage is for fabric that is</Label>
              <select
                id="fabric-width"
                value={v.widthInches}
                onChange={e => set({ widthInches: Number(e.target.value) === 60 ? 60 : 45 })}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value={45}>44–45&quot; wide</option>
                <option value={60}>58–60&quot; wide</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fabric-suggested">Suggested fabrics</Label>
            <Input
              id="fabric-suggested"
              value={v.suggested}
              maxLength={200}
              onChange={e => set({ suggested: e.target.value })}
              placeholder="e.g. Cotton poplin, linen, rayon challis"
            />
          </div>

          <div className="space-y-2">
            <Label>Yardage by size</Label>
            {v.sizes.map((size, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={size.label}
                  maxLength={40}
                  placeholder="Size, e.g. XS–M"
                  onChange={e => {
                    const sizes = [...v.sizes];
                    sizes[i] = { ...size, label: e.target.value };
                    set({ sizes });
                  }}
                  className="flex-1"
                  aria-label={`Size ${i + 1}`}
                />
                <Input
                  type="number"
                  min="0.125"
                  step="0.125"
                  value={size.yards || ''}
                  placeholder="Yards"
                  onChange={e => {
                    const sizes = [...v.sizes];
                    sizes[i] = { ...size, yards: parseFloat(e.target.value) || 0 };
                    set({ sizes });
                  }}
                  className="w-24"
                  aria-label={`Yards for size ${i + 1}`}
                />
                <span className="text-sm text-muted-foreground">yd</span>
                {v.sizes.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove size"
                    onClick={() => set({ sizes: v.sizes.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {v.sizes.length < 12 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set({ sizes: [...v.sizes, { label: '', yards: 0 }] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Add size
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
