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

    console.log(`[ensureWaitlistBonus] Looking up waitlist for email: ${normalizedEmail}`);
    // Fetch all waitlist entries and filter in code to avoid SQL escaping issues
    const { data: allWaitlistEntries, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .select('id, email, bonus_granted_at, bonus_granted_user_id');

    if (waitlistError) {
      console.error('[ensureWaitlistBonus] Error looking up waitlist:', waitlistError);
      return { hasActiveBonus: false };
    }

    // Find matching email (case-insensitive)
    const waitlistEntry = allWaitlistEntries?.find(
      entry => entry.email?.trim().toLowerCase() === normalizedEmail
    );

    if (!waitlistEntry) {
      console.log(`[ensureWaitlistBonus] No waitlist entry found for ${normalizedEmail}`);
      return { hasActiveBonus: false };
    }

    console.log(`[ensureWaitlistBonus] Found waitlist entry:`, {
      id: waitlistEntry.id,
      email: waitlistEntry.email,
      bonus_granted_at: waitlistEntry.bonus_granted_at,
      bonus_granted_user_id: waitlistEntry.bonus_granted_user_id
    });

    // If bonus was already granted, check if it's to this user
    if (waitlistEntry.bonus_granted_at) {
      if (waitlistEntry.bonus_granted_user_id === userId) {
        // This user already got the bonus, check if it still exists
        const { data: existingBonus } = await supabaseAdmin
          .from('user_bonuses')
          .select('id, bonus_value')
          .eq('user_id', userId)
          .eq('bonus_type', 'fixed_searches')
          .eq('reason', WAITLIST_BONUS_REASON)
          .eq('is_active', true)
          .gt('bonus_value', 0)
          .maybeSingle();
        
        if (existingBonus) {
          console.log(`[ensureWaitlistBonus] User ${userId} already has bonus: ${existingBonus.bonus_value} searches`);
          return { hasActiveBonus: true };
        } else {
          console.log(`[ensureWaitlistBonus] Bonus was granted to ${userId} but no longer exists in user_bonuses`);
        }
      } else {
        console.log(`[ensureWaitlistBonus] Bonus already granted to different user ${waitlistEntry.bonus_granted_user_id}`);
      }
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
      console.error('[ensureWaitlistBonus] Failed to award waitlist bonus:', bonusError);
      return { hasActiveBonus: false };
    }

    console.log(`[ensureWaitlistBonus] Successfully granted ${WAITLIST_BONUS_AMOUNT} bonus searches to user ${userId}`);

    const { error: updateError } = await supabaseAdmin
      .from('waitlist')
      .update({
        bonus_granted_at: new Date().toISOString(),
        bonus_granted_user_id: userId,
        bonus_code: WAITLIST_COUPON_CODE,
      })
      .eq('id', waitlistEntry.id);

    if (updateError) {
      console.error('[ensureWaitlistBonus] Failed to update waitlist entry after granting bonus:', updateError);
    } else {
      console.log(`[ensureWaitlistBonus] Updated waitlist entry ${waitlistEntry.id} with bonus grant info`);
    }

    return { hasActiveBonus: true };
  } catch (error) {
    console.error('ensureWaitlistBonus error:', error);
    return { hasActiveBonus: false };
  }
}

