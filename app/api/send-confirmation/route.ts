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
                  <!--[if mso]>
                  <noscript>
                    <xml>
                      <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                      </o:OfficeDocumentSettings>
                    </xml>
                  </noscript>
                  <![endif]-->
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
                    <tr>
                      <td align="center" style="padding: 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                          <!-- Header with Logo and App Name -->
                          <tr>
                            <td style="text-align: center; padding: 20px 0; border-bottom: 3px solid #f78937;">
                              <img src="https://app-ideas-finder-n20w78bwg-app-ideas-finder.vercel.app/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png" alt="App Ideas Finder Logo" width="80" height="80" style="display: block; margin: 0 auto 15px auto;">
                              <h1 style="color: #0a3a5f; margin: 0; font-size: 24px; font-weight: bold;">App Ideas Finder</h1>
                            </td>
                          </tr>
                          
                          <!-- Main Content -->
                          <tr>
                            <td style="text-align: center; padding: 30px 20px;">
                              <h2 style="color: #0a3a5f; margin: 0 0 10px 0; font-size: 28px;">Thanks for joining our waitlist!</h2>
                              <p style="color: #f78937; font-size: 18px; font-weight: bold; margin: 0;">You're confirmed for early access</p>
                            </td>
                          </tr>
                          
                          <!-- Info Box -->
                          <tr>
                            <td style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
                              <h3 style="color: #0a3a5f; margin: 0 0 15px 0; font-size: 20px;">What happens next?</h3>
                              <ol style="color: #666; margin: 0; padding-left: 25px; list-style-type: decimal; list-style-position: outside;">
                                <li style="margin-bottom: 8px; display: list-item;">We'll notify you as soon as early access opens</li>
                                <li style="margin-bottom: 8px; display: list-item;">You'll be among the first to experience our AI-powered app idea generator</li>
                                <li style="margin-bottom: 0; display: list-item;">Get exclusive access to features before public launch</li>
                              </ol>
                            </td>
                          </tr>
                          
                          <!-- Footer -->
                          <tr>
                            <td style="text-align: center; padding: 30px 20px;">
                              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                                Please consider joining our community of innovative developers here ...
                              </p>
                              
                              <!-- Social Media Links -->
                              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 20px auto;">
                                <tr>
                                  <td style="padding: 0 10px;">
                                    <a href="https://x.com/appideasfinder" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">
                                      𝕏 Follow us on X
                                    </a>
                                  </td>
                                  <td style="padding: 0 10px;">
                                    <a href="https://discord.gg/nK2fNbe7" style="display: inline-block; background-color: #f78937; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">
                                      <img src="https://app-ideas-finder-n20w78bwg-app-ideas-finder.vercel.app/discord-white-logo.png" alt="Discord" width="20" height="20" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                                      Join us on Discord
                                    </a>
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Privacy Message -->
                              <div style="text-align: center; margin-top: 30px;">
                                <span style="color: #888; font-size: 11px;">🔒 We respect your privacy. No spam, ever.</span>
                              </div>
                              
                              <!-- Unsubscribe Link -->
                              <div style="text-align: center; margin-top: 10px;">
                                <a href="https://app-ideas-finder-n20w78bwg-app-ideas-finder.vercel.app/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999; font-size: 10px; text-decoration: underline;">Unsubscribe</a>
                              </div>
                              
                              <!-- Footer -->
                              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
                                  App Ideas Finder Team
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
