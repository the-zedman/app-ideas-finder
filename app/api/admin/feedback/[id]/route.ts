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
    console.error('Error verifying admin:', adminError);
    return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
  }

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabaseAdmin };
}

// DELETE - Delete feedback
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete feedback:', error);
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/feedback/[id] error:', error);
    return NextResponse.json({ error: 'Unexpected error deleting feedback' }, { status: 500 });
  }
}

// PATCH - Archive/Unarchive feedback
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { id } = await params;
    const body = await request.json();
    const { archived } = body;

    if (typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .update({ archived })
      .eq('id', id);

    if (error) {
      console.error('Failed to update feedback:', error);
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true, archived });
  } catch (error) {
    console.error('PATCH /api/admin/feedback/[id] error:', error);
    return NextResponse.json({ error: 'Unexpected error updating feedback' }, { status: 500 });
  }
}

