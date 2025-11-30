'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImageGalleryProps {
  images: string[];
  title: string;
}

export function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square relative overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  const currentImage = images[selectedIndex];
  const hasMultiple = images.length > 1;

  const nextImage = () => {
    setSelectedIndex(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedIndex(prev => (prev - 1 + images.length) % images.length);
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum swipe distance in pixels

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swiped left - go to next image
        nextImage();
      } else {
        // Swiped right - go to previous image
        prevImage();
      }
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div
          className="relative w-full rounded-lg group flex items-center justify-center bg-muted/30 touch-pan-y"
          onTouchStart={hasMultiple ? handleTouchStart : undefined}
          onTouchMove={hasMultiple ? handleTouchMove : undefined}
          onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
        >
          <Image
            src={currentImage}
            alt={title}
            width={800}
            height={800}
            className="object-contain w-full h-auto max-w-full cursor-pointer rounded-lg select-none"
            onClick={openFullscreen}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={selectedIndex === 0}
            style={{ maxHeight: 'none' }}
            draggable={false}
          />

          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
                onClick={e => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
                onClick={e => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {selectedIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Grid */}
        {hasMultiple && images.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                  index === selectedIndex
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-transparent hover:border-primary/50'
                }`}
              >
                <Image
                  src={image}
                  alt={`${title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 25vw, 20vw"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeFullscreen}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-4 sm:top-4 sm:right-4 z-[60] text-white bg-black/60 hover:bg-white/30 h-12 w-12 sm:h-10 sm:w-10 rounded-full shadow-lg"
            onClick={e => {
              e.stopPropagation();
              closeFullscreen();
            }}
          >
            <X className="h-7 w-7 sm:h-6 sm:w-6" />
          </Button>

          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={e => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={e => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          <div
            className="relative w-full h-full max-w-7xl max-h-[90vh] touch-pan-y"
            onTouchStart={hasMultiple ? handleTouchStart : undefined}
            onTouchMove={hasMultiple ? handleTouchMove : undefined}
            onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
          >
            <Image
              src={currentImage}
              alt={title}
              fill
              className="object-contain select-none"
              sizes="100vw"
              onClick={e => e.stopPropagation()}
              draggable={false}
            />
          </div>

          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-2 rounded">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
