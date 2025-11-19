import { createClient } from '@supabase/supabase-js';

/**
 * Check if a user has an active subscription (trial, active, or free_unlimited)
 * Returns null if user has no subscription or subscription is expired/cancelled
 */
export async function hasActiveSubscription(
  userId: string | undefined,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<boolean> {
  if (!userId) return false;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !subscription) {
    return false;
  }

  // Active subscription statuses: trial, active, free_unlimited
  // Inactive: cancelled, expired
  const activeStatuses = ['trial', 'active', 'free_unlimited'];
  return activeStatuses.includes(subscription.status);
}

