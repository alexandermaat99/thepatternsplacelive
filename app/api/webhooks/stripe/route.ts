import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Create order record
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            product_id: session.metadata?.productId,
            buyer_id: session.metadata?.buyerId,
            seller_id: session.metadata?.sellerId,
            stripe_session_id: session.id,
            status: 'completed',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || 'USD',
          });

        if (orderError) {
          console.error('Error creating order:', orderError);
        }

        // Mark product as sold (optional - you might want to keep it active for multiple sales)
        // const { error: productError } = await supabase
        //   .from('products')
        //   .update({ is_active: false })
        //   .eq('id', session.metadata?.productId);

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        
        // Update order status to expired
        const { error } = await supabase
          .from('orders')
          .update({ status: 'expired' })
          .eq('stripe_session_id', session.id);

        if (error) {
          console.error('Error updating order status:', error);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 