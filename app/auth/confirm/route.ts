import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

/**
 * Landing route for links in Supabase auth emails (sign-up confirmation,
 * password reset). Establishes the session, then sends the user to `next`.
 *
 * Handles both link styles:
 * - `?token_hash=...&type=...` (custom email templates; works on any device)
 * - `?code=...` (default `{{ .ConfirmationURL }}` templates, PKCE). This only
 *   signs the user in if the link is opened in the same browser that started
 *   the flow. In another browser the email is still confirmed, so we send
 *   them to log in instead of showing an error.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeRedirectPath(params.get('next'), '/dashboard');
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');
  const isPasswordReset = type === 'recovery' || next.startsWith('/auth/update-password');

  // Supabase reports problems such as an expired link via query params.
  const linkError = params.get('error_description') || params.get('error');
  if (linkError) {
    redirect(
      isPasswordReset
        ? '/auth/forgot-password?expired=1'
        : `/auth/error?error=${encodeURIComponent(linkError)}`
    );
  }

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
    redirect(
      isPasswordReset
        ? '/auth/forgot-password?expired=1'
        : `/auth/error?error=${encodeURIComponent(error.message)}`
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    // Usually: the link was opened in a different browser or device.
    redirect(
      isPasswordReset
        ? '/auth/forgot-password?expired=1'
        : `/auth/login?confirmed=1&redirect=${encodeURIComponent(next)}`
    );
  }

  redirect(`/auth/error?error=${encodeURIComponent('This link is invalid or incomplete.')}`);
}
