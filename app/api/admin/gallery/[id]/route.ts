import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { app_name, app_url, app_icon_url, screenshot_url, description, is_featured, display_order } = body;

    if (!app_name || !app_url || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: app_name, app_url, description' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('gallery')
      .update({
        app_name,
        app_url,
        app_icon_url: app_icon_url || null,
        screenshot_url: screenshot_url || null,
        description,
        is_featured: is_featured || false,
        display_order: display_order || 0
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[gallery] Failed to update item:', error);
      return NextResponse.json(
        { error: 'Failed to update gallery item', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error('[gallery] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update gallery item',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabaseAdmin
      .from('gallery')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('[gallery] Failed to delete item:', error);
      return NextResponse.json(
        { error: 'Failed to delete gallery item', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[gallery] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete gallery item',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

