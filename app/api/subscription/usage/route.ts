import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    
    // Get user subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('user_id', user.id)
      .single();
    
    if (!subscription) {
      return NextResponse.json({ 
        error: 'No subscription found',
        hasSubscription: false 
      }, { status: 404 });
    }
    
    // Get current period usage
    const now = new Date();
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .single();
    
    // Get search packs (unused searches)
    const { data: packs } = await supabaseAdmin
      .from('search_packs')
      .select('searches_remaining')
      .eq('user_id', user.id)
      .gt('searches_remaining', 0);
    
    const packSearches = packs?.reduce((sum, pack) => sum + pack.searches_remaining, 0) || 0;
    
    // Get active bonuses
    const { data: bonuses } = await supabaseAdmin
      .from('user_bonuses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    // Calculate total bonus searches
    let bonusSearches = 0;
    let percentageBonus = 0;
    
    bonuses?.forEach(bonus => {
      if (bonus.bonus_type === 'fixed_searches') {
        bonusSearches += bonus.bonus_value;
      } else if (bonus.bonus_type === 'percentage_increase') {
        percentageBonus += bonus.bonus_value;
      }
    });
    
    const baseLimit = usage?.searches_limit || subscription.subscription_plans.searches_per_month;
    const bonusFromPercentage = Math.floor((baseLimit * percentageBonus) / 100);
    const totalLimit = subscription.status === 'free_unlimited' ? -1 : baseLimit + bonusFromPercentage + bonusSearches;
    
    const searchesUsed = usage?.searches_used || 0;
    const searchesRemaining = subscription.status === 'free_unlimited' ? -1 : 
      Math.max(0, totalLimit - searchesUsed + packSearches);
    
    // Calculate trial time remaining
    let trialTimeRemaining = null;
    if (subscription.status === 'trial' && subscription.trial_end_date) {
      const trialEnd = new Date(subscription.trial_end_date);
      const timeLeft = trialEnd.getTime() - now.getTime();
      if (timeLeft > 0) {
        trialTimeRemaining = {
          days: Math.floor(timeLeft / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
          totalSeconds: Math.floor(timeLeft / 1000)
        };
      }
    }
    
    return NextResponse.json({
      hasSubscription: true,
      planId: subscription.plan_id,
      planName: subscription.subscription_plans?.name,
      status: subscription.status,
      searchesUsed,
      searchesLimit: totalLimit,
      searchesRemaining,
      packSearches,
      bonusSearches,
      percentageBonus,
      trialTimeRemaining,
      currentPeriodEnd: subscription.current_period_end,
      canSearch: subscription.status === 'free_unlimited' || searchesRemaining > 0
    });
    
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json({
      error: 'Failed to fetch usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

