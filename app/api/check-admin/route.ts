import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the current user using client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Create client to get user
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return allCookies },
        setAll() {},
      },
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        userError 
      }, { status: 401 });
    }
    
    // Check if service role key is available
    if (!serviceRoleKey) {
      return NextResponse.json({
        error: 'Service role key not configured',
        userId: user.id,
        email: user.email,
        hasServiceKey: false
      }, { status: 500 });
    }
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Query admins table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      hasServiceKey: true,
      adminData,
      adminError: adminError?.message,
      isAdmin: !!adminData,
      role: adminData?.role || null
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

