'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';
import { useToast } from '@/contexts/toast-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareButtonProps {
  productId: string;
  productTitle: string;
  productImage?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareButton({
  productId,
  productTitle,
  productImage,
  className,
  variant = 'outline',
  size = 'default',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Check if Web Share API is available (only in browser)
    setHasWebShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const productUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/marketplace/product/${productId}`
      : '';

  const handleShare = async () => {
    // Check if Web Share API is available (mobile browsers)
    if (hasWebShare && navigator.share) {
      try {
        await navigator.share({
          title: productTitle,
          text: `Check out ${productTitle} on The Pattern's Place!`,
          url: productUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback to copy link
          copyToClipboard();
        }
      }
    } else {
      // Fallback to copy link
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy link. Please try again.', 'error');
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out ${productTitle} on The Pattern's Place!`);
    const url = encodeURIComponent(productUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(productUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const shareToPinterest = () => {
    const url = encodeURIComponent(productUrl);
    const description = encodeURIComponent(productTitle);
    const media = productImage ? encodeURIComponent(productImage) : '';
    window.open(
      `https://pinterest.com/pin/create/button/?url=${url}&description=${description}&media=${media}`,
      '_blank'
    );
  };

  // If Web Share API is available, use simple button
  if (hasWebShare) {
    return (
      <Button onClick={handleShare} variant={variant} size={size} className={className}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
    );
  }

  // Otherwise, use dropdown with multiple options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyToClipboard}>
          <Share2 className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareToTwitter}>Share on Twitter</DropdownMenuItem>
        <DropdownMenuItem onClick={shareToFacebook}>Share on Facebook</DropdownMenuItem>
        <DropdownMenuItem onClick={shareToPinterest}>Share on Pinterest</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
