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
    
    // Verify user is admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!adminData) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    // Fetch all waitlist data
    const { data: waitlistData, error } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch waitlist', message: error.message }, { status: 500 });
    }

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalSignups = waitlistData?.length || 0;
    const dailySignups = waitlistData?.filter(item => 
      new Date(item.created_at) >= today
    ).length || 0;
    
    const weeklySignups = waitlistData?.filter(item => 
      new Date(item.created_at) >= weekAgo
    ).length || 0;
    
    const monthlySignups = waitlistData?.filter(item => 
      new Date(item.created_at) >= monthAgo
    ).length || 0;

    // Generate signup trends for last 30 days
    const signupTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const daySignups = waitlistData?.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= date && itemDate < nextDate;
      }).length || 0;

      signupTrends.push({
        date: date.toISOString().split('T')[0],
        signups: daySignups
      });
    }

    // Email domain breakdown
    const domainCounts: { [key: string]: number } = {};
    waitlistData?.forEach(item => {
      const domain = item.email.split('@')[1]?.toLowerCase();
      if (domain) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });

    const domainBreakdown = Object.entries(domainCounts)
      .map(([domain, count]) => ({
        domain,
        count,
        percentage: ((count / totalSignups) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalSignups,
      dailySignups,
      weeklySignups,
      monthlySignups,
      recentSignups: waitlistData?.slice(0, 20) || [],
      signupTrends,
      domainBreakdown,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching waitlist data:', error);
    return NextResponse.json({
      error: 'Failed to fetch waitlist data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

