import type { SupabaseClient } from '@supabase/supabase-js';

// Resolve the canonical user for the current session.
// - Returns the logged-in Supabase user object
// - And a canonicalUserId that should be used for any of our own tables
export async function getCanonicalUser(
  supabase: SupabaseClient
): Promise<{ user: any | null; canonicalUserId: string | null }> {
  const { data, error } = await supabase.auth.getUser();

  const user = data?.user ?? null;
  if (error || !user) {
    return { user: null, canonicalUserId: null };
  }

  // Check if this user has been linked to a primary/canonical account
  const { data: link } = await supabase
    .from('account_links')
    .select('primary_user_id')
    .eq('linked_user_id', user.id)
    .maybeSingle();

  const canonicalUserId = link?.primary_user_id ?? user.id;

  return { user, canonicalUserId };
}


