import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST() {
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
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Get current usage record
    const now = new Date();
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .maybeSingle();
    
    if (!usage) {
      return NextResponse.json({ error: 'No usage record found' }, { status: 404 });
    }
    
    // Check if user has unlimited access
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();
    
    if (subscription?.status === 'free_unlimited') {
      // Don't increment for unlimited users
      return NextResponse.json({ success: true, unlimited: true });
    }
    
    // Increment searches_used
    const { error } = await supabaseAdmin
      .from('monthly_usage')
      .update({ searches_used: usage.searches_used + 1 })
      .eq('id', usage.id);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to increment usage', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      searchesUsed: usage.searches_used + 1,
      searchesLimit: usage.searches_limit
    });
    
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return NextResponse.json({
      error: 'Failed to increment usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

