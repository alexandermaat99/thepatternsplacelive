"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StripeConnectButtonProps {
  userId: string;
}

export function StripeConnectButton({ userId }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connect/onboard", {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start Stripe onboarding');
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (err) {
      console.error('Stripe onboarding error:', err);
      alert(`Failed to start Stripe onboarding: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleConnectStripe} disabled={loading}>
      {loading ? "Redirecting..." : "Connect with Stripe"}
    </Button>
  );
} 