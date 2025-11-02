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
    
    const { priceId, planType, successUrl, cancelUrl } = await request.json();
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
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
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      
      customerId = customer.id;
      
      // Update subscription with customer ID
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }
    
    // Determine if this is a subscription or one-time payment
    const isSubscription = planType !== 'trial' && planType !== 'search_pack';
    
    // Create checkout session
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
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    return NextResponse.json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

