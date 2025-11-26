import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate username format
    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (trimmedUsername.length > 30) {
      return NextResponse.json(
        { error: 'Username must be 30 characters or less' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        {
          error:
            'Username can only contain letters, numbers, underscores, and hyphens',
        },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      console.error('Error checking username:', checkError);
      return NextResponse.json(
        { error: 'Error checking username availability' },
        { status: 500 }
      );
    }

    if (existingProfile && existingProfile.id !== user.id) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Update username
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: trimmedUsername, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating username:', updateError);
      
      // Check if it's a unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update username' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, username: trimmedUsername });
  } catch (error) {
    console.error('Error in username update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check username availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Validate format
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Check if username is taken by another user
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error checking username' },
        { status: 500 }
      );
    }

    const available =
      !existingProfile || existingProfile.id === user.id;

    return NextResponse.json({ available });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

