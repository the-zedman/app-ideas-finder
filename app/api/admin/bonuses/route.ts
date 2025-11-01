import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// POST - Award bonus to user
export async function POST(request: Request) {
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
    
    if (!adminData || adminData.role === 'support') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get request body
    const body = await request.json();
    const { userId, bonusType, bonusValue, bonusDuration, reason } = body;
    
    if (!userId || !bonusType || !bonusValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Insert bonus
    const { error } = await supabaseAdmin
      .from('user_bonuses')
      .insert({
        user_id: userId,
        bonus_type: bonusType,
        bonus_value: bonusValue,
        bonus_duration: bonusDuration || 'once',
        months_remaining: bonusDuration === 'monthly' ? bonusValue : null,
        reason: reason,
        awarded_by: user.id
      });
    
    if (error) {
      return NextResponse.json({ error: 'Failed to award bonus', message: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to award bonus',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

