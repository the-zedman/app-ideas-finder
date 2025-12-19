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

    const { data, error } = await supabaseAdmin
      .from('startup_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[startup-analyses] Failed to fetch:', error);
      return NextResponse.json(
        { error: 'Failed to fetch startup analyses', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ analyses: data || [] });
  } catch (error) {
    console.error('[startup-analyses] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch startup analyses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from('startup_analyses')
      .insert({
        ...body,
        created_by: user.id
      })
      .select('id, share_slug')
      .single();

    if (error) {
      console.error('[startup-analyses] Failed to insert:', error);
      return NextResponse.json(
        { error: 'Failed to save startup analysis', message: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis: data });
  } catch (error) {
    console.error('[startup-analyses] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save startup analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
