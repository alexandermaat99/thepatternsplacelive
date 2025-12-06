import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';
import { sanitizeString } from '@/lib/security/input-validation';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;
const MAX_USER_AGENT_LENGTH = 500;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use a more lenient limit for feedback
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // 20 feedback submissions per hour (more lenient for testing/feedback)
    });
    if (!rateLimitResult.success) {
      const resetTime = new Date(rateLimitResult.reset);
      const minutesUntilReset = Math.ceil((rateLimitResult.reset - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          error: `Too many requests. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`,
          resetTime: resetTime.toISOString(),
          minutesUntilReset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': resetTime.toISOString(),
          },
        }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.json();
    const { message, page_url, user_agent } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Sanitize message
    const sanitizedMessage = sanitizeString(trimmedMessage, MAX_MESSAGE_LENGTH);
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      return NextResponse.json({ error: 'Message contains invalid content' }, { status: 400 });
    }

    // Validate and sanitize optional fields
    let sanitizedPageUrl: string | null = null;
    if (page_url && typeof page_url === 'string') {
      const trimmedUrl = page_url.trim();
      if (trimmedUrl.length > 0 && trimmedUrl.length <= MAX_URL_LENGTH) {
        sanitizedPageUrl = sanitizeString(trimmedUrl, MAX_URL_LENGTH) || null;
      }
    }

    let sanitizedUserAgent: string | null = null;
    if (user_agent && typeof user_agent === 'string') {
      const trimmedUserAgent = user_agent.trim();
      if (trimmedUserAgent.length > 0 && trimmedUserAgent.length <= MAX_USER_AGENT_LENGTH) {
        sanitizedUserAgent = sanitizeString(trimmedUserAgent, MAX_USER_AGENT_LENGTH) || null;
      }
    }

    // Get user (optional - feedback can be anonymous)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If user is logged in, fetch their username (non-blocking - if it fails, just continue without username)
    let username: string | null = null;
    if (user?.id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          // Sanitize username (should already be safe, but just in case)
          username = sanitizeString(profile.username, 30) || null;
        }
      } catch (error) {
        // If username fetch fails, just continue without it (non-critical)
        console.warn('Failed to fetch username for feedback:', error);
      }
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
        username: username,
        message: sanitizedMessage,
        page_url: sanitizedPageUrl,
        user_agent: sanitizedUserAgent,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting feedback:', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });

      // Provide more specific error message
      let errorMessage = 'Failed to submit feedback';
      if (insertError.code === '42P01') {
        errorMessage = 'Feedback system is not set up. Please contact support.';
      } else if (insertError.code === '42501') {
        errorMessage = 'Permission denied. Please try again.';
      } else if (insertError.message) {
        errorMessage = `Database error: ${insertError.message}`;
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: feedback.id,
    });
  } catch (error) {
    console.error('Error in POST /api/feedback:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting feedback' },
      { status: 500 }
    );
  }
}
