import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/convert-trials",
//     "schedule": "0 * * * *"
//   }]
// }

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Find trials that have expired
    const now = new Date().toISOString();
    
    const { data: expiredTrials, error } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('status', 'trial')
      .lt('trial_end_date', now);
    
    if (error) {
      console.error('Error fetching expired trials:', error);
      return NextResponse.json({ error: 'Failed to fetch trials' }, { status: 500 });
    }
    
    if (!expiredTrials || expiredTrials.length === 0) {
      return NextResponse.json({ 
        message: 'No expired trials to convert',
        converted: 0
      });
    }
    
    console.log(`Found ${expiredTrials.length} expired trials to convert`);
    
    let converted = 0;
    const errors: any[] = [];
    
    for (const trial of expiredTrials) {
      try {
        if (!trial.stripe_customer_id) {
          console.warn(`Trial ${trial.id} has no Stripe customer ID, skipping`);
          continue;
        }
        
        if (!stripe) {
          console.error('Stripe not configured');
          continue;
        }
        
        // Create Core Monthly subscription in Stripe
        const subscription = await stripe.subscriptions.create({
          customer: trial.stripe_customer_id,
          items: [{ price: process.env.STRIPE_PRICE_CORE_MONTHLY! }],
          metadata: {
            user_id: trial.user_id,
            plan_type: 'core_monthly',
            converted_from_trial: 'true',
          },
        });
        
        // Update subscription in database
        const periodStart = new Date((subscription as any).current_period_start * 1000);
        const periodEnd = new Date((subscription as any).current_period_end * 1000);
        
        await supabase
          .from('user_subscriptions')
          .update({
            plan_id: 'core_monthly',
            status: 'active',
            stripe_subscription_id: subscription.id,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('user_id', trial.user_id);
        
        // Update usage limits to Core plan (75 searches)
        await supabase
          .from('monthly_usage')
          .update({
            searches_limit: 75,
            searches_used: 0, // Reset for new month
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
          })
          .eq('user_id', trial.user_id);
        
        console.log(`✅ Converted trial to Core Monthly for user ${trial.user_id}`);
        converted++;
        
      } catch (error) {
        console.error(`Error converting trial ${trial.id}:`, error);
        errors.push({
          trialId: trial.id,
          userId: trial.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Converted ${converted} of ${expiredTrials.length} trials`,
      converted,
      total: expiredTrials.length,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('Error in convert-trials cron:', error);
    return NextResponse.json(
      { error: 'Failed to convert trials', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

