import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_REDIRECT = '/homezone';
const SIGNUP_REDIRECT = '/billing?onboarding=true&trial=true';

const resolveNextPath = (
  value: string | null,
  origin: string,
  fallback: string = DEFAULT_REDIRECT
): string => {
  if (!value) return fallback;
  let decoded = value;

  // Attempt to decode multiple times to handle double-encoded values
  for (let i = 0; i < 2; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      break;
    }
  }

  // If decoded string is an absolute URL, ensure it points to our origin
  if (/^https?:\/\//i.test(decoded)) {
    try {
      const url = new URL(decoded);
      if (url.origin === origin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  // Ensure we only redirect to relative paths
  if (!decoded.startsWith('/')) {
    return fallback;
  }

  return decoded || fallback;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const eventType = searchParams.get('type');
  const nextParam = searchParams.get('next');
  const fallback = eventType === 'signup' ? SIGNUP_REDIRECT : DEFAULT_REDIRECT;
  const nextPath = resolveNextPath(nextParam, origin, fallback);

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
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const baseUrl = isLocalEnv
        ? origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : origin;

      const redirectUrl = new URL(nextPath, baseUrl);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
