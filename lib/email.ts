import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
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
};

export async function sendEmail({ to, subject, html, text }: EmailPayload) {
  if (!sesClient) {
    console.warn('SES client not configured; skipping email send.');
    return;
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: SOURCE_EMAIL,
    Destination: {
      ToAddresses: toAddresses,
    },
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
          Data: text || '',
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}

export async function sendAdminAlert(subject: string, html: string, text?: string) {
  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject,
    html,
    text,
  });
}

