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

  return { supabaseAdmin };
}

export async function GET(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin } = context;
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');

    if (campaignId) {
      // Get single campaign with stats
      const { data: campaign, error } = await supabaseAdmin
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      // Get recipient stats
      const { data: recipients } = await supabaseAdmin
        .from('email_recipients')
        .select('sent_status, opened_count, clicked_count')
        .eq('campaign_id', campaignId);

      const total = recipients?.length || 0;
      const sent = recipients?.filter((r) => r.sent_status === 'sent').length || 0;
      const failed = recipients?.filter((r) => r.sent_status === 'failed').length || 0;
      const opened = recipients?.filter((r) => (r.opened_count || 0) > 0).length || 0;
      const clicked = recipients?.filter((r) => (r.clicked_count || 0) > 0).length || 0;

      const stats = {
        total,
        sent,
        failed,
        opened,
        clicked,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : '0.00',
        clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(2) : '0.00',
      };

      return NextResponse.json({ campaign, stats });
    }

    // Get all campaigns with basic stats
    const { data: campaigns, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Get stats for each campaign
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { data: recipients } = await supabaseAdmin
          .from('email_recipients')
          .select('sent_status, opened_count, clicked_count')
          .eq('campaign_id', campaign.id);

        const sent = recipients?.filter((r) => r.sent_status === 'sent').length || 0;
        const opened = recipients?.filter((r) => (r.opened_count || 0) > 0).length || 0;
        const clicked = recipients?.filter((r) => (r.clicked_count || 0) > 0).length || 0;

        return {
          ...campaign,
          stats: {
            sent,
            opened,
            clicked,
            openRate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : '0.00',
            clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(2) : '0.00',
          },
        };
      })
    );

    return NextResponse.json({ campaigns: campaignsWithStats });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

