import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendAdminAlert } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireUser() {
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey) as SupabaseClient<any, any, any>;
  return { user, supabaseAdmin };
}

async function grantFeedbackBonus(supabaseAdmin: ReturnType<typeof createClient>, userId: string) {
  const FEEDBACK_REASON = 'feedback_reward';

  type FeedbackBonus = { id: string; bonus_value: number | null };
  const { data: existingBonus } = await supabaseAdmin
    .from('user_bonuses')
    .select('id, bonus_value')
    .eq('user_id', userId)
    .eq('bonus_type', 'fixed_searches')
    .eq('reason', FEEDBACK_REASON)
    .eq('is_active', true)
    .maybeSingle();
  const typedBonus = (existingBonus as FeedbackBonus | null);

  if (typedBonus) {
    const nextValue = (typedBonus.bonus_value || 0) + 1;
    const updatePayload = { bonus_value: nextValue };
    const { error } = await supabaseAdmin
      .from('user_bonuses')
      .update(updatePayload as any)
      .eq('id', typedBonus.id);

    if (error) {
      console.error('Failed to update feedback bonus:', error);
      return { granted: false };
    }

    return { granted: true, totalBonus: nextValue };
  }

  const { error: insertError } = await supabaseAdmin.from('user_bonuses').insert({
    user_id: userId,
    bonus_type: 'fixed_searches',
    bonus_value: 1,
    bonus_duration: 'permanent',
    reason: FEEDBACK_REASON,
    is_active: true,
  });

  if (insertError) {
    console.error('Failed to insert feedback bonus:', insertError);
    return { granted: false };
  }

  return { granted: true, totalBonus: 1 };
}

export async function POST(request: Request) {
  try {
    const context = await requireUser();
    if (context instanceof NextResponse) return context;

    const { user, supabaseAdmin } = context;
    const body = await request.json();
    const message = (body.message || '').trim();
    const category = body.category || 'general';
    const pageUrl = body.pageUrl || null;
    const allowContact = body.allowContact ?? true;

    if (!message || message.length < 5) {
      return NextResponse.json({ error: 'Feedback is too short' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Feedback is too long (max 2000 characters)' }, { status: 400 });
    }

    const { data: feedback, error: insertError } = await supabaseAdmin
      .from('user_feedback')
      .insert({
        user_id: user.id,
        user_email: user.email,
        category,
        message,
        page_url: pageUrl,
        allow_contact: allowContact,
      })
      .select('*')
      .single();

    if (insertError || !feedback) {
      console.error('Failed to save feedback:', insertError);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    const bonusResult = await grantFeedbackBonus(supabaseAdmin, user.id);

    if (bonusResult.granted) {
      await supabaseAdmin
        .from('user_feedback')
        .update({ reward_granted: true, reward_amount: 1 })
        .eq('id', feedback.id);
    }

    const html = `
      <h2>💡 New Feedback Received</h2>
      <p><strong>User:</strong> ${user.email || user.id}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Page:</strong> ${pageUrl || 'not provided'}</p>
      <p><strong>Allow contact:</strong> ${allowContact ? 'Yes' : 'No'}</p>
      <p><strong>Message:</strong></p>
      <pre style="background:#f5f5f5;padding:12px;border-radius:8px;border:1px solid #eee;">${message}</pre>
      <p>Bonus granted: ${bonusResult.granted ? '+1 search credit' : 'failed to grant'}</p>
    `;

    await sendAdminAlert(`[Feedback] ${category} – ${user.email || user.id}`, html, message);

    return NextResponse.json({
      success: true,
      bonusGranted: bonusResult.granted,
      message: bonusResult.granted
        ? 'Thanks for the feedback! We added +1 bonus search to your account.'
        : 'Thanks for the feedback! (Bonus pending)',
    });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: 'Unexpected error submitting feedback' }, { status: 500 });
  }
}

