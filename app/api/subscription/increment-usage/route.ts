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
        .single();
      
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
      .single();
    
    if (subscription?.status === 'free_unlimited') {
      // Don't decrement anything for unlimited users
      return NextResponse.json({ success: true, unlimited: true, source: 'unlimited' });
    }

    // 1) Consume fixed bonus searches first (never-expiring early access credits)
    // Exclude feedback bonuses - they add to monthly limit and are consumed as part of monthly quota
    // Order by oldest first so waitlist bonuses are consumed first
    const { data: bonusRows, error: bonusError } = await supabaseAdmin
      .from('user_bonuses')
      .select('*')
      .eq('user_id', user.id)
      .eq('bonus_type', 'fixed_searches')
      .neq('reason', 'feedback_reward') // Exclude feedback bonuses
      .eq('is_active', true)
      .gt('bonus_value', 0)
      .order('awarded_at', { ascending: true })
      .limit(1)
      .maybeSingle();

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

    // 2) Consume Search Pack credits next (never-expiring paid packs)
    const { data: packRow, error: packError } = await supabaseAdmin
      .from('search_packs')
      .select('*')
      .eq('user_id', user.id)
      .gt('searches_remaining', 0)
      .order('purchased_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (packError) {
      console.error('Error fetching search packs:', packError);
    } else if (packRow) {
      const newRemaining = (packRow.searches_remaining || 0) - 1;

      const { error: updatePackError } = await supabaseAdmin
        .from('search_packs')
        .update({ searches_remaining: newRemaining })
        .eq('id', packRow.id);

      if (updatePackError) {
        console.error('Error updating search pack:', updatePackError);
        return NextResponse.json(
          { error: 'Failed to consume search pack', message: updatePackError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        source: 'search_pack',
      });
    }

    // 3) Fall back to monthly plan quota
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

