"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize, type StripeConnectInstance } from "@stripe/connect-js";
import { ConnectComponentsProvider, ConnectAccountOnboarding } from "@stripe/react-connect-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Stripe-hosted onboarding; used if the embedded form can't load (e.g. blocked by an extension).
const HOSTED_ONBOARDING_URL = "/api/connect/continue";

async function fetchClientSecret(): Promise<string> {
  const response = await fetch("/api/connect/account-session", {
    method: "POST",
    credentials: "include",
  });

  if (response.status === 401) {
    window.location.assign("/auth/login");
    throw new Error("Not signed in");
  }
  if (!response.ok) {
    throw new Error("Failed to start payout setup");
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

  // Scroll guard. While Stripe's form loads (and right after each step), it
  // resizes and moves focus into its fields, which makes the browser jump the
  // page to the middle of the form. During those windows we hold the page
  // where it was unless the person scrolls or types themselves.
  const guardUntil = useRef(Number.POSITIVE_INFINITY); // on until the form starts
  const heldY = useRef(0);
  const lastUserInput = useRef(0);

  useEffect(() => {
    heldY.current = window.scrollY;
    const markInput = () => {
      lastUserInput.current = Date.now();
    };
    const onScroll = () => {
      const now = Date.now();
      const guarding = now < guardUntil.current && now - lastUserInput.current > 700;
      if (guarding && Math.abs(window.scrollY - heldY.current) > 2) {
        window.scrollTo({ top: heldY.current, behavior: "instant" });
      } else if (!guarding) {
        heldY.current = window.scrollY;
      }
    };
    const opts = { passive: true } as const;
    window.addEventListener("wheel", markInput, opts);
    window.addEventListener("touchstart", markInput, opts);
    window.addEventListener("keydown", markInput, opts);
    window.addEventListener("pointerdown", markInput, opts);
    window.addEventListener("scroll", onScroll, opts);
    return () => {
      window.removeEventListener("wheel", markInput);
      window.removeEventListener("touchstart", markInput);
      window.removeEventListener("keydown", markInput);
      window.removeEventListener("pointerdown", markInput);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // After the form appears or changes step: if its top is hidden under the
  // sticky nav, bring it into view once, then hold that position briefly.
  const settleForm = useCallback(() => {
    const el = containerRef.current;
    let target = window.scrollY;
    if (el && el.getBoundingClientRect().top < 64) {
      target = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 80);
      window.scrollTo({ top: target, behavior: "instant" });
    }
    heldY.current = target;
    guardUntil.current = Date.now() + 2500;
  }, []);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
      setLoadFailed(true);
      return;
    }

    setConnectInstance(
      loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret,
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#0F172A",
            fontFamily: "system-ui, -apple-system, sans-serif",
            borderRadius: "8px",
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
              Taking longer than usual?{" "}
              <a href={HOSTED_ONBOARDING_URL} className="underline underline-offset-4">
                Continue on Stripe&apos;s site
              </a>
            </p>
          )}
        </div>
      )}

      {connectInstance && (
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding
            onLoaderStart={() => {
              setFormStarted(true);
              settleForm();
            }}
            onLoadError={({ error }) => {
              console.error("Stripe onboarding failed to load:", error);
              guardUntil.current = 0;
              setLoadFailed(true);
            }}
            onStepChange={settleForm}
            onExit={() => router.refresh()}
            collectionOptions={{
              fields: "eventually_due",
              futureRequirements: "include",
            }}
          />
        </ConnectComponentsProvider>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-4">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Your details go directly to Stripe, our payments partner, and are encrypted. We never see
        your full SSN or bank account number.
      </p>
    </div>
  );
}
