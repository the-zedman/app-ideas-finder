import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmailHTML } from '@/lib/email-template';
import { sendEmail } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This endpoint should be called by a cron job (e.g., Vercel Cron or external service)
export async function GET(request: Request) {
  try {
    // Verify cron secret if set
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    // Find scheduled campaigns that are ready to send
    const { data: scheduledCampaigns, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now);

    if (error) {
      console.error('Error fetching scheduled campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch scheduled campaigns' }, { status: 500 });
    }

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      return NextResponse.json({ message: 'No scheduled campaigns to process', processed: 0 });
    }

    let processed = 0;

    for (const campaign of scheduledCampaigns) {
      try {
        // Update status to sending
        await supabaseAdmin
          .from('email_campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);

        // Get recipient emails
        let recipientEmails: string[] = [];

        switch (campaign.recipient_type) {
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
            recipientEmails = campaign.adhoc_emails || [];
            break;
          }
        }

        // Filter out unsubscribed emails
        const { data: unsubscribed } = await supabaseAdmin.from('unsubscribes').select('email');
        const unsubscribedEmails = new Set((unsubscribed || []).map((u) => u.email.toLowerCase()));
        recipientEmails = recipientEmails.filter((email) => !unsubscribedEmails.has(email.toLowerCase()));

        // Get user IDs for recipients
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const emailToUserId = new Map<string, string>();
        authUsers?.users.forEach((u) => {
          if (u.email) {
            emailToUserId.set(u.email.toLowerCase(), u.id);
          }
        });

        // Send emails
        let sentCount = 0;
        let failedCount = 0;
        const batchSize = 50;

        for (let i = 0; i < recipientEmails.length; i += batchSize) {
          const batch = recipientEmails.slice(i, i + batchSize);

          // Create recipient records
          const recipientRecords = batch.map((email) => ({
            campaign_id: campaign.id,
            email,
            user_id: emailToUserId.get(email.toLowerCase()) || null,
            sent_status: 'pending',
          }));

          const { data: recipients } = await supabaseAdmin
            .from('email_recipients')
            .insert(recipientRecords)
            .select();

          if (recipients) {
            for (const recipient of recipients) {
              try {
                const emailHTML = generateEmailHTML({
                  htmlContent: campaign.html_content,
                  trackingToken: recipient.tracking_token,
                });

                await sendEmail({
                  to: recipient.email,
                  subject: campaign.subject,
                  html: emailHTML,
                  text: campaign.text_content || '',
                });

                await supabaseAdmin
                  .from('email_recipients')
                  .update({
                    sent_status: 'sent',
                    sent_at: new Date().toISOString(),
                  })
                  .eq('id', recipient.id);

                sentCount++;
              } catch (error) {
                console.error(`Error sending email to ${recipient.email}:`, error);
                await supabaseAdmin
                  .from('email_recipients')
                  .update({
                    sent_status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                  })
                  .eq('id', recipient.id);
                failedCount++;
              }
            }
          }

          // Delay between batches
          if (i + batchSize < recipientEmails.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // Update campaign status
        await supabaseAdmin
          .from('email_campaigns')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            total_sent: sentCount,
            total_failed: failedCount,
          })
          .eq('id', campaign.id);

        processed++;
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        await supabaseAdmin
          .from('email_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaign.id);
      }
    }

    return NextResponse.json({ message: 'Processed scheduled campaigns', processed });
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    return NextResponse.json({ error: 'Failed to process scheduled emails' }, { status: 500 });
  }
}

