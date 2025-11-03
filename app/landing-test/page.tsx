'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import ReCAPTCHA from 'react-google-recaptcha';

export default function LandingTest() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const supabase = createClient();

  // Fetch waitlist count
  useEffect(() => {
    const fetchWaitlistCount = async () => {
      try {
        const { count, error } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          setWaitlistCount(count);
        }
      } catch (err) {
        console.error('Error fetching waitlist count:', err);
      }
    };

    fetchWaitlistCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await recaptchaRef.current?.executeAsync();
      
      if (!recaptchaToken) {
        setMessage('reCAPTCHA verification failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Generate unique unsubscribe token
      const unsubscribeToken = crypto.randomUUID();

      // Insert email into Supabase
      const { data, error } = await supabase
        .from('waitlist')
        .insert([{ email: email, unsubscribe_token: unsubscribeToken }])
        .select();

      if (error) {
        if (error.code === '23505') {
          setMessage('This email is already on the waitlist!');
        } else {
          setMessage('Something went wrong. Please try again.');
        }
      } else {
        // Send confirmation email
        try {
          await fetch('/api/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, unsubscribeToken, recaptchaToken }),
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }

        setMessage('Thanks for joining! Check your email for confirmation.');
        setEmail('');
        setWaitlistCount(prev => prev + 1);
      }
    } catch (err) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/login" className="text-gray-700 hover:text-gray-900">Sign in</a>
              <a href="/signup" className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                Sign up
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <h1 className="text-gray-900 mb-6" style={{ fontSize: '70px', fontWeight: 900, lineHeight: '1.1' }}>
              The super <span className="inline-block">fast</span><br />
              app ideas<br />
              generator!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Discover your next app idea by analyzing real user feedback from the App Store. Get insights in seconds, not weeks.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative">
                <button 
                  disabled
                  className="bg-[#88D18A] text-white px-8 py-4 rounded-lg font-semibold text-lg text-center w-full opacity-75 cursor-not-allowed"
                >
                  Start the generator!
                </button>
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                  LAUNCHING SOON
                </div>
              </div>
              <a 
                href="#trending" 
                className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-gray-300 transition-colors text-center"
              >
                Explore trending apps
              </a>
            </div>
            
            {/* Waitlist Section */}
            <div className="border-t border-gray-200 pt-8">
              <p className="text-gray-600 mb-4">
                Be among the first to experience an easier way to find app ideas by joining our early access beta group that will be opening to developers, like you, very soon.
              </p>
              
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#88D18A] text-gray-900 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                </button>
              </form>
              
              {message && (
                <div className={`text-sm mb-4 ${message.includes('Thanks') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </div>
              )}
              
              {waitlistCount > 0 && (
                <div className="inline-flex items-center gap-2 bg-[#CCDDB7] px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-gray-800">
                    🎉 {waitlistCount.toLocaleString()} developers have joined the waitlist
                  </span>
                </div>
              )}
              
              {/* Hidden reCAPTCHA */}
              <ReCAPTCHA
                ref={recaptchaRef}
                size="invisible"
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
              />
            </div>
          </div>
          
          {/* Right Column - Image */}
          <div className="relative">
            <div className="relative">
              <img 
                src="/ideas-devices-medium-compressed.jpg" 
                alt="App Ideas Finder on devices" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-bold text-gray-900 mb-2">iOS App Analysis</h3>
              <p className="text-sm text-gray-600">
                Analyze any iOS app on the App Store instantly.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-bold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-600">
                Advanced AI analyzes hundreds of reviews in seconds.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="font-bold text-gray-900 mb-2">Feature Ideas</h3>
              <p className="text-sm text-gray-600">
                Get core features and enhancement suggestions.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Market Research</h3>
              <p className="text-sm text-gray-600">
                Understand user sentiment and market opportunities.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Save Time</h3>
              <p className="text-sm text-gray-600">
                Get insights that would take days in just seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">
            Trusted by developers and entrepreneurs worldwide
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            <div className="text-3xl font-bold text-gray-400">StartupCo</div>
            <div className="text-3xl font-bold text-gray-400">AppDevs</div>
            <div className="text-3xl font-bold text-gray-400">InnovateLabs</div>
            <div className="text-3xl font-bold text-gray-400">TechVentures</div>
            <div className="text-3xl font-bold text-gray-400">BuildFast</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-white mb-4">Tools</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/appengine" className="hover:text-white">Generate app ideas</a></li>
                <li><a href="#" className="hover:text-white">Explore popular apps</a></li>
                <li><a href="#" className="hover:text-white">Analyze competitors</a></li>
                <li><a href="#" className="hover:text-white">Market research</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-white">Tutorials</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Apps</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Web App</a></li>
                <li><a href="#" className="hover:text-white">Chrome Extension</a></li>
                <li><a href="#" className="hover:text-white">API Access</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/billing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex justify-between items-center">
            <p className="text-sm">© 2025 App Ideas Finder. Elevating humanity, one algorithm at a time.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Twitter</a>
              <a href="#" className="hover:text-white">LinkedIn</a>
              <a href="#" className="hover:text-white">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

