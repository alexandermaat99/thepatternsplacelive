'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const MAX_MESSAGE_LENGTH = 2000;

export function FeedbackBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      return;
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          page_url: typeof window !== 'undefined' ? window.location.href : null,
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
        }),
      });

      let data: any = {};
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        data = { error: `Server error (${response.status})` };
      }

      if (!response.ok) {
        const errorMsg = data.error || `Failed to submit feedback (${response.status})`;
        console.error('Feedback API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          data,
        });
        // Show user-friendly error message
        if (response.status === 429 && data.minutesUntilReset) {
          setErrorMessage(
            `Too many submissions. Please try again in ${data.minutesUntilReset} minute${data.minutesUntilReset !== 1 ? 's' : ''}.`
          );
        } else {
          setErrorMessage(errorMsg);
        }
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus('success');
      setMessage('');

      // Close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false);
        setSubmitStatus('idle');
        setErrorMessage(null);
      }, 1500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when closing
      setMessage('');
      setSubmitStatus('idle');
      setErrorMessage(null);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-rose-400/70 hover:bg-rose-500 text-white px-3 py-3 sm:px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group max-w-[min(400px,calc(100vw-3rem))]"
        aria-label="Submit feedback"
      >
        <MessageCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm font-medium leading-tight sm:hidden">Feedback</span>
        <span className="hidden sm:inline text-sm font-medium leading-tight">
          We're still figuring things out, please let us know about any problems or suggestions!
        </span>
      </button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Your Feedback</DialogTitle>
            <DialogDescription>
              We're still figuring things out! Please let us know about any problems or suggestions
              you have.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-message">Your message</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us about any problems you encountered, features you'd like to see, or any other feedback..."
                rows={6}
                maxLength={MAX_MESSAGE_LENGTH + 50}
                className="resize-none"
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {message.length} / {MAX_MESSAGE_LENGTH} characters
                </p>
                {submitStatus === 'error' && (
                  <p className="text-xs text-red-500">
                    {errorMessage || 'Failed to submit. Please try again.'}
                  </p>
                )}
                {submitStatus === 'success' && (
                  <p className="text-xs text-green-500">
                    Thank you! Your feedback has been submitted.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || !message.trim() || message.trim().length > MAX_MESSAGE_LENGTH
                }
                className="bg-rose-500 hover:bg-rose-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
