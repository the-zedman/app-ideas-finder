import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Simple password protection via query parameter
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('password');
    
    if (password !== 'AppIdeas2024!') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all waitlist data
    const { data: waitlistData, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
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
        signups: daySignups,
        unsubscribes: 0 // TODO: Track unsubscribes
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

    const dashboardData = {
      totalSignups,
      totalUnsubscribes: 0, // TODO: Implement unsubscribe tracking
      dailySignups,
      weeklySignups,
      monthlySignups,
      unsubscribeRate: 0,
      recentSignups: waitlistData?.slice(0, 20) || [],
      signupTrends,
      domainBreakdown,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


