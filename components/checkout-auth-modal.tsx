'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/contexts/auth-context';
import { User } from 'lucide-react';
import Image from 'next/image';

interface CheckoutAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestCheckout: () => void;
  onLoginSuccess: () => void;
}

export function CheckoutAuthModal({
  isOpen,
  onClose,
  onGuestCheckout,
  onLoginSuccess,
}: CheckoutAuthModalProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [wasLoggedOut, setWasLoggedOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track if user was logged out when checkout modal opened
  useEffect(() => {
    if (isOpen && !user && !authLoading) {
      setWasLoggedOut(true);
    }
  }, [isOpen, user, authLoading]);

  // Check for successful login via sessionStorage flag (set by AuthModal)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLoginSuccess = () => {
      const justLoggedIn = sessionStorage.getItem('just_logged_in');
      if (justLoggedIn === 'true' && isOpen && wasLoggedOut && user && !authLoading) {
        // Clear the flag
        sessionStorage.removeItem('just_logged_in');
        // Close login modal if still open
        if (showLoginModal) {
          setShowLoginModal(false);
        }
        // Close checkout auth modal
        onClose();
        // Proceed to checkout
        setTimeout(() => {
          onLoginSuccess();
          setWasLoggedOut(false);
        }, 200);
      }
    };

    // Check immediately
    checkLoginSuccess();

    // Also check periodically while login modal is open
    let intervalId: NodeJS.Timeout | null = null;
    if (showLoginModal && wasLoggedOut && !user) {
      intervalId = setInterval(checkLoginSuccess, 200);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, isOpen, showLoginModal, wasLoggedOut, authLoading, onClose, onLoginSuccess]);

  const handleLoginClick = () => {
    setShowLoginModal(true);
    if (!user) {
      setWasLoggedOut(true);
    }
  };

  const handleLoginModalClose = () => {
    setShowLoginModal(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              {mounted && (
                <>
                  <Image
                    src="/logos/back_logo.svg"
                    alt="The Patterns Place"
                    width={120}
                    height={40}
                    className="h-10 w-auto dark:hidden"
                  />
                  <Image
                    src="/logos/back_logo_light.svg"
                    alt="The Patterns Place"
                    width={120}
                    height={40}
                    className="h-10 w-auto hidden dark:block"
                  />
                </>
              )}
            </div>
            <DialogTitle className="text-2xl text-center">Sign in to Checkout</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Sign in to your account to keep track of your{' '}
              <span className="font-bold text-rose-300">patterns</span>,
              <span className="font-bold text-rose-300"> leave reviews</span>, and collect{' '}
              <span className="font-bold text-rose-300">pattern points</span>!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button onClick={handleLoginClick} className="w-full" size="lg">
              <User className="h-5 w-5 mr-2" />
              Sign In to Checkout
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button onClick={onGuestCheckout} variant="outline" className="w-full" size="lg">
              Continue as Guest
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Guest checkout allows you to complete your purchase without creating an account.
              You&apos;ll receive your order confirmation via email.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={showLoginModal}
        onClose={handleLoginModalClose}
        defaultView="login"
        action="checkout"
      />
    </>
  );
}
