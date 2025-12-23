'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Award } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'check-email' | 'signup-success';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: AuthView;
  action?: string | null;
  redirectUrl?: string | null;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultView = 'login',
  action,
  redirectUrl,
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(defaultView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setView(defaultView);
      setEmail('');
      setPassword('');
      setRepeatPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, defaultView]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data?.session) {
        throw new Error('Login failed - no session created');
      }

      // Session is created, close modal and refresh
      // We skip getUser() verification to avoid hanging
      // The router refresh will verify the session properly

      // Set a flag to indicate we just logged in (prevents auth modal from opening immediately)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_logged_in', 'true');
      }

      onClose();

      // Refresh router to sync server-side state
      router.refresh();

      // Navigate if there's a redirect URL
      if (redirectUrl) {
        const decodedRedirect = decodeURIComponent(redirectUrl);
        if (
          decodedRedirect.startsWith('/') &&
          !decodedRedirect.startsWith('//') &&
          !decodedRedirect.includes(':')
        ) {
          window.location.href = decodedRedirect;
        }
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      setError(
        error instanceof Error ? error.message : 'An error occurred during login. Please try again.'
      );
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) {
        throw error;
      }

      // Supabase quirk: if the user already exists, `error` can be null but
      // `data.user.identities` is an empty array. Treat that as "already registered".
      if (data?.user && Array.isArray((data.user as any).identities)) {
        const identities = (data.user as any).identities as unknown[];
        if (identities.length === 0) {
          setError(
            "There's already an account with this email address. Try signing in instead or reset your password."
          );
          setIsLoading(false);
          return;
        }
      }

      // Show success view
      setView('signup-success');
    } catch (error: unknown) {
      // Provide a clearer message when the email is already in use
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (
          message.includes('already registered') ||
          message.includes('already exists') ||
          message.includes('user already')
        ) {
          setError(
            "There's already an account with this email address. Try signing in instead or reset your password."
          );
        } else {
          setError(error.message || 'An error occurred');
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setView('check-email');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getDescription = () => {
    if (action === 'heart') {
      return 'Yay! You found something you like. Sign in so you can keep track of your favorite patterns!';
    }
    if (view === 'login') {
      return 'Enter your email below to sign in to your account';
    }
    if (view === 'signup') {
      return 'Create a new account to start exploring patterns';
    }
    if (view === 'forgot-password') {
      return "Type in your email and we'll send you a link to reset your password";
    }
    return '';
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <button
            type="button"
            onClick={() => setView('forgot-password')}
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setView('signup');
          }}
          className="text-primary font-medium hover:underline underline-offset-4"
        >
          Sign up
        </button>
      </p>
    </form>
  );

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Enter a strong password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-repeat-password">Confirm Password</Label>
        <Input
          id="signup-repeat-password"
          type="password"
          placeholder="Re-enter your password"
          required
          value={repeatPassword}
          onChange={e => setRepeatPassword(e.target.value)}
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
      <div className="flex justify-center pt-1">
        <Badge className="bg-rose-300 hover:bg-rose-300 text-white border-0">
          <Award className="h-3 w-3 mr-1" />
          Get 20 Pattern Points when you sign up!
        </Badge>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setView('login');
          }}
          className="text-primary font-medium hover:underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-md">{error}</p>
      )}
      <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setView('login');
          }}
          className="text-primary font-medium hover:underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </form>
  );

  const renderCheckEmail = () => (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Check Your Email</h3>
        <p className="text-sm text-muted-foreground">
          If you registered using your email and password, you will receive a password reset email.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          setEmail('');
          setView('login');
        }}
        className="mt-4"
      >
        Back to Sign In
      </Button>
    </div>
  );

  const renderSignUpSuccess = () => (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Check Your Email</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you a confirmation email. Please check your inbox and click the link to
          verify your account.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          setEmail('');
          setPassword('');
          setRepeatPassword('');
          setView('login');
        }}
        className="mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-300"
      >
        Back to Sign In
      </Button>
    </div>
  );

  const getTitle = () => {
    switch (view) {
      case 'login':
        return 'Welcome Back!';
      case 'signup':
        return "Join The Pattern's Place";
      case 'forgot-password':
        return 'Reset Your Password';
      case 'check-email':
        return 'Email Sent';
      case 'signup-success':
        return 'Almost There!';
      default:
        return '';
    }
  };

  const showBackButton = view === 'forgot-password';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden focus-visible:outline-none focus-visible:ring-0">
        {/* Header with logo */}
        <div className="relative p-6 pb-4 border-b bg-muted/30">
          {showBackButton && (
            <button
              onClick={() => setView('login')}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex justify-center">
            <img
              src="/logos/back_logo.svg"
              alt="The Patterns Place"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/logos/back_logo_light.svg"
              alt="The Patterns Place"
              className="h-8 w-auto hidden dark:block"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-xl font-semibold">{getTitle()}</DialogTitle>
            {(view === 'login' || view === 'signup' || view === 'forgot-password') && (
              <DialogDescription className="text-muted-foreground mt-2">
                {getDescription()}
              </DialogDescription>
            )}
          </DialogHeader>

          {view === 'login' && renderLoginForm()}
          {view === 'signup' && renderSignUpForm()}
          {view === 'forgot-password' && renderForgotPasswordForm()}
          {view === 'check-email' && renderCheckEmail()}
          {view === 'signup-success' && renderSignUpSuccess()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
