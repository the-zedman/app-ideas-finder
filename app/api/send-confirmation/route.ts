import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Configure AWS SES
const sesClient = new SESClient({
  region: 'ap-southeast-2', // Asia Pacific (Sydney)
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Email template
    const emailParams = {
      Source: 'info@appideasfinder.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'You\'re on the App Ideas Finder waitlist',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>Welcome to App Ideas Finder</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #0a3a5f; margin-bottom: 10px;">Thanks for joining our waitlist!</h1>
                    <p style="color: #f78937; font-size: 18px; font-weight: bold;">You're confirmed for early access</p>
                  </div>
                  
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #0a3a5f; margin-top: 0;">What happens next?</h2>
                    <ul style="color: #666;">
                      <li>We'll notify you as soon as early access opens</li>
                      <li>You'll be among the first to experience our AI-powered app idea generator</li>
                      <li>Get exclusive access to features before public launch</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #666; font-size: 14px;">
                      Thanks for joining our community of innovative developers!
                    </p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                      App Ideas Finder Team
                    </p>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Welcome to App Ideas Finder!

You're on the early access waitlist! We'll notify you as soon as early access opens.

What happens next:
- We'll notify you as soon as early access opens
- You'll be among the first to experience our AI-powered app idea generator  
- Get exclusive access to features before public launch

Thanks for joining our community of innovative developers!

App Ideas Finder Team`,
            Charset: 'UTF-8',
          },
        },
      },
    };

    // Send email
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);

    return NextResponse.json({ 
      success: true, 
      messageId: result.MessageId 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation email' }, 
      { status: 500 }
    );
  }
}
