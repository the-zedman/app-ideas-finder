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
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('user_id') || '';
    const dateFilter = searchParams.get('date') || '';
    
    // Build query - fetch analyses first
    let query = supabaseAdmin
      .from('user_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (search) {
      query = query.ilike('app_name', `%${search}%`);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (dateFilter) {
      const now = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      if (dateFilter !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }
    }
    
    const { data: analyses, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch analyses', message: error.message }, { status: 500 });
    }
    
    // Fetch all profiles separately
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email');
    
    // Create a map of profiles
    const profileMap = new Map();
    profiles?.forEach(p => {
      profileMap.set(p.id, p);
    });
    
    // Enrich analyses with profile data
    const enrichedAnalyses = analyses?.map(a => ({
      ...a,
      profiles: profileMap.get(a.user_id) || { first_name: '', last_name: '', email: 'Unknown' }
    })) || [];
    
    // Calculate stats
    const totalCost = enrichedAnalyses?.reduce((sum, a) => sum + (parseFloat(a.api_cost) || 0), 0) || 0;
    const avgCost = enrichedAnalyses && enrichedAnalyses.length > 0 ? totalCost / enrichedAnalyses.length : 0;
    
    // Most analyzed app
    const appCounts = new Map();
    enrichedAnalyses?.forEach(a => {
      appCounts.set(a.app_name, (appCounts.get(a.app_name) || 0) + 1);
    });
    
    let mostAnalyzedApp = '';
    let maxCount = 0;
    appCounts.forEach((count, app) => {
      if (count > maxCount) {
        maxCount = count;
        mostAnalyzedApp = app;
      }
    });
    
    return NextResponse.json({
      analyses: enrichedAnalyses,
      stats: {
        totalAnalyses: enrichedAnalyses?.length || 0,
        totalCost,
        avgCost,
        mostAnalyzedApp: mostAnalyzedApp || 'N/A'
      },
      adminRole: adminData.role
    });
    
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json({
      error: 'Failed to fetch analyses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint for removing analyses
export async function DELETE(request: Request) {
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
    
    // Get analysis ID from request body
    const body = await request.json();
    const { analysisId } = body;
    
    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
    }
    
    // Delete the analysis
    const { error } = await supabaseAdmin
      .from('user_analyses')
      .delete()
      .eq('id', analysisId);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to delete analysis', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

