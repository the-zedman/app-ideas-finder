import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sendAdminAlert } from '@/lib/email';
import { hasActiveSubscription } from '@/lib/check-subscription';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_REDIRECT = '/homezone';
const SIGNUP_REDIRECT = '/homezone';

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
      // Handle affiliate referral tracking for new signups
      if (type === 'signup' && data?.user) {
        const affiliateRef = cookieStore.get('affiliate_ref')?.value;
        
        if (affiliateRef) {
          // Process affiliate referral
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (serviceRoleKey) {
            try {
              const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceRoleKey
              );
              
              // Verify the affiliate code exists
              const { data: affiliateData } = await supabaseAdmin
                .from('user_affiliates')
                .select('user_id')
                .eq('affiliate_code', affiliateRef)
                .single();
              
              if (affiliateData) {
                // Create affiliate conversion record
                const { error: conversionError } = await supabaseAdmin
                  .from('affiliate_conversions')
                  .insert({
                    affiliate_code: affiliateRef,
                    referred_user_id: data.user.id,
                    converted_to_paid: false,
                    bonus_awarded: false
                  });
                
                if (!conversionError) {
                  // Update total_referrals count
                  try {
                    const { error: rpcError } = await supabaseAdmin.rpc('increment_affiliate_referrals', {
                      affiliate_code_param: affiliateRef
                    });
                    
                    if (rpcError) {
                      // If RPC doesn't exist, manually update
                      console.warn('[auth/callback] RPC function failed, using manual update:', rpcError);
                      const { data: currentData } = await supabaseAdmin
                        .from('user_affiliates')
                        .select('total_referrals')
                        .eq('affiliate_code', affiliateRef)
                        .single();
                      
                      if (currentData) {
                        await supabaseAdmin
                          .from('user_affiliates')
                          .update({ total_referrals: (currentData.total_referrals || 0) + 1 })
                          .eq('affiliate_code', affiliateRef);
                      }
                    }
                  } catch (rpcException) {
                    // If RPC doesn't exist, manually update
                    console.warn('[auth/callback] RPC function exception, using manual update:', rpcException);
                    const { data: currentData } = await supabaseAdmin
                      .from('user_affiliates')
                      .select('total_referrals')
                      .eq('affiliate_code', affiliateRef)
                      .single();
                    
                    if (currentData) {
                      await supabaseAdmin
                        .from('user_affiliates')
                        .update({ total_referrals: (currentData.total_referrals || 0) + 1 })
                        .eq('affiliate_code', affiliateRef);
                    }
                  }
                  
                  console.log(`[auth/callback] Affiliate referral tracked: ${affiliateRef} -> ${data.user.id}`);
                } else {
                  console.error('[auth/callback] Error creating affiliate conversion:', conversionError);
                }
              } else {
                console.warn(`[auth/callback] Invalid affiliate code: ${affiliateRef}`);
              }
            } catch (affiliateError) {
              console.error('[auth/callback] Error processing affiliate referral:', affiliateError);
            }
          }
          
          // Clear the affiliate cookie after processing
          cookieStore.delete('affiliate_ref');
        }
        
        if (data.user.email) {
          const email = data.user.email;
          const text = `New signup: ${email}\nUser ID: ${data.user.id}\nSigned up at: ${new Date().toISOString()}${affiliateRef ? `\nReferred by: ${affiliateRef}` : ''}`;
          const html = `
            <h2>🎉 New Signup</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>User ID:</strong> ${data.user.id}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${affiliateRef ? `<p><strong>Referred by affiliate code:</strong> ${affiliateRef}</p>` : ''}
          `;
          sendAdminAlert(`[New Signup] ${email}`, html, text).catch((err) =>
            console.error('Failed to send signup alert:', err)
          );
        }
      }

      const cookieOverride = cookieStore.get('pending_signup_redirect')?.value;
      let finalPath =
        (cookieOverride && resolveNextPath(cookieOverride, SIGNUP_REDIRECT, origin)) ||
        nextPath ||
        DEFAULT_REDIRECT;

      // For logins (not signups), always check subscription status to determine redirect
      // This ensures users with subscriptions go to /homezone, not /pricing
      if (!cookieOverride && type !== 'signup' && data?.user) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          try {
            console.log(`[auth/callback] Checking subscription for user ${data.user.id} (type: ${type || 'null'}, nextPath: ${nextPath || 'null'})`);
            const userHasSubscription = await hasActiveSubscription(
              data.user.id,
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceRoleKey,
              data.user.email
            );
            if (userHasSubscription) {
              // User has subscription - redirect to /homezone
              finalPath = '/homezone';
              console.log(`[auth/callback] User ${data.user.id} has subscription, redirecting to /homezone`);
            } else {
              // User has no subscription - redirect to /homezone (let them see the dashboard)
              // Middleware will handle redirecting to pricing if needed
              finalPath = '/homezone';
              console.log(`[auth/callback] User ${data.user.id} has no subscription, redirecting to /homezone`);
            }
          } catch (error) {
            console.error(`[auth/callback] Error checking subscription for ${data.user.id}:`, error);
            // On error, redirect to pricing to be safe
            finalPath = '/pricing';
          }
        }
      }

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
        // Also clear affiliate_ref cookie after processing
        response.cookies.delete('affiliate_ref');
      } catch (err) {
        console.warn('Failed to clear cookies', err);
      }

      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
