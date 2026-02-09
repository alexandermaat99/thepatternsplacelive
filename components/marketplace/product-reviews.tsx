'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Send,
  Trash2,
  Edit2,
  Info,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react';
import { useToast } from '@/contexts/toast-context';
import { DateDisplay } from '@/components/date-display';
import { createClient } from '@/lib/supabase/client';
import { DIFFICULTY_LEVELS, getDifficultyLabel, getDifficultyColor } from '@/lib/constants';
import Image from 'next/image';
import { compressImage, validateImageFile } from '@/lib/image-compression';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PATTERN_POINTS } from '@/lib/pattern-points';

interface Review {
  id: string;
  rating: number;
  difficulty_rating: string | null;
  title: string | null;
  comment: string | null;
  images: string[] | null;
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
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Character limits
  const MAX_TITLE_LENGTH = 100;
  const MAX_COMMENT_LENGTH = 2000;

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
              setImages(existingReview.images || []);
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
            .maybeSingle();

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

    // Validate character limits
    if (title.trim().length > MAX_TITLE_LENGTH) {
      showToast(`Review title must be ${MAX_TITLE_LENGTH} characters or less`, 'error');
      return;
    }
    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      showToast(`Review comment must be ${MAX_COMMENT_LENGTH} characters or less`, 'error');
      return;
    }

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
          images: images.length > 0 ? images : null,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 5) {
      showToast('Maximum 5 images allowed per review', 'error');
      return;
    }

    // Validate file types
    const allowedTypes = ['image/heif', 'image/heic', 'image/png', 'image/jpeg', 'image/jpg'];
    const allowedExtensions = ['.heif', '.heic', '.png', '.jpg', '.jpeg'];

    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType =
        allowedTypes.includes(file.type.toLowerCase()) || allowedExtensions.includes(fileExtension);

      if (!isValidType) {
        showToast(
          `Invalid file type. Only ${allowedExtensions.join(', ')} files are allowed.`,
          'error'
        );
        return;
      }
    }

    setUploadingImages(true);

    try {
      const supabase = createClient();
      const newImageUrls: string[] = [];

      for (const file of files) {
        // Additional validation: check file extension
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
          showToast(
            `Invalid file type: ${fileExtension}. Only ${allowedExtensions.join(', ')} files are allowed.`,
            'error'
          );
          continue;
        }

        // Validate file size and other properties
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          showToast(validation.error || 'Invalid image file', 'error');
          continue;
        }

        // Compress image
        let processedFile = file;
        try {
          processedFile = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: false,
          });
        } catch (compressionError) {
          console.warn('Compression failed, using original file:', compressionError);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to review-images bucket
        const { data, error } = await supabase.storage
          .from('review-images')
          .upload(fileName, processedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          showToast(`Failed to upload ${file.name}`, 'error');
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('review-images').getPublicUrl(data.path);

        newImageUrls.push(publicUrl);
      }

      if (newImageUrls.length > 0) {
        setImages([...images, ...newImageUrls]);
        showToast(`${newImageUrls.length} image(s) uploaded successfully`, 'success');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      showToast('Failed to upload images', 'error');
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const openLightbox = (imageUrls: string[], startIndex: number = 0) => {
    setLightboxImages(imageUrls);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setLightboxIndex(prev => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
    } else {
      setLightboxIndex(prev => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
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
      setImages([]);

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
            {!userReview && !isEditing && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    <strong>Earn {PATTERN_POINTS.LEAVE_REVIEW} Pattern Points</strong> for leaving a
                    review!
                  </p>
                </div>
              </div>
            )}
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
                {userReview.images && userReview.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-2">
                    {userReview.images.map((imageUrl, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openLightbox(userReview.images || [], idx)}
                      >
                        <Image
                          src={imageUrl}
                          alt={`Review image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 25vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
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
                    maxLength={MAX_TITLE_LENGTH}
                    className="mt-1"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      {title.length} / {MAX_TITLE_LENGTH} characters
                    </p>
                    {title.length > MAX_TITLE_LENGTH * 0.9 && (
                      <p className="text-xs text-amber-600">
                        {MAX_TITLE_LENGTH - title.length} characters remaining
                      </p>
                    )}
                  </div>
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
                    maxLength={MAX_COMMENT_LENGTH}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-muted-foreground">
                      {comment.length} / {MAX_COMMENT_LENGTH} characters
                    </p>
                    {comment.length > MAX_COMMENT_LENGTH * 0.9 && (
                      <p className="text-xs text-amber-600">
                        {MAX_COMMENT_LENGTH - comment.length} characters remaining
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Images (optional, max 5)</Label>
                  <div className="mt-2">
                    {images.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                        {images.map((imageUrl, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-lg overflow-hidden border group"
                          >
                            <div
                              className="absolute inset-0 cursor-pointer z-0"
                              onClick={() => openLightbox(images, idx)}
                            >
                              <Image
                                src={imageUrl}
                                alt={`Review image ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 33vw, 25vw"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              aria-label="Remove image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {images.length < 5 && (
                      <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          {uploadingImages ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Upload images ({images.length}/5)
                              </span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".heif,.heic,.png,.jpg,.jpeg,image/heif,image/heic,image/png,image/jpeg"
                          multiple
                          onChange={handleImageUpload}
                          disabled={uploadingImages || images.length >= 5}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
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
                          setImages(userReview.images || []);
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
                {review.images && review.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-2">
                    {review.images.map((imageUrl, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openLightbox(review.images || [], idx)}
                      >
                        <Image
                          src={imageUrl}
                          alt={`Review image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 25vw"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95">
          <DialogHeader className="sr-only">
            <DialogTitle>Review Image</DialogTitle>
          </DialogHeader>
          {lightboxImages.length > 0 && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Previous button */}
              {lightboxImages.length > 1 && (
                <button
                  onClick={() => navigateLightbox('prev')}
                  className="absolute left-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {/* Image */}
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <Image
                  src={lightboxImages[lightboxIndex]}
                  alt={`Review image ${lightboxIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>

              {/* Next button */}
              {lightboxImages.length > 1 && (
                <button
                  onClick={() => navigateLightbox('next')}
                  className="absolute right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Image counter */}
              {lightboxImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
