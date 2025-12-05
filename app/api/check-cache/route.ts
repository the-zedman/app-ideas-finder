import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { hasActiveSubscription } from '@/lib/check-subscription';

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
    
    // Check if user has active subscription or bonus access
    const hasAccess = await hasActiveSubscription(user.id, supabaseUrl, serviceRoleKey, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No active subscription or access' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json({ error: 'App ID required' }, { status: 400 });
    }
    
    // Use service role to bypass RLS and check for ANY analysis of this app
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data, error } = await supabaseAdmin
      .from('user_analyses')
      .select('*')
      .eq('app_id', appId)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking cache:', error);
      return NextResponse.json({ cached: null });
    }
    
    return NextResponse.json({ cached: data });
    
  } catch (error) {
    console.error('Error in check-cache:', error);
    return NextResponse.json(
      { error: 'Failed to check cache', cached: null },
      { status: 500 }
    );
  }
}

