import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { StripeAccountStatus } from '@/lib/auth-helpers';

type PayoutsState = {
  badge: string;
  badgeClass: string;
  icon: React.ReactNode;
  message: string;
  action?: { href: string; label: string };
  showRefresh?: boolean;
};

const AMBER = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';

function getPayoutsState(status: StripeAccountStatus): PayoutsState {
  if (status.isOnboarded) {
    return status.requiresMoreInfo
      ? {
          badge: 'Action needed',
          badgeClass: AMBER,
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          message:
            "You can keep selling, but Stripe needs a few more details to keep payouts running. It only takes a minute.",
          action: { href: '/dashboard/stripe-setup', label: 'Update details' },
        }
      : {
          badge: 'Active',
          badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          message: "You're all set to sell. Earnings are sent to your bank account automatically.",
          action: { href: '/marketplace/sell', label: 'List a product' },
        };
  }

  switch (status.status) {
    case 'pending':
      return {
        badge: 'Setup incomplete',
        badgeClass: AMBER,
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        message: 'Finish setting up payouts to start selling paid patterns.',
        action: { href: '/dashboard/stripe-setup', label: 'Finish setup' },
      };
    case 'requires_info':
      return {
        badge: 'Action needed',
        badgeClass: AMBER,
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        message: 'Stripe needs a bit more information to verify your account.',
        action: { href: '/dashboard/stripe-setup', label: 'Provide information' },
      };
    case 'pending_verification':
      return {
        badge: 'In review',
        badgeClass: 'bg-secondary text-secondary-foreground',
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
        message:
          "Stripe is reviewing your details. This usually takes a few minutes. You'll be able to sell paid patterns as soon as it's done.",
        showRefresh: true,
      };
    default:
      // Stripe was slow or unreachable. Don't tell the seller they're "not connected".
      return {
        badge: 'Status unavailable',
        badgeClass: 'bg-secondary text-secondary-foreground',
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
        message: "We couldn't load your payout status just now.",
        showRefresh: true,
      };
  }
}

export function PayoutsCard({ stripeStatus }: { stripeStatus: StripeAccountStatus }) {
  const state = getPayoutsState(stripeStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Payouts
          {state.icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="secondary" className={state.badgeClass}>
          {state.badge}
        </Badge>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        {state.action && (
          <Button asChild className="w-full">
            <Link href={state.action.href}>{state.action.label}</Link>
          </Button>
        )}
        {state.showRefresh && (
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard" prefetch={false}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh status
            </Link>
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Payments and payouts are handled by Stripe.</p>
      </CardContent>
    </Card>
  );
}
