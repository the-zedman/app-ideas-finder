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
    
    // Verify user is admin using service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Fetch stats using service role (bypasses RLS)
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Recent signups
    const { data: recentSignups } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Total analyses
    const { count: totalAnalyses } = await supabaseAdmin
      .from('user_analyses')
      .select('*', { count: 'exact', head: true });

    // Active users (analyzed in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeData } = await supabaseAdmin
      .from('user_analyses')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    const activeUsers = new Set(activeData?.map(a => a.user_id) || []).size;

    // Total API cost
    const { data: costData } = await supabaseAdmin
      .from('user_analyses')
      .select('api_cost');
    
    const totalApiCost = costData?.reduce((sum, a) => sum + (parseFloat(a.api_cost) || 0), 0) || 0;

    // Recent analyses
    const { data: recentAnalyses } = await supabaseAdmin
      .from('user_analyses')
      .select('id, app_name, review_count, api_cost, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers,
      totalAnalyses: totalAnalyses || 0,
      totalApiCost,
      recentSignups: recentSignups || [],
      recentAnalyses: recentAnalyses || []
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

