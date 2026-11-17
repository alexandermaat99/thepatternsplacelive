'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * A card that tilts in 3D toward the mouse, with a soft glare that follows the
 * cursor. Children can float above it with `[transform:translateZ(..px)]`.
 *
 * All motion runs through one animation loop that eases the tilt toward its
 * target every frame, so entering, moving, leaving and the idle drift all
 * blend smoothly instead of snapping. Mouse tracking happens on an outer box
 * that never tilts, so the card's moving edge can't flicker in and out under
 * the cursor. Mouse only (no tilt on touch), and off for "reduce motion".
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
  const outerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Where the mouse is over the card (0..1), or null when it isn't.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    const outer = outerRef.current;
    const card = cardRef.current;
    if (!outer || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cur = { rx: 0, ry: 0, mx: 50, my: 50, glare: 0 };
    const start = performance.now();
    let last = start;
    let raf: number | null = null;
    let visible = true;

    const apply = () => {
      card.style.setProperty('--rx', `${cur.rx.toFixed(3)}deg`);
      card.style.setProperty('--ry', `${cur.ry.toFixed(3)}deg`);
      card.style.setProperty('--mx', `${cur.mx.toFixed(2)}%`);
      card.style.setProperty('--my', `${cur.my.toFixed(2)}%`);
      card.style.setProperty('--glare', cur.glare.toFixed(3));
    };

    const tick = (now: number) => {
      raf = null;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = pointer.current;

      let target: typeof cur;
      if (p) {
        target = {
          rx: (0.5 - p.y) * maxTilt * 2,
          ry: (p.x - 0.5) * maxTilt * 2,
          mx: p.x * 100,
          my: p.y * 100,
          glare: 1,
        };
      } else if (idle) {
        const t = (now - start) / 1000;
        const amp = 2.5 + 5 * Math.exp(-t / 1.4); // big hello, settles to a gentle float
        const rx = amp * Math.sin(t * 1.3);
        const ry = amp * 1.4 * Math.sin(t * 0.9 + 0.8);
        target = { rx, ry, mx: 50 + ry * 5, my: 50 - rx * 5, glare: 0.6 };
      } else {
        target = { rx: 0, ry: 0, mx: 50, my: 50, glare: 0 };
      }

      // Follow the mouse quickly; drift back slowly and softly when it leaves.
      const tau = p ? 0.12 : 0.6;
      const k = 1 - Math.exp(-dt / tau);
      let moving = false;
      for (const key of Object.keys(cur) as (keyof typeof cur)[]) {
        cur[key] += (target[key] - cur[key]) * k;
        if (Math.abs(target[key] - cur[key]) > 0.01) moving = true;
      }
      apply();

      if (visible && (p || idle || moving)) raf = requestAnimationFrame(tick);
    };

    const run = () => {
      if (raf === null && visible) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    wake.current = run;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run();
      else if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
    observer.observe(outer);
    run();

    return () => {
      observer.disconnect();
      if (raf !== null) cancelAnimationFrame(raf);
      wake.current = () => {};
    };
  }, [idle, maxTilt]);

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !outerRef.current) return;
    const rect = outerRef.current.getBoundingClientRect();
    pointer.current = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
    wake.current();
  };

  const leave = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore "leave" events fired while the cursor is still within the
    // card's footprint (can happen as the tilted card moves under it).
    const rect = outerRef.current?.getBoundingClientRect();
    if (
      rect &&
      e.clientX > rect.left &&
      e.clientX < rect.right &&
      e.clientY > rect.top &&
      e.clientY < rect.bottom
    ) {
      return;
    }
    pointer.current = null;
    wake.current();
  };

  return (
    <div
      ref={outerRef}
      onPointerMove={track}
      onPointerEnter={track}
      onPointerLeave={leave}
      className={cn('group/tilt', className)}
    >
      <div ref={cardRef} className="tilt-card relative h-full rounded-[inherit]">
        {children}
        {glare && (
          <div
            aria-hidden
            className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit]"
          />
        )}
      </div>
    </div>
  );
}
