import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Small badge shown next to a Founding Designer's name. */
export function FoundingDesignerBadge({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      title="One of the first designers to sell on The Pattern's Place"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 align-middle whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <Sparkles className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} aria-hidden="true" />
      Founding Designer
    </span>
  );
}
