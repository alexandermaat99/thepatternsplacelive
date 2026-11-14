'use client';

import { Scissors } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** Seller-side checkbox: "my photos show a garment sewn from this pattern". */
export function SewnSampleInput({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={v => onChange(v === true)} className="mt-0.5" />
      <span className="text-sm">
        <span className="font-medium">My photos include a garment sewn from this pattern</span>
        <span className="block text-muted-foreground">
          By you or a pattern tester. Shoppers see a &quot;Sewn sample&quot; badge, which helps them
          trust the pattern works.
        </span>
      </span>
    </label>
  );
}

/** Shopper-side badge. */
export function SewnSampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800',
        className
      )}
      title="The designer's photos include a garment sewn from this pattern"
    >
      <Scissors className="h-3 w-3" /> Sewn sample
    </span>
  );
}
