import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    
    // Verify user is admin (support role cannot view costs)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData || adminData.role === 'support') {
      return NextResponse.json({ error: 'Admin or Super Admin access required' }, { status: 403 });
    }
    
    // Fetch all analyses with costs
    const { data: analyses } = await supabaseAdmin
      .from('user_analyses')
      .select('user_id, app_name, api_cost, created_at')
      .order('created_at', { ascending: false });
    
    if (!analyses) {
      return NextResponse.json({ 
        totalCost: 0, 
        monthCost: 0, 
        avgCost: 0, 
        trend: 'stable',
        dailyCosts: [],
        costsByUser: [],
        costsByApp: [],
        projection: 0
      });
    }
    
    // Calculate total cost
    const totalCost = analyses.reduce((sum, a) => sum + (parseFloat(a.api_cost) || 0), 0);
    const avgCost = analyses.length > 0 ? totalCost / analyses.length : 0;
    
    // This month's cost
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCost = analyses
      .filter(a => new Date(a.created_at) >= monthStart)
      .reduce((sum, a) => sum + (parseFloat(a.api_cost) || 0), 0);
    
    // Last month's cost for trend
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthCost = analyses
      .filter(a => {
        const date = new Date(a.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, a) => sum + (parseFloat(a.api_cost) || 0), 0);
    
    // Determine trend
    let trend = 'stable';
    if (monthCost > lastMonthCost * 1.1) trend = 'increasing';
    else if (monthCost < lastMonthCost * 0.9) trend = 'decreasing';
    
    // Daily costs for chart (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const dailyCostsMap = new Map();
    analyses
      .filter(a => new Date(a.created_at) >= thirtyDaysAgo)
      .forEach(a => {
        const date = new Date(a.created_at).toISOString().split('T')[0];
        dailyCostsMap.set(date, (dailyCostsMap.get(date) || 0) + (parseFloat(a.api_cost) || 0));
      });
    
    const dailyCosts = Array.from(dailyCostsMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Costs by user
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email');
    
    const profileMap = new Map();
    profiles?.forEach(p => {
      profileMap.set(p.id, p);
    });
    
    const userCostsMap = new Map();
    analyses.forEach(a => {
      userCostsMap.set(a.user_id, (userCostsMap.get(a.user_id) || 0) + (parseFloat(a.api_cost) || 0));
    });
    
    // Get auth users for email fallback
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUserMap = new Map();
    authUsers?.users.forEach(u => {
      authUserMap.set(u.id, u);
    });
    
    const costsByUser = Array.from(userCostsMap.entries())
      .map(([userId, cost]) => {
        const profile = profileMap.get(userId);
        const authUser = authUserMap.get(userId);
        
        const firstName = profile?.first_name || '';
        const lastName = profile?.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Use profile name, or fall back to email username
        const displayName = fullName || authUser?.email?.split('@')[0] || 'Unknown User';
        const email = authUser?.email || profile?.email || 'unknown@email.com';
        
        return {
          userId,
          name: displayName,
          email: email,
          cost
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10); // Top 10
    
    // Costs by app
    const appCostsMap = new Map();
    analyses.forEach(a => {
      appCostsMap.set(a.app_name, (appCostsMap.get(a.app_name) || 0) + (parseFloat(a.api_cost) || 0));
    });
    
    const costsByApp = Array.from(appCostsMap.entries())
      .map(([app, cost]) => ({ app, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10); // Top 10
    
    // Monthly projection
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const projection = currentDay > 0 ? (monthCost / currentDay) * daysInMonth : 0;
    
    return NextResponse.json({
      totalCost,
      monthCost,
      avgCost,
      trend,
      dailyCosts,
      costsByUser,
      costsByApp,
      projection,
      adminRole: adminData.role
    });
    
  } catch (error) {
    console.error('Error fetching cost data:', error);
    return NextResponse.json({
      error: 'Failed to fetch cost data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

