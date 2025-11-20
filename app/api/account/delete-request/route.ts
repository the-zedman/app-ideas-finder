import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { sendAdminAlert } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAuthUser() {
  const cookieStore = await cookies();
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

  return user;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch deletion request:', error);
      return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    console.error('GET /api/account/delete-request error:', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching deletion request' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { reason } = await request.json().catch(() => ({ reason: null }));

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          message: 'A deletion request is already pending.',
          request: existing,
        },
        { status: 200 }
      );
    }

    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email,
        reason: reason?.toString().slice(0, 2000) || null,
        subscription_status: subscription?.status || 'none',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log deletion request:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    const plainText = `
User: ${user.email}
Subscription: ${subscription?.status || 'none'}
Requested at: ${data.requested_at}
Reason:
${reason || 'n/a'}
`;

    const html = `
      <h2>🔐 Account Deletion Request</h2>
      <p><strong>User:</strong> ${user.email}</p>
      <p><strong>Subscription:</strong> ${subscription?.status || 'none'}</p>
      <p><strong>Requested at:</strong> ${new Date(data.requested_at).toLocaleString()}</p>
      <p><strong>Reason:</strong></p>
      <p style="white-space: pre-line; background:#f9f9f9; padding:12px; border-radius:6px;">
        ${reason ? reason.toString().replace(/</g, '&lt;') : 'n/a'}
      </p>
      <p>View queue: https://appideasfinder.com/admin/deletions</p>
    `;

    try {
      await sendAdminAlert(`[Deletion Request] ${user.email}`, html, plainText);
    } catch (emailError) {
      console.error('Failed to send deletion email alert:', emailError);
    }

    return NextResponse.json({
      message: 'Deletion request submitted',
      request: data,
    });
  } catch (error) {
    console.error('POST /api/account/delete-request error:', error);
    return NextResponse.json(
      { error: 'Unexpected error submitting deletion request' },
      { status: 500 }
    );
  }
}

