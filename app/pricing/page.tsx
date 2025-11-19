'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkSubscription = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasActiveSubscription(false);
        return;
      }
      
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (subscription) {
        const activeStatuses = ['trial', 'active', 'free_unlimited'];
        setHasActiveSubscription(activeStatuses.includes(subscription.status));
      } else {
        setHasActiveSubscription(false);
      }
    };
    
    checkSubscription();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
              />
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/contact" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Contact</Link>
              <Link href="/" className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 sm:py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
            Choose the plan that works best for you. All plans include full access to our AI-powered analysis.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-lg font-semibold ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ease-in-out ${
                billingCycle === 'annual' ? 'bg-[#88D18A]' : 'bg-gray-300'
              }`}
            >
              <span
                className="inline-block h-6 w-6 transform rounded-full shadow-lg transition-transform duration-200 ease-in-out"
                style={{ 
                  transform: billingCycle === 'annual' ? 'translateX(1.75rem)' : 'translateX(0.25rem)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </button>
            <span className={`text-lg font-semibold ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-400'}`}>
              Annual
              <span className="ml-2 text-sm text-[#88D18A]">Save up to 19%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Trial Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Trial</h3>
                <p className="text-gray-600 mb-4">Perfect for trying out</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$1</span>
                  <span className="text-gray-600"> / 3 days</span>
                </div>
                <p className="text-sm text-gray-500">One-time payment</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700"><strong>10 searches</strong> during trial period</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Full AI-powered analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">13-section detailed reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Auto-converts to Core plan</span>
                </li>
              </ul>

              <div className="text-center">
                <button disabled className="block w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed">
                  Coming Soon
                </button>
                <p className="text-xs text-gray-500 mt-3">Sign up at launch for special early-bird pricing</p>
              </div>
            </div>

            {/* Core Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Core</h3>
                <p className="text-gray-600 mb-4">For regular users</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingCycle === 'monthly' ? '39' : '399'}
                  </span>
                  <span className="text-gray-600">
                    {billingCycle === 'monthly' ? ' / month' : ' / year'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {billingCycle === 'annual' && 'Save $69/year'}
                  {billingCycle === 'monthly' && 'Or $399/year (save $69)'}
                </p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700"><strong>73 searches</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Full AI-powered analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">13-section detailed reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Affiliate program access</span>
                </li>
              </ul>

              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  ${billingCycle === 'monthly' ? '0.52' : '0.44'} per search
                </p>
                <button disabled className="block w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed">
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Prime Plan */}
            <div className="bg-white border-2 border-[#88D18A] rounded-2xl p-8 hover:shadow-lg transition-shadow relative">
              {/* Most Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#88D18A] text-white text-xs font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Prime</h3>
                <p className="text-gray-600 mb-4">For power users</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingCycle === 'monthly' ? '79' : '799'}
                  </span>
                  <span className="text-gray-600">
                    {billingCycle === 'monthly' ? ' / month' : ' / year'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {billingCycle === 'annual' && 'Save $149/year'}
                  {billingCycle === 'monthly' && 'Or $799/year (save $149)'}
                </p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700"><strong>227 searches</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Full AI-powered analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">13-section detailed reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Premium priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Affiliate program access</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Early access to new features</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Downloadable PDF reports</span>
                </li>
              </ul>

              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  ${billingCycle === 'monthly' ? '0.35' : '0.30'} per search
                </p>
                <button disabled className="block w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed">
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affiliate Program Callout */}
      <section className="py-8 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 bg-gradient-to-r from-[#88D18A]/10 to-[#6BC070]/10 rounded-2xl p-6 sm:p-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl sm:text-4xl">💰</span>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Earn With Our Affiliate Program</h3>
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-4">
                All users get access to our affiliate program. <strong>Earn 25% commission</strong> on every referral - up to $199.75 per annual subscription.
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-[#88D18A] font-bold">✓</span>
                  <span>$9.75-$19.75 per monthly subscription</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#88D18A] font-bold">✓</span>
                  <span>$99.75-$199.75 per annual subscription</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#88D18A] font-bold">✓</span>
                  <span>$7.25 per Search Pack sold</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#88D18A] font-bold">✓</span>
                  <span>Paid within 7 days</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-[#88D18A] mb-2">25%</div>
                <div className="text-xs sm:text-sm text-gray-600">Commission Rate</div>
              </div>
              <Link 
                href="/affiliate" 
                className="px-6 sm:px-8 py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Learn More About Affiliates
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search Packs - Only show for users with active subscriptions */}
      {hasActiveSubscription === true && (
        <section className="py-8 sm:py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Need More Searches?</h2>
              <p className="text-sm sm:text-base text-gray-600">Purchase additional searches that never expire and work with any plan.</p>
            </div>

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
                  
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="text-[#88D18A] font-bold">✓</span>
                      <span>53 additional searches</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="text-[#88D18A] font-bold">✓</span>
                      <span>No expiration date - use anytime</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="text-[#88D18A] font-bold">✓</span>
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
                  <Link href="//" className="px-8 py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors whitespace-nowrap">
                    Purchase Search Pack
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">What happens after my trial ends?</h3>
              <p className="text-gray-700">Your trial automatically converts to the Core monthly plan ($39/month) after 3 days unless you cancel. You can cancel anytime during the trial period.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">Do unused searches roll over?</h3>
              <p className="text-gray-700">Monthly subscription searches reset at the start of each billing cycle and don't roll over. However, Search Pack purchases never expire and roll over indefinitely.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-gray-700">Yes! You can upgrade from Core to Prime anytime. Downgrades from Prime to Core take effect at your next billing cycle.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">What's included in an analysis?</h3>
              <p className="text-gray-700">Each analysis includes 12 detailed sections covering user sentiment, feature suggestions, pricing models, app naming ideas, and more - all powered by AI analyzing hundreds of real user reviews.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">What's the affiliate program?</h3>
              <p className="text-gray-700 mb-3">All users get a unique affiliate link and code. Earn <strong>25% cash commission</strong> on every referral:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
                <li>$9.75-$19.75 per monthly subscription</li>
                <li>$99.75-$199.75 per annual subscription</li>
                <li>$7.25 per Search Pack purchase</li>
              </ul>
              <p className="text-gray-700 mt-3 text-sm">Commissions paid within 7 days after the referred customer's first month (if they remain active). <Link href="/affiliate" className="text-[#88D18A] hover:underline font-semibold">Learn more →</Link></p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-700">Yes, you can cancel your subscription at any time. Cancellations take effect at the end of your current billing period.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#88D18A] py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">Ready to Get Started?</h2>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 px-4">
            Join the family of developers using App Ideas Finder to build better apps
          </p>
          <Link href="//" className="inline-block bg-white hover:bg-gray-100 text-[#88D18A] font-semibold py-3 px-8 rounded-lg transition-colors text-lg">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="/affiliate" className="hover:text-white">Affiliate Program</a></li>
                <li><a href="/terms-of-service" className="hover:text-white">Terms of Service</a></li>
                <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            {/* Badges Section */}
            <div className="flex flex-col items-start md:items-end">
              <h3 className="font-bold text-white mb-4">Featured On</h3>
              <div className="flex flex-wrap gap-4">
                <a href="https://huzzler.so/products/J8grXvhghC/app-ideas-finder?utm_source=huzzler_product_website&utm_medium=badge&utm_campaign=badge" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                  <img alt="Featured on Huzzler" src="https://huzzler.so/assets/images/embeddable-badges/featured.png" className="h-12" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-center sm:text-left">© 2025 App Ideas Finder. Elevating humanity, one algorithm at a time.</p>
            <div className="flex gap-4">
              <a href="https://x.com/appideasfinder" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                𝕏
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

