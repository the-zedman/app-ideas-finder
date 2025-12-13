import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { ensureWaitlistBonus } from '@/lib/waitlist-perk';
import { WAITLIST_BONUS_AMOUNT, WAITLIST_COUPON_CODE } from '@/lib/waitlist';
import { VIP_BONUS_AMOUNT, VIP_COUPON_CODE, VIP_BONUS_REASON } from '@/lib/vip';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Get current user
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return allCookies },
        setAll() {},
      },
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    await ensureWaitlistBonus(supabaseAdmin, user.id, user.email);
    
    // Get user subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Get current period usage
    const now = new Date();
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .single();
    
    // Get active bonuses
    const { data: bonuses } = await supabaseAdmin
      .from('user_bonuses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    // Calculate bonus searches
    // Separate waitlist bonuses from feedback bonuses
    let bonusSearchesRemaining = 0; // fixed, never-expiring bonus searches (e.g. early access 75) - waitlist only
    let feedbackBonusSearches = 0; // feedback bonuses that add to monthly limit
    let percentageBonus = 0;
    
    bonuses?.forEach((bonus: any) => {
      if (bonus.bonus_type === 'fixed_searches') {
        // Separate waitlist bonuses from feedback bonuses
        if (bonus.reason === 'feedback_reward') {
          // Feedback bonuses add to monthly limit, not to bonus pool
          feedbackBonusSearches += bonus.bonus_value || 0;
        } else {
          // Waitlist and other fixed bonuses go to bonus pool
          bonusSearchesRemaining += bonus.bonus_value || 0;
        }
      } else if (bonus.bonus_type === 'percentage_increase') {
        percentageBonus += bonus.bonus_value || 0;
      }
    });
    
    if (!subscription) {
      // Calculate waitlist bonus remaining (only count waitlist bonuses, not feedback bonuses)
      const waitlistBonusRemaining = bonuses?.filter((b: any) => 
        b.bonus_type === 'fixed_searches' && b.reason === 'waitlist_75_free' && b.is_active
      ).reduce((sum: number, b: any) => sum + (b.bonus_value || 0), 0) || 0;
      
      // Calculate VIP bonus remaining
      const vipBonusRemaining = bonuses?.filter((b: any) => 
        b.bonus_type === 'fixed_searches' && b.reason === VIP_BONUS_REASON && b.is_active
      ).reduce((sum: number, b: any) => sum + (b.bonus_value || 0), 0) || 0;
      
      // Determine if user is VIP or Waitlist (VIP takes precedence if both exist)
      const isVip = vipBonusRemaining > 0;
      const isWaitlist = waitlistBonusRemaining > 0;
      const earlyAccessBonusRemaining = isVip ? vipBonusRemaining : waitlistBonusRemaining;
      const earlyAccessBonusAmount = isVip ? VIP_BONUS_AMOUNT : WAITLIST_BONUS_AMOUNT;
      
      // For early access users, feedback bonuses add to the total limit
      const totalEarlyAccessLimit = earlyAccessBonusAmount + feedbackBonusSearches;
      
      if (earlyAccessBonusRemaining > 0 || feedbackBonusSearches > 0) {
        // Calculate searches used: original amount - remaining amount
        const earlyAccessSearchesUsed = earlyAccessBonusAmount - earlyAccessBonusRemaining;
        return NextResponse.json({
          hasSubscription: false,
          planId: isVip ? 'vip_bonus' : 'waitlist_bonus',
          planName: isVip ? 'VIP Early Access' : 'Waitlist Early Access',
          status: isVip ? 'vip_bonus' : 'waitlist_bonus',
          searchesUsed: earlyAccessSearchesUsed,
          searchesLimit: totalEarlyAccessLimit, // Include feedback bonuses in limit
          searchesRemaining: earlyAccessBonusRemaining + feedbackBonusSearches,
          bonusSearchesRemaining: earlyAccessBonusRemaining,
          feedbackBonusSearches, // Include feedback bonuses separately for display
          percentageBonus: 0,
          trialTimeRemaining: null,
          currentPeriodEnd: null,
          // Include both coupon codes for compatibility
          waitlistCouponCode: isVip ? VIP_COUPON_CODE : WAITLIST_COUPON_CODE,
          vipCouponCode: isVip ? VIP_COUPON_CODE : null,
          waitlistBonusAmount: isWaitlist ? WAITLIST_BONUS_AMOUNT : null,
          vipBonusAmount: isVip ? VIP_BONUS_AMOUNT : null,
          // Separate tracking for display
          waitlistBonusRemaining: waitlistBonusRemaining,
          vipBonusRemaining: vipBonusRemaining,
          isVip,
          canSearch: earlyAccessBonusRemaining + feedbackBonusSearches > 0,
        });
      }

      return NextResponse.json(
        {
          error: 'No subscription found',
          hasSubscription: false,
        },
        { status: 404 }
      );
    }
    
    const baseLimit = usage?.searches_limit || subscription.subscription_plans?.searches_per_month || 0;
    const percentageBonusAmount = Math.floor((baseLimit * percentageBonus) / 100);
    
    // Calculate VIP/waitlist bonus amounts (original and remaining)
    const vipBonusRemaining = bonuses?.filter((b: any) => 
      b.bonus_type === 'fixed_searches' && b.reason === VIP_BONUS_REASON && b.is_active
    ).reduce((sum: number, b: any) => sum + (b.bonus_value || 0), 0) || 0;
    
    const waitlistBonusRemaining = bonuses?.filter((b: any) => 
      b.bonus_type === 'fixed_searches' && b.reason === 'waitlist_75_free' && b.is_active
    ).reduce((sum: number, b: any) => sum + (b.bonus_value || 0), 0) || 0;
    
    // Check if user ever had VIP or waitlist bonus (even if fully consumed)
    const hadVipBonus = vipBonusRemaining > 0 || bonuses?.some((b: any) => b.reason === VIP_BONUS_REASON);
    const hadWaitlistBonus = waitlistBonusRemaining > 0 || bonuses?.some((b: any) => b.reason === 'waitlist_75_free');
    
    // Calculate original bonus amount and how much was used
    const originalBonusAmount = hadVipBonus ? VIP_BONUS_AMOUNT : (hadWaitlistBonus ? WAITLIST_BONUS_AMOUNT : 0);
    const earlyAccessBonusRemaining = vipBonusRemaining + waitlistBonusRemaining;
    const earlyAccessBonusUsed = originalBonusAmount > 0 ? Math.max(0, originalBonusAmount - earlyAccessBonusRemaining) : 0;
    
    // Plan-based monthly limit NOW includes early access bonus for display purposes
    const planSearchesLimit = subscription.status === 'free_unlimited' 
      ? -1 
      : baseLimit + percentageBonusAmount + feedbackBonusSearches + originalBonusAmount;
    
    // Searches used includes both monthly usage AND early access bonus consumed
    const monthlyUsageSearches = usage?.searches_used || 0;
    const searchesUsed = monthlyUsageSearches + earlyAccessBonusUsed;
    
    const planSearchesRemaining = subscription.status === 'free_unlimited'
      ? -1
      : Math.max(0, planSearchesLimit - searchesUsed);
    
    const totalSearchesRemaining = subscription.status === 'free_unlimited'
      ? -1
      : planSearchesRemaining;
    
    return NextResponse.json({
      hasSubscription: true,
      planId: subscription.plan_id,
      planName: subscription.subscription_plans?.name,
      status: subscription.status,
      searchesUsed,
      // Total limit including plan + early access bonus
      searchesLimit: planSearchesLimit,
      // Total remaining including plan
      searchesRemaining: totalSearchesRemaining,
      bonusSearchesRemaining: earlyAccessBonusRemaining,
      percentageBonus,
      currentPeriodEnd: subscription.current_period_end,
      // Coupon codes
      waitlistCouponCode: hadWaitlistBonus ? WAITLIST_COUPON_CODE : null,
      vipCouponCode: hadVipBonus ? VIP_COUPON_CODE : null,
      // Bonus tracking
      waitlistBonusRemaining,
      vipBonusRemaining,
      waitlistBonusAmount: hadWaitlistBonus ? WAITLIST_BONUS_AMOUNT : null,
      vipBonusAmount: hadVipBonus ? VIP_BONUS_AMOUNT : null,
      isVip: hadVipBonus,
      earlyAccessBonusUsed,
      canSearch: subscription.status === 'free_unlimited' || totalSearchesRemaining > 0
    });
    
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json({
      error: 'Failed to fetch usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

