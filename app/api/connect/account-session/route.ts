import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe account ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    const stripe = getStripe();
    let accountId = profile?.stripe_account_id;

    // If no account exists, create a new Express account
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        metadata: { userId: user.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          url: 'https://thepatternsplace.com',
          mcc: '5999',
          product_description: 'Digital products and services sold through ThePatternsPlace marketplace'
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
            },
          },
        },
      });

      accountId = account.id;

      // Save the account ID to the user's profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    } else {
      // Check if existing account is Standard - if so, create new Express account
      const existingAccount = await stripe.accounts.retrieve(accountId);
      
      if (existingAccount.type === 'standard') {
        // Migrate to Express
        const newAccount = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email,
          metadata: { 
            userId: user.id,
            migratedFrom: accountId,
            migratedAt: new Date().toISOString()
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          business_profile: {
            url: 'https://thepatternsplace.com',
            mcc: '5999',
            product_description: 'Digital products and services sold through ThePatternsPlace marketplace'
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'daily',
              },
            },
          },
        });

        accountId = newAccount.id;

        // Update profile with new account ID
        await supabase
          .from('profiles')
          .update({ stripe_account_id: accountId })
          .eq('id', user.id);
      }
    }

    // Create an Account Session for embedded onboarding
    // Using 'eventually_due' collects ALL required info upfront (including SSN/tax info)
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        // Enable tax settings component for sellers to opt into Stripe Tax
        tax_settings: {
          enabled: true,
        },
        tax_registrations: {
          enabled: true,
        },
      },
    });

    return NextResponse.json({ 
      clientSecret: accountSession.client_secret,
      accountId 
    });
  } catch (error: any) {
    console.error('Error creating account session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account session' },
      { status: 500 }
    );
  }
}

