import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from './auth-helpers';

// Server-side helper to get current user and profile
export async function getCurrentUserWithProfileServer(): Promise<{
  user: any;
  profile: UserProfile | null;
} | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return { user, profile: null };
  }

  return { user, profile };
}
