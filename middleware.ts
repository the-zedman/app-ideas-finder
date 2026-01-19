import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only intercept the root path
  if (request.nextUrl.pathname === '/') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Domain For Sale - App Ideas Finder</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #333;
    }
    .container {
      text-align: center;
      max-width: 600px;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 60px 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }
    h2 {
      font-size: 1.5rem;
      margin-bottom: 30px;
      font-weight: 400;
      color: #666;
    }
    .message {
      font-size: 1.1rem;
      line-height: 1.8;
      margin-bottom: 40px;
      color: #444;
    }
    .contact {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      margin-top: 30px;
      border: 1px solid #e0e0e0;
    }
    .contact p {
      margin-bottom: 10px;
    }
    .contact p:last-child {
      margin-bottom: 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
      border-bottom: 1px solid #2563eb;
    }
    a:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>App Ideas Finder</h1>
    <h2>This Domain Is For Sale</h2>
    <div class="message">
      <p>This website is no longer active.</p>
      <p>The domain <strong>appideasfinder.com</strong> is available for purchase.</p>
    </div>
    <div class="contact">
      <p style="font-weight: 600; color: #333; margin-bottom: 10px;">
        Interested in purchasing this domain?
      </p>
      <p style="margin-bottom: 15px; color: #666;">
        Please contact us to discuss.
      </p>
      <p style="margin-top: 20px; font-size: 1rem;">
        <a href="mailto:contact@appideasfinder.com">contact@appideasfinder.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  }

  // For all other paths, continue normally
  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
