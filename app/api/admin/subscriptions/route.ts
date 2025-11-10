import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// GET - List all user subscriptions
export async function GET(request: Request) {
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
    
    // Verify user is admin (not support)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role === 'support') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    
    // Fetch all subscriptions with user info
    const { data: subscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .order('created_at', { ascending: false });
    
    // Get auth users and profiles
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email');
    
    const authUserMap = new Map();
    authUsers?.users.forEach(u => authUserMap.set(u.id, u));
    
    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p));
    
    // Get current usage for each user
    const { data: usageRecords } = await supabaseAdmin
      .from('monthly_usage')
      .select('user_id, searches_used, searches_limit');
    
    const usageMap = new Map();
    usageRecords?.forEach(u => usageMap.set(u.user_id, u));
    
    // Enrich subscription data
    let enrichedSubscriptions = subscriptions?.map(sub => {
      const authUser = authUserMap.get(sub.user_id);
      const profile = profileMap.get(sub.user_id);
      const usage = usageMap.get(sub.user_id);
      
      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = fullName || authUser?.email?.split('@')[0] || 'Unknown';
      
      // Calculate lifetime spend (simplified - should come from actual payment records)
      // For now, using current plan price as estimate
      const currentPrice = sub.subscription_plans?.price || 0;
      const lifetimeSpend = sub.status === 'active' || sub.status === 'trial' ? currentPrice : 0;
      
      return {
        ...sub,
        user_email: authUser?.email || 'unknown',
        user_name: displayName,
        searches_used: usage?.searches_used || 0,
        searches_limit: usage?.searches_limit || sub.subscription_plans?.searches_per_month || 0,
        lifetime_spend: lifetimeSpend
      };
    }) || [];
    
    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      enrichedSubscriptions = enrichedSubscriptions.filter(sub => 
        sub.user_email?.toLowerCase().includes(searchLower) ||
        sub.user_name?.toLowerCase().includes(searchLower)
      );
    }
    
    if (statusFilter) {
      enrichedSubscriptions = enrichedSubscriptions.filter(sub => sub.status === statusFilter);
    }
    
    return NextResponse.json({
      subscriptions: enrichedSubscriptions,
      total: enrichedSubscriptions.length
    });
    
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({
      error: 'Failed to fetch subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Update user subscription
export async function PATCH(request: Request) {
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
    
    // Verify user is super admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { userId, planId, status } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Update subscription
    const updates: any = {};
    if (planId) updates.plan_id = planId;
    if (status) updates.status = status;
    
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to update subscription', message: error.message }, { status: 500 });
    }
    
    // If changing plan, update monthly usage limit
    if (planId) {
      const { data: plan } = await supabaseAdmin
        .from('subscription_plans')
        .select('searches_per_month')
        .eq('id', planId)
        .single();
      
      if (plan) {
        await supabaseAdmin
          .from('monthly_usage')
          .update({ searches_limit: plan.searches_per_month })
          .eq('user_id', userId);
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

