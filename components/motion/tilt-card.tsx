'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A card that tilts in 3D toward the mouse, with a soft glare that follows the
 * cursor. Children can float above it with `[transform:translateZ(..px)]`.
 * Mouse only (no tilt on touch), and off for "reduce motion".
 */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
  glare = true,
  idle = false,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  /** Drift gently on its own (bigger sweep on load) so people notice it's interactive. */
  idle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const reduced = useRef(false);
  const hovering = useRef(false);
  const resumedAt = useRef(0);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  // Idle drift: a decaying sweep on load, then a slow float. Paused while the
  // mouse is over the card or the card is off screen.
  useEffect(() => {
    const el = ref.current;
    if (!idle || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf: number | null = null;
    const start = performance.now();
    resumedAt.current = start;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (hovering.current) return;
      const t = (now - start) / 1000;
      const amp = 2.5 + 5 * Math.exp(-t / 1.4); // big hello, settles to a gentle float
      const blend = Math.min(1, (now - resumedAt.current) / 900); // ease back in after hover
      const rx = blend * amp * Math.sin(t * 1.3);
      const ry = blend * amp * 1.4 * Math.sin(t * 0.9 + 0.8);
      el.style.setProperty('--rx', `${rx}deg`);
      el.style.setProperty('--ry', `${ry}deg`);
      el.style.setProperty('--mx', `${50 + ry * 5}%`);
      el.style.setProperty('--my', `${50 - rx * 5}%`);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && raf === null) {
        el.dataset.idle = 'true';
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
      delete el.dataset.idle;
    };
  }, [idle]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || reduced.current || !ref.current) return;
    const el = ref.current;
    hovering.current = true;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(0.5 - y) * maxTilt * 2}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * maxTilt * 2}deg`);
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
      el.dataset.active = 'true';
    });
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    hovering.current = false;
    resumedAt.current = performance.now();
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    delete el.dataset.active;
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn('tilt-card group/tilt relative', className)}
    >
      {children}
      {glare && (
        <div
          aria-hidden
          className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      )}
    </div>
  );
}
