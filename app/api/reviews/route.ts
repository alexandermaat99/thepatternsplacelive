import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch reviews for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(
        `
        id,
        rating,
        difficulty_rating,
        title,
        comment,
        images,
        created_at,
        updated_at,
        buyer_id,
        profiles:buyer_id (
          id,
          full_name,
          username,
          avatar_url
        )
      `
      )
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Normalize profiles
    const normalizedReviews = (reviews || []).map(review => ({
      ...review,
      profiles: Array.isArray(review.profiles) ? review.profiles[0] : review.profiles,
    }));

    return NextResponse.json({ reviews: normalizedReviews });
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update a review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, rating, difficultyRating, title, comment, orderId, images } = body;

    // Validate input
    if (!productId || !rating) {
      return NextResponse.json({ error: 'Product ID and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Validate difficulty rating if provided
    if (
      difficultyRating &&
      !['beginner', 'intermediate', 'advanced', 'expert'].includes(difficultyRating)
    ) {
      return NextResponse.json(
        { error: 'Invalid difficulty rating. Must be beginner, intermediate, advanced, or expert' },
        { status: 400 }
      );
    }

    // Validate character limits
    const MAX_TITLE_LENGTH = 100;
    const MAX_COMMENT_LENGTH = 2000;
    const MAX_IMAGES = 5; // Limit to 5 images per review

    if (title && title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Review title must be ${MAX_TITLE_LENGTH} characters or less` },
        { status: 400 }
      );
    }
    if (comment && comment.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Review comment must be ${MAX_COMMENT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Validate images
    if (images) {
      if (!Array.isArray(images)) {
        return NextResponse.json({ error: 'Images must be an array' }, { status: 400 });
      }
      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES} images allowed per review` },
          { status: 400 }
        );
      }
      // Validate that all images are valid URLs
      const urlPattern = /^https?:\/\/.+/;
      for (const imageUrl of images) {
        if (typeof imageUrl !== 'string' || !urlPattern.test(imageUrl)) {
          return NextResponse.json({ error: 'All images must be valid URLs' }, { status: 400 });
        }
      }
    }

    // Verify user has purchased this product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('product_id', productId)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .limit(1)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased' },
        { status: 403 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id, order_id')
      .eq('product_id', productId)
      .eq('buyer_id', user.id)
      .single();

    if (existingReview) {
      // Update existing review
      const { data: updatedReview, error: updateError } = await supabase
        .from('reviews')
        .update({
          rating,
          difficulty_rating: difficultyRating || null,
          title: title || null,
          comment: comment || null,
          images: images && images.length > 0 ? images : null,
          order_id: orderId || existingReview.order_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReview.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating review:', updateError);
        return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
      }

      return NextResponse.json({ review: updatedReview, message: 'Review updated successfully' });
    } else {
      // Create new review
      const { data: newReview, error: insertError } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          buyer_id: user.id,
          order_id: orderId || order.id || null,
          rating,
          difficulty_rating: difficultyRating || null,
          title: title || null,
          comment: comment || null,
          images: images && images.length > 0 ? images : null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating review:', insertError);
        return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
      }

      return NextResponse.json({ review: newReview, message: 'Review created successfully' });
    }
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    // Verify user owns this review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('buyer_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', reviewId);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
