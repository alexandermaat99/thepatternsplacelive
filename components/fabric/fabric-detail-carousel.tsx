'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Indices to keep in the DOM so prev/next slides are often already cached (retail-style carousel behavior). */
function neighborIndices(center: number, count: number): number[] {
  if (count <= 1) return [center];
  const next = (center + 1) % count;
  const prev = (center - 1 + count) % count;
  return [...new Set([center, next, prev])];
}

export function FabricDetailCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const prevActiveUrlRef = useRef<string | null>(null);
  const loadedUrlsRef = useRef<Set<string>>(new Set());
  const n = urls.length;
  const activeUrl = urls[index];
  const preloadIndices = useMemo(() => neighborIndices(index, n), [index, n]);

  const prev = useCallback(() => setIndex(i => (i - 1 + n) % n), [n]);
  const next = useCallback(() => setIndex(i => (i + 1) % n), [n]);

  useEffect(() => {
    if (prevActiveUrlRef.current !== null && prevActiveUrlRef.current !== activeUrl) {
      if (loadedUrlsRef.current.has(activeUrl)) {
        setImageReady(true);
      } else {
        setImageReady(false);
      }
    }
    prevActiveUrlRef.current = activeUrl;
  }, [activeUrl]);

  if (n === 0) return null;

  return (
    <div
      className="relative aspect-[4/5] w-full max-w-xl mx-auto lg:mx-0 rounded-lg border border-border bg-muted overflow-hidden group"
      aria-busy={!imageReady}
    >
      {preloadIndices.map(i => {
        const isActive = i === index;
        return (
          <Image
            key={urls[i]}
            src={urls[i]}
            alt={isActive ? (n > 1 ? `${alt} — photo ${i + 1} of ${n}` : alt) : ''}
            fill
            className={cn(
              'object-cover transition-opacity duration-200 absolute inset-0',
              isActive ? 'z-[1] opacity-100' : 'pointer-events-none z-0 opacity-0'
            )}
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={85}
            priority={i === 0}
            decoding="async"
            aria-hidden={!isActive}
            onLoadingComplete={() => {
              loadedUrlsRef.current.add(urls[i]);
              if (i === index) setImageReady(true);
            }}
            onError={() => {
              loadedUrlsRef.current.add(urls[i]);
              if (i === index) setImageReady(true);
            }}
          />
        );
      })}
      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/70 backdrop-blur-[1px] transition-opacity duration-200',
          imageReady ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
        aria-hidden={imageReady}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">Loading photo…</span>
      </div>
      {n > 1 ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md opacity-90 hover:opacity-100"
            onClick={prev}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md opacity-90 hover:opacity-100"
            onClick={next}
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div
            className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5"
            role="tablist"
            aria-label="Photo indicators"
          >
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index ? 'bg-background' : 'bg-background/50'
                }`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
