import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type;
        
        if (!userId) {
          console.error('No user_id in session metadata');
          break;
        }
        
        console.log(`Checkout completed for user ${userId}, plan: ${planType}`);
        
        // Handle different payment types
        if (planType === 'trial') {
          // Trial payment completed - activate trial
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 3);
          
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'trial',
              trial_start_date: new Date().toISOString(),
              trial_end_date: trialEndDate.toISOString(),
              current_period_start: new Date().toISOString(),
              current_period_end: trialEndDate.toISOString(),
              stripe_subscription_id: session.subscription as string || null,
            })
            .eq('user_id', userId);
          
          // Set usage limit to 10 for trial
          await supabase
            .from('monthly_usage')
            .update({
              searches_limit: 10,
              period_end: trialEndDate.toISOString(),
            })
            .eq('user_id', userId);
            
        } else if (planType === 'search_pack') {
          // Search pack purchased - add to search_packs table
          await supabase
            .from('search_packs')
            .insert({
              user_id: userId,
              searches_purchased: 50,
              searches_remaining: 50,
              price_paid: (session.amount_total || 0) / 100,
              expires_at: null, // Never expires
            });
            
        } else if (session.subscription) {
          // Subscription created - will be handled by subscription.created event
          console.log('Subscription will be handled by subscription.created event');
        }
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        
        if (!userId) {
          // Try to find user by customer ID
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .maybeSingle();
          
          if (!subData) {
            console.error('No user found for subscription');
            break;
          }
        }
        
        const periodStart = new Date((subscription as any).current_period_start * 1000);
        const periodEnd = new Date((subscription as any).current_period_end * 1000);
        
        // Determine plan type from price ID
        const priceId = subscription.items.data[0]?.price.id;
        let planId = 'core_monthly';
        let searchesLimit = 75;
        
        if (priceId === process.env.STRIPE_PRICE_CORE_MONTHLY) {
          planId = 'core_monthly';
          searchesLimit = 75;
        } else if (priceId === process.env.STRIPE_PRICE_CORE_ANNUAL) {
          planId = 'core_annual';
          searchesLimit = 75;
        } else if (priceId === process.env.STRIPE_PRICE_PRIME_MONTHLY) {
          planId = 'prime_monthly';
          searchesLimit = 225;
        } else if (priceId === process.env.STRIPE_PRICE_PRIME_ANNUAL) {
          planId = 'prime_annual';
          searchesLimit = 225;
        }
        
        const status = subscription.status === 'active' ? 'active' : 
                      subscription.status === 'trialing' ? 'trial' : 
                      subscription.status === 'canceled' ? 'cancelled' : 'expired';
        
        // Update user subscription
        await supabase
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: status,
            stripe_subscription_id: subscription.id,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer as string);
        
        // Update usage limits
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .maybeSingle();
        
        if (subData) {
          await supabase
            .from('monthly_usage')
            .update({
              searches_limit: searchesLimit,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString(),
            })
            .eq('user_id', subData.user_id);
        }
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Mark subscription as cancelled
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        console.error('Payment failed for subscription:', invoice.subscription);
        
        // Could send email notification here or update status
        if (invoice.subscription) {
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'expired',
            })
            .eq('stripe_subscription_id', invoice.subscription as string);
        }
        
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

