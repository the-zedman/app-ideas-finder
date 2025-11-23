import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Force region to ap-southeast-2 (Sydney) to match other email services
const REGION = 'ap-southeast-2';
const SOURCE_EMAIL = process.env.SES_SOURCE_EMAIL || 'App Ideas Finder <info@appideasfinder.com>';
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'info@appideasfinder.com';

const credentialsConfigured =
  Boolean(process.env.AWS_ACCESS_KEY_ID) && Boolean(process.env.AWS_SECRET_ACCESS_KEY);

const sesClient = credentialsConfigured
  ? new SESClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, text, replyTo }: EmailPayload) {
  if (!sesClient) {
    const error = new Error('SES client not configured - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set');
    console.error('SES client not configured; cannot send email.', error);
    throw error;
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: SOURCE_EMAIL,
    Destination: {
      ToAddresses: toAddresses,
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
        Text: {
          Data: text || html.replace(/<[^>]*>/g, '') || '',
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const result = await sesClient.send(command);
    console.log(`Email sent successfully to ${toAddresses.join(', ')}. MessageId: ${result.MessageId}`);
    return result;
  } catch (error: any) {
    console.error('SES send error:', error);
    
    // Provide more helpful error messages
    if (error.name === 'MessageRejected') {
      const errorMsg = error.message || 'Email rejected by SES';
      if (errorMsg.includes('not verified')) {
        throw new Error(
          `Email verification required. Please verify the sender email (${SOURCE_EMAIL}) and recipient email(s) in AWS SES. ` +
          `If SES is in sandbox mode, all recipient emails must be verified. Error: ${errorMsg}`
        );
      }
      throw new Error(`SES rejected the email: ${errorMsg}`);
    }
    
    throw error;
  }
}

export async function sendAdminAlert(subject: string, html: string, text?: string) {
  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject,
    html,
    text,
  });
}

