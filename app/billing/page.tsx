'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function BillingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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
      
      // Fetch usage data
      const usageResponse = await fetch('/api/subscription/usage');
      const usage = await usageResponse.json();
      setUsageData(usage);
      
      setLoading(false);
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  const plans = [
    {
      id: 'core_monthly',
      name: 'Core',
      price: 39,
      annual: 399,
      searches: 75,
      features: [
        '75 searches per month',
        'All 12 analysis sections',
        'Save unlimited analyses',
        'Export results',
        'Email support'
      ],
      popular: true
    },
    {
      id: 'prime_monthly',
      name: 'Prime',
      price: 79,
      annual: 799,
      searches: 225,
      features: [
        '225 searches per month',
        'Everything in Core',
        'Priority support',
        'Advanced analytics',
        'API access (coming soon)'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-[#3D405B]">App Ideas Finder</h1>
            </div>
            <nav className="flex items-center gap-6">
              <a href="/homezone" className="text-gray-600 hover:text-[#3D405B]">Dashboard</a>
              <a href="/appengine" className="text-gray-600 hover:text-[#3D405B]">App Engine</a>
              <a href="/billing" className="text-[#3D405B] font-semibold">Billing</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Current Plan */}
        <div className="bg-white rounded-2xl p-8 mb-12 border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Current Plan</h2>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-[#E07A5F]">{usageData?.planName || 'Trial'}</h3>
              <p className="text-gray-600">
                {usageData?.searchesUsed || 0} / {usageData?.searchesLimit === -1 ? '∞' : usageData?.searchesLimit || 0} searches used
              </p>
              {usageData?.status === 'trial' && usageData?.trialTimeRemaining && (
                <p className="text-sm text-gray-500 mt-1">
                  Trial ends in {usageData.trialTimeRemaining.days}d {usageData.trialTimeRemaining.hours}h {usageData.trialTimeRemaining.minutes}m
                </p>
              )}
            </div>
            <div>
              {usageData?.status === 'trial' && (
                <button className="bg-gray-200 text-gray-600 px-6 py-2 rounded-lg font-medium">
                  Current Plan
                </button>
              )}
            </div>
          </div>

          {usageData?.status === 'trial' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                💡 <strong>Trial Info:</strong> Your trial automatically converts to Core plan ($39/month) after 3 days unless you cancel.
              </p>
            </div>
          )}
        </div>

        {/* Available Plans */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Choose Your Plan</h2>
          <p className="text-gray-600 text-center mb-8">Select the plan that fits your needs</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-white rounded-2xl p-8 border-2 ${
                  plan.popular ? 'border-[#E07A5F] shadow-xl' : 'border-gray-200 shadow-sm'
                } relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[#E07A5F] text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    or ${plan.annual}/year <span className="text-green-600 font-medium">(Save ${(plan.price * 12) - plan.annual})</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className="w-full bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Choose {plan.name}
                </button>
                <p className="text-xs text-center text-gray-500 mt-3">Payment integration coming soon</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search Packs */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Extra Searches?</h3>
          <p className="text-gray-600 mb-6">Purchase Search Packs that never expire</p>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">Search Pack</h4>
                <p className="text-gray-600">50 additional searches</p>
                <p className="text-sm text-purple-700 font-medium mt-1">Never expires • Rolls over monthly</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-2">$69</div>
                <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                  Buy Now
                </button>
                <p className="text-xs text-gray-500 mt-2">Coming soon</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            💡 Recommended: $1.38/search vs $0.52-1.04/search on plans
          </p>
        </div>
      </main>
    </div>
  );
}

