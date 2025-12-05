import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { awardPatternPoints, PATTERN_POINTS } from '@/lib/pattern-points';
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

    const body = await request.json();
    const { action } = body;

    // Validate action
    const validActions = ['list', 'purchase', 'sale', 'review'] as const;
    if (!action || !validActions.includes(action as any)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: list, purchase, sale, review' },
        { status: 400 }
      );
    }

    // Award points based on action
    let points: number;
    switch (action) {
      case 'list':
        points = PATTERN_POINTS.LIST_PRODUCT;
        break;
      case 'purchase':
        points = PATTERN_POINTS.BUY_PRODUCT;
        break;
      case 'sale':
        points = PATTERN_POINTS.SELL_PRODUCT;
        break;
      case 'review':
        points = PATTERN_POINTS.LEAVE_REVIEW;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Award points (server-side, can access service role key)
    const newTotal = await awardPatternPoints(user.id, points);

    if (newTotal === null) {
      return NextResponse.json({ error: 'Failed to award points' }, { status: 500 });
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
