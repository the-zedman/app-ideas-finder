/**
 * Email template utility for App Ideas Finder
 * Provides consistent header/footer and tracking pixel support
 */

export interface EmailTemplateOptions {
  subject: string;
  htmlContent: string;
  trackingToken?: string;
  replyTo?: string;
}

/**
 * Generate email HTML with header, content, footer, and tracking pixel
 */
export function generateEmailHTML({
  htmlContent,
  trackingToken,
}: {
  htmlContent: string;
  trackingToken?: string;
}): string {
  // Use tracking token in logo URL for open tracking
  // The tracking endpoint serves the logo image after recording the open
  const logoUrl = trackingToken
    ? `https://www.appideasfinder.com/api/admin/email/track-open?token=${trackingToken}`
    : 'https://www.appideasfinder.com/App%20Ideas%20Finder%20-%20logo%20-%20200x200.png';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>App Ideas Finder</title>
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
                    <img src="${logoUrl}" alt="App Ideas Finder Logo" width="80" height="80" style="display: block; margin: 0 auto 15px auto; border: 0; outline: none; max-width: 80px; height: auto;">
                    <h1 style="color: #0a3a5f; margin: 0; font-size: 24px; font-weight: bold;" class="mobile-header">App Ideas Finder</h1>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 30px 20px;" class="mobile-padding">
                    ${htmlContent}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="text-align: center; padding: 30px 20px;" class="mobile-padding">
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
                      <a href="https://www.appideasfinder.com/unsubscribe" style="color: #999; font-size: 10px; text-decoration: underline;">Unsubscribe</a>
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
  `;
}

