import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

type AdminContext =
  | NextResponse
  | {
      supabaseAdmin: SupabaseClient<any>;
      adminRole: string;
    };

async function requireSuperAdmin(): Promise<AdminContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase environment variables are not fully configured' },
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
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabaseAdmin: SupabaseClient<any> = createClient(supabaseUrl, serviceRoleKey);

  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    console.error('Error verifying admin (user actions):', adminError);
    return NextResponse.json(
      { error: 'Failed to verify admin status', message: adminError.message },
      { status: 500 }
    );
  }

  if (!adminData || adminData.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Only super admins can modify users' },
      { status: 403 }
    );
  }

  return { supabaseAdmin, adminRole: adminData.role };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireSuperAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const { action } = await request.json();

    if (action !== 'disable' && action !== 'enable') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (getUserError || !targetUser?.user) {
      console.error('Failed to load target user for disable/enable', getUserError);
      return NextResponse.json(
        { error: 'Unable to load user', message: getUserError?.message },
        { status: 404 }
      );
    }

    const existingAppMetadata = (targetUser.user.app_metadata || {}) as Record<string, any>;
    const updatedAppMetadata = { ...existingAppMetadata };

    if (action === 'disable') {
      updatedAppMetadata.disabled = true;
    } else {
      delete updatedAppMetadata.disabled;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: updatedAppMetadata,
      ban_duration: action === 'disable' ? '87600h' : 'none',
    });

    if (updateError) {
      console.error('Failed to update user status', updateError);
      return NextResponse.json(
        { error: 'Failed to update user', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: action,
      message: action === 'disable' ? 'User disabled successfully' : 'User enabled successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Unexpected error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireSuperAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const { data: userResponse } = await supabaseAdmin.auth.admin.getUserById(id);
    const userEmail = userResponse.user?.email || null;

    const { data: subscriptionRecord } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', id)
      .maybeSingle();

    const tablesToClean = [
      { table: 'user_analyses', column: 'user_id' },
      { table: 'monthly_usage', column: 'user_id' },
      { table: 'user_bonuses', column: 'user_id' },
      { table: 'search_packs', column: 'user_id' },
      { table: 'user_subscriptions', column: 'user_id' },
      { table: 'profiles', column: 'id' },
      { table: 'admins', column: 'user_id' },
    ] as const;

    for (const entry of tablesToClean) {
      const { error } = await supabaseAdmin.from(entry.table).delete().eq(entry.column, id);
      if (error) {
        console.error(`Failed cleaning ${entry.table} for user ${id}:`, error);
        return NextResponse.json(
          { error: 'Failed to delete user data', message: error.message },
          { status: 500 }
        );
      }
    }

    if (userEmail) {
      const { error: waitlistError } = await supabaseAdmin.from('waitlist').delete().eq('email', userEmail);
      if (waitlistError) {
        console.warn('Failed to remove user from waitlist (non-blocking):', waitlistError);
      }
    }

    if (subscriptionRecord?.stripe_customer_id) {
      try {
        if (stripe) {
          await stripe.customers.del(subscriptionRecord.stripe_customer_id);
        }
      } catch (stripeError) {
        console.warn('Failed to delete Stripe customer (non-blocking):', stripeError);
      }
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error('Failed to delete auth user', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete auth user', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Unexpected error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


