import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Pattern points values for different actions
export const PATTERN_POINTS = {
  BUY_PRODUCT: 10,
  DOWNLOAD_FREE_PATTERN: 5, // When someone downloads a free pattern
  SELL_PRODUCT: 10, // When someone buys your product
  SELL_FREE_PATTERN: 8, // When someone downloads your free pattern
  LIST_PRODUCT: 15, // When you list a new product
  LEAVE_REVIEW: 10,
} as const;

/**
 * Anti-gaming rules (points can be spent on fabric, so they're worth money):
 *  - Every award is recorded in the pattern_point_events ledger and can only
 *    happen once per (user, reason, ref): repeating an action never re-earns.
 *  - Nothing is earned from your own listings (self-purchase, self-download,
 *    reviewing your own pattern).
 *  - Actions that cost nothing to repeat (listing, free downloads, reviews)
 *    have a daily cap per user. Guests' free downloads earn the designer nothing.
 */
const DAILY_CAPS: Record<string, number> = {
  list_product: 3,
  free_download: 5,
  free_download_sale: 10,
  review: 5,
  sale: 20,
};

async function awardCapped(userId: string, points: number, reason: string, refId: string) {
  const cap = DAILY_CAPS[reason];
  if (cap) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await createServiceRoleClient()
      .from('pattern_point_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reason', reason)
      .gte('created_at', since);
    if ((count ?? 0) >= cap) return null;
  }
  return awardPatternPointsOnce(userId, points, reason, refId);
}

type PaidOrder = { id: string; buyer_id: string | null; seller_id: string };

/**
 * After a paid checkout: buyers earn per pattern, each designer earns once per
 * checkout. Purchases of your own patterns earn nothing.
 */
export async function awardPointsForPaidOrders(orders: PaidOrder[], checkoutRef: string): Promise<void> {
  try {
    for (const o of orders) {
      if (o.buyer_id && o.buyer_id !== o.seller_id) {
        await awardCapped(o.buyer_id, PATTERN_POINTS.BUY_PRODUCT, 'purchase', o.id);
      }
    }
    const sellers = new Set(orders.filter(o => o.buyer_id !== o.seller_id).map(o => o.seller_id));
    for (const sellerId of sellers) {
      await awardCapped(sellerId, PATTERN_POINTS.SELL_PRODUCT, 'sale', `${checkoutRef}:${sellerId}`);
    }
  } catch (error) {
    console.error('Error awarding points for paid orders:', error);
  }
}

/** Free download: once per pattern for the downloader, once per downloader for the designer. Signed-in only. */
export async function awardPointsForFreeDownload(downloaderId: string | null, productId: string, sellerId: string) {
  if (!downloaderId || downloaderId === sellerId) return;
  try {
    await awardCapped(downloaderId, PATTERN_POINTS.DOWNLOAD_FREE_PATTERN, 'free_download', productId);
    await awardCapped(sellerId, PATTERN_POINTS.SELL_FREE_PATTERN, 'free_download_sale', `${productId}:${downloaderId}`);
  } catch (error) {
    console.error('Error awarding points for free download:', error);
  }
}

/** Review: once per pattern (deleting and re-posting doesn't re-earn), never for your own pattern. */
export async function awardPointsForReview(reviewerId: string, productId: string, sellerId: string) {
  if (reviewerId === sellerId) return;
  try {
    await awardCapped(reviewerId, PATTERN_POINTS.LEAVE_REVIEW, 'review', productId);
  } catch (error) {
    console.error('Error awarding points for review:', error);
  }
}

/** Listing: once per listing, at most a few listings a day. */
export async function awardPointsForListing(sellerId: string, productId: string) {
  return awardCapped(sellerId, PATTERN_POINTS.LIST_PRODUCT, 'list_product', productId);
}

/**
 * Award points at most once per (user, reason, ref), e.g. once per listed
 * product. Returns the new total, or null if already awarded / on error.
 */
export async function awardPatternPointsOnce(
  userId: string,
  points: number,
  reason: string,
  refId: string
): Promise<number | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('award_pattern_points_once', {
      p_user_id: userId,
      p_points: points,
      p_reason: reason,
      p_ref_id: refId,
    });
    if (error) {
      console.error('Error awarding one-time pattern points:', error);
      return null;
    }
    return (data as number | null) ?? null;
  } catch (error) {
    console.error('Error awarding one-time pattern points:', error);
    return null;
  }
}
