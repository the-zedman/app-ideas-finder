import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireAdmin() {
  const cookieStore = await cookies();
  const { createServerClient } = await import('@supabase/ssr');

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
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
    console.error('Error verifying admin for deletion requests:', adminError);
    return NextResponse.json(
      { error: 'Failed to verify admin status', message: adminError.message },
      { status: 500 }
    );
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
    const statusFilter = searchParams.get('status');

    let query = supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch deletion requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    return NextResponse.json({
      requests: data ?? [],
      stats: {
        pending: data?.filter((r) => r.status === 'pending').length ?? 0,
        completed: data?.filter((r) => r.status === 'completed').length ?? 0,
        declined: data?.filter((r) => r.status === 'declined').length ?? 0,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/deletion-requests error:', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching deletion requests' },
      { status: 500 }
    );
  }
}

