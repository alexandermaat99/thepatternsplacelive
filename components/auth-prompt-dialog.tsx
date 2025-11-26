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
import Link from 'next/link';

interface AuthPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthPromptDialog({ isOpen, onClose }: AuthPromptDialogProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

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
              className="h-10 w-auto"
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
            asChild
            className="w-full"
          >
            <Link href={`/auth/sign-up?redirect=${encodeURIComponent(currentPath)}`} onClick={onClose}>
              Sign Up
            </Link>
          </Button>
          <Button 
            asChild
            variant="secondary"
            className="w-full"
          >
            <Link href={`/auth/login?redirect=${encodeURIComponent(currentPath)}`} onClick={onClose}>
              Sign In
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

