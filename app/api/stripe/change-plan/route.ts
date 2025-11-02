import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

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
    
    const { newPriceId, planType } = await request.json();
    
    if (!newPriceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }
    
    // Get user's subscription
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, plan_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    // Get the current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    // Update the subscription with new price
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Pro-rate the change
    });
    
    // Update plan in database (webhook will handle the full update)
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ plan_id: planType })
      .eq('user_id', user.id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription updated successfully'
    });
    
  } catch (error) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Failed to change plan', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

