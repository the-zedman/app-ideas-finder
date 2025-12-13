import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST() {
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
    
    // Get current usage record
    const now = new Date();
    let { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .maybeSingle();
    
    // If no usage record exists, create one
    if (!usage) {
      console.log('📝 No usage record found, creating one...');
      
      // Get user's subscription to determine search limit
      const { data: subscription } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const searchesLimit = subscription?.subscription_plans?.monthly_searches || 0;
      
      // Create usage record for current month
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const { data: newUsage, error: createError } = await supabaseAdmin
        .from('monthly_usage')
        .insert({
          user_id: user.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          searches_used: 0,
          searches_limit: searchesLimit
        })
        .select()
        .single();
      
      if (createError || !newUsage) {
        console.error('❌ Failed to create usage record:', createError);
        return NextResponse.json({ 
          error: 'Failed to create usage record', 
          message: createError?.message 
        }, { status: 500 });
      }
      
      console.log('✅ Created new usage record');
      usage = newUsage;
    }
    
    // Check subscription status
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (subscription?.status === 'free_unlimited') {
      // Don't decrement anything for unlimited users
      return NextResponse.json({ success: true, unlimited: true, source: 'unlimited' });
    }

    // 1) Consume fixed bonus searches first (never-expiring early access credits)
    // For users with subscriptions: exclude feedback bonuses (they add to monthly limit)
    // For waitlist users: consume waitlist bonuses first, then feedback bonuses
    let bonusQuery = supabaseAdmin
      .from('user_bonuses')
      .select('*')
      .eq('user_id', user.id)
      .eq('bonus_type', 'fixed_searches')
      .eq('is_active', true)
      .gt('bonus_value', 0);

    // For users with subscriptions, exclude feedback bonuses (they're part of monthly quota)
    // For waitlist users, consume waitlist bonuses first (oldest), then feedback bonuses (newest)
    if (subscription) {
      bonusQuery = bonusQuery.neq('reason', 'feedback_reward');
      bonusQuery = bonusQuery.order('awarded_at', { ascending: true });
    } else {
      // Waitlist users: consume waitlist bonuses first (oldest), then feedback bonuses (newest)
      // First try waitlist bonuses
      bonusQuery = bonusQuery.neq('reason', 'feedback_reward');
      bonusQuery = bonusQuery.order('awarded_at', { ascending: true });
    }

    const { data: bonusRows, error: bonusError } = await bonusQuery.limit(1).maybeSingle();

    if (bonusError) {
      console.error('Error fetching bonus searches:', bonusError);
    } else if (bonusRows) {
      const newValue = (bonusRows.bonus_value || 0) - 1;
      const updatePayload: any = { bonus_value: newValue };
      if (newValue <= 0) {
        updatePayload.is_active = false;
      }

      const { error: updateBonusError } = await supabaseAdmin
        .from('user_bonuses')
        .update(updatePayload)
        .eq('id', bonusRows.id);

      if (updateBonusError) {
        console.error('Error updating bonus searches:', updateBonusError);
        return NextResponse.json(
          { error: 'Failed to consume bonus search', message: updateBonusError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        source: 'bonus_search',
      });
    }

    // For waitlist users, if no waitlist bonuses found, try feedback bonuses
    if (!subscription) {
      const { data: feedbackBonusRows, error: feedbackBonusError } = await supabaseAdmin
        .from('user_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .eq('bonus_type', 'fixed_searches')
        .eq('reason', 'feedback_reward')
        .eq('is_active', true)
        .gt('bonus_value', 0)
        .order('awarded_at', { ascending: false }) // Consume newest feedback bonuses first
        .limit(1)
        .maybeSingle();

      if (!feedbackBonusError && feedbackBonusRows) {
        const newValue = (feedbackBonusRows.bonus_value || 0) - 1;
        const updatePayload: any = { bonus_value: newValue };
        if (newValue <= 0) {
          updatePayload.is_active = false;
        }

        const { error: updateFeedbackBonusError } = await supabaseAdmin
          .from('user_bonuses')
          .update(updatePayload)
          .eq('id', feedbackBonusRows.id);

        if (updateFeedbackBonusError) {
          console.error('Error updating feedback bonus searches:', updateFeedbackBonusError);
          return NextResponse.json(
            { error: 'Failed to consume feedback bonus search', message: updateFeedbackBonusError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          source: 'feedback_bonus_search',
        });
      }
    }

    // 2) Fall back to monthly plan quota
    const { error } = await supabaseAdmin
      .from('monthly_usage')
      .update({ searches_used: usage.searches_used + 1 })
      .eq('id', usage.id);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to increment usage', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      source: 'plan_quota',
      searchesUsed: usage.searches_used + 1,
      searchesLimit: usage.searches_limit
    });
    
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return NextResponse.json({
      error: 'Failed to increment usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

