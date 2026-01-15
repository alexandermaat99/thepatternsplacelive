"use client";

import { useState, useCallback, useEffect } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectTaxSettings,
} from "@stripe/react-connect-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, SkipForward } from "lucide-react";

interface StripeEmbeddedOnboardingProps {
  onComplete?: () => void;
  onExit?: () => void;
}

type OnboardingStep = "account" | "tax" | "complete";

export function StripeEmbeddedOnboarding({ onComplete, onExit }: StripeEmbeddedOnboardingProps) {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("account");
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Fetch the client secret from our API
  const fetchClientSecret = useCallback(async () => {
    try {
      const response = await fetch("/api/connect/account-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || "Failed to create account session";
        
        // Don't retry on 401 - it's an authentication issue, not a transient error
        if (response.status === 401) {
          const authError = new Error(errorMessage);
          // Mark as auth error so we can handle it differently
          (authError as any).isAuthError = true;
          setError("You must be logged in to set up your Stripe account. Please log in and try again.");
          setLoading(false);
          throw authError;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.accountId) {
        setAccountId(data.accountId);
      }
      return data.clientSecret;
    } catch (err: any) {
      // Re-throw auth errors to stop retry loop
      if (err.isAuthError) {
        throw err;
      }
      // For other errors, throw to allow retry logic
      throw err;
    }
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch account ID immediately so fallback button is always enabled
  useEffect(() => {
    const fetchAccountId = async () => {
      try {
        const response = await fetch("/api/connect/account-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accountId) {
            setAccountId(data.accountId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch account ID:", err);
        // Don't set error state - let the component continue trying to load
      }
    };

    // Only fetch if we don't have accountId yet
    if (!accountId) {
      fetchAccountId();
    }
  }, [accountId]);

  // Listen for script loading errors (especially Connect.js)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Connect.js') || 
          event.message?.includes('connect-js.stripe.com') ||
          event.filename?.includes('connect-js.stripe.com')) {
        console.error('Detected Connect.js loading error:', event);
        setOnboardingError("The Stripe setup form failed to load. Please use the button below to continue setup in a new window.");
        setLoading(false);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason?.toString() || '';
      if (reason.includes('Connect.js') || reason.includes('Failed to load')) {
        console.error('Detected Connect.js promise rejection:', event.reason);
        setOnboardingError("The Stripe setup form failed to load. Please use the button below to continue setup in a new window.");
        setLoading(false);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);


  // Initialize Stripe Connect on mount
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const initStripeConnect = async () => {
      try {
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        
        if (!publishableKey) {
          throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable");
        }

        // Set timeout to detect if Connect.js fails to load
        timeoutId = setTimeout(() => {
          if (mounted && loading && !stripeConnectInstance) {
            console.warn("Stripe Connect.js taking too long to load, showing fallback");
            setOnboardingError("The embedded form is taking too long to load. This may be due to browser security settings. Please use the button below to continue setup in a new window.");
            setLoading(false);
          }
        }, 5000); // 5 second timeout - faster detection

        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance: {
            overlays: "dialog",
            variables: {
              colorPrimary: "#0F172A",
              colorBackground: "#ffffff",
              colorText: "#1e293b",
              colorDanger: "#ef4444",
              fontFamily: "system-ui, -apple-system, sans-serif",
              borderRadius: "8px",
              spacingUnit: "4px",
            },
          },
        });

        if (mounted) {
          clearTimeout(timeoutId);
          setStripeConnectInstance(instance);
          setLoading(false);
          
          // Scroll to top after Stripe loads
          setTimeout(() => window.scrollTo(0, 0), 100);
        }
      } catch (err: any) {
        console.error("Error initializing Stripe Connect:", err);
        if (mounted) {
          clearTimeout(timeoutId);
          const errorMsg = err.message || "Failed to initialize onboarding";
          setError(errorMsg);
          setOnboardingError("The embedded form failed to load. Please use the button below to continue setup in a new window.");
          setLoading(false);
        }
      }
    };

    initStripeConnect();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchClientSecret]);

  const handleAccountOnboardingExit = () => {
    console.log("Account onboarding complete, moving to tax setup");
    setCurrentStep("tax");
    window.scrollTo(0, 0);
  };


  const handleUseAccountLink = async () => {
    if (!accountId) {
      setError("Account ID not available. Please refresh the page.");
      return;
    }

    try {
      const response = await fetch("/api/connect/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account link");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setOnboardingError(err.message || "Failed to open Stripe setup");
    }
  };

  const handleSkipTax = () => {
    console.log("User skipped tax setup");
    setCurrentStep("complete");
    window.scrollTo(0, 0);
  };

  const handleTaxComplete = () => {
    console.log("Tax setup complete");
    setCurrentStep("complete");
    window.scrollTo(0, 0);
  };

  const handleGoToDashboard = () => {
    onComplete?.();
    window.location.href = "/dashboard";
  };

  const handleExit = () => {
    onExit?.();
    window.location.href = "/dashboard";
  };

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Onboarding Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading || !stripeConnectInstance) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Complete Your Seller Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading onboarding form...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        currentStep === "account" 
          ? "bg-primary text-primary-foreground" 
          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      }`}>
        {currentStep !== "account" && <CheckCircle className="h-4 w-4" />}
        <span>1. Account Setup</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        currentStep === "tax" 
          ? "bg-primary text-primary-foreground" 
          : currentStep === "complete"
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-muted text-muted-foreground"
      }`}>
        {currentStep === "complete" && <CheckCircle className="h-4 w-4" />}
        <span>2. Tax Settings</span>
      </div>
    </div>
  );

  // Account Onboarding Step
  if (currentStep === "account") {
    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator />
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Seller Setup</CardTitle>
            <CardDescription>
              Fill out the form below to set up your payment account. This includes your personal info, 
              tax details (SSN or EIN), and bank account for payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                Important: Verification may require multiple steps
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                For security and regulatory compliance, Stripe may request additional verification 
                (such as your full SSN or a photo of your ID) after your initial submission. 
                This is standard for all payment platforms and typically only takes a few minutes to complete.
              </p>
            </div>
            
            {/* Always show the form container, but show fallback if error or timeout */}
            <div id="stripe-onboarding-container" className="min-h-[400px]">
              {onboardingError ? (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Embedded Form Failed to Load
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                        {onboardingError}
                      </p>
                      <Button onClick={handleUseAccountLink} className="w-full" size="lg" disabled={!accountId}>
                        Continue Setup in New Window
                      </Button>
                      {!accountId && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                          Creating your account... This may take a moment. If the button stays disabled, please refresh the page.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : stripeConnectInstance ? (
                <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                  <ConnectAccountOnboarding
                    onExit={handleAccountOnboardingExit}
                    collectionOptions={{
                      fields: "eventually_due",
                      futureRequirements: "include",
                    }}
                  />
                </ConnectComponentsProvider>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Loading setup form...
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    If this takes too long, use the button below to continue in a new window.
                  </p>
                  <Button 
                    onClick={handleUseAccountLink} 
                    variant="default" 
                    className="w-full"
                    disabled={!accountId}
                    size="lg"
                  >
                    Continue Setup in New Window Instead
                  </Button>
                  {!accountId && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Creating your account...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Always show fallback option prominently - visible even when form is loading */}
            {!onboardingError && (
              <div className="mt-6 pt-6 border-t">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Alternative: Continue Setup in New Window
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                    If the embedded form above doesn&apos;t work, click the button below to complete your setup in a new window.
                  </p>
                  <Button 
                    onClick={handleUseAccountLink} 
                    variant="default" 
                    className="w-full"
                    disabled={!accountId}
                    size="lg"
                  >
                    Continue Setup in New Window
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tax Settings Step
  if (currentStep === "tax") {
    return (
      <div className="max-w-2xl mx-auto">
        <StepIndicator />
        <Card>
          <CardHeader>
            <CardTitle>Tax Collection Settings</CardTitle>
            <CardDescription>
              Optionally configure Stripe Tax to automatically calculate and collect sales tax on your products.
              This is recommended if you sell to customers in multiple states or countries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <ConnectTaxSettings 
                onTaxSettingsUpdated={handleTaxComplete}
              />
            </ConnectComponentsProvider>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleTaxComplete} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue
              </Button>
              <Button variant="outline" onClick={handleSkipTax}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip for Now
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              You can always configure tax settings later from your Stripe dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete Step
  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Setup Submitted!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your information has been submitted to Stripe for verification.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">What happens next?</h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Stripe will review your information (usually takes a few minutes)</li>
              <li>• You may be asked for additional verification (full SSN, photo ID)</li>
              <li>• Check your dashboard for status updates</li>
              <li>• Once fully verified, you can start selling!</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handleGoToDashboard} className="flex-1">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
