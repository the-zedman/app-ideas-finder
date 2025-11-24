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
        console.log(`Trial expired for user ${user.id}, marking as expired`);
        
        // Mark trial as expired - user must manually subscribe
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id);
        
        return NextResponse.json({ 
          trialExpired: true, 
          converted: false,
          message: 'Trial expired - subscription required to continue'
        });
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

