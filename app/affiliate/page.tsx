import Link from 'next/link';

export default function AffiliatePage() {
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
              <Link href="/pricing" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Pricing</Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Contact</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-[#88D18A] via-[#6BC070] to-[#88D18A] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-xs sm:text-sm font-black mb-4 sm:mb-6 shadow-lg">
            💰 AFFILIATE PROGRAM
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6" style={{ letterSpacing: '-0.02em' }}>
            Earn Money Sharing<br />App Ideas Finder
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto opacity-95">
            Turn your network into income. Get paid 25% commission for helping fellow developers discover better app ideas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/" 
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-8 py-4 rounded-lg font-black text-lg transition-all transform hover:scale-105 shadow-xl"
            >
              Get Your Affiliate Link →
            </Link>
            <div className="text-white/90 text-sm sm:text-base">
              Already a member? <Link href="/" className="underline font-semibold hover:text-yellow-400">Go to Dashboard</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Breakdown */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">What You'll Earn</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Get paid 25% commission on every subscription and Search Pack purchase
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Monthly Subscriptions */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monthly Plans</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Core ($37/mo)</span>
                  <span className="font-bold text-[#88D18A]">$9.75</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Prime ($79/mo)</span>
                  <span className="font-bold text-[#88D18A]">$19.75</span>
                </div>
              </div>
            </div>

            {/* Annual Subscriptions */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Annual Plans</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Core ($399/yr)</span>
                  <span className="font-bold text-[#88D18A]">$99.75</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Prime ($799/yr)</span>
                  <span className="font-bold text-[#88D18A]">$199.75</span>
                </div>
              </div>
            </div>

            {/* Search Packs */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200">
              <div className="text-3xl mb-3">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Search Packs</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Pack ($29)</span>
                  <span className="font-bold text-[#88D18A]">$7.25</span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  No limit - earn on every pack sold!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-10 sm:mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="bg-[#88D18A] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Get Your Link</h3>
              <p className="text-sm sm:text-base text-gray-600">Every user gets a unique affiliate link automatically in their dashboard</p>
            </div>

            <div className="text-center">
              <div className="bg-[#88D18A] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Share It</h3>
              <p className="text-sm sm:text-base text-gray-600">Post on Twitter, YouTube, your blog, or anywhere developers hang out</p>
            </div>

            <div className="text-center">
              <div className="bg-[#88D18A] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Earn Commission</h3>
              <p className="text-sm sm:text-base text-gray-600">Get paid 25% when someone subscribes or buys Search Packs</p>
            </div>

            <div className="text-center">
              <div className="bg-[#88D18A] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Get Paid</h3>
              <p className="text-sm sm:text-base text-gray-600">Receive payment within 7 days via Stripe or PayPal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Earning Potential Examples */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Real Earning Potential</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">See what other affiliates are making</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Example 1 */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border-2 border-gray-200">
              <div className="text-3xl sm:text-4xl mb-4">📝</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Tech Blogger</h3>
              <div className="space-y-2 text-sm sm:text-base text-gray-700 mb-6">
                <p>• 5 Core monthly referrals = $48.75</p>
                <p>• 2 Prime monthly referrals = $39.50</p>
                <p>• 3 Search Packs sold = $21.75</p>
              </div>
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="text-2xl sm:text-3xl font-black text-[#88D18A]">$110/month</div>
                <div className="text-xs sm:text-sm text-gray-500">Passive income</div>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-gradient-to-br from-[#88D18A]/10 to-[#6BC070]/10 rounded-2xl p-6 sm:p-8 border-2 border-[#88D18A]">
              <div className="text-3xl sm:text-4xl mb-4">🎥</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">YouTube Creator</h3>
              <div className="space-y-2 text-sm sm:text-base text-gray-700 mb-6">
                <p>• 10K views → 100 signups</p>
                <p>• 50 Core + 50 Prime signups</p>
                <p>• 50 × $9.75 = $487.50</p>
                <p>• 50 × $19.75 = $987.50</p>
              </div>
              <div className="border-t-2 border-[#88D18A] pt-4">
                <div className="text-2xl sm:text-3xl font-black text-[#88D18A]">$1,475</div>
                <div className="text-xs sm:text-sm text-gray-500">From one video</div>
              </div>
            </div>

            {/* Example 3 */}
            <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border-2 border-gray-200">
              <div className="text-3xl sm:text-4xl mb-4">👨‍🏫</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Course Creator</h3>
              <div className="space-y-2 text-sm sm:text-base text-gray-700 mb-6">
                <p>• 200 students, 5% convert</p>
                <p>• 10 annual subscriptions</p>
                <p>• Mix of Core/Prime</p>
                <p>• Average: $150 per conversion</p>
              </div>
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="text-2xl sm:text-3xl font-black text-[#88D18A]">$1,500</div>
                <div className="text-xs sm:text-sm text-gray-500">One-time bonus</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Promote Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-10 sm:mb-12">Why Promote App Ideas Finder?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">📈</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">High Conversion Rate</h3>
              <p className="text-sm sm:text-base text-gray-600">Developers see the value immediately with our $1 trial</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">💡</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Solves Real Pain</h3>
              <p className="text-sm sm:text-base text-gray-600">No more guessing what to build - real data, real insights</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Low Trial Barrier</h3>
              <p className="text-sm sm:text-base text-gray-600">$1 for 3 days makes signup a no-brainer</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Sticky Product</h3>
              <p className="text-sm sm:text-base text-gray-600">Users stick around and keep paying - benefits you long-term</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Multiple Revenue Streams</h3>
              <p className="text-sm sm:text-base text-gray-600">Earn from subscriptions AND Search Packs</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Full Transparency</h3>
              <p className="text-sm sm:text-base text-gray-600">Real-time dashboard shows clicks, conversions, and earnings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Terms */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-8 sm:mb-10">Payment Terms</h2>
          
          <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200 mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">For Subscriptions</h3>
            <ul className="space-y-3 text-sm sm:text-base text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>Commission paid <strong>within 7 days</strong> after customer completes their first 30 days</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>Customer must remain active through entire first month</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>If customer cancels or refunds within 30 days, no commission paid</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>One-time payment per customer (not recurring)</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">For Search Packs</h3>
            <ul className="space-y-3 text-sm sm:text-base text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>Paid within <strong>7 days</strong> of purchase</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>No waiting period (one-time purchases are final)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#88D18A] text-xl">✓</span>
                <span>Earn $7.25 every time your referral buys a pack</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-10 sm:mb-12">Tips for Success</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-gradient-to-br from-[#88D18A]/5 to-transparent rounded-2xl p-6 sm:p-8 border-l-4 border-[#88D18A]">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Share Your Story</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-3">
                Don't just post a link - explain how App Ideas Finder helped YOU find your next app idea.
              </p>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                <li>• Show actual results from analyses you've run</li>
                <li>• Be authentic about why you use it</li>
                <li>• Share specific examples and insights</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[#88D18A]/5 to-transparent rounded-2xl p-6 sm:p-8 border-l-4 border-[#88D18A]">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Target the Right Audience</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                <li>• Indie developers looking for their next project</li>
                <li>• Aspiring entrepreneurs in the app space</li>
                <li>• Developers tired of failed projects</li>
                <li>• Anyone building iOS apps</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[#88D18A]/5 to-transparent rounded-2xl p-6 sm:p-8 border-l-4 border-[#88D18A]">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Create Value First</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                <li>• Write a blog post about finding app ideas</li>
                <li>• Make a YouTube video showing the tool in action</li>
                <li>• Tweet about insights you discovered</li>
                <li>• Share specific case studies</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[#88D18A]/5 to-transparent rounded-2xl p-6 sm:p-8 border-l-4 border-[#88D18A]">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Best Places to Share</h3>
              <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                <li>• Twitter/X (tag @appideasfinder)</li>
                <li>• YouTube (tutorial videos work great)</li>
                <li>• Dev.to, Medium, Hashnode</li>
                <li>• Reddit, Indie Hackers, Discord</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-[#88D18A] via-[#6BC070] to-[#88D18A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 sm:mb-6">Ready to Start Earning?</h2>
          <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-10 opacity-95">
            Join hundreds of developers earning passive income by sharing App Ideas Finder
          </p>
          <Link 
            href="/" 
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-black text-base sm:text-lg transition-all transform hover:scale-105 shadow-xl"
          >
            Get Your Affiliate Link Now →
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

