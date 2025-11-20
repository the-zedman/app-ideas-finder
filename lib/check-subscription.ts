import { createClient } from '@supabase/supabase-js';
import { ensureWaitlistBonus } from './waitlist-perk';
import { WAITLIST_BONUS_REASON } from './waitlist';

/**
 * Check if a user has an active subscription (trial, active, or free_unlimited)
 * Returns null if user has no subscription or subscription is expired/cancelled
 */
export async function hasActiveSubscription(
  userId: string | undefined,
  supabaseUrl: string,
  supabaseServiceKey: string,
  userEmail?: string | null
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

  // If there's a subscription, check if it's active
  if (subscription && !error) {
    const activeStatuses = ['trial', 'active', 'free_unlimited'];
    if (activeStatuses.includes(subscription.status)) {
      return true;
    }
    // If subscription exists but is inactive (cancelled/expired), still check for waitlist bonus
  }

  // Check for existing waitlist bonus first (before trying to grant)
  const { data: activeBonus } = await supabase
    .from('user_bonuses')
    .select('id')
    .eq('user_id', userId)
    .eq('bonus_type', 'fixed_searches')
    .eq('reason', WAITLIST_BONUS_REASON)
    .eq('is_active', true)
    .gt('bonus_value', 0)
    .maybeSingle();

  if (activeBonus) {
    return true;
  }

  // If no active bonus, try to grant one if user is on waitlist
  if (!userEmail) {
    return false;
  }

  const waitlistResult = await ensureWaitlistBonus(supabase, userId, userEmail);
  return waitlistResult.hasActiveBonus;
}

