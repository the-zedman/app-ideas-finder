'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/landing-test" className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link>
              <Link href="/landing-test" className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 mb-8">
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
      <section className="py-12 bg-white">
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
                  <span className="text-gray-700">12-section detailed reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Auto-converts to Core plan</span>
                </li>
              </ul>

              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">$0.10 per search</p>
                <Link href="/landing-test" className="block w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Start Trial
                </Link>
                <p className="text-xs text-gray-500 mt-3">Converts to Core after 3 days unless cancelled</p>
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
                  <span className="text-gray-700"><strong>75 searches</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Full AI-powered analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">12-section detailed reports</span>
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
                <Link href="/landing-test" className="block w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Get Started
                </Link>
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
                  <span className="text-gray-700"><strong>225 searches</strong> per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">Full AI-powered analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#88D18A] text-xl">✓</span>
                  <span className="text-gray-700">12-section detailed reports</span>
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
                <Link href="/landing-test" className="block w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Packs */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Need More Searches?</h2>
            <p className="text-gray-600">Purchase additional searches that never expire and work with any plan.</p>
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
                    <span>50 additional searches</span>
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
                <Link href="/landing-test" className="px-8 py-3 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold rounded-lg transition-colors whitespace-nowrap">
                  Purchase Search Pack
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          
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
              <p className="text-gray-700">All users get a unique affiliate code. For every paying subscriber who uses your link, you receive 25 bonus searches on your next billing cycle.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-700">Yes, you can cancel your subscription at any time. Cancellations take effect at the end of your current billing period.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#88D18A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8">
            Join the family of developers using App Ideas Finder to build better apps
          </p>
          <Link href="/landing-test" className="inline-block bg-white hover:bg-gray-100 text-[#88D18A] font-semibold py-3 px-8 rounded-lg transition-colors text-lg">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 App Ideas Finder. Elevating humanity, one algorithm at a time</p>
        </div>
      </footer>
    </div>
  );
}

