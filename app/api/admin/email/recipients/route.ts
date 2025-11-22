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

  const { data: adminData } = await supabaseAdmin
    .from('admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminData) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { supabaseAdmin, user };
}

export async function GET(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { searchParams } = new URL(request.url);
    const recipientType = searchParams.get('type');

    if (!recipientType) {
      return NextResponse.json({ error: 'Recipient type required' }, { status: 400 });
    }

    let emails: string[] = [];

    switch (recipientType) {
      case 'waitlist': {
        const { data: waitlist } = await supabaseAdmin
          .from('waitlist')
          .select('email');
        emails = (waitlist || []).map((w) => w.email).filter(Boolean);
        break;
      }

      case 'all_users': {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        emails = (authUsers?.users || [])
          .map((u) => u.email)
          .filter(Boolean) as string[];
        break;
      }

      case 'subscribers': {
        const { data: subscriptions } = await supabaseAdmin
          .from('user_subscriptions')
          .select('user_id')
          .in('status', ['trial', 'active', 'free_unlimited']);

        if (subscriptions && subscriptions.length > 0) {
          const userIds = subscriptions.map((s) => s.user_id);
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          emails = (authUsers?.users || [])
            .filter((u) => userIds.includes(u.id))
            .map((u) => u.email)
            .filter(Boolean) as string[];
        }
        break;
      }

      case 'adhoc': {
        // For adhoc, return empty array - emails will be provided in the request
        emails = [];
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }

    // Filter out unsubscribed emails
    const { data: unsubscribed } = await supabaseAdmin
      .from('unsubscribes')
      .select('email');

    const unsubscribedEmails = new Set((unsubscribed || []).map((u) => u.email.toLowerCase()));
    emails = emails.filter((email) => !unsubscribedEmails.has(email.toLowerCase()));

    return NextResponse.json({
      count: emails.length,
      emails: emails.slice(0, 1000), // Limit to 1000 for preview
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipients', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

