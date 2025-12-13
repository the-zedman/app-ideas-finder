import { createClient } from '@supabase/supabase-js';
import { ensureWaitlistBonus } from './waitlist-perk';
import { WAITLIST_BONUS_REASON } from './waitlist';
import { VIP_BONUS_REASON } from './vip';

/**
 * Check if a user has an active subscription (active or free_unlimited)
 * Also checks for waitlist and VIP bonuses
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
    .select('status, plan_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`[check-subscription] Error fetching subscription for ${userId}:`, error);
  }

  // If there's a subscription, check if it's active
  if (subscription && !error) {
    console.log(`[check-subscription] Found subscription for ${userId}: status=${subscription.status}, plan=${subscription.plan_id}`);
    const activeStatuses = ['active', 'free_unlimited'];
    if (activeStatuses.includes(subscription.status)) {
      console.log(`[check-subscription] User ${userId} has active subscription: ${subscription.status}`);
      return true;
    }
    console.log(`[check-subscription] User ${userId} has inactive subscription: ${subscription.status}`);
    // If subscription exists but is inactive (cancelled/expired), still check for waitlist/VIP bonus
  } else if (!subscription) {
    console.log(`[check-subscription] No subscription found for ${userId}, checking for waitlist/VIP bonus`);
  }

  // Check for existing waitlist bonus first (before trying to grant)
  const { data: activeWaitlistBonus } = await supabase
    .from('user_bonuses')
    .select('id, bonus_value')
    .eq('user_id', userId)
    .eq('bonus_type', 'fixed_searches')
    .eq('reason', WAITLIST_BONUS_REASON)
    .eq('is_active', true)
    .gt('bonus_value', 0)
    .maybeSingle();

  if (activeWaitlistBonus) {
    console.log(`[check-subscription] User ${userId} has active waitlist bonus: ${activeWaitlistBonus.bonus_value} searches`);
    return true;
  }

  // Check for existing VIP bonus
  const { data: activeVipBonus } = await supabase
    .from('user_bonuses')
    .select('id, bonus_value')
    .eq('user_id', userId)
    .eq('bonus_type', 'fixed_searches')
    .eq('reason', VIP_BONUS_REASON)
    .eq('is_active', true)
    .gt('bonus_value', 0)
    .maybeSingle();

  if (activeVipBonus) {
    console.log(`[check-subscription] User ${userId} has active VIP bonus: ${activeVipBonus.bonus_value} searches`);
    return true;
  }

  // If no active bonus, try to grant one if user is on waitlist or VIP list
  if (!userEmail) {
    console.log(`[check-subscription] No email provided for user ${userId}, cannot check waitlist/VIP`);
    return false;
  }

  console.log(`[check-subscription] Checking waitlist/VIP for user ${userId} with email ${userEmail}`);
  const bonusResult = await ensureWaitlistBonus(supabase, userId, userEmail);
  console.log(`[check-subscription] Waitlist/VIP result for ${userId}:`, bonusResult);
  return bonusResult.hasActiveBonus;
}

