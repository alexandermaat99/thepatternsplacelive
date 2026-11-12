import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface StripeConnectButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  label?: string;
}

/** Sends the seller to payout setup (embedded Stripe onboarding). */
export function StripeConnectButton({
  variant = 'default',
  label = 'Set up payouts',
}: StripeConnectButtonProps) {
  return (
    <Button asChild variant={variant} className="w-full">
      <Link href="/dashboard/stripe-setup">{label}</Link>
    </Button>
  );
}
