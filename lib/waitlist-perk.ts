import type { SupabaseClient } from '@supabase/supabase-js';
import { WAITLIST_BONUS_AMOUNT, WAITLIST_BONUS_REASON, WAITLIST_COUPON_CODE } from './waitlist';
import { VIP_BONUS_AMOUNT, VIP_BONUS_REASON, VIP_COUPON_CODE } from './vip';

type WaitlistPerkResult = {
  hasActiveBonus: boolean;
  source?: 'waitlist' | 'vip';
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
    const { data: activeWaitlistBonus } = await supabaseAdmin
      .from('user_bonuses')
      .select('id, bonus_value')
      .eq('user_id', userId)
      .eq('bonus_type', 'fixed_searches')
      .eq('reason', WAITLIST_BONUS_REASON)
      .eq('is_active', true)
      .gt('bonus_value', 0)
      .maybeSingle();

    if (activeWaitlistBonus) {
      return { hasActiveBonus: true, source: 'waitlist' };
    }

    // Check for an active VIP bonus
    const { data: activeVipBonus } = await supabaseAdmin
      .from('user_bonuses')
      .select('id, bonus_value')
      .eq('user_id', userId)
      .eq('bonus_type', 'fixed_searches')
      .eq('reason', VIP_BONUS_REASON)
      .eq('is_active', true)
      .gt('bonus_value', 0)
      .maybeSingle();

    if (activeVipBonus) {
      return { hasActiveBonus: true, source: 'vip' };
    }

    if (!email) {
      return { hasActiveBonus: false };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // First check waitlist
    console.log(`[ensureWaitlistBonus] Looking up waitlist for email: ${normalizedEmail}`);
    const { data: allWaitlistEntries, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .select('id, email, bonus_granted_at, bonus_granted_user_id');

    if (waitlistError) {
      console.error('[ensureWaitlistBonus] Error looking up waitlist:', waitlistError);
    }

    const waitlistEntry = allWaitlistEntries?.find(
      entry => entry.email?.trim().toLowerCase() === normalizedEmail
    );

    // Then check VIP list
    console.log(`[ensureWaitlistBonus] Looking up VIP list for email: ${normalizedEmail}`);
    const { data: allVipEntries, error: vipError } = await supabaseAdmin
      .from('vip_users')
      .select('id, email, bonus_granted_at, bonus_granted_user_id, status');

    if (vipError) {
      console.error('[ensureWaitlistBonus] Error looking up VIP users:', vipError);
    }

    const vipEntry = allVipEntries?.find(
      entry => entry.email?.trim().toLowerCase() === normalizedEmail
    );

    // Process waitlist entry if found
    if (waitlistEntry) {
      const result = await processWaitlistEntry(supabaseAdmin, userId, waitlistEntry);
      if (result.hasActiveBonus) {
        return { ...result, source: 'waitlist' };
      }
    }

    // Process VIP entry if found
    if (vipEntry) {
      const result = await processVipEntry(supabaseAdmin, userId, vipEntry);
      if (result.hasActiveBonus) {
        return { ...result, source: 'vip' };
      }
    }

    if (!waitlistEntry && !vipEntry) {
      console.log(`[ensureWaitlistBonus] No waitlist or VIP entry found for ${normalizedEmail}`);
    }

    return { hasActiveBonus: false };
  } catch (error) {
    console.error('ensureWaitlistBonus error:', error);
    return { hasActiveBonus: false };
  }
}

async function processWaitlistEntry(
  supabaseAdmin: SupabaseClient<any>,
  userId: string,
  waitlistEntry: any
): Promise<{ hasActiveBonus: boolean }> {
  console.log(`[processWaitlistEntry] Found waitlist entry:`, {
    id: waitlistEntry.id,
    email: waitlistEntry.email,
    bonus_granted_at: waitlistEntry.bonus_granted_at,
    bonus_granted_user_id: waitlistEntry.bonus_granted_user_id
  });

  // If bonus was already granted, check if it's to this user
  if (waitlistEntry.bonus_granted_at) {
    if (waitlistEntry.bonus_granted_user_id === userId) {
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
        console.log(`[processWaitlistEntry] User ${userId} already has bonus: ${existingBonus.bonus_value} searches`);
        return { hasActiveBonus: true };
      }
    }
    console.log(`[processWaitlistEntry] Bonus already granted to different user or consumed`);
    return { hasActiveBonus: false };
  }

  // Grant new waitlist bonus
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
    console.error('[processWaitlistEntry] Failed to award waitlist bonus:', bonusError);
    return { hasActiveBonus: false };
  }

  console.log(`[processWaitlistEntry] Successfully granted ${WAITLIST_BONUS_AMOUNT} bonus searches to user ${userId}`);

  await supabaseAdmin
    .from('waitlist')
    .update({
      bonus_granted_at: new Date().toISOString(),
      bonus_granted_user_id: userId,
      bonus_code: WAITLIST_COUPON_CODE,
    })
    .eq('id', waitlistEntry.id);

  return { hasActiveBonus: true };
}

async function processVipEntry(
  supabaseAdmin: SupabaseClient<any>,
  userId: string,
  vipEntry: any
): Promise<{ hasActiveBonus: boolean }> {
  console.log(`[processVipEntry] Found VIP entry:`, {
    id: vipEntry.id,
    email: vipEntry.email,
    status: vipEntry.status,
    bonus_granted_at: vipEntry.bonus_granted_at,
    bonus_granted_user_id: vipEntry.bonus_granted_user_id
  });

  // If bonus was already granted, check if it's to this user
  if (vipEntry.bonus_granted_at) {
    if (vipEntry.bonus_granted_user_id === userId) {
      const { data: existingBonus } = await supabaseAdmin
        .from('user_bonuses')
        .select('id, bonus_value')
        .eq('user_id', userId)
        .eq('bonus_type', 'fixed_searches')
        .eq('reason', VIP_BONUS_REASON)
        .eq('is_active', true)
        .gt('bonus_value', 0)
        .maybeSingle();
      
      if (existingBonus) {
        console.log(`[processVipEntry] User ${userId} already has VIP bonus: ${existingBonus.bonus_value} searches`);
        return { hasActiveBonus: true };
      }
    }
    console.log(`[processVipEntry] VIP bonus already granted to different user or consumed`);
    return { hasActiveBonus: false };
  }

  // Grant new VIP bonus
  const { data: bonusRow, error: bonusError } = await supabaseAdmin
    .from('user_bonuses')
    .insert({
      user_id: userId,
      bonus_type: 'fixed_searches',
      bonus_value: VIP_BONUS_AMOUNT,
      bonus_duration: 'permanent',
      reason: VIP_BONUS_REASON,
      is_active: true,
    })
    .select('id')
    .single();

  if (bonusError || !bonusRow) {
    console.error('[processVipEntry] Failed to award VIP bonus:', bonusError);
    return { hasActiveBonus: false };
  }

  console.log(`[processVipEntry] Successfully granted ${VIP_BONUS_AMOUNT} VIP bonus searches to user ${userId}`);

  // Update VIP entry status to activated
  await supabaseAdmin
    .from('vip_users')
    .update({
      bonus_granted_at: new Date().toISOString(),
      bonus_granted_user_id: userId,
      bonus_code: VIP_COUPON_CODE,
      status: 'activated',
    })
    .eq('id', vipEntry.id);

  return { hasActiveBonus: true };
}

