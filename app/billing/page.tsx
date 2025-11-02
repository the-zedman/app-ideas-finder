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
              <a href="/homezone" className="text-xl font-bold text-gray-900 hover:text-gray-700">
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
                    className="bg-[#E07A5F] h-2 rounded-full transition-all"
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
                {subscription?.current_period_end 
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600 mb-6">Upgrade, downgrade, or purchase additional searches anytime.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Core Plan */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#E07A5F] transition-all">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Core</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$39</div>
                <div className="text-gray-600">per month</div>
                <div className="text-sm text-gray-500 mt-2">75 searches/month</div>
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
              
              {currentPlan === 'core_monthly' ? (
                <button disabled className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout('core_monthly', 'price_core_monthly')}
                  disabled={processingCheckout}
                  className="w-full py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingCheckout ? 'Processing...' : 'Select Core Monthly'}
                </button>
              )}
              
              <div className="mt-3 text-center">
                <button
                  onClick={() => handleCheckout('core_annual', 'price_core_annual')}
                  disabled={processingCheckout}
                  className="text-sm text-[#E07A5F] hover:underline"
                >
                  Or pay annually for $399 (save $69/year)
                </button>
              </div>
            </div>

            {/* Prime Plan */}
            <div className="bg-gradient-to-br from-[#E07A5F] to-[#D06A4F] rounded-2xl p-6 text-white relative transform scale-105 shadow-xl">
              <div className="absolute top-4 right-4 bg-white text-[#E07A5F] px-3 py-1 rounded-full text-xs font-bold">
                POPULAR
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">Prime</h3>
                <div className="text-4xl font-bold mb-2">$79</div>
                <div className="text-white/90">per month</div>
                <div className="text-sm text-white/80 mt-2">225 searches/month</div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span>
                  <span>225 app analyses per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span>
                  <span>Priority AI processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">✓</span>
                  <span>Priority support</span>
                </li>
              </ul>
              
              {currentPlan === 'prime_monthly' ? (
                <button disabled className="w-full py-3 bg-white/20 text-white font-semibold rounded-lg cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout('prime_monthly', 'price_prime_monthly')}
                  disabled={processingCheckout}
                  className="w-full py-3 bg-white text-[#E07A5F] hover:bg-white/90 font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingCheckout ? 'Processing...' : 'Select Prime Monthly'}
                </button>
              )}
              
              <div className="mt-3 text-center">
                <button
                  onClick={() => handleCheckout('prime_annual', 'price_prime_annual')}
                  disabled={processingCheckout}
                  className="text-sm text-white hover:underline"
                >
                  Or pay annually for $799 (save $149/year)
                </button>
              </div>
            </div>

            {/* Search Pack */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#E07A5F] transition-all">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Search Pack</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$29</div>
                <div className="text-gray-600">one-time</div>
                <div className="text-sm text-gray-500 mt-2">50 extra searches</div>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">50 additional searches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Never expires</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Works with any plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700">Purchase multiple packs</span>
                </li>
              </ul>
              
              <button
                onClick={() => handleCheckout('search_pack', 'price_search_pack')}
                disabled={processingCheckout}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {processingCheckout ? 'Processing...' : 'Buy Search Pack'}
              </button>
              
              <div className="mt-3 text-center text-sm text-gray-500">
                Perfect for occasional extra searches
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
                onClick={() => {
                  // TODO: Implement cancellation
                  alert('Cancellation will be implemented with Stripe integration');
                  setShowCancelModal(false);
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
