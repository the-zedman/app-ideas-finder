import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hasActiveSubscription } from '@/lib/check-subscription';

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
    
    // Check if user has active subscription or bonus access
    const hasAccess = await hasActiveSubscription(user.id, supabaseUrl, serviceRoleKey, user.email);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No active subscription or access' }, { status: 403 });
    }
    
    const apiKey = process.env.GROK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Grok API key not configured' }, { status: 500 });
    }
    
    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Error in grok-key:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
