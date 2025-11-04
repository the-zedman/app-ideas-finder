import { NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: 'ap-southeast-2', // Asia Pacific (Sydney)
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, subject, message, recaptchaToken } = await request.json();

    // Verify reCAPTCHA
    const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidRecaptcha) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email to admin (info@appideasfinder.com)
    const emailParams = {
      Source: 'App Ideas Finder <info@appideasfinder.com>',
      Destination: {
        ToAddresses: ['info@appideasfinder.com'],
      },
      Message: {
        Subject: {
          Data: `[Contact Form] ${subject}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      line-height: 1.6;
                      color: #333;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                    }
                    .header {
                      background-color: #88D18A;
                      color: white;
                      padding: 20px;
                      border-radius: 5px 5px 0 0;
                    }
                    .content {
                      background-color: #f9f9f9;
                      padding: 20px;
                      border: 1px solid #ddd;
                      border-radius: 0 0 5px 5px;
                    }
                    .field {
                      margin-bottom: 15px;
                    }
                    .label {
                      font-weight: bold;
                      color: #555;
                    }
                    .value {
                      margin-top: 5px;
                      padding: 10px;
                      background-color: white;
                      border-radius: 3px;
                      border: 1px solid #e0e0e0;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2>📬 New Contact Form Submission</h2>
                    </div>
                    <div class="content">
                      <div class="field">
                        <div class="label">From:</div>
                        <div class="value">${name}</div>
                      </div>
                      <div class="field">
                        <div class="label">Email:</div>
                        <div class="value"><a href="mailto:${email}">${email}</a></div>
                      </div>
                      <div class="field">
                        <div class="label">Subject:</div>
                        <div class="value">${subject}</div>
                      </div>
                      <div class="field">
                        <div class="label">Message:</div>
                        <div class="value">${message.replace(/\n/g, '<br>')}</div>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
New Contact Form Submission

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
            `,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const sendEmailCommand = new SendEmailCommand(emailParams);
    await sesClient.send(sendEmailCommand);

    // Send confirmation email to user
    const confirmationParams = {
      Source: 'App Ideas Finder <info@appideasfinder.com>',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Thank you for contacting App Ideas Finder',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      line-height: 1.6;
                      color: #333;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                    }
                    .header {
                      background-color: #88D18A;
                      color: white;
                      padding: 20px;
                      border-radius: 5px 5px 0 0;
                      text-align: center;
                    }
                    .content {
                      background-color: #f9f9f9;
                      padding: 30px;
                      border: 1px solid #ddd;
                      border-radius: 0 0 5px 5px;
                    }
                    .button {
                      display: inline-block;
                      background-color: #88D18A;
                      color: white;
                      padding: 12px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      margin-top: 20px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2>✅ Message Received</h2>
                    </div>
                    <div class="content">
                      <p>Hi ${name},</p>
                      <p>Thank you for reaching out to App Ideas Finder! We've received your message and will get back to you as soon as possible, typically within 24 hours.</p>
                      <p><strong>Your message:</strong></p>
                      <p style="background-color: white; padding: 15px; border-left: 3px solid #88D18A; margin: 15px 0;">
                        ${message.replace(/\n/g, '<br>')}
                      </p>
                      <p>In the meantime, feel free to explore our platform:</p>
                      <div style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://appideasfinder.com'}/landing-test" class="button">
                          Visit App Ideas Finder
                        </a>
                      </div>
                      <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        The App Ideas Finder Team
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `
Hi ${name},

Thank you for reaching out to App Ideas Finder! We've received your message and will get back to you as soon as possible, typically within 24 hours.

Your message:
${message}

In the meantime, feel free to explore our platform at ${process.env.NEXT_PUBLIC_APP_URL || 'https://appideasfinder.com'}/landing-test

Best regards,
The App Ideas Finder Team
            `,
            Charset: 'UTF-8',
          },
        },
      },
    };

    const sendConfirmationCommand = new SendEmailCommand(confirmationParams);
    await sesClient.send(sendConfirmationCommand);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

