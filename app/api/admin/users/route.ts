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
    
    // Get query params for filtering/searching
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const provider = searchParams.get('provider') || '';
    const activityFilter = searchParams.get('activity') || '';
    
    // Fetch all users with profiles
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers) {
      return NextResponse.json({ error: 'Failed to fetch users', message: authError?.message }, { status: 500 });
    }
    
    // Get profiles for all users
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*');
    
    // Get analysis counts for all users
    const { data: analysisCounts } = await supabaseAdmin
      .from('user_analyses')
      .select('user_id');
    
    // Count analyses per user
    const analysisCountMap = new Map();
    analysisCounts?.forEach(a => {
      analysisCountMap.set(a.user_id, (analysisCountMap.get(a.user_id) || 0) + 1);
    });
    
    // Get last activity for each user
    const { data: lastActivity } = await supabaseAdmin
      .from('user_analyses')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });
    
    const lastActivityMap = new Map();
    lastActivity?.forEach(a => {
      if (!lastActivityMap.has(a.user_id)) {
        lastActivityMap.set(a.user_id, a.created_at);
      }
    });
    
    // Combine all data
    const users = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      const analysisCount = analysisCountMap.get(authUser.id) || 0;
      const lastActive = lastActivityMap.get(authUser.id);
      
      // Determine provider
      const provider = authUser.app_metadata?.provider || 
                      (authUser.user_metadata?.iss ? 'google' : 'email');
      
      return {
        id: authUser.id,
        email: authUser.email,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        created_at: authUser.created_at,
        last_active: lastActive,
        analysis_count: analysisCount,
        provider: provider,
        disabled: false // Can be extended with ban functionality later
      };
    });
    
    // Apply filters
    let filteredUsers = users;
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email?.toLowerCase().includes(searchLower) ||
        u.first_name?.toLowerCase().includes(searchLower) ||
        u.last_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Provider filter
    if (provider) {
      filteredUsers = filteredUsers.filter(u => u.provider === provider);
    }
    
    // Activity filter
    if (activityFilter === 'active') {
      filteredUsers = filteredUsers.filter(u => u.analysis_count > 0);
    } else if (activityFilter === 'inactive') {
      filteredUsers = filteredUsers.filter(u => u.analysis_count === 0);
    }
    
    // Sort by created_at desc
    filteredUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return NextResponse.json({
      users: filteredUsers,
      total: filteredUsers.length,
      adminRole: adminData.role
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

