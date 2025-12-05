import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { COMPANY_INFO } from '@/lib/company-info';

export async function POST(request: NextRequest) {
  try {
    const { userId, forceMigrate } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    // Check if user already has a Stripe account
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (existingProfile?.stripe_account_id) {
      // Check the account type
      try {
        const existingAccount = await stripe.accounts.retrieve(existingProfile.stripe_account_id);
        
        // If it's a Standard account and not fully onboarded, or user wants to migrate
        if (existingAccount.type === 'standard') {
          const isFullyOnboarded = existingAccount.details_submitted && existingAccount.charges_enabled;
          
          if (!isFullyOnboarded || forceMigrate) {
            // Migrate to Express: Create a new Express account
            console.log(`Migrating user ${userId} from Standard to Express account`);
            
            const newExpressAccount = await stripe.accounts.create({
              type: 'express',
              country: 'US',
              email: user.email,
              metadata: { 
                userId,
                migratedFrom: existingProfile.stripe_account_id,
                migratedAt: new Date().toISOString()
              },
              capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
              },
              business_type: 'individual',
              business_profile: {
                url: COMPANY_INFO.urls.website,
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

            // Update profile with new Express account ID
            await supabase
              .from('profiles')
              .update({ stripe_account_id: newExpressAccount.id })
              .eq('id', userId);

            // Create onboarding link for new Express account
            const accountLink = await stripe.accountLinks.create({
              account: newExpressAccount.id,
              refresh_url: `${origin}/dashboard?stripe_refresh=true`,
              return_url: `${origin}/dashboard?stripe_return=true`,
              type: 'account_onboarding',
            });

            return NextResponse.json({ 
              url: accountLink.url,
              migrated: true,
              message: 'Upgraded to Express account for faster onboarding'
            });
          }
          
          // Standard account is fully onboarded - offer migration option
          return NextResponse.json({
            alreadyOnboarded: true,
            accountType: 'standard',
            canMigrate: true,
            message: 'Your Standard account is active. You can migrate to Express for a better experience.'
          });
        }
        
        // It's already an Express account, just generate a new onboarding link if needed
        if (existingAccount.details_submitted && existingAccount.charges_enabled) {
          return NextResponse.json({
            alreadyOnboarded: true,
            accountType: 'express',
            message: 'Your Express account is already fully set up'
          });
        }
        
        // Express account needs to complete onboarding
        const accountLink = await stripe.accountLinks.create({
          account: existingProfile.stripe_account_id,
          refresh_url: `${origin}/dashboard?stripe_refresh=true`,
          return_url: `${origin}/dashboard?stripe_return=true`,
          type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
        
      } catch (stripeError: any) {
        console.error('Error retrieving existing account:', stripeError);
        // Account might be invalid, create a new one
      }
    }

    // No existing account or invalid account - create new Express account

    // 1. Create a new Stripe Express account for the seller
    // Express accounts have smoother onboarding and the platform has more control
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      metadata: { userId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        url: COMPANY_INFO.urls.website,
        mcc: '5999', // Miscellaneous retail stores
        product_description: 'Digital products and services sold through ThePatternsPlace marketplace'
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily', // Sellers get payouts daily
          },
        },
      },
    });

    // 2. Save the account.id to the user's profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile. Make sure stripe_account_id column exists.' },
        { status: 500 }
      );
    }

    // 3. Create an onboarding link for Express account
    // Express onboarding is typically faster and smoother than Standard
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/dashboard?stripe_refresh=true`,
      return_url: `${origin}/dashboard?stripe_return=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to start Stripe onboarding' },
      { status: 500 }
    );
  }
} 