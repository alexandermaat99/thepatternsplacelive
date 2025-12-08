'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { Download, Mail } from 'lucide-react';

interface FreeDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
}

export function FreeDownloadDialog({
  isOpen,
  onClose,
  productId,
  productTitle,
}: FreeDownloadDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const handleAuthenticatedDownload = async () => {
    setIsDownloading(true);

    try {
      const response = await fetch('/api/checkout/free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download free pattern');
      }

      showToast('Free pattern downloaded! Check your email for the files.', 'success');

      // Redirect to success page
      setTimeout(() => {
        router.push(`/marketplace/success?order_id=${data.orderId}`);
      }, 1000);
    } catch (error) {
      console.error('Free download error:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to download free pattern. Please try again.',
        'error'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogin = () => {
    onClose();
    openAuthModal('login', {
      redirectUrl: pathname || `/marketplace/product/${productId}`,
    });
  };

  const handleSignUp = () => {
    onClose();
    openAuthModal('signup', {
      redirectUrl: pathname || `/marketplace/product/${productId}`,
    });
  };

  // If user becomes authenticated while dialog is open, trigger download
  useEffect(() => {
    if (user && isOpen && !isGuestMode) {
      // User just logged in, close dialog and trigger download
      onClose();
      handleAuthenticatedDownload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen, isGuestMode]);

  const handleGuestDownload = async () => {
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch('/api/checkout/free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download free pattern');
      }

      showToast('Free pattern downloaded! Check your email for the files.', 'success');
      onClose();
      setEmail('');
      setIsGuestMode(false);

      // Redirect to success page
      setTimeout(() => {
        router.push(`/marketplace/success?order_id=${data.orderId}`);
      }, 1000);
    } catch (error) {
      console.error('Free download error:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to download free pattern. Please try again.',
        'error'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Free Pattern</DialogTitle>
          <DialogDescription>
            {productTitle}
            <br />
            <span className="text-sm text-muted-foreground mt-1 block">
              Choose how you'd like to download this free pattern
            </span>
          </DialogDescription>
        </DialogHeader>

        {!isGuestMode ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Button onClick={handleLogin} className="w-full" variant="default">
                Sign In
              </Button>
              <Button onClick={handleSignUp} className="w-full" variant="outline">
                Create Account
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button onClick={() => setIsGuestMode(true)} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download as Guest
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email Address</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleGuestDownload();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                We'll send the pattern files to this email address
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsGuestMode(false);
                  setEmail('');
                }}
                variant="outline"
                className="flex-1"
                disabled={isDownloading}
              >
                Back
              </Button>
              <Button
                onClick={handleGuestDownload}
                className="flex-1"
                disabled={isDownloading || !email || !email.includes('@')}
              >
                {isDownloading ? (
                  'Downloading...'
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-start">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
