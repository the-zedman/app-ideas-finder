import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendAdminAlert } from '@/lib/email';

const DEFAULT_REDIRECT = '/pricing';
const SIGNUP_REDIRECT = '/pricing';

const decodeValue = (value: string | null) => {
  if (!value) return null;
  let decoded = value;
  for (let i = 0; i < 2; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      break;
    }
  }
    return decoded;
};

const parseParams = (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const hashParams = new URLSearchParams(
    request.nextUrl.hash ? request.nextUrl.hash.replace(/^#/, '') : ''
  );
  return {
    code: decodeValue(searchParams.get('code') || hashParams.get('code')),
    type: decodeValue(searchParams.get('type') || hashParams.get('type')),
    next: decodeValue(searchParams.get('next') || hashParams.get('next')),
  };
};

const resolveNextPath = (
  next: string | null,
  fallback: string,
  origin: string
): string => {
  if (!next) return fallback;
  if (next.startsWith('http://') || next.startsWith('https://')) {
    try {
      const url = new URL(next);
      if (url.origin === origin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
  if (!next.startsWith('/')) return fallback;
  try {
    new URL(next, origin);
    return next;
  } catch {
    return fallback;
  }
};

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const { code, type, next } = parseParams(request);
  const fallback = type === 'signup' ? SIGNUP_REDIRECT : DEFAULT_REDIRECT;
  const nextPath = resolveNextPath(next, fallback, origin);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Use implicit flow to avoid PKCE code verifier issues with magic links
          flowType: 'implicit',
        },
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      if (type === 'signup' && data?.user?.email) {
        const email = data.user.email;
        const text = `New signup: ${email}\nUser ID: ${data.user.id}\nSigned up at: ${new Date().toISOString()}`;
        const html = `
          <h2>🎉 New Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>User ID:</strong> ${data.user.id}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `;
        sendAdminAlert(`[New Signup] ${email}`, html, text).catch((err) =>
          console.error('Failed to send signup alert:', err)
        );
      }

      const cookieOverride = cookieStore.get('pending_signup_redirect')?.value;
      const finalPath =
        (cookieOverride && resolveNextPath(cookieOverride, SIGNUP_REDIRECT, origin)) ||
        nextPath ||
        DEFAULT_REDIRECT;

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const baseUrl = isLocalEnv
        ? origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : origin;

      const redirectUrl = new URL(finalPath, baseUrl);
      const response = NextResponse.redirect(redirectUrl);

      try {
        response.cookies.delete('pending_signup_redirect');
      } catch (err) {
        console.warn('Failed to clear pending signup redirect cookie', err);
      }

      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
