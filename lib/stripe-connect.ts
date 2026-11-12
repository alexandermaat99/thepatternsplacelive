import type Stripe from 'stripe';
import type { User } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';
import type { StripeAccountStatus } from '@/lib/auth-helpers';

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether a seller can be paid through checkout. Checkout uses destination
 * charges (the platform is the merchant of record), so sellers only need the
 * `transfers` capability, not `card_payments`. Legacy Standard accounts
 * keep their old check.
 */
export function canReceiveSales(account: Stripe.Account): boolean {
  if (!account.details_submitted) return false;
  if (account.type === 'standard') return account.charges_enabled ?? false;
  return account.capabilities?.transfers === 'active';
}

/**
 * Turn a Stripe connected account into the seller-facing payout status.
 *
 * - onboarded:            can be paid for sales (may still have upcoming requirements)
 * - pending:              seller started but hasn't finished onboarding
 * - requires_info:        seller submitted, but Stripe needs more information
 * - pending_verification: seller submitted everything, Stripe is reviewing it
 */
export function summarizeConnectedAccount(
  account: Stripe.Account
): Omit<StripeAccountStatus, 'isConnected' | 'accountId'> {
  const detailsSubmitted = account.details_submitted ?? false;
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  const isOnboarded = canReceiveSales(account);

  const requirementsDue = Array.from(
    new Set([
      ...(account.requirements?.past_due ?? []),
      ...(account.requirements?.currently_due ?? []),
    ])
  );
  const requiresMoreInfo = requirementsDue.length > 0;
  const pendingVerification = (account.requirements?.pending_verification ?? []).length > 0;

  let status: StripeAccountStatus['status'];
  if (isOnboarded) status = 'onboarded';
  else if (!detailsSubmitted) status = 'pending';
  else if (requiresMoreInfo) status = 'requires_info';
  else status = 'pending_verification';

  return {
    isOnboarded,
    status,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    requiresMoreInfo,
    pendingVerification,
    requirementsDue,
    accountType: account.type as StripeAccountStatus['accountType'],
  };
}

/** True when Stripe says the account doesn't exist or isn't reachable with our key. */
function isUnreachableAccountError(error: any) {
  return (
    error?.type === 'StripePermissionError' ||
    error?.code === 'resource_missing' ||
    error?.code === 'account_invalid'
  );
}

function isLiveKey() {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key.startsWith('sk_live_') || key.startsWith('rk_live_');
}

async function createExpressAccount(user: User, replacingAccountId?: string) {
  const stripe = getStripe();
  const params: Stripe.AccountCreateParams = {
    type: 'express',
    country: 'US',
    email: user.email,
    metadata: {
      userId: user.id,
      ...(replacingAccountId && { replacedAccountId: replacingAccountId }),
    },
    // Destination charges only need `transfers`. Skipping `card_payments`
    // means sellers go through fewer identity checks during onboarding.
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    business_profile: {
      url: COMPANY_INFO.urls.website,
      mcc: '5999',
      product_description: `Digital products and services sold through ${COMPANY_INFO.name} marketplace`,
    },
    settings: {
      payouts: { schedule: { interval: 'daily' } },
    },
  };

  // The idempotency key makes concurrent/retried requests for the same user
  // resolve to the same Stripe account instead of creating duplicates.
  const idempotencyKey = `connect-account:${user.id}:${replacingAccountId ?? 'initial'}`;
  try {
    return await stripe.accounts.create(params, { idempotencyKey });
  } catch (error: any) {
    // Another request with the same key is still in flight — wait and replay it.
    if (error?.type === 'StripeIdempotencyError' || error?.statusCode === 409) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return stripe.accounts.create(params, { idempotencyKey });
    }
    throw error;
  }
}

/**
 * Express accounts created before we switched to transfers-only still request
 * `card_payments`, which adds identity checks. For sellers who haven't
 * finished onboarding yet, drop it so they get the lighter flow. Accounts that
 * already submitted their details are left untouched.
 */
async function dropUnneededCardPayments(account: Stripe.Account): Promise<Stripe.Account> {
  if (account.type !== 'express' || account.details_submitted || !account.capabilities?.card_payments) {
    return account;
  }
  try {
    return await getStripe().accounts.update(account.id, {
      capabilities: { card_payments: { requested: false } },
    });
  } catch (error) {
    // Not critical: onboarding still works, it just asks for a bit more.
    console.error(`Could not remove card_payments from ${account.id}:`, error);
    return account;
  }
}

/**
 * Return the seller's connected account, creating one on first use.
 * Never replaces a working account; only replaces one Stripe reports as missing.
 */
export async function getOrCreateConnectedAccount(
  supabase: ServerSupabase,
  user: User
): Promise<Stripe.Account> {
  const stripe = getStripe();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;

  const existingId: string | null = profile?.stripe_account_id ?? null;

  if (existingId) {
    try {
      const existing = await stripe.accounts.retrieve(existingId);
      // Legacy Standard accounts that never finished setup move to Express.
      // Active Standard accounts are left alone.
      const isLegacyIncomplete = existing.type === 'standard' && !canReceiveSales(existing);
      if (!isLegacyIncomplete) return dropUnneededCardPayments(existing);
    } catch (error: any) {
      if (!isUnreachableAccountError(error)) throw error;
      // A test-mode key can't see live accounts. Don't overwrite real seller
      // data from a dev environment pointed at the production database.
      if (!isLiveKey()) {
        throw new Error(
          `Stripe account ${existingId} isn't accessible with the current (test) API key. ` +
            'It was probably created in live mode.'
        );
      }
    }

    const replacement = await createExpressAccount(user, existingId);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_account_id: replacement.id })
      .eq('id', user.id)
      .eq('stripe_account_id', existingId);
    if (updateError) throw updateError;
    return replacement;
  }

  const account = await createExpressAccount(user);

  // Only claim the slot if it's still empty, then re-read so a concurrent
  // request that won the race determines the account everyone uses.
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ stripe_account_id: account.id })
    .eq('id', user.id)
    .is('stripe_account_id', null);
  if (updateError) throw updateError;

  const { data: saved } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single();
  if (saved?.stripe_account_id && saved.stripe_account_id !== account.id) {
    return stripe.accounts.retrieve(saved.stripe_account_id);
  }
  return account;
}

/** Stripe-hosted onboarding link, used when the embedded form can't load. */
export async function createHostedOnboardingLink(accountId: string, origin: string) {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    // Account links are single-use; if it expires, this route mints a fresh one.
    refresh_url: `${origin}/api/connect/continue`,
    return_url: `${origin}/dashboard/stripe-setup`,
    type: 'account_onboarding',
    collection_options: { fields: 'eventually_due', future_requirements: 'include' },
  });
  return link.url;
}
