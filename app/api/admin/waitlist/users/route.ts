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
    
    // Fetch all waitlist entries
    const { data: waitlistEntries, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (waitlistError) {
      return NextResponse.json({ 
        error: 'Failed to fetch waitlist', 
        message: waitlistError.message 
      }, { status: 500 });
    }
    
    // Fetch all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Failed to fetch users', 
        message: authError.message 
      }, { status: 500 });
    }
    
    // Create a map of email to auth user
    const emailToAuthUser = new Map();
    authUsers.users.forEach(authUser => {
      if (authUser.email) {
        emailToAuthUser.set(authUser.email.toLowerCase(), authUser);
      }
    });
    
    // Get analysis counts for all users (by user_id)
    const { data: analysisCounts } = await supabaseAdmin
      .from('user_analyses')
      .select('user_id');
    
    // Count analyses per user_id
    const analysisCountMap = new Map();
    analysisCounts?.forEach(a => {
      analysisCountMap.set(a.user_id, (analysisCountMap.get(a.user_id) || 0) + 1);
    });
    
    // Combine waitlist data with signup and activity data
    const waitlistUsers = waitlistEntries?.map(waitlistEntry => {
      const email = waitlistEntry.email?.toLowerCase();
      const authUser = email ? emailToAuthUser.get(email) : null;
      const hasSignedUp = !!authUser;
      const signupDate = authUser?.created_at || null;
      const lastSignIn = authUser?.last_sign_in_at || null;
      const searchCount = authUser ? (analysisCountMap.get(authUser.id) || 0) : 0;
      
      // For login count, we'll use last_sign_in_at as an indicator
      // Since Supabase doesn't track login count directly, we'll show if they've logged in
      const hasLoggedIn = !!lastSignIn;
      
      return {
        id: waitlistEntry.id,
        email: waitlistEntry.email,
        waitlistSignupDate: waitlistEntry.created_at,
        hasSignedUp,
        signupDate,
        lastSignIn,
        hasLoggedIn,
        searchCount,
        unsubscribeToken: waitlistEntry.unsubscribe_token
      };
    }) || [];
    
    return NextResponse.json({
      users: waitlistUsers,
      total: waitlistUsers.length,
      signedUp: waitlistUsers.filter(u => u.hasSignedUp).length,
      notSignedUp: waitlistUsers.filter(u => !u.hasSignedUp).length
    });
    
  } catch (error) {
    console.error('Error fetching waitlist users:', error);
    return NextResponse.json({
      error: 'Failed to fetch waitlist users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

