'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

interface AuthPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthPromptDialog({ isOpen, onClose }: AuthPromptDialogProps) {
  const { openAuthModal } = useAuth();

  const handleSignUp = () => {
    onClose();
    openAuthModal('signup', { action: 'heart' });
  };

  const handleSignIn = () => {
    onClose();
    openAuthModal('login', { action: 'heart' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader className="space-y-4 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-2">
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
          </div>
          
          {/* Dialog Title - required for accessibility */}
          <DialogTitle className="sr-only">
            Sign in or sign up to save favorites
          </DialogTitle>
          
          {/* Friendly message */}
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground leading-relaxed">
              Yay! You found something you like.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign up or sign in so you can keep track of your favorite patterns!
            </p>
          </div>
        </DialogHeader>
        
        <DialogFooter className="!flex-col sm:!flex-col gap-3 pt-4 sm:space-x-0">
          <Button 
            className="w-full"
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
          <Button 
            variant="secondary"
            className="w-full"
            onClick={handleSignIn}
          >
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
