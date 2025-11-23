import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Helper function to create affiliate commission
async function createAffiliateCommission(
  supabase: any,
  referredUserId: string,
  planId: string,
  amountPaid: number,
  subscriptionStart: Date,
  transactionType: 'subscription' | 'search_pack',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
) {
  try {
    // Find affiliate conversion for this user
    const { data: conversion } = await supabase
      .from('affiliate_conversions')
      .select('affiliate_code')
      .eq('referred_user_id', referredUserId)
      .maybeSingle();

    if (!conversion || !conversion.affiliate_code) {
      console.log(`[webhook] No affiliate conversion found for user ${referredUserId}`);
      return;
    }

    // Get affiliate owner
    const { data: affiliateData } = await supabase
      .from('user_affiliates')
      .select('user_id')
      .eq('affiliate_code', conversion.affiliate_code)
      .single();

    if (!affiliateData) {
      console.log(`[webhook] No affiliate found for code ${conversion.affiliate_code}`);
      return;
    }

    // Check if commission already exists
    const { data: existingCommission } = await supabase
      .from('affiliate_commissions')
      .select('id')
      .eq('referred_user_id', referredUserId)
      .eq('transaction_type', transactionType)
      .maybeSingle();

    if (existingCommission) {
      console.log(`[webhook] Commission already exists for user ${referredUserId}, transaction ${transactionType}`);
      return;
    }

    // Calculate commission (25%)
    const commissionRate = 25.00;
    const commissionAmount = Math.round((amountPaid * commissionRate / 100) * 100) / 100;

    // Only create commission if amount paid > 0 (no commission for 100% discount coupons)
    if (amountPaid <= 0 || commissionAmount <= 0) {
      console.log(`[webhook] Skipping commission creation: amountPaid=${amountPaid}, commissionAmount=${commissionAmount} (likely 100% discount coupon)`);
      return;
    }

    // Payment due date: 30 days after subscription starts
    const pendingUntil = new Date(subscriptionStart);
    pendingUntil.setDate(pendingUntil.getDate() + 30);

    // Create commission record
    const { error: commissionError } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_user_id: affiliateData.user_id,
        affiliate_code: conversion.affiliate_code,
        referred_user_id: referredUserId,
        transaction_type: transactionType,
        plan_id: planId,
        amount_paid: amountPaid,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        pending_until: pendingUntil.toISOString(),
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null
      });

    if (commissionError) {
      console.error(`[webhook] Error creating commission:`, commissionError);
    } else {
      // Update affiliate's pending commission total
      const { data: currentAffiliate } = await supabase
        .from('user_affiliates')
        .select('pending_commission')
        .eq('user_id', affiliateData.user_id)
        .single();

      if (currentAffiliate) {
        const newPending = (currentAffiliate.pending_commission || 0) + commissionAmount;
        await supabase
          .from('user_affiliates')
          .update({ pending_commission: newPending })
          .eq('user_id', affiliateData.user_id);

        // Update conversion to paid
        await supabase
          .from('affiliate_conversions')
          .update({ 
            converted_to_paid: true,
            conversion_date: subscriptionStart.toISOString()
          })
          .eq('referred_user_id', referredUserId);

        // Update paying_referrals count - only increment if commission was actually created (amountPaid > 0)
        const { data: affiliate } = await supabase
          .from('user_affiliates')
          .select('paying_referrals')
          .eq('user_id', affiliateData.user_id)
          .single();

        if (affiliate) {
          await supabase
            .from('user_affiliates')
            .update({ paying_referrals: (affiliate.paying_referrals || 0) + 1 })
            .eq('user_id', affiliateData.user_id);
        }

        console.log(`[webhook] ✅ Created commission $${commissionAmount} for affiliate ${conversion.affiliate_code}`);
      }
    }
  } catch (error) {
    console.error(`[webhook] Error in createAffiliateCommission:`, error);
  }
}

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
          const trialStart = new Date();
          
          // Upsert subscription (create if doesn't exist, update if it does)
          // Since auto-trial trigger is disabled, we need to create the record
          await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: 'trial',
              status: 'trial',
              trial_start_date: trialStart.toISOString(),
              trial_end_date: trialEndDate.toISOString(),
              current_period_start: trialStart.toISOString(),
              current_period_end: trialEndDate.toISOString(),
              stripe_customer_id: session.customer as string || null,
              stripe_subscription_id: session.subscription as string || null,
            }, {
              onConflict: 'user_id'
            });
          
          // Upsert usage record (create if doesn't exist, update if it does)
          await supabase
            .from('monthly_usage')
            .upsert({
              user_id: userId,
              period_start: trialStart.toISOString(),
              period_end: trialEndDate.toISOString(),
              searches_used: 0,
              searches_limit: 10,
            }, {
              onConflict: 'user_id,period_start'
            });
          
          // Create affiliate commission for trial
          const amountPaid = (session.amount_total || 0) / 100;
          await createAffiliateCommission(
            supabase,
            userId,
            'trial',
            amountPaid,
            trialStart,
            'subscription',
            session.customer as string || undefined,
            session.subscription as string || undefined
          );
            
        } else if (planType === 'search_pack') {
          // Search pack purchased - add to search_packs table
          const amountPaid = (session.amount_total || 0) / 100;
          const purchaseDate = new Date();
          
          await supabase
            .from('search_packs')
            .insert({
              user_id: userId,
              searches_purchased: 29,
              searches_remaining: 29,
              price_paid: amountPaid,
              expires_at: null, // Never expires
            });
          
          // Create affiliate commission for search pack
          await createAffiliateCommission(
            supabase,
            userId,
            'search_pack',
            amountPaid,
            purchaseDate,
            'search_pack',
            session.customer as string || undefined
          );
            
        } else if (session.subscription) {
          // Subscription created via checkout - handle it immediately
          // This ensures subscriptions with coupons (100% discount) are still processed
          console.log(`Subscription created via checkout for user ${userId}, subscription: ${session.subscription}`);
          
          try {
            // Fetch the subscription from Stripe to get full details
            const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
            
            const periodStart = new Date((stripeSubscription as any).current_period_start * 1000);
            const periodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
            
            // Determine plan type from price ID
            const priceId = stripeSubscription.items.data[0]?.price.id;
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
            
            const status = stripeSubscription.status === 'active' ? 'active' : 
                          stripeSubscription.status === 'trialing' ? 'trial' : 
                          stripeSubscription.status === 'canceled' ? 'cancelled' : 'expired';
            
            // Upsert user subscription
            const { error: subError } = await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: userId,
                plan_id: planId,
                status: status,
                stripe_customer_id: session.customer as string || null,
                stripe_subscription_id: stripeSubscription.id,
                current_period_start: periodStart.toISOString(),
                current_period_end: periodEnd.toISOString(),
              }, {
                onConflict: 'user_id'
              });
            
            if (subError) {
              console.error(`[checkout.session.completed] Error upserting subscription for user ${userId}:`, subError);
              throw subError;
            }
            
            // Upsert usage limits
            const { error: usageError } = await supabase
              .from('monthly_usage')
              .upsert({
                user_id: userId,
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
                searches_used: 0,
                searches_limit: searchesLimit,
              }, {
                onConflict: 'user_id,period_start'
              });
            
            if (usageError) {
              console.error(`[checkout.session.completed] Error upserting usage for user ${userId}:`, usageError);
              throw usageError;
            }
            
            // Create affiliate commission for subscription
            const amountPaid = (session.amount_total || 0) / 100;
            await createAffiliateCommission(
              supabase,
              userId,
              planId,
              amountPaid,
              periodStart,
              'subscription',
              session.customer as string || undefined,
              stripeSubscription.id
            );
            
            console.log(`[checkout.session.completed] Successfully created subscription record for user ${userId}, plan: ${planId}, status: ${status}`);
          } catch (error) {
            console.error(`[checkout.session.completed] Error processing subscription from checkout session:`, error);
            // Don't break - let subscription.created event handle it as fallback
          }
        }
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.user_id;
        
        if (!userId) {
          console.log(`[subscription.${event.type}] No user_id in subscription metadata, looking up by customer_id: ${subscription.customer}`);
          
          // Try to find user by customer ID in existing subscriptions
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .maybeSingle();
          
          if (subData) {
            userId = subData.user_id;
            console.log(`[subscription.${event.type}] Found user_id from existing subscription: ${userId}`);
          } else {
            // Try to find user by looking up the customer in Stripe and matching by email
            try {
              const customer = await stripe.customers.retrieve(subscription.customer as string);
              if (customer && !customer.deleted && (customer as any).email) {
                const customerEmail = (customer as any).email;
                console.log(`[subscription.${event.type}] Looking up user by email: ${customerEmail}`);
                
                // Find user by email in auth.users
                const { data: authUsers } = await supabase.auth.admin.listUsers();
                const matchingUser = authUsers?.users.find(u => u.email === customerEmail);
                
                if (matchingUser) {
                  userId = matchingUser.id;
                  console.log(`[subscription.${event.type}] Found user_id by email lookup: ${userId}`);
                } else {
                  console.error(`[subscription.${event.type}] No user found with email ${customerEmail}`);
                }
              }
            } catch (error) {
              console.error(`[subscription.${event.type}] Error looking up customer:`, error);
            }
          }
          
          if (!userId) {
            console.error(`[subscription.${event.type}] No user_id found for subscription ${subscription.id}, customer: ${subscription.customer}`);
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
        
        // Upsert user subscription (create if doesn't exist, update if it does)
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: planId,
            status: status,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          }, {
            onConflict: 'user_id'
          });
        
        if (subError) {
          console.error(`[subscription.${event.type}] Error upserting subscription for user ${userId}:`, subError);
        } else {
          console.log(`[subscription.${event.type}] Successfully upserted subscription for user ${userId}, plan: ${planId}, status: ${status}`);
        }
        
        // Upsert usage limits (create if doesn't exist, update if it does)
        const { error: usageError } = await supabase
          .from('monthly_usage')
          .upsert({
            user_id: userId,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            searches_used: 0,
            searches_limit: searchesLimit,
          }, {
            onConflict: 'user_id,period_start'
          });
        
        if (usageError) {
          console.error(`[subscription.${event.type}] Error upserting usage for user ${userId}:`, usageError);
        } else {
          console.log(`[subscription.${event.type}] Successfully upserted usage for user ${userId}`);
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
        const invoice = event.data.object as any;
        
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

