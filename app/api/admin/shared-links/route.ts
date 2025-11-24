import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return allCookies;
        },
        setAll() {}
      }
    });

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      return NextResponse.json(
        { error: 'Failed to verify admin', message: adminError.message },
        { status: 500 }
      );
    }

    if (!adminData) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const searchParam = searchParams.get('search')?.trim().toLowerCase() || '';

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 1000, 5000) : null;

    const { data, error } = await supabaseAdmin.rpc('get_latest_shared_apps', {
      limit_count: limit
    });

    if (error) {
      console.error('[shared-links] Failed to fetch apps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shared apps', message: error.message },
        { status: 500 }
      );
    }

    const filtered =
      data?.filter((entry: any) => {
        if (!searchParam) return true;
        return (
          entry.app_name?.toLowerCase().includes(searchParam) ||
          entry.app_id?.toLowerCase().includes(searchParam)
        );
      }) || [];

    return NextResponse.json({
      apps: filtered
    });
  } catch (error) {
    console.error('[shared-links] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch shared links',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

