import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Pattern points values for different actions
export const PATTERN_POINTS = {
  BUY_PRODUCT: 10,
  SELL_PRODUCT: 10, // When someone buys your product
  LIST_PRODUCT: 15, // When you list a new product
  LEAVE_REVIEW: 10,
} as const;

/**
 * Award pattern points to a user
 * @param userId - The user ID to award points to
 * @param points - The number of points to award
 * @returns The new total points, or null if there was an error
 */
export async function awardPatternPoints(userId: string, points: number): Promise<number | null> {
  if (!userId || points <= 0) {
    console.error('Invalid parameters for awardPatternPoints:', { userId, points });
    return null;
  }

  try {
    const supabase = createServiceRoleClient();

    // Use the database function to award points
    const { data, error } = await supabase.rpc('award_pattern_points', {
      p_user_id: userId,
      p_points: points,
    });

    if (error) {
      console.error('Error awarding pattern points:', error);
      return null;
    }

    return data || 0;
  } catch (error) {
    console.error('Exception in awardPatternPoints:', error);
    return null;
  }
}

/**
 * Award points for buying a product
 */
export async function awardPointsForPurchase(buyerId: string | null): Promise<void> {
  if (!buyerId) {
    // Guest purchase - no points awarded
    return;
  }

  try {
    await awardPatternPoints(buyerId, PATTERN_POINTS.BUY_PRODUCT);
    console.log(`✅ Awarded ${PATTERN_POINTS.BUY_PRODUCT} pattern points to buyer ${buyerId}`);
  } catch (error) {
    console.error('Error awarding points for purchase:', error);
    // Don't throw - points are non-critical
  }
}

/**
 * Award points for selling a product (when someone buys your product)
 */
export async function awardPointsForSale(sellerId: string): Promise<void> {
  try {
    await awardPatternPoints(sellerId, PATTERN_POINTS.SELL_PRODUCT);
    console.log(`✅ Awarded ${PATTERN_POINTS.SELL_PRODUCT} pattern points to seller ${sellerId}`);
  } catch (error) {
    console.error('Error awarding points for sale:', error);
    // Don't throw - points are non-critical
  }
}

/**
 * Award points for listing a product
 */
export async function awardPointsForListing(sellerId: string): Promise<void> {
  try {
    await awardPatternPoints(sellerId, PATTERN_POINTS.LIST_PRODUCT);
    console.log(`✅ Awarded ${PATTERN_POINTS.LIST_PRODUCT} pattern points to seller ${sellerId}`);
  } catch (error) {
    console.error('Error awarding points for listing:', error);
    // Don't throw - points are non-critical
  }
}

/**
 * Award points for leaving a review
 */
export async function awardPointsForReview(buyerId: string): Promise<void> {
  try {
    await awardPatternPoints(buyerId, PATTERN_POINTS.LEAVE_REVIEW);
    console.log(`✅ Awarded ${PATTERN_POINTS.LEAVE_REVIEW} pattern points to reviewer ${buyerId}`);
  } catch (error) {
    console.error('Error awarding points for review:', error);
    // Don't throw - points are non-critical
  }
}
