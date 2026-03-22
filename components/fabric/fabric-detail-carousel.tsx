'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FabricDetailCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const prevActiveUrlRef = useRef<string | null>(null);
  const n = urls.length;
  const activeUrl = urls[index];

  const prev = useCallback(() => setIndex(i => (i - 1 + n) % n), [n]);
  const next = useCallback(() => setIndex(i => (i + 1) % n), [n]);

  useEffect(() => {
    if (prevActiveUrlRef.current !== null && prevActiveUrlRef.current !== activeUrl) {
      setImageReady(false);
    }
    prevActiveUrlRef.current = activeUrl;
  }, [activeUrl]);

  if (n === 0) return null;

  return (
    <div
      className="relative aspect-[4/5] w-full max-w-xl mx-auto lg:mx-0 rounded-lg border border-border bg-muted overflow-hidden group"
      aria-busy={!imageReady}
    >
      <Image
        key={activeUrl}
        src={activeUrl}
        alt={n > 1 ? `${alt} — photo ${index + 1} of ${n}` : alt}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 50vw"
        quality={85}
        priority
        decoding="async"
        onLoadingComplete={() => setImageReady(true)}
        onError={() => setImageReady(true)}
      />
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
