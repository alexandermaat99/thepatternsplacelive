import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/security/rate-limit';
import { sanitizeString } from '@/lib/security/input-validation';

const MAX_BIO_LENGTH = 500;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, RATE_LIMITS.STANDARD);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          },
        }
      );
    }

    // Authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.json();
    const { bio } = body;

    // Validate bio
    if (bio !== null && bio !== undefined && typeof bio !== 'string') {
      return NextResponse.json({ error: 'Bio must be a string or null' }, { status: 400 });
    }

    // Sanitize and validate bio
    let sanitizedBio: string | null = null;
    if (bio !== null && bio !== undefined && bio.trim() !== '') {
      sanitizedBio = sanitizeString(bio.trim(), MAX_BIO_LENGTH);

      if (sanitizedBio.length > MAX_BIO_LENGTH) {
        return NextResponse.json(
          { error: `Bio must be ${MAX_BIO_LENGTH} characters or less` },
          { status: 400 }
        );
      }

      // If bio is empty after sanitization, set to null
      if (sanitizedBio.length === 0) {
        sanitizedBio = null;
      }
    }

    // Update bio
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ bio: sanitizedBio, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('bio')
      .single();

    if (updateError) {
      console.error('Error updating bio:', updateError);
      return NextResponse.json({ error: 'Failed to update bio' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bio: updatedProfile.bio,
    });
  } catch (error) {
    console.error('Error in POST /api/profile/bio:', error);
    return NextResponse.json({ error: 'An error occurred while updating bio' }, { status: 500 });
  }
}

