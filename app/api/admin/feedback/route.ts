import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireAdmin() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const { createServerClient } = await import('@supabase/ssr');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return allCookies;
      },
      setAll() {},
    },
  });

  const {
    data: { user },
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
    console.error('Error verifying admin for feedback route:', adminError);
    return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
  }

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabaseAdmin, admin: { ...adminData, user_id: user.id } };
}

export async function GET(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const archivedFilter = searchParams.get('archived');

    let query = supabaseAdmin
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }

    // Filter by archived status
    if (archivedFilter === 'true') {
      query = query.eq('archived', true);
    } else {
      // Default: show only non-archived items (including null for backwards compatibility)
      query = query.or('archived.eq.false,archived.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    const total = data?.length ?? 0;
    const categories = data?.reduce<Record<string, number>>((acc, item) => {
      const cat = item.category || 'general';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {}) ?? {};

    return NextResponse.json({
      feedback: data ?? [],
      stats: {
        total,
        categories,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/feedback error:', error);
    return NextResponse.json({ error: 'Unexpected error fetching feedback' }, { status: 500 });
  }
}

