'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function BillingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  
  const router = useRouter();
  const supabase = createClient();

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
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          planType,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session');
        setProcessingCheckout(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start checkout');
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
      trial: 'Trial',
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
      trial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Trial' },
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

  const currentPlan = subscription?.plan_id || 'trial';
  const isUnlimited = subscription?.status === 'free_unlimited';
  const isTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';

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
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">Back to Home</a>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Sign Out</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                {isTrial ? 'Trial Ends' : 'Next Billing Date'}
              </div>
              <div className="text-xl font-bold text-gray-900">
                {isTrial && subscription?.trial_end_date
                  ? new Date(subscription.trial_end_date).toLocaleDateString()
                  : subscription?.current_period_end 
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : 'N/A'}
              </div>
              {isTrial && subscription?.trial_end_date && (
                <div className="mt-2 text-sm text-yellow-600 font-medium">
                  {Math.ceil((new Date(subscription.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                </div>
              )}
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
                  Save $69/year
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Core</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${billingInterval === 'monthly' ? '39' : '399'}
                </div>
                <div className="text-gray-600">per {billingInterval === 'monthly' ? 'month' : 'year'}</div>
                <div className="text-sm text-gray-500 mt-2">75 searches/month</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${billingInterval === 'monthly' ? '0.52' : '0.44'} per search
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">75 app analyses per month</span>
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
                    billingInterval === 'monthly' ? 'price_core_monthly' : 'price_core_annual'
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
                  Save $149/year
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Prime</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${billingInterval === 'monthly' ? '79' : '799'}
                </div>
                <div className="text-gray-600">per {billingInterval === 'monthly' ? 'month' : 'year'}</div>
                <div className="text-sm text-gray-500 mt-2">225 searches/month</div>
                <div className="text-xs text-gray-400 mt-1">
                  ${billingInterval === 'monthly' ? '0.35' : '0.30'} per search
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">225 app analyses per month</span>
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
                    billingInterval === 'monthly' ? 'price_prime_monthly' : 'price_prime_annual'
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

        {/* Search Pack Add-on */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Need More Searches?</h2>
          <p className="text-gray-600 mb-6">Purchase additional searches that never expire and work with any plan.</p>
          
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">📦</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Search Pack</h3>
                    <p className="text-gray-600">One-time purchase, never expires</p>
                  </div>
                </div>
                
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>50 additional searches</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>No expiration date - use anytime</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Compatible with all subscription plans</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div>
                  <div className="text-5xl font-bold text-gray-900">$29</div>
                  <div className="text-sm text-gray-500 text-center mt-1">one-time payment</div>
                  <div className="text-xs text-gray-400 text-center mt-1">$0.58 per search</div>
                </div>
                <button
                  onClick={() => handleCheckout('search_pack', 'price_search_pack')}
                  disabled={processingCheckout}
                  className="px-8 py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {processingCheckout ? 'Processing...' : 'Purchase Search Pack'}
                </button>
              </div>
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
    </div>
  );
}
