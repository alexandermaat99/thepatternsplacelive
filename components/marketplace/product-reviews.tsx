'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, Send, Trash2, Edit2, Info } from 'lucide-react';
import { useToast } from '@/contexts/toast-context';
import { DateDisplay } from '@/components/date-display';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTY_LEVELS, getDifficultyLabel, getDifficultyColor } from '@/lib/constants';

interface Review {
  id: string;
  rating: number;
  difficulty_rating: string | null;
  title: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  buyer_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [difficultyRating, setDifficultyRating] = useState<string>('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  // Scroll to reviews section if hash is present (industry standard approach)
  useEffect(() => {
    // Only attempt scroll after component has finished loading
    if (loading) return;

    const scrollToReviews = () => {
      if (window.location.hash !== '#reviews') return;

      const element = document.getElementById('reviews');
      if (element) {
        // Use scroll-margin-top (set via className) + manual offset for fixed headers
        const offset = 100;
        const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementTop - offset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(scrollToReviews, 300);

    // Handle hash changes
    const handleHashChange = () => {
      setTimeout(scrollToReviews, 100);
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [loading]);

  // Fetch reviews and check if user has purchased
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always fetch reviews (even for non-logged-in users)
        const response = await fetch(`/api/reviews?productId=${productId}`);
        const data = await response.json();

        if (data.reviews) {
          setReviews(data.reviews);

          // Only check for user's review if user is logged in
          if (user) {
            const existingReview = data.reviews.find((r: Review) => r.buyer_id === user.id);
            if (existingReview) {
              setUserReview(existingReview);
              setRating(existingReview.rating);
              setDifficultyRating(existingReview.difficulty_rating || '');
              setTitle(existingReview.title || '');
              setComment(existingReview.comment || '');
            }
          }
        }

        // Check if user has purchased (only if logged in)
        if (user) {
          const supabase = createClient();
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('product_id', productId)
            .eq('buyer_id', user.id)
            .eq('status', 'completed')
            .limit(1)
            .single();

          setHasPurchased(!!order);
        } else {
          setHasPurchased(false);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasPurchased) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          difficultyRating: difficultyRating || null,
          title: title.trim() || null,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      showToast(
        userReview ? 'Review updated successfully' : 'Review submitted successfully',
        'success'
      );

      // Refresh reviews
      const reviewsResponse = await fetch(`/api/reviews?productId=${productId}`);
      const reviewsData = await reviewsResponse.json();
      if (reviewsData.reviews) {
        setReviews(reviewsData.reviews);
        const updatedReview = reviewsData.reviews.find((r: Review) => r.buyer_id === user.id);
        if (updatedReview) {
          setUserReview(updatedReview);
        }
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast(error instanceof Error ? error.message : 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userReview || !user) return;

    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const response = await fetch(`/api/reviews?reviewId=${userReview.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      showToast('Review deleted successfully', 'success');
      setUserReview(null);
      setRating(5);
      setTitle('');
      setComment('');

      // Refresh reviews
      const reviewsResponse = await fetch(`/api/reviews?productId=${productId}`);
      const reviewsData = await reviewsResponse.json();
      if (reviewsData.reviews) {
        setReviews(reviewsData.reviews);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('Failed to delete review', 'error');
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <div className="mt-8">
        <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 scroll-mt-24" id="reviews">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {averageRating.toFixed(1)} ({reviews.length}{' '}
                {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Review Form - Only show if user has purchased */}
      {user && hasPurchased && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {userReview && !isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">Your Review</h3>
                      {userReview.difficulty_rating && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            You rated the difficulty:
                          </span>
                          <Badge
                            style={{
                              backgroundColor: getDifficultyColor(userReview.difficulty_rating).bg,
                              color: getDifficultyColor(userReview.difficulty_rating).text,
                              borderColor: getDifficultyColor(userReview.difficulty_rating).bg,
                            }}
                            className="text-xs"
                          >
                            {getDifficultyLabel(userReview.difficulty_rating)}
                          </Badge>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can edit or delete your review at any time
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i <= userReview.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                {userReview.title && <h4 className="font-medium">{userReview.title}</h4>}
                {userReview.comment && (
                  <p className="text-muted-foreground">{userReview.comment}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  <DateDisplay date={userReview.updated_at || userReview.created_at} />
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <Label>Rating</Label>
                    <div className="flex items-center gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRating(i)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors ${
                              i <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 md:max-w-xs">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="review-difficulty">How difficult was this pattern?</Label>
                      <a
                        href="/marketplace/difficulty-levels"
                        target="_blank"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Learn about difficulty levels"
                      >
                        <Info className="h-4 w-4" />
                      </a>
                    </div>
                    <select
                      id="review-difficulty"
                      value={difficultyRating}
                      onChange={e => setDifficultyRating(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-1"
                    >
                      <option value="">Select difficulty level</option>
                      {DIFFICULTY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="review-title">Title (optional)</Label>
                  <Input
                    id="review-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Brief summary of your experience"
                    maxLength={100}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="review-comment">Your Review</Label>
                  <Textarea
                    id="review-comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Share your thoughts about this pattern..."
                    rows={4}
                    className="mt-1"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting
                      ? 'Submitting...'
                      : userReview
                        ? 'Update Review'
                        : 'Submit Review'}
                  </Button>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        if (userReview) {
                          setRating(userReview.rating);
                          setDifficultyRating(userReview.difficulty_rating || '');
                          setTitle(userReview.title || '');
                          setComment(userReview.comment || '');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No reviews yet. Be the first to review this product!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold">
                        {review.profiles?.username || review.profiles?.full_name || 'Anonymous'}
                      </span>
                      {review.buyer_id === user?.id && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                      {review.difficulty_rating && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            They rated the difficulty:
                          </span>
                          <Badge
                            style={{
                              backgroundColor: getDifficultyColor(review.difficulty_rating).bg,
                              color: getDifficultyColor(review.difficulty_rating).text,
                              borderColor: getDifficultyColor(review.difficulty_rating).bg,
                            }}
                            className="text-xs"
                          >
                            {getDifficultyLabel(review.difficulty_rating)}
                          </Badge>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground">
                        <DateDisplay date={review.created_at} />
                      </span>
                    </div>
                  </div>
                </div>
                {review.title && <h4 className="font-medium mb-2">{review.title}</h4>}
                {review.comment && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
