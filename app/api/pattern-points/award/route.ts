import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { awardPointsForListing, PATTERN_POINTS } from '@/lib/pattern-points';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.STANDARD);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only "listed a product" can be claimed from the browser. Purchase, sale
    // and review points are awarded server-side when those things happen.
    // The product must belong to the caller and be newly created, and each
    // product can only earn points once (enforced by the ledger).
    const body = await request.json().catch(() => ({}));
    const { action, productId } = body ?? {};
    if (action !== 'list' || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: product } = await supabase
      .from('products')
      .select('id, user_id, created_at')
      .eq('id', productId)
      .single();
    const isRecent =
      product && Date.now() - new Date(product.created_at).getTime() < 30 * 60 * 1000;
    if (!product || product.user_id !== user.id || !isRecent) {
      return NextResponse.json({ error: 'Not eligible' }, { status: 403 });
    }

    const points = PATTERN_POINTS.LIST_PRODUCT;
    const newTotal = await awardPointsForListing(user.id, productId);
    if (newTotal === null) {
      return NextResponse.json({ success: true, pointsAwarded: 0, alreadyAwarded: true });
    }

    return NextResponse.json({
      success: true,
      pointsAwarded: points,
      newTotal,
    });
  } catch (error) {
    console.error('Error awarding pattern points:', error);
    return NextResponse.json({ error: 'An error occurred while awarding points' }, { status: 500 });
  }
}
