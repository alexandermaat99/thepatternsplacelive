import { redirect } from "next/navigation";
import { StripeEmbeddedOnboarding } from "@/components/marketplace/stripe-embedded-onboarding";
import { getCurrentUserWithProfileServer, getStripeAccountStatusServer } from "@/lib/auth-helpers-server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default async function StripeSetupPage() {
  const authData = await getCurrentUserWithProfileServer();

  if (!authData || !authData.user) {
    redirect("/auth/login");
  }

  const { profile } = authData;

  // Check if already fully onboarded
  if (profile?.stripe_account_id) {
    const stripeStatus = await getStripeAccountStatusServer(profile.stripe_account_id);
    
    if (stripeStatus.isOnboarded) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
              You&apos;re All Set!
            </h1>
            <p className="text-green-700 dark:text-green-300 mb-4">
              Your Stripe account is fully connected and ready to receive payments.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/marketplace/sell">
                <Button>List a Product</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 max-w-2xl mx-auto">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <StripeEmbeddedOnboarding />
    </div>
  );
}

