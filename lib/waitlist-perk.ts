import type { SupabaseClient } from '@supabase/supabase-js';
import { WAITLIST_BONUS_AMOUNT, WAITLIST_BONUS_REASON, WAITLIST_COUPON_CODE } from './waitlist';

type WaitlistPerkResult = {
  hasActiveBonus: boolean;
};

export async function ensureWaitlistBonus(
  supabaseAdmin: SupabaseClient<any>,
  userId: string | undefined,
  email: string | null | undefined
): Promise<WaitlistPerkResult> {
  if (!supabaseAdmin || !userId) {
    return { hasActiveBonus: false };
  }

  try {
    // Check for an active waitlist bonus first
    const { data: activeBonus } = await supabaseAdmin
      .from('user_bonuses')
      .select('id, bonus_value')
      .eq('user_id', userId)
      .eq('bonus_type', 'fixed_searches')
      .eq('reason', WAITLIST_BONUS_REASON)
      .eq('is_active', true)
      .gt('bonus_value', 0)
      .maybeSingle();

    if (activeBonus) {
      return { hasActiveBonus: true };
    }

    if (!email) {
      return { hasActiveBonus: false };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: waitlistEntry } = await supabaseAdmin
      .from('waitlist')
      .select('id, bonus_granted_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!waitlistEntry || waitlistEntry.bonus_granted_at) {
      return { hasActiveBonus: false };
    }

    const { data: bonusRow, error: bonusError } = await supabaseAdmin
      .from('user_bonuses')
      .insert({
        user_id: userId,
        bonus_type: 'fixed_searches',
        bonus_value: WAITLIST_BONUS_AMOUNT,
        bonus_duration: 'permanent',
        reason: WAITLIST_BONUS_REASON,
        is_active: true,
      })
      .select('id')
      .single();

    if (bonusError || !bonusRow) {
      console.error('Failed to award waitlist bonus:', bonusError);
      return { hasActiveBonus: false };
    }

    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({
        bonus_granted_at: new Date().toISOString(),
        bonus_granted_user_id: userId,
        bonus_code: WAITLIST_COUPON_CODE,
      })
      .eq('id', waitlistEntry.id);

    if (updateError) {
      console.error('Failed to update waitlist entry after granting bonus:', updateError);
    }

    return { hasActiveBonus: true };
  } catch (error) {
    console.error('ensureWaitlistBonus error:', error);
    return { hasActiveBonus: false };
  }
}

