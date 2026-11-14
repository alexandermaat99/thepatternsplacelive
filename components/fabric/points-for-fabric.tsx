import Link from 'next/link';
import { Award } from 'lucide-react';
import { getFabricShippingSettings } from '@/lib/fabric-settings-server';
import { PATTERN_POINTS } from '@/lib/pattern-points';
import { formatCents } from '@/lib/fabric-orders';

const SIGN_UP_BONUS = 20;

/** "Use pattern points on fabric" callout. Hidden when an admin turns points off. */
export async function PointsForFabric({ variant }: { variant: 'home' | 'fabric' }) {
  const { points } = await getFabricShippingSettings();
  if (!points.enabled) return null;
  const perPattern = formatCents(Math.floor((PATTERN_POINTS.BUY_PRODUCT * 100) / points.pointsPerDollar));
  const cap = points.maxPercentOfFabric < 100 ? `, up to ${points.maxPercentOfFabric}% of your fabric` : '';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-rose-50 via-background to-background p-5 sm:flex-row sm:items-center sm:p-6 dark:from-rose-950/30">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
        <Award className="h-5 w-5 text-rose-500" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="font-semibold">Turn your pattern points into fabric</p>
        <p className="text-sm text-muted-foreground">
          You get {SIGN_UP_BONUS} points for joining and {PATTERN_POINTS.BUY_PRODUCT} for every pattern
          you buy ({perPattern} toward fabric). At checkout, use them for money off: {points.pointsPerDollar}{' '}
          points = $1{cap}.
        </p>
      </div>
      <Link
        href={variant === 'home' ? '/fabric' : '/marketplace'}
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-muted"
      >
        {variant === 'home' ? 'Shop fabric' : 'Find a pattern'}
      </Link>
    </div>
  );
}
