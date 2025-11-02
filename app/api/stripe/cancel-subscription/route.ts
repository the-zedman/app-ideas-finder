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
    
    // Get user's subscription
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    
    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    
    // Update status in database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period'
    });
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

