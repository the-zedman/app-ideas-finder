import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Helper to verify admin access
async function verifyAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
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
    return { error: 'Not authenticated', status: 401 };
  }
  
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  
  const { data: adminData } = await supabaseAdmin
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (!adminData) {
    return { error: 'Not authorized', status: 403 };
  }
  
  return { supabaseAdmin, user };
}

// POST - Add VIP user manually
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    const { email, notes, invited_by } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    
    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomUUID();
    
    // Insert into vip_users
    const { data, error } = await auth.supabaseAdmin
      .from('vip_users')
      .insert([{ 
        email: email.toLowerCase().trim(), 
        unsubscribe_token: unsubscribeToken,
        notes: notes || null,
        invited_by: invited_by || 'admin',
        status: 'pending'
      }])
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email already exists in VIP list' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to add VIP user', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('Error adding VIP user:', error);
    return NextResponse.json({
      error: 'Failed to add VIP user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Fetch VIP data and stats
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    // Fetch all VIP data
    const { data: vipData, error } = await auth.supabaseAdmin
      .from('vip_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch VIP users', message: error.message }, { status: 500 });
    }

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalVips = vipData?.length || 0;
    const pendingVips = vipData?.filter(item => item.status === 'pending').length || 0;
    const activatedVips = vipData?.filter(item => item.status === 'activated').length || 0;
    
    const dailyAdditions = vipData?.filter(item => 
      new Date(item.created_at) >= today
    ).length || 0;
    
    const weeklyAdditions = vipData?.filter(item => 
      new Date(item.created_at) >= weekAgo
    ).length || 0;
    
    const monthlyAdditions = vipData?.filter(item => 
      new Date(item.created_at) >= monthAgo
    ).length || 0;

    // Generate addition trends for last 30 days
    const additionTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayAdditions = vipData?.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= date && itemDate < nextDate;
      }).length || 0;

      additionTrends.push({
        date: date.toISOString().split('T')[0],
        additions: dayAdditions
      });
    }

    // Email domain breakdown
    const domainCounts: { [key: string]: number } = {};
    vipData?.forEach(item => {
      const domain = item.email.split('@')[1]?.toLowerCase();
      if (domain) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });

    const domainBreakdown = Object.entries(domainCounts)
      .map(([domain, count]) => ({
        domain,
        count,
        percentage: ((count / totalVips) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalVips,
      pendingVips,
      activatedVips,
      dailyAdditions,
      weeklyAdditions,
      monthlyAdditions,
      recentVips: vipData?.slice(0, 20) || [],
      allVips: vipData || [],
      additionTrends,
      domainBreakdown,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching VIP data:', error);
    return NextResponse.json({
      error: 'Failed to fetch VIP data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

