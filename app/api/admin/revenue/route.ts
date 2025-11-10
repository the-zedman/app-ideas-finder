import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Check admin access
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
    
    // Use service role to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Check if user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Note: This assumes you have payment tracking in place
    // You'll need to query actual Stripe payment data or create a payments table
    
    // For now, we'll calculate based on subscriptions
    // This is a placeholder - you should track actual payments in a separate table
    
    // Get all active subscriptions with plan details
    const { data: activeSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          price,
          billing_interval
        )
      `)
      .in('status', ['active', 'trial']);
    
    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    let arr = 0;
    
    if (activeSubscriptions) {
      activeSubscriptions.forEach((sub: any) => {
        const price = sub.subscription_plans?.price || 0;
        const interval = sub.subscription_plans?.billing_interval || 'monthly';
        
        if (interval === 'monthly') {
          mrr += price;
        } else if (interval === 'annual') {
          mrr += price / 12; // Convert annual to monthly
        }
      });
    }
    
    arr = mrr * 12;
    
    // Get total lifetime revenue (placeholder - should come from actual payment records)
    const { data: allSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          price,
          billing_interval
        )
      `);
    
    let lifetimeRevenue = 0;
    let totalCustomers = 0;
    const customerSet = new Set();
    
    if (allSubscriptions) {
      allSubscriptions.forEach((sub: any) => {
        customerSet.add(sub.user_id);
        // This is simplified - in reality, you need payment history
        const price = sub.subscription_plans?.price || 0;
        if (sub.status === 'active' || sub.status === 'trial') {
          lifetimeRevenue += price;
        }
      });
      totalCustomers = customerSet.size;
    }
    
    // Get new customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const { data: newCustomers } = await supabaseAdmin
      .from('user_subscriptions')
      .select('user_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    const uniqueNewCustomers = new Set(newCustomers?.map((c: any) => c.user_id) || []).size;
    
    // Get churn data (subscriptions that went from active to cancelled)
    const { data: churnedSubs } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .in('status', ['cancelled', 'expired'])
      .gte('updated_at', startOfMonth.toISOString());
    
    const churnedCount = churnedSubs?.length || 0;
    const churnRate = activeSubscriptions && activeSubscriptions.length > 0
      ? ((churnedCount / (activeSubscriptions.length + churnedCount)) * 100).toFixed(2)
      : '0.00';
    
    // Get revenue by plan type
    const revenueByPlan: any = {};
    if (activeSubscriptions) {
      activeSubscriptions.forEach((sub: any) => {
        const planName = sub.subscription_plans?.name || sub.plan_id;
        const price = sub.subscription_plans?.price || 0;
        if (!revenueByPlan[planName]) {
          revenueByPlan[planName] = { count: 0, revenue: 0 };
        }
        revenueByPlan[planName].count += 1;
        revenueByPlan[planName].revenue += price;
      });
    }
    
    // Get daily/weekly/monthly/yearly estimates
    // These are simplified estimates - should come from actual payment data
    const dailyRevenue = mrr / 30; // Rough estimate
    const weeklyRevenue = mrr / 4; // Rough estimate
    const monthlyRevenue = mrr;
    const yearlyRevenue = arr;
    
    // Calculate ARPU (Average Revenue Per User)
    const arpu = totalCustomers > 0 ? mrr / totalCustomers : 0;
    
    // Get recent high-value customers
    const { data: highValueCustomers } = await supabaseAdmin
      .from('user_subscriptions')
      .select(`
        user_id,
        subscription_plans (name, price),
        users:user_id (email, first_name, last_name)
      `)
      .in('plan_id', ['prime_monthly', 'prime_annual'])
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return NextResponse.json({
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat(arr.toFixed(2)),
      lifetimeRevenue: parseFloat(lifetimeRevenue.toFixed(2)),
      dailyRevenue: parseFloat(dailyRevenue.toFixed(2)),
      weeklyRevenue: parseFloat(weeklyRevenue.toFixed(2)),
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      yearlyRevenue: parseFloat(yearlyRevenue.toFixed(2)),
      totalCustomers,
      activeSubscriptions: activeSubscriptions?.length || 0,
      newCustomers: uniqueNewCustomers,
      churnedCustomers: churnedCount,
      churnRate: parseFloat(churnRate),
      arpu: parseFloat(arpu.toFixed(2)),
      revenueByPlan,
      highValueCustomers: highValueCustomers?.map((c: any) => ({
        email: c.users?.email || 'Unknown',
        name: `${c.users?.first_name || ''} ${c.users?.last_name || ''}`.trim() || 'Unknown',
        plan: c.subscription_plans?.name || 'Unknown',
        value: c.subscription_plans?.price || 0
      })) || []
    });
    
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

