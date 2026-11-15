'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js';
import { ConnectComponentsProvider, ConnectAccountOnboarding } from '@stripe/react-connect-js';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Stripe-hosted onboarding; used if the embedded form can't load (e.g. blocked by an extension).
const HOSTED_ONBOARDING_URL = '/api/connect/continue';

async function fetchClientSecret(): Promise<string> {
  const response = await fetch('/api/connect/account-session', {
    method: 'POST',
    credentials: 'include',
  });

  if (response.status === 401) {
    window.location.assign('/auth/login');
    throw new Error('Not signed in');
  }
  if (!response.ok) {
    throw new Error('Failed to start payout setup');
  }

  const { clientSecret } = await response.json();
  return clientSecret;
}

export function StripeEmbeddedOnboarding() {
  const router = useRouter();
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [formStarted, setFormStarted] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [slowToLoad, setSlowToLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  // While Stripe's form loads it flips through interim screens (a spinner,
  // a "Privacy & Terms" box, an "Onboard with Link" screen it focuses into,
  // then the real form). Each one resizes the form and can scroll the page.
  // There's no "done loading" signal, so: until the person first scrolls,
  // types or clicks (and for 20s at most), after every big resize bring the
  // form's top back into view if it's hidden. Their first scroll turns this
  // off for good; we never undo their own scrolling.
  const [following, setFollowing] = useState(true);
  const lastBigResize = useRef(0);
  const ignoreScrollUntil = useRef(0);

  useEffect(() => {
    const stop = () => setFollowing(false);
    const opts = { passive: true, once: true } as const;
    window.addEventListener('wheel', stop, opts);
    window.addEventListener('touchmove', stop, opts);
    window.addEventListener('keydown', stop, opts);
    window.addEventListener('pointerdown', stop, opts);
    // Scrolling over Stripe's form doesn't reach our page as wheel/touch
    // events, so also watch the page scroll itself: Stripe's jumps happen
    // right as its form resizes; any other scroll is the person's own.
    const onScroll = () => {
      const now = Date.now();
      if (now < ignoreScrollUntil.current) return; // our own correction
      if (now - lastBigResize.current > 700) stop();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stop);
      window.removeEventListener('pointerdown', stop);
    };
  }, []);

  useEffect(() => {
    if (!formStarted || !following) return;
    const el = formRef.current;
    let lastHeight = el?.offsetHeight ?? 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bringTopIntoView = () => {
      const box = containerRef.current;
      if (box && box.getBoundingClientRect().top < 64) {
        ignoreScrollUntil.current = Date.now() + 150;
        window.scrollTo({
          top: Math.max(0, window.scrollY + box.getBoundingClientRect().top - 80),
          behavior: 'instant',
        });
      }
    };
    const observer = el
      ? new ResizeObserver(([entry]) => {
          const height = entry.contentRect.height;
          if (Math.abs(height - lastHeight) < 120) return; // small changes (errors, typing) don't count
          lastHeight = height;
          lastBigResize.current = Date.now();
          clearTimeout(timer);
          // Let Stripe finish moving focus first, then correct once.
          timer = setTimeout(bringTopIntoView, 350);
        })
      : null;
    if (el && observer) observer.observe(el);
    const stopAfter = setTimeout(() => setFollowing(false), 20000);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
      clearTimeout(stopAfter);
    };
  }, [formStarted, following]);

  // Stripe's form changes height and moves focus as the seller goes through
  // steps, which can leave the page scrolled to the bottom of the form. After
  // each step, bring the top of the form back into view (below the sticky nav).
  const scrollFormToTop = useCallback(() => {
    setTimeout(() => {
      const el = containerRef.current;
      if (el && el.getBoundingClientRect().top < 64) {
        el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 150);
  }, []);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      setLoadFailed(true);
      return;
    }

    setConnectInstance(
      loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#0F172A',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '8px',
          },
        },
      })
    );
  }, []);

  // If nothing has rendered after a while (ad blockers can silently block
  // Stripe's script), offer the hosted page as a quiet alternative.
  useEffect(() => {
    if (formStarted) return;
    const timer = setTimeout(() => setSlowToLoad(true), 10000);
    return () => clearTimeout(timer);
  }, [formStarted]);

  if (loadFailed) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          The setup form couldn&apos;t load in this browser. You can finish on Stripe&apos;s secure
          site instead. You&apos;ll come right back here when you&apos;re done.
        </p>
        <Button asChild size="lg">
          <a href={HOSTED_ONBOARDING_URL}>Continue to Stripe</a>
        </Button>
      </div>
    );
  }

  return (
    // overflow-anchor: none stops the browser from "anchoring" to content below
    // the form and pushing the page down while the form grows.
    <div ref={containerRef} className="space-y-4 scroll-mt-20 [overflow-anchor:none]">
      {!formStarted && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          {slowToLoad && (
            <p className="text-sm">
              Taking longer than usual?{' '}
              <a href={HOSTED_ONBOARDING_URL} className="underline underline-offset-4">
                Continue on Stripe&apos;s site
              </a>
            </p>
          )}
        </div>
      )}

      {connectInstance && (
        <div style={formStarted && following ? { minHeight: 560 } : undefined}>
          <div ref={formRef}>
            <ConnectComponentsProvider connectInstance={connectInstance}>
              <ConnectAccountOnboarding
                onLoaderStart={() => setFormStarted(true)}
                onLoadError={({ error }) => {
                  console.error('Stripe onboarding failed to load:', error);
                  setLoadFailed(true);
                }}
                onStepChange={scrollFormToTop}
                onExit={() => router.refresh()}
                collectionOptions={{
                  fields: 'eventually_due',
                  futureRequirements: 'include',
                }}
              />
            </ConnectComponentsProvider>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-4">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Your details go directly to Stripe, our payments partner, and are encrypted. We never see
        your full SSN or bank account number.
      </p>
    </div>
  );
}
