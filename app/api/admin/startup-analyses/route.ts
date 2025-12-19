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
    console.log('[startup-analyses POST] Request received');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
      console.error('[startup-analyses POST] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Missing service role key' },
        { status: 500 }
      );
    }

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
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('[startup-analyses POST] Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication error', message: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('[startup-analyses POST] No user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[startup-analyses POST] User ID:', user.id);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error('[startup-analyses POST] Admin check error:', adminError);
      return NextResponse.json(
        { error: 'Failed to verify admin', message: adminError.message },
        { status: 500 }
      );
    }

    if (!adminData) {
      console.error('[startup-analyses POST] User is not an admin:', user.id);
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    console.log('[startup-analyses POST] Admin verified, role:', adminData.role);

    const body = await request.json();
    console.log('[startup-analyses POST] Request body keys:', Object.keys(body));
    console.log('[startup-analyses POST] Business name:', body.business_name);
    console.log('[startup-analyses POST] Business idea length:', body.business_idea?.length);

    const insertData = {
      ...body,
      created_by: user.id
    };

    console.log('[startup-analyses POST] Inserting data...');
    const { data, error } = await supabaseAdmin
      .from('startup_analyses')
      .insert(insertData)
      .select('id, share_slug')
      .single();

    if (error) {
      console.error('[startup-analyses POST] Failed to insert:', error);
      console.error('[startup-analyses POST] Error code:', error.code);
      console.error('[startup-analyses POST] Error message:', error.message);
      console.error('[startup-analyses POST] Error hint:', error.hint);
      console.error('[startup-analyses POST] Error details:', error.details);
      return NextResponse.json(
        { error: 'Failed to save startup analysis', message: error.message, code: error.code, hint: error.hint, details: error.details },
        { status: 500 }
      );
    }

    console.log('[startup-analyses POST] Successfully inserted, ID:', data?.id);
    return NextResponse.json({ analysis: data });
  } catch (error) {
    console.error('[startup-analyses POST] Unexpected error:', error);
    console.error('[startup-analyses POST] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Failed to save startup analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
