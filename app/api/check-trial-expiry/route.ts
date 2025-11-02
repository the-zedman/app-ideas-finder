import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

// This endpoint is called when a user logs in or loads the app
// It checks if their trial has expired and converts them to Core Monthly
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Get current user
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return allCookies },
        setAll() {},
      },
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Get user's subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!subscription) {
      return NextResponse.json({ trialExpired: false });
    }
    
    // Check if trial has expired
    if (subscription.status === 'trial' && subscription.trial_end_date) {
      const trialEnd = new Date(subscription.trial_end_date);
      const now = new Date();
      
      if (now > trialEnd) {
        console.log(`Trial expired for user ${user.id}, converting to Core Monthly`);
        
        // Only convert if we have Stripe set up and a customer ID
        if (stripe && subscription.stripe_customer_id) {
          try {
            // Create Core Monthly subscription in Stripe
            const stripeSubscription = await stripe.subscriptions.create({
              customer: subscription.stripe_customer_id,
              items: [{ price: process.env.STRIPE_PRICE_CORE_MONTHLY! }],
              metadata: {
                user_id: user.id,
                plan_type: 'core_monthly',
                converted_from_trial: 'true',
              },
            });
            
            // Update subscription in database
            const periodStart = new Date((stripeSubscription as any).current_period_start * 1000);
            const periodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
            
            await supabaseAdmin
              .from('user_subscriptions')
              .update({
                plan_id: 'core_monthly',
                status: 'active',
                stripe_subscription_id: stripeSubscription.id,
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
              })
              .eq('user_id', user.id);
            
            // Update usage limits to Core plan (75 searches)
            await supabaseAdmin
              .from('monthly_usage')
              .update({
                searches_limit: 75,
                searches_used: 0, // Reset for new month
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
              })
              .eq('user_id', user.id);
            
            return NextResponse.json({ 
              trialExpired: true, 
              converted: true,
              message: 'Trial expired and converted to Core Monthly'
            });
          } catch (error) {
            console.error('Error converting trial:', error);
            
            // Mark as expired even if Stripe fails
            await supabaseAdmin
              .from('user_subscriptions')
              .update({ status: 'expired' })
              .eq('user_id', user.id);
            
            return NextResponse.json({ 
              trialExpired: true, 
              converted: false,
              error: 'Failed to create subscription'
            });
          }
        } else {
          // Mark as expired if no Stripe setup
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ status: 'expired' })
            .eq('user_id', user.id);
          
          return NextResponse.json({ 
            trialExpired: true, 
            converted: false,
            message: 'Trial expired but Stripe not configured'
          });
        }
      }
    }
    
    return NextResponse.json({ trialExpired: false });
    
  } catch (error) {
    console.error('Error checking trial expiry:', error);
    return NextResponse.json(
      { error: 'Failed to check trial expiry', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

