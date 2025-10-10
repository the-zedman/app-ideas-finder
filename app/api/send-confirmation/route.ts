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

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
  hourWindowMs: 60 * 60 * 1000, // 1 hour
  maxRequestsHour: 10, // 10 requests per hour
};

// Simple in-memory rate limiting (for production, use Redis or Vercel KV)
const rateLimitMap = new Map<string, { count: number; resetTime: number; hourCount: number; hourResetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  let rateLimit = rateLimitMap.get(key);
  
  if (!rateLimit || now > rateLimit.resetTime) {
    // Reset minute counter
    rateLimit = {
      count: 0,
      resetTime: now + RATE_LIMIT.windowMs,
      hourCount: rateLimit?.hourCount || 0,
      hourResetTime: rateLimit?.hourResetTime || now + RATE_LIMIT.hourWindowMs,
    };
  }
  
  if (now > rateLimit.hourResetTime) {
    // Reset hour counter
    rateLimit.hourCount = 0;
    rateLimit.hourResetTime = now + RATE_LIMIT.hourWindowMs;
  }
  
  // Check limits
  if (rateLimit.count >= RATE_LIMIT.maxRequests || rateLimit.hourCount >= RATE_LIMIT.maxRequestsHour) {
    rateLimitMap.set(key, rateLimit);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.min(rateLimit.resetTime, rateLimit.hourResetTime),
    };
  }
  
  // Increment counters
  rateLimit.count++;
  rateLimit.hourCount++;
  rateLimitMap.set(key, rateLimit);
  
  return {
    allowed: true,
    remaining: Math.min(
      RATE_LIMIT.maxRequests - rateLimit.count,
      RATE_LIMIT.maxRequestsHour - rateLimit.hourCount
    ),
    resetTime: rateLimit.resetTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               request.headers.get('cf-connecting-ip') ||
               'unknown';
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          }
        }
      );
    }

    const { email, unsubscribeToken, recaptchaToken } = await request.json();

    // Input validation
    if (!email || !unsubscribeToken || !recaptchaToken) {
      return NextResponse.json({ error: 'Email, unsubscribe token, and reCAPTCHA verification are required' }, { status: 400 });
    }

    // Verify reCAPTCHA
    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });

    const recaptchaData = await recaptchaResponse.json();
    
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Email template
    const emailParams = {
      Source: 'App Ideas Finder <info@appideasfinder.com>',
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
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <meta http-equiv="X-UA-Compatible" content="IE=edge">
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
                              <h2 style="color: #0a3a5f; margin: 0 0 10px 0; font-size: 28px;" class="mobile-header">Thanks for joining our waitlist!</h2>
                              <p style="color: #f78937; font-size: 18px; font-weight: bold; margin: 0;" class="mobile-text">You're confirmed for early access</p>
                            </td>
                          </tr>
                          
                          <!-- Info Box -->
                          <tr>
                            <td style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;" class="mobile-padding">
                              <h3 style="color: #0a3a5f; margin: 0 0 15px 0; font-size: 20px;" class="mobile-header">What happens next?</h3>
                              <ol style="color: #666; margin: 0; padding-left: 25px; list-style-type: decimal; list-style-position: outside;" class="mobile-text">
                                <li style="margin-bottom: 8px; display: list-item;">We'll notify you as soon as early access opens</li>
                                <li style="margin-bottom: 8px; display: list-item;">You'll be among the first to experience our AI-powered app idea generator</li>
                                <li style="margin-bottom: 0; display: list-item;">Get exclusive access to features before public launch</li>
                              </ol>
                            </td>
                          </tr>
                          
                          <!-- Footer -->
                          <tr>
                            <td style="text-align: center; padding: 30px 20px;" class="mobile-padding">
                              <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;" class="mobile-text">
                                Please consider joining our community of innovative developers here ...
                              </p>
                              
                              <!-- Social Media Links -->
                              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 20px auto;">
                                <tr>
                                  <td style="padding: 0 10px;">
                                    <a href="https://x.com/appideasfinder" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;" class="mobile-button">
                                      𝕏 Follow us on X
                                    </a>
                                  </td>
                                  <td style="padding: 0 10px;">
                                    <a href="https://discord.gg/nK2fNbe7" style="display: inline-block; background-color: #f78937; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;" class="mobile-button">
                                      <img src="https://www.appideasfinder.com/discord-white-logo.png" alt="Discord" width="20" height="20" style="display: inline-block; vertical-align: middle; margin-right: 8px; border: 0; outline: none; max-width: 20px; height: auto;">
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
                                <a href="https://www.appideasfinder.com/unsubscribe?token=${unsubscribeToken}" style="color: #999; font-size: 10px; text-decoration: underline;">Unsubscribe</a>
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

    // Send notification email to admin
    try {
      const notificationParams = {
        Source: 'App Ideas Finder <info@appideasfinder.com>',
        Destination: {
          ToAddresses: ['info@appideasfinder.com'],
        },
        Message: {
          Subject: {
            Data: 'New Waitlist Signup - App Ideas Finder',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <title>New Waitlist Signup</title>
                  </head>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #0a3a5f;">New Waitlist Signup</h2>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Domain:</strong> ${email.split('@')[1]}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
                    <p><strong>Unsubscribe Token:</strong> ${unsubscribeToken}</p>
                  </body>
                </html>
              `,
              Charset: 'UTF-8',
            },
            Text: {
              Data: `New Waitlist Signup\n\nEmail: ${email}\nDomain: ${email.split('@')[1]}\nTime: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}\nUnsubscribe Token: ${unsubscribeToken}`,
              Charset: 'UTF-8',
            },
          },
        },
      };

      const notificationCommand = new SendEmailCommand(notificationParams);
      await sesClient.send(notificationCommand);
    } catch (notificationError) {
      console.error('Error sending notification email:', notificationError);
      // Don't fail the main request if notification fails
    }

    return NextResponse.json({ 
      success: true, 
      messageId: result.MessageId,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      }
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send confirmation email' }, 
      { status: 500 }
    );
  }
}