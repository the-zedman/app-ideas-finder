import Link from 'next/link';

export default function TermsOfService() {
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: November 3, 2025</p>

        <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8">
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using App Ideas Finder ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed">
              App Ideas Finder is an AI-powered platform that analyzes iOS app reviews to provide insights, feature ideas, and development recommendations. We use advanced AI technology to help developers and entrepreneurs make data-driven decisions about app development.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To use our Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">3.2 Account Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription Plans and Billing</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Plans</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We offer the following subscription plans:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Trial:</strong> 3-day trial with 10 searches for $1</li>
              <li><strong>Core:</strong> 73 searches per month for $37/month or $399/year</li>
              <li><strong>Prime:</strong> 227 searches per month for $79/month or $799/year</li>
              <li><strong>Search Packs:</strong> Additional 29-search packs available for purchase</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.2 Billing and Payment</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>All fees are charged upfront and are non-refundable except as required by law</li>
              <li>Trial subscriptions automatically convert to Core monthly subscriptions after 3 days unless cancelled</li>
              <li>Monthly subscriptions renew automatically unless cancelled before the renewal date</li>
              <li>Unused searches do not roll over to the next month (except Search Pack purchases)</li>
              <li>Search Pack purchases roll over indefinitely until used</li>
              <li>Your subscription month starts from the date you subscribe, not the calendar month</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.3 Cancellation and Refunds</h3>
            <p className="text-gray-700 leading-relaxed">
              You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. We do not provide refunds for partial months or unused searches, except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to our systems or networks</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) to access the Service</li>
              <li>Resell, redistribute, or transfer your account or searches</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Remove, obscure, or alter any proprietary notices</li>
              <li>Use the Service to harass, abuse, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Our Rights</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service, including all content, features, and functionality, is owned by App Ideas Finder and is protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.2 Your Rights</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of any content you submit to the Service. By using the Service, you grant us a license to use, store, and process your queries to provide the Service and improve our AI models.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.3 Analysis Results</h3>
            <p className="text-gray-700 leading-relaxed">
              The insights and analysis generated by our Service are provided for your use. You may use these results for your own business purposes but may not resell or redistribute them as a standalone product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data and Analytics</h2>
            <p className="text-gray-700 leading-relaxed">
              We cache analysis results for up to 14 days to improve Service performance. When you analyze an app that was recently analyzed by another user, you may receive cached results. This helps us provide faster service and optimize costs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Disclaimers</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">8.1 Service Availability</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted or error-free service.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">8.2 AI Accuracy</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              While we strive for accuracy, AI-generated insights may contain errors or inaccuracies. You should verify any information before making business decisions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">8.3 Third-Party Data</h3>
            <p className="text-gray-700 leading-relaxed">
              Our Service analyzes publicly available app store data. We do not guarantee the accuracy, completeness, or availability of third-party data sources.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, App Ideas Finder shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless App Ideas Finder from any claims, damages, losses, liabilities, and expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Affiliate Program</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              All users are automatically enrolled in our affiliate program and receive a unique affiliate code and link. Terms include:
            </p>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.1 Commission Structure</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Commission Rate:</strong> 25% of the first payment from referred customers</li>
              <li><strong>Eligible Transactions:</strong>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Monthly subscriptions (Core: $9.75, Prime: $19.75)</li>
                  <li>Annual subscriptions (Core: $99.75, Prime: $199.75)</li>
                  <li>Search Pack purchases ($7.25 per pack)</li>
                </ul>
              </li>
              <li><strong>Payment Timeline:</strong>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Subscriptions: Paid within 7 days after referred customer completes their first 30 days</li>
                  <li>Search Packs: Paid within 7 days of purchase</li>
                </ul>
              </li>
              <li><strong>Payment Methods:</strong> Commissions paid via Stripe or PayPal</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.2 Commission Eligibility</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Referred customer must remain active through their entire first 30 days</li>
              <li>If referred customer cancels or requests refund within 30 days, no commission is paid</li>
              <li>Commissions are one-time per customer (not recurring)</li>
              <li>Self-referrals are not eligible for commission</li>
              <li>Referred customer must be a new customer (not an existing user with a new account)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">11.3 Program Rules</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>We reserve the right to void commissions obtained through fraudulent means</li>
              <li>Prohibited activities include: spam, fake accounts, stolen credit cards, misleading claims</li>
              <li>We may withhold payment pending investigation of suspicious activity</li>
              <li>Affiliate accounts may be terminated for violations</li>
              <li>Affiliate program terms and commission rates may be modified at any time</li>
              <li>We reserve the right to terminate the affiliate program at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Modifications to Service</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice. We are not liable for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which App Ideas Finder operates, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with applicable arbitration rules, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Severability</h2>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Email: <a href="mailto:info@appideasfinder.com" className="text-[#88D18A] hover:underline">info@appideasfinder.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
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

