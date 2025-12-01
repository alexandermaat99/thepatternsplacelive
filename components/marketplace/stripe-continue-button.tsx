"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface StripeContinueButtonProps {
  accountId: string;
}

export function StripeContinueButton({ accountId }: StripeContinueButtonProps) {
  const router = useRouter();

  const handleContinueSetup = () => {
    // Navigate to the embedded onboarding page
    router.push("/dashboard/stripe-setup");
  };

  return (
    <Button onClick={handleContinueSetup} className="w-full">
      <RefreshCw className="h-4 w-4 mr-2" />
      Continue Stripe Setup
    </Button>
  );
}

