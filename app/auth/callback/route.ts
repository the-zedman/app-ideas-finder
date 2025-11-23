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
    
    if (!error && data?.user) {
      // Get affiliate ref from multiple sources
      // Priority: URL params > User metadata > Cookie
      const urlParams = new URL(request.url).searchParams;
      const refFromUrl = urlParams.get('ref') || urlParams.get('affiliate_ref');
      const affiliateRef = cookieStore.get('affiliate_ref')?.value;
      const refFromMetadata = data.user?.user_metadata?.affiliate_ref;
      
      // URL params take priority (most reliable through OAuth/magic link redirects)
      // Then check user metadata (stored when magic link was requested)
      // Finally check cookie
      const finalAffiliateRef = refFromUrl || refFromMetadata || affiliateRef;
      
      console.log(`[auth/callback] Affiliate ref sources:`, {
        refFromUrl,
        refFromMetadata,
        affiliateRef,
        finalAffiliateRef
      });
      
      // Check if this is a new user (signup) by checking:
      // 1. type === 'signup'
      // 2. User was created recently (within last 60 seconds)
      // 3. No existing affiliate_conversions record for this user
      const userCreatedAt = new Date(data.user.created_at);
      const now = new Date();
      const secondsSinceCreation = (now.getTime() - userCreatedAt.getTime()) / 1000;
      const isRecentlyCreated = secondsSinceCreation < 60;
      
      // Check if affiliate conversion already exists for this user
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      let existingConversion = null;
      if (serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          );
          const { data: conversionData } = await supabaseAdmin
            .from('affiliate_conversions')
            .select('id')
            .eq('referred_user_id', data.user.id)
            .maybeSingle();
          existingConversion = conversionData;
        } catch (err) {
          console.error('[auth/callback] Error checking existing conversion:', err);
        }
      }
      
      const isNewUser = type === 'signup' || (isRecentlyCreated && !existingConversion);
      
      // Also check if we should process affiliate even if user wasn't just created
      // This handles cases where magic link was clicked later
      const shouldProcessAffiliate = finalAffiliateRef && !existingConversion && data?.user;
      
      console.log(`[auth/callback] User check:`, {
        userId: data.user.id,
        type,
        secondsSinceCreation,
        isRecentlyCreated,
        existingConversion: !!existingConversion,
        isNewUser,
        shouldProcessAffiliate,
        finalAffiliateRef: finalAffiliateRef || 'none'
      });
      
      // Handle affiliate referral tracking for new signups
      // Process if: (1) it's a new user signup, OR (2) we have affiliate ref and no existing conversion
      if (shouldProcessAffiliate) {
        console.log(`[auth/callback] ✅ Processing affiliate referral: ${finalAffiliateRef} for user ${data.user.id} (isNewUser: ${isNewUser}, type: ${type})`);
        
        if (serviceRoleKey) {
          // Process affiliate referral
          try {
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceRoleKey
            );
            
            // Verify the affiliate code exists
            const { data: affiliateData, error: affiliateCheckError } = await supabaseAdmin
              .from('user_affiliates')
              .select('user_id, affiliate_code, total_referrals')
              .eq('affiliate_code', finalAffiliateRef)
              .single();
            
            console.log(`[auth/callback] Affiliate code check:`, { 
              affiliateRef: finalAffiliateRef, 
              found: !!affiliateData, 
              currentTotalReferrals: affiliateData?.total_referrals,
              error: affiliateCheckError?.message 
            });
            
            if (affiliateData) {
                // Create affiliate conversion record
                const { error: conversionError } = await supabaseAdmin
                  .from('affiliate_conversions')
                  .insert({
                    affiliate_code: finalAffiliateRef,
                    referred_user_id: data.user.id,
                    converted_to_paid: false,
                    bonus_awarded: false
                  });
                
                if (!conversionError) {
                  // Update total_referrals count - always use manual update for reliability
                  console.log(`[auth/callback] Updating total_referrals for affiliate ${finalAffiliateRef}`);
                  
                  // First, get current count
                  const { data: currentData, error: fetchError } = await supabaseAdmin
                    .from('user_affiliates')
                    .select('total_referrals, user_id')
                    .eq('affiliate_code', finalAffiliateRef)
                    .single();
                  
                  console.log(`[auth/callback] Current affiliate data before update:`, { 
                    currentData, 
                    fetchError: fetchError?.message,
                    currentCount: currentData?.total_referrals 
                  });
                  
                  if (currentData) {
                    const newCount = (currentData.total_referrals || 0) + 1;
                    const { data: updateData, error: updateError } = await supabaseAdmin
                      .from('user_affiliates')
                      .update({ total_referrals: newCount })
                      .eq('affiliate_code', finalAffiliateRef)
                      .select('total_referrals');
                    
                    if (updateError) {
                      console.error('[auth/callback] Error updating total_referrals:', updateError);
                    } else {
                      console.log(`[auth/callback] ✅ Successfully updated total_referrals from ${currentData.total_referrals || 0} to ${newCount} for affiliate ${finalAffiliateRef} (user_id: ${currentData.user_id})`);
                      console.log(`[auth/callback] Verification - updated record:`, updateData);
                    }
                  } else {
                    console.error('[auth/callback] ❌ Could not fetch current affiliate data for update. Fetch error:', fetchError);
                  }
                  
                  // Also try RPC as backup (but don't rely on it)
                  try {
                    const { error: rpcError } = await supabaseAdmin.rpc('increment_affiliate_referrals', {
                      affiliate_code_param: finalAffiliateRef
                    });
                    if (!rpcError) {
                      console.log(`[auth/callback] RPC also succeeded for affiliate ${finalAffiliateRef}`);
                    }
                  } catch (rpcException) {
                    // Ignore RPC errors, we already did manual update
                    console.log(`[auth/callback] RPC failed (expected if function doesn't exist), but manual update should have worked`);
                  }
                  
                  console.log(`[auth/callback] ✅ Affiliate referral tracked: ${finalAffiliateRef} -> ${data.user.id}`);
                } else {
                  console.error('[auth/callback] ❌ Error creating affiliate conversion:', conversionError);
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
          const text = `New signup: ${email}\nUser ID: ${data.user.id}\nSigned up at: ${new Date().toISOString()}${finalAffiliateRef ? `\nReferred by: ${finalAffiliateRef}` : ''}`;
        const html = `
          <h2>🎉 New Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>User ID:</strong> ${data.user.id}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${finalAffiliateRef ? `<p><strong>Referred by affiliate code:</strong> ${finalAffiliateRef}</p>` : ''}
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

      // For signups, check if user is on waitlist to determine redirect
      // Waitlist users → /homezone, Normal users → /pricing
      if ((type === 'signup' || isNewUser) && data?.user?.email) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          try {
            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceRoleKey
            );
            
            // Check if user email is in waitlist
            const { data: waitlistEntry } = await supabaseAdmin
              .from('waitlist')
              .select('email')
              .eq('email', data.user.email.toLowerCase())
              .single();
            
            if (waitlistEntry) {
              // Waitlist user → redirect to /homezone
              finalPath = '/homezone';
              console.log(`[auth/callback] Waitlist user ${data.user.email} signing up, redirecting to /homezone`);
            } else {
              // Normal user → redirect to /pricing
              finalPath = '/pricing';
              console.log(`[auth/callback] Normal user ${data.user.email} signing up, redirecting to /pricing`);
            }
          } catch (error) {
            console.error(`[auth/callback] Error checking waitlist for ${data.user.id}:`, error);
            // On error, default to pricing for normal users
            finalPath = '/pricing';
          }
        }
      }

      // For logins (not signups), always check subscription status to determine redirect
      // This ensures users with subscriptions go to /homezone, not /pricing
      if (!cookieOverride && type !== 'signup' && !isNewUser && data?.user) {
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
              // User has no subscription - redirect to /pricing
              finalPath = '/pricing';
              console.log(`[auth/callback] User ${data.user.id} has no subscription, redirecting to /pricing`);
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
