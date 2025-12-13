'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Footer from '@/components/Footer';

function BillingContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [isOnboarding, setIsOnboarding] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    setIsOnboarding(searchParams.get('onboarding') === 'true');
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      await fetchSubscription();
      await fetchUsage();
      setLoading(false);
    };

    init();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/subscription/usage');
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const handleCheckout = async (planType: string, priceId: string) => {
    setProcessingCheckout(true);
    
    try {
      // All successful purchases redirect to dashboard
      const successUrl = `${window.location.origin}/homezone?purchase_success=true`;
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          planType,
          successUrl,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Checkout error:', data);
        alert(`Error: ${data.error || 'Failed to create checkout session'}\n${data.message || ''}\n${data.details || ''}`);
        setProcessingCheckout(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL in checkout response:', data);
        alert('Error creating checkout session: No redirect URL received');
        setProcessingCheckout(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingCheckout(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDisplayName = () => {
    const firstName = user?.user_metadata?.first_name || '';
    const lastName = user?.user_metadata?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.email?.split('@')[0] || 'User';
  };

  const getPlanDisplayName = (planId: string) => {
    const planNames: any = {
      waitlist_bonus: 'Waitlist Early Access',
      vip_bonus: 'VIP',
      core_monthly: 'Core (Monthly)',
      core_annual: 'Core (Annual)',
      prime_monthly: 'Prime (Monthly)',
      prime_annual: 'Prime (Annual)',
      free_unlimited: 'Free Unlimited',
    };
    return planNames[planId] || planId;
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
      free_unlimited: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Free Unlimited' },
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_id || (usage?.status === 'vip_bonus' ? 'vip_bonus' : usage?.status === 'waitlist_bonus' ? 'waitlist_bonus' : null);
  const isUnlimited = subscription?.status === 'free_unlimited';
  const isActive = subscription?.status === 'active';
  const isWaitlistUser = usage?.status === 'waitlist_bonus' || (usage?.bonusSearchesRemaining > 0 && !subscription);
  const isVipUser = usage?.status === 'vip_bonus' || usage?.isVip;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8"
              />
              <a href="/homezone" className="text-xl font-bold text-[#3D405B] hover:text-gray-700">
                App Ideas Finder
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">Back to Dashboard</a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Waitlist/VIP User Welcome */}
        {(isWaitlistUser || isVipUser) && (
          <div className={`bg-gradient-to-r ${isVipUser ? 'from-amber-500 to-yellow-600' : 'from-[#88D18A] to-[#6BC070]'} rounded-2xl p-8 mb-8 text-white`}>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">🎉 Thank You for Being an Early Supporter!</h2>
              <p className="text-lg mb-6 opacity-90">
                As a thank you for joining our {isVipUser ? 'special VIP list' : 'waitlist'}, you have <strong>{usage?.bonusSearchesRemaining || (isVipUser ? usage?.vipBonusAmount : usage?.waitlistBonusAmount) || 75} free searches</strong> to use anytime - no expiration, no limits!
              </p>
              <p className="text-sm mb-6 opacity-75">
                These searches never expire and roll over month to month until you use them. Once you've used your free searches, use code <strong>{isVipUser ? (usage?.vipCouponCode || 'VIPTHANKYOU') : (usage?.waitlistCouponCode || 'WAITLISTTHANKYOU')}</strong> for 25% off any plan forever.
              </p>
            </div>
          </div>
        )}

        {/* Current Subscription Card */}
        <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Subscription</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-2">Plan</div>
              <div className="text-xl font-bold text-gray-900">
                {getPlanDisplayName(currentPlan)}
              </div>
              <div className="mt-2">
                {subscription && getStatusBadge(subscription.status)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-2">Searches This Month</div>
              <div className="text-xl font-bold text-gray-900">
                {usage?.searchesUsed || 0} / {isUnlimited ? '∞' : (usage?.searchesRemaining + usage?.searchesUsed || 0)}
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#88D18A] h-2 rounded-full transition-all"
                    style={{ 
                      width: isUnlimited ? '100%' : `${((usage?.searchesUsed || 0) / ((usage?.searchesRemaining + usage?.searchesUsed) || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-2">
                Next Billing Date
              </div>
              <div className="text-xl font-bold text-gray-900">
                {subscription?.current_period_end 
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
              <p className="text-gray-600 mt-1">Upgrade, downgrade, or change your billing frequency anytime.</p>
            </div>
            
            {/* Billing Interval Toggle */}
            <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingInterval === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Plan */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#88D18A] transition-all">
              {billingInterval === 'annual' && (
                <div className="bg-green-50 text-green-700 text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Save $50/year
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Core</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${billingInterval === 'monthly' ? '12.50' : '100'}
                </div>
                <div className="text-gray-600">per {billingInterval === 'monthly' ? 'month' : 'year'}</div>
                <div className="text-sm text-gray-500 mt-2">25 searches/month</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${billingInterval === 'monthly' ? '0.50' : '0.33'} per search
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">25 app analyses per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Full AI-powered insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Export all results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Cancel anytime</span>
                </li>
              </ul>
              
              {(billingInterval === 'monthly' && currentPlan === 'core_monthly') || 
               (billingInterval === 'annual' && currentPlan === 'core_annual') ? (
                <button disabled className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(
                    billingInterval === 'monthly' ? 'core_monthly' : 'core_annual',
                    '' // Server will look up the price ID
                  )}
                  disabled={processingCheckout}
                  className="w-full py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingCheckout ? 'Processing...' : `Select Core ${billingInterval === 'monthly' ? 'Monthly' : 'Annual'}`}
                </button>
              )}
            </div>

            {/* Prime Plan */}
            <div className="bg-white rounded-2xl p-6 border-2 border-[#88D18A] relative shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#88D18A] text-white px-4 py-1 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              
              {billingInterval === 'annual' && (
                <div className="bg-green-50 text-green-700 text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Save $100/year
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Prime</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${billingInterval === 'monthly' ? '25' : '200'}
                </div>
                <div className="text-gray-600">per {billingInterval === 'monthly' ? 'month' : 'year'}</div>
                <div className="text-sm text-gray-500 mt-2">100 searches/month</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${billingInterval === 'monthly' ? '0.25' : '0.17'} per search
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">100 app analyses per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Priority AI processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>
              
              {(billingInterval === 'monthly' && currentPlan === 'prime_monthly') || 
               (billingInterval === 'annual' && currentPlan === 'prime_annual') ? (
                <button disabled className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(
                    billingInterval === 'monthly' ? 'prime_monthly' : 'prime_annual',
                    '' // Server will look up the price ID
                  )}
                  disabled={processingCheckout}
                  className="w-full py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingCheckout ? 'Processing...' : `Select Prime ${billingInterval === 'monthly' ? 'Monthly' : 'Annual'}`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Subscription */}
        {isActive && !isUnlimited && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
            <p className="text-gray-600 mb-4">
              Your subscription will remain active until the end of your current billing period.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-6 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-8 max-w-md w-full mx-4" style={{ backgroundColor: '#ffffff' }}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel? You'll lose access to your current plan at the end of this billing period.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/stripe/cancel-subscription', {
                      method: 'POST',
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                      alert(data.message);
                      setShowCancelModal(false);
                      await fetchSubscription();
                    } else {
                      alert(data.error || 'Failed to cancel subscription');
                    }
                  } catch (error) {
                    alert('Error cancelling subscription');
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600 text-xl">Loading...</div></div>}>
      <BillingContent />
    </Suspense>
  );
}
