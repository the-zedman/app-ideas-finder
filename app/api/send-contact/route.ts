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
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <meta http-equiv="X-UA-Compatible" content="IE=edge">
                  <title>Thank You - App Ideas Finder</title>
                  <!--[if mso]>
                  <noscript>
                    <xml>
                      <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                      </o:OfficeDocumentSettings>
                    </xml>
                  </noscript>
                  <![endif]-->
                  <style>
                    @media only screen and (max-width: 600px) {
                      .mobile-padding { padding: 15px !important; }
                      .mobile-text { font-size: 16px !important; }
                      .mobile-header { font-size: 20px !important; }
                      .mobile-button { padding: 12px 20px !important; font-size: 14px !important; }
                      .mobile-table { width: 100% !important; max-width: 100% !important; }
                    }
                  </style>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                    <tr>
                      <td align="center" style="padding: 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;" class="mobile-table">
                          <!-- Header with Logo and App Name -->
                          <tr>
                            <td style="text-align: center; padding: 20px 0; border-bottom: 3px solid #f78937;" class="mobile-padding">
                              <img src="https://www.appideasfinder.com/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png" alt="App Ideas Finder Logo" width="80" height="80" style="display: block; margin: 0 auto 15px auto; border: 0; outline: none; max-width: 80px; height: auto;">
                              <h1 style="color: #0a3a5f; margin: 0; font-size: 24px; font-weight: bold;" class="mobile-header">App Ideas Finder</h1>
                            </td>
                          </tr>
                          
                          <!-- Main Content -->
                          <tr>
                            <td style="text-align: center; padding: 30px 20px;" class="mobile-padding">
                              <h2 style="color: #0a3a5f; margin: 0 0 10px 0; font-size: 28px;" class="mobile-header">Thank you for contacting us!</h2>
                              <p style="color: #f78937; font-size: 18px; font-weight: bold; margin: 0;" class="mobile-text">We've received your message</p>
                            </td>
                          </tr>
                          
                          <!-- Message Box -->
                          <tr>
                            <td style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;" class="mobile-padding">
                              <h3 style="color: #0a3a5f; margin: 0 0 15px 0; font-size: 20px;" class="mobile-header">Hi ${name},</h3>
                              <p style="color: #666; margin: 0 0 15px 0;" class="mobile-text">
                                Thank you for reaching out! We've received your message and will get back to you as soon as possible, typically within 24 hours.
                              </p>
                              <div style="background-color: #ffffff; padding: 15px; border-left: 3px solid #f78937; margin: 15px 0;">
                                <p style="color: #666; margin: 0 0 10px 0; font-weight: bold;">Your message:</p>
                                <p style="color: #666; margin: 0;" class="mobile-text">${message.replace(/\n/g, '<br>')}</p>
                              </div>
                            </td>
                          </tr>
                          
                          <!-- Footer -->
                          <tr>
                            <td style="text-align: center; padding: 30px 20px;" class="mobile-padding">
                              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;" class="mobile-text">
                                In the meantime, feel free to explore our platform:
                              </p>
                              
                              <!-- CTA Button -->
                              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 20px auto;">
                                <tr>
                                  <td style="padding: 0 10px;">
                                    <a href="https://www.appideasfinder.com" style="display: inline-block; background-color: #f78937; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;" class="mobile-button">
                                      Visit App Ideas Finder
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Footer -->
                              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
                                  Best regards,<br>
                                  The App Ideas Finder Team
                                </p>
                                <p style="color: #999; font-size: 11px; margin: 0;">
                                  © 2025 App Ideas Finder. All rights reserved.
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
              </html>
            `,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `Hi ${name},

Thank you for reaching out to App Ideas Finder! We've received your message and will get back to you as soon as possible, typically within 24 hours.

Your message:
${message}

In the meantime, feel free to explore our platform at https://www.appideasfinder.com

Best regards,
The App Ideas Finder Team`,
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

