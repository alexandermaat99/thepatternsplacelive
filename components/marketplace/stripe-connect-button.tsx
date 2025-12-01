"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface StripeConnectButtonProps {
  userId: string;
  forceMigrate?: boolean;
  variant?: "default" | "outline" | "secondary";
  label?: string;
}

export function StripeConnectButton({ 
  userId, 
  forceMigrate = false,
  variant = "default",
  label
}: StripeConnectButtonProps) {
  const router = useRouter();

  const handleConnectStripe = () => {
    // Navigate to the embedded onboarding page
    router.push("/dashboard/stripe-setup");
  };

  const buttonLabel = label || (forceMigrate ? "Upgrade to Express" : "Connect with Stripe");

  return (
    <Button onClick={handleConnectStripe} variant={variant} className="w-full">
      {buttonLabel}
    </Button>
  );
} 