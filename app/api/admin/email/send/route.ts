import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { generateEmailHTML } from '@/lib/email-template';
import { sendEmail } from '@/lib/email';

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

export async function POST(request: Request) {
  try {
    const context = await requireAdmin();
    if (context instanceof NextResponse) return context;

    const { supabaseAdmin, user } = context;
    const body = await request.json();
    const { subject, htmlContent, textContent, recipientType, adhocEmails, replyTo } = body;

    if (!subject || !htmlContent || !recipientType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get reply-to email from settings or use provided/default
    let replyToEmail = replyTo || 'info@appideasfinder.com';
    if (!replyTo) {
      const { data: setting } = await supabaseAdmin
        .from('email_settings')
        .select('setting_value')
        .eq('setting_key', 'reply_to_email')
        .maybeSingle();
      if (setting) {
        replyToEmail = setting.setting_value;
      }
    }

    // Get recipient emails
    let recipientEmails: string[] = [];

    switch (recipientType) {
      case 'waitlist': {
        const { data: waitlist } = await supabaseAdmin.from('waitlist').select('email');
        recipientEmails = (waitlist || []).map((w) => w.email).filter(Boolean);
        break;
      }

      case 'all_users': {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        recipientEmails = (authUsers?.users || [])
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
          recipientEmails = (authUsers?.users || [])
            .filter((u) => userIds.includes(u.id))
            .map((u) => u.email)
            .filter(Boolean) as string[];
        }
        break;
      }

      case 'adhoc': {
        if (!adhocEmails || !Array.isArray(adhocEmails) || adhocEmails.length === 0) {
          return NextResponse.json({ error: 'Adhoc emails required' }, { status: 400 });
        }
        recipientEmails = adhocEmails.filter((email: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        });
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 });
    }

    // Filter out unsubscribed emails
    const { data: unsubscribed } = await supabaseAdmin.from('unsubscribes').select('email');
    const unsubscribedEmails = new Set((unsubscribed || []).map((u) => u.email.toLowerCase()));
    recipientEmails = recipientEmails.filter((email) => !unsubscribedEmails.has(email.toLowerCase()));

    if (recipientEmails.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        subject,
        html_content: htmlContent,
        text_content: textContent || '',
        recipient_type: recipientType,
        adhoc_emails: recipientType === 'adhoc' ? adhocEmails : null,
        reply_to_email: replyToEmail,
        sent_by: user.id,
        total_recipients: recipientEmails.length,
        status: 'sending',
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Get user IDs for recipients (for tracking)
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailToUserId = new Map<string, string>();
    authUsers?.users.forEach((u) => {
      if (u.email) {
        emailToUserId.set(u.email.toLowerCase(), u.id);
      }
    });

    // Create recipient records and send emails
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 50; // Send in batches to avoid overwhelming SES

    for (let i = 0; i < recipientEmails.length; i += batchSize) {
      const batch = recipientEmails.slice(i, i + batchSize);

      // Create recipient records
      const recipientRecords = batch.map((email) => ({
        campaign_id: campaign.id,
        email,
        user_id: emailToUserId.get(email.toLowerCase()) || null,
        sent_status: 'pending',
      }));

      const { data: recipients, error: recipientsError } = await supabaseAdmin
        .from('email_recipients')
        .insert(recipientRecords)
        .select();

      if (recipientsError || !recipients) {
        console.error('Error creating recipient records:', recipientsError);
        failedCount += batch.length;
        continue;
      }

      // Send emails
      for (const recipient of recipients) {
        try {
          const emailHTML = generateEmailHTML({
            htmlContent,
            trackingToken: recipient.tracking_token,
          });

          await sendEmail({
            to: recipient.email,
            subject,
            html: emailHTML,
            text: textContent || '',
          });

          // Update recipient as sent
          await supabaseAdmin
            .from('email_recipients')
            .update({
              sent_status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', recipient.id);

          sentCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorDetails = error instanceof Error ? error.stack : String(error);
          console.error(`Error sending email to ${recipient.email}:`, errorMessage, errorDetails);
          
          await supabaseAdmin
            .from('email_recipients')
            .update({
              sent_status: 'failed',
              error_message: errorMessage,
            })
            .eq('id', recipient.id);
          failedCount++;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipientEmails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status based on results
    const finalStatus = failedCount === recipientEmails.length ? 'failed' : sentCount > 0 ? 'sent' : 'failed';
    await supabaseAdmin
      .from('email_campaigns')
      .update({
        status: finalStatus,
        sent_at: sentCount > 0 ? new Date().toISOString() : null,
        total_sent: sentCount,
        total_failed: failedCount,
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalRecipients: recipientEmails.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

