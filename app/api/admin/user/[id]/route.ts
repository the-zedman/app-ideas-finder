import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Get user by ID
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (userError || !targetUser) {
      return NextResponse.json({ 
        error: 'User not found', 
        message: userError?.message 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      id: targetUser.user.id,
      email: targetUser.user.email,
      created_at: targetUser.user.created_at,
      email_confirmed_at: targetUser.user.email_confirmed_at,
      last_sign_in_at: targetUser.user.last_sign_in_at
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

