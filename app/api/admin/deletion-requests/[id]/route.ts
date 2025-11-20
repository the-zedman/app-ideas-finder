import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireSuperAdmin() {
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
    console.error('Error verifying admin (deletion request update):', adminError);
    return NextResponse.json(
      { error: 'Failed to verify admin status', message: adminError.message },
      { status: 500 }
    );
  }

  if (!adminData || adminData.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabaseAdmin, adminUser: user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireSuperAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin, adminUser } = context;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing request id' }, { status: 400 });
    }

    const { status, adminNote } = await request.json();

    if (!['pending', 'completed', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      status,
      admin_note: adminNote?.toString().slice(0, 2000) || null,
    };

    if (status === 'completed' || status === 'declined') {
      updates.processed_at = new Date().toISOString();
      updates.processed_by = adminUser.id;
      updates.processed_by_email = adminUser.email;
    } else {
      updates.processed_at = null;
      updates.processed_by = null;
      updates.processed_by_email = null;
    }

    const { data, error } = await supabaseAdmin
      .from('account_deletion_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update deletion request:', error);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    console.error('PATCH /api/admin/deletion-requests/[id] error:', error);
    return NextResponse.json(
      { error: 'Unexpected error updating request' },
      { status: 500 }
    );
  }
}

