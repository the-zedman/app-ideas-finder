import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { stripe, STRIPE_PRICES } from '@/lib/stripe';

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
    
    const { priceId: clientPriceId, planType, successUrl, cancelUrl } = await request.json();
    
    // Map plan type to price ID from environment variables
    const priceIdMap: { [key: string]: string } = {
      'trial': process.env.STRIPE_PRICE_TRIAL || '',
      'core_monthly': process.env.STRIPE_PRICE_CORE_MONTHLY || '',
      'core_annual': process.env.STRIPE_PRICE_CORE_ANNUAL || '',
      'prime_monthly': process.env.STRIPE_PRICE_PRIME_MONTHLY || '',
      'prime_annual': process.env.STRIPE_PRICE_PRIME_ANNUAL || '',
      'search_pack': process.env.STRIPE_PRICE_SEARCH_PACK || '',
    };
    
    // Use client-provided priceId if available, otherwise look up by plan type
    const priceId = clientPriceId || priceIdMap[planType];
    
    if (!priceId) {
      return NextResponse.json({ 
        error: 'Price ID not configured', 
        details: `No price ID found for plan type: ${planType}` 
      }, { status: 400 });
    }
    
    // Check if Stripe is initialized
    if (!stripe) {
      console.error('Stripe is not initialized - STRIPE_SECRET_KEY is missing');
      return NextResponse.json({ 
        error: 'Payment service not configured', 
        details: 'Stripe is not properly configured' 
      }, { status: 500 });
    }
    
    // Get or create Stripe customer
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    let customerId = subscription?.stripe_customer_id;
    
    // Create customer if doesn't exist
    if (!customerId) {
      console.log(`Creating Stripe customer for user ${user.id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      
      customerId = customer.id;
      console.log(`Created Stripe customer ${customerId} for user ${user.id}`);
      
      // Update subscription with customer ID if subscription exists
      // If no subscription exists, we'll create it when the checkout completes
      if (subscription) {
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.warn('Could not update subscription with customer ID:', updateError);
          // This is okay - the subscription will be created/updated when checkout completes
        } else {
          console.log(`Updated subscription with customer ID ${customerId}`);
        }
      } else {
        console.log('No subscription record exists yet - will be created when checkout completes');
      }
    }
    
    // Determine if this is a subscription or one-time payment
    const isSubscription = planType !== 'trial' && planType !== 'search_pack';
    
    // Create checkout session
    console.log(`Creating checkout session for plan type: ${planType}, price ID: ${priceId}`);
    const sessionConfig: any = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl || `${request.headers.get('origin')}/billing?success=true`,
      cancel_url: cancelUrl || `${request.headers.get('origin')}/billing?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan_type: planType,
      },
    };
    
    // For subscriptions, add trial period if applicable
    if (isSubscription && planType === 'trial') {
      sessionConfig.subscription_data = {
        trial_period_days: 3,
      };
    }
    
    console.log('Checkout session config:', JSON.stringify(sessionConfig, null, 2));
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log(`Checkout session created: ${session.id}`);
    
    return NextResponse.json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session', 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}

