'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import ReCAPTCHA from 'react-google-recaptcha';

// Flip Clock Digit Component
function FlipDigit({ value, label }: { value: number; label?: string }) {
  const [currentValue, setCurrentValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  
  useEffect(() => {
    if (value !== currentValue) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentValue(value);
        setIsFlipping(false);
      }, 300);
    }
  }, [value, currentValue]);
  
  const displayValue = String(value).padStart(2, '0');
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative perspective-1000">
        <div className={`flip-card ${isFlipping ? 'flipping' : ''}`}>
          {/* Top half */}
          <div className="flip-card-top">
            <span className="flip-digit-text">{displayValue}</span>
            <div className="flip-card-divider"></div>
          </div>
          
          {/* Bottom half */}
          <div className="flip-card-bottom">
            <span className="flip-digit-text">{displayValue}</span>
          </div>
          
          {/* Flipping animation elements */}
          {isFlipping && (
            <>
              <div className="flip-card-front-top">
                <span className="flip-digit-text">{String(currentValue).padStart(2, '0')}</span>
              </div>
              <div className="flip-card-back-bottom">
                <span className="flip-digit-text">{displayValue}</span>
              </div>
            </>
          )}
        </div>
        
        {/* Screws for vintage look */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-gray-600 rounded-full shadow-inner"></div>
        <div className="absolute top-1 right-1 w-2 h-2 bg-gray-600 rounded-full shadow-inner"></div>
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-gray-600 rounded-full shadow-inner"></div>
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-gray-600 rounded-full shadow-inner"></div>
      </div>
      
      {label && (
        <span className="text-xs font-bold text-gray-700 mt-3 uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}

// Countdown Timer Component
function CountdownTimer() {
  const calculateTimeLeft = () => {
    // Set launch date to 14 days from now
    const launchDate = new Date();
    launchDate.setDate(launchDate.getDate() + 14);
    
    const now = new Date();
    const difference = launchDate.getTime() - now.getTime();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
      };
    }
    
    return { days: 0, hours: 0, minutes: 0 };
  };
  
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="mb-8 flex flex-col items-center">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
          🚀 COUNTDOWN TO LAUNCH
        </h3>
        <p className="text-sm text-gray-600 font-semibold">
          Get ready for something amazing
        </p>
      </div>
      
      <div className="flex gap-4 justify-center items-center">
        <FlipDigit value={timeLeft.days} label="DAYS" />
        <div className="text-5xl font-bold text-gray-800 mb-8">:</div>
        <FlipDigit value={timeLeft.hours} label="HOURS" />
        <div className="text-5xl font-bold text-gray-800 mb-8">:</div>
        <FlipDigit value={timeLeft.minutes} label="MINUTES" />
      </div>
    </div>
  );
}

export default function LandingTest() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const supabase = createClient();

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isHowItWorksVisible) {
            setIsHowItWorksVisible(true);
            setAnimationKey(Date.now());
            setShowResult(false);
            
            // Show result after animation completes
            setTimeout(() => {
              setShowResult(true);
            }, 3500);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (howItWorksRef.current) {
      observer.observe(howItWorksRef.current);
    }

    return () => observer.disconnect();
  }, [isHowItWorksVisible]);

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
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </div>
            <div className="flex items-center gap-6">
              <button disabled className="text-gray-400 cursor-not-allowed">Sign in</button>
              <button disabled className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg font-semibold cursor-not-allowed">
                Sign up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Text */}
          <div>
            <h1 className="text-gray-900 mb-6" style={{ fontSize: '70px', fontWeight: 900, lineHeight: '1.1', letterSpacing: '-0.02em' }}>
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
          <div className="relative -mr-20">
            <img 
              src="/ideas-devices-compressed.png" 
              alt="App Ideas Finder on devices" 
              className="w-full h-auto mb-8"
              style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}
            />
            
            {/* Countdown Timer */}
            <div className="flex justify-center mt-8">
              <CountdownTimer />
            </div>
          </div>
        </div>
      </section>

      {/* The 1% Edge Theory Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Heading */}
          <div className="text-center mb-12">
            <div className="inline-block bg-[#88D18A] text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              THE SCIENCE OF WINNING
            </div>
            <h2 className="text-5xl font-black text-gray-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              You Don't Need to Be Perfect.<br />You Just Need to Be 1% Better.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The most successful apps aren't built from scratch—they're built by learning from competitors' mistakes and customers' frustrations.
            </p>
          </div>

          {/* The Theory */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-6xl mb-6">🎯</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">The Competitive Intelligence Advantage</h3>
                <p className="text-lg text-gray-700 mb-4">
                  In 2004, Clayton Christensen (Harvard Business School) discovered that <strong>84% of successful products</strong> didn't invent new categories—they simply improved existing ones by listening to what customers complained about.
                </p>
                <p className="text-lg text-gray-700 mb-4">
                  Steve Jobs famously said: <em>"Good artists copy, great artists steal."</em> Apple didn't invent smartphones, MP3 players, or tablets—they made them <strong>marginally better</strong> by fixing what competitors got wrong.
                </p>
                <div className="bg-[#88D18A]/10 border-l-4 border-[#88D18A] p-4 rounded-r-lg">
                  <p className="text-gray-800 font-semibold">
                    "The best way to predict the future is to look at what's broken today." — Peter Thiel, PayPal & Palantir Founder
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Stat Card 1 */}
                <div className="bg-gradient-to-br from-[#88D18A] to-[#6BC070] text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                  <div className="text-5xl font-black mb-2">84%</div>
                  <p className="text-sm opacity-90">of billion-dollar startups improved existing solutions rather than creating new markets</p>
                  <p className="text-xs mt-2 opacity-75">— CB Insights, 2023</p>
                </div>
                
                {/* Stat Card 2 */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                  <div className="text-5xl font-black mb-2">72%</div>
                  <p className="text-sm opacity-90">of users will switch to a competitor if their current app fails to address their top complaint</p>
                  <p className="text-xs mt-2 opacity-75">— Forrester Research, 2024</p>
                </div>
                
                {/* Stat Card 3 */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform">
                  <div className="text-5xl font-black mb-2">1%</div>
                  <p className="text-sm opacity-90">improvement in user experience can increase conversion rates by up to 400%</p>
                  <p className="text-xs mt-2 opacity-75">— Nielsen Norman Group</p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-World Examples */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-8">Real Companies. Real Results.</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Example 1: Slack */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">💬</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Slack</h4>
                    <p className="text-sm text-gray-500">vs. HipChat, Skype</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">
                  Slack analyzed <strong>thousands of reviews</strong> complaining about clunky interfaces and poor search in competing tools.
                </p>
                <div className="bg-[#CCDDB7] p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800">The 1% Edge:</p>
                  <p className="text-sm text-gray-700">Better search + cleaner UI = $27.7B valuation</p>
                </div>
              </div>

              {/* Example 2: Notion */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">📝</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Notion</h4>
                    <p className="text-sm text-gray-500">vs. Evernote, OneNote</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">
                  Users complained about <strong>inflexibility</strong> and fragmented tools. Notion listened.
                </p>
                <div className="bg-[#CCDDB7] p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800">The 1% Edge:</p>
                  <p className="text-sm text-gray-700">All-in-one workspace = 30M+ users in 4 years</p>
                </div>
              </div>

              {/* Example 3: Superhuman */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Superhuman</h4>
                    <p className="text-sm text-gray-500">vs. Gmail, Outlook</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-3">
                  Found that power users wanted <strong>keyboard shortcuts</strong> and speed that Gmail didn't offer.
                </p>
                <div className="bg-[#CCDDB7] p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-800">The 1% Edge:</p>
                  <p className="text-sm text-gray-700">Speed-first email = $30/month premium pricing</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Formula */}
          <div className="bg-gradient-to-r from-[#88D18A] to-[#6BC070] rounded-3xl p-8 md:p-12 text-white text-center">
            <h3 className="text-3xl font-bold mb-6">The Winning Formula</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-xl md:text-2xl font-bold mb-6">
              <div className="bg-white/20 px-6 py-4 rounded-xl backdrop-blur-sm">
                Find Competitor Weaknesses
              </div>
              <div className="text-3xl">+</div>
              <div className="bg-white/20 px-6 py-4 rounded-xl backdrop-blur-sm">
                Discover Customer Pain Points
              </div>
              <div className="text-3xl">=</div>
              <div className="bg-yellow-400 text-gray-900 px-6 py-4 rounded-xl font-black shadow-lg">
                Your 1% Edge
              </div>
            </div>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              You don't need a revolutionary idea. You need to be <strong>marginally better</strong> at solving problems your competitors ignore. That's where App Ideas Finder comes in.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {/* Original Card 1 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-bold text-gray-900 mb-2">iOS App Analysis</h3>
              <p className="text-sm text-gray-600">
                Analyze any iOS app on the App Store instantly.
              </p>
            </div>
            
            {/* Original Card 2 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="font-bold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-600">
                Advanced AI analyzes hundreds of reviews in seconds.
              </p>
            </div>
            
            {/* Original Card 3 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="font-bold text-gray-900 mb-2">Feature Ideas</h3>
              <p className="text-sm text-gray-600">
                Get core features and enhancement suggestions.
              </p>
            </div>
            
            {/* Original Card 4 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Market Research</h3>
              <p className="text-sm text-gray-600">
                Understand user sentiment and market opportunities.
              </p>
            </div>
            
            {/* Original Card 5 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Save Time</h3>
              <p className="text-sm text-gray-600">
                Get insights that would take days in just seconds.
              </p>
            </div>
            
            {/* New Card 1 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="font-bold text-gray-900 mb-2">A Better Way to Be a Creator</h3>
              <p className="text-sm text-gray-600">
                Discover what's working in the market and find opportunities your competitors are missing.
              </p>
            </div>
            
            {/* New Card 2 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="font-bold text-gray-900 mb-2">Start Building</h3>
              <p className="text-sm text-gray-600">
                Get actionable insights and resources to turn your ideas into reality.
              </p>
            </div>
            
            {/* New Card 3 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold text-gray-900 mb-2">Steal Ideas from Competitors</h3>
              <p className="text-sm text-gray-600">
                See what users love about competing apps and what they're desperately asking for.
              </p>
            </div>
            
            {/* New Card 4 */}
            <div className="bg-white rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">💭</div>
              <h3 className="font-bold text-gray-900 mb-2">Break Ideas Paralysis</h3>
              <p className="text-sm text-gray-600">
                Stop overthinking. Get data-driven validation and clear direction for your next app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-gray-900 text-center mb-8" style={{ letterSpacing: '-0.02em' }}>
            How it works
          </h2>
          
          {/* Steps Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 max-w-3xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col">
              <div className="text-center">
                <div className="inline-block bg-[#CCDDB7] text-gray-800 px-3 py-1 rounded-full font-bold text-xs mb-4">
                  STEP 1
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Choose the app you want to analyze
                </h3>
              </div>
              <div className="flex justify-center items-center flex-1">
                {isHowItWorksVisible && (
                  <div className="animate-fade-in">
                    <div className="flex items-center justify-center text-9xl">
                      📱
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col">
              <div className="text-center">
                <div className="inline-block bg-[#CCDDB7] text-gray-800 px-3 py-1 rounded-full font-bold text-xs mb-4">
                  STEP 2
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Click
                </h3>
              </div>
              <div className="flex justify-center items-center flex-1">
                <button className="bg-[#88D18A] text-white font-semibold py-3 px-8 rounded-lg text-lg animate-click-pulse shadow-lg">
                  Generate
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress Animation */}
          {isHowItWorksVisible && (
            <div className="mb-4 max-w-5xl mx-auto px-8">
              <div className="relative h-24 flex items-center">
                {/* Growing line */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200">
                  <div className="h-full bg-[#88D18A] animate-grow-line"></div>
                </div>
                
                {/* Numbered circles */}
                <div className="relative flex justify-between w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num, idx) => (
                    <div 
                      key={`${animationKey}-${num}`}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-[#88D18A] text-white font-bold text-lg shadow-lg animate-pop-in"
                      style={{ 
                        animationDelay: `${2.3 + (idx * 0.092)}s`,
                        opacity: 0,
                        animationFillMode: 'forwards'
                      }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Result Text */}
          <div className={`text-center max-w-5xl mx-auto mb-8 transition-all duration-1000 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-gradient-to-r from-[#88D18A] to-[#6BC070] text-white px-6 py-4 rounded-2xl shadow-xl">
              <p className="text-xl font-bold">
                App Ideas Finder has now generates your 12 step detailed app analysis and development action plan
              </p>
            </div>
          </div>
          
          {/* 12 Sections Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto transition-all duration-1000 delay-300 ${showResult ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              1. What people like
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              2. What users want
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              3. Top recommendations
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              4. Suggested SEO keywords
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              5. Suggested core features to include
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              6. Suggested enhanced features to include
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              7. Suggested app description
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              8. Suggested app name ideas
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              9. Product Requirements Prompt
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              10. Similar apps
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              11. Suggested pricing model
            </div>
            <div className="bg-[#CCDDB7] px-4 py-3 rounded-lg text-sm font-semibold text-gray-800">
              12. Time & cost savings
            </div>
          </div>
        </div>
      </section>
      
      {/* Add animations to the page */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes click-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 25px rgba(136, 209, 138, 0.3);
          }
          50% {
            transform: scale(0.95);
            box-shadow: 0 5px 15px rgba(136, 209, 138, 0.5);
          }
        }
        
        @keyframes grow-line {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes flip-top {
          0% {
            transform: rotateX(0deg);
          }
          100% {
            transform: rotateX(-90deg);
          }
        }
        
        @keyframes flip-bottom {
          0% {
            transform: rotateX(90deg);
          }
          100% {
            transform: rotateX(0deg);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        
        .animate-click-pulse {
          animation: click-pulse 1.5s ease-in-out infinite;
        }
        
        .animate-grow-line {
          animation: grow-line 2.3s ease-out forwards;
        }
        
        .animate-pop-in {
          animation: pop-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
      `}</style>
      
      {/* Flip Clock Styles */}
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .flip-card {
          position: relative;
          width: 100px;
          height: 120px;
          font-size: 64px;
          font-weight: 900;
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          background: linear-gradient(to bottom, #2d2d2d 0%, #1a1a1a 50%, #0d0d0d 50%, #000000 100%);
        }
        
        .flip-card-top,
        .flip-card-bottom {
          position: absolute;
          width: 100%;
          height: 50%;
          overflow: hidden;
          background: linear-gradient(to bottom, #2d2d2d, #1a1a1a);
        }
        
        .flip-card-top {
          top: 0;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .flip-card-bottom {
          bottom: 0;
          border-radius: 0 0 8px 8px;
          background: linear-gradient(to bottom, #0d0d0d, #000000);
        }
        
        .flip-card-divider {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.8), transparent);
        }
        
        .flip-digit-text {
          position: absolute;
          width: 100%;
          height: 200%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        .flip-card-top .flip-digit-text {
          top: 0;
        }
        
        .flip-card-bottom .flip-digit-text {
          top: -100%;
        }
        
        .flip-card-front-top,
        .flip-card-back-bottom {
          position: absolute;
          width: 100%;
          height: 50%;
          overflow: hidden;
          backface-visibility: hidden;
          transform-origin: bottom;
        }
        
        .flip-card-front-top {
          top: 0;
          background: linear-gradient(to bottom, #2d2d2d, #1a1a1a);
          border-radius: 8px 8px 0 0;
          animation: flip-top 0.3s ease-in forwards;
          z-index: 2;
        }
        
        .flip-card-back-bottom {
          bottom: 0;
          background: linear-gradient(to bottom, #0d0d0d, #000000);
          border-radius: 0 0 8px 8px;
          transform: rotateX(90deg);
          transform-origin: top;
          animation: flip-bottom 0.3s 0.3s ease-out forwards;
        }
        
        .flip-card-front-top .flip-digit-text {
          top: 0;
          color: #fff;
        }
        
        .flip-card-back-bottom .flip-digit-text {
          top: -100%;
          color: #fff;
        }
        
        @media (max-width: 640px) {
          .flip-card {
            width: 70px;
            height: 84px;
            font-size: 44px;
          }
        }
      `}</style>

      {/* Final CTA Section - White backgrounds on all elements */}
      <section className="py-20 bg-gradient-to-br from-[#88D18A] via-[#6BC070] to-[#88D18A] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-block bg-yellow-400 text-gray-900 px-4 py-2 rounded-full text-sm font-black mb-6 shadow-lg">
            ⚡ YOUR COMPETITIVE EDGE STARTS HERE
          </div>
          
          {/* Main Headline */}
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            Stop Guessing.<br />Start Winning.
          </h2>
          
          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-gray-900 font-bold text-lg">Find What Competitors Miss</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="text-4xl mb-3">💡</div>
              <p className="text-gray-900 font-bold text-lg">Discover Hidden Opportunities</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-gray-900 font-bold text-lg">Build Your 1% Edge</p>
            </div>
          </div>
          
          {/* Subheading */}
          <p className="text-2xl text-white font-semibold mb-8">
            Join developers who are building smarter, not harder.
          </p>
          
          {/* Email Capture Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email to get early access"
                required
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 rounded-xl text-lg border-2 border-white/30 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-all disabled:opacity-50 shadow-lg"
                style={{ backgroundColor: '#FFFFFF', color: '#111827' }}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black rounded-xl text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
              >
                {isSubmitting ? 'Joining...' : 'Join the Waitlist →'}
              </button>
            </div>
          </form>
          
          {/* Status Message */}
          {message && (
            <div className={`max-w-2xl mx-auto mb-4 p-4 rounded-xl ${
              message.includes('already') || message.includes('wrong')
                ? 'bg-red-500/20 border-2 border-red-300 text-white'
                : 'bg-white/20 border-2 border-white/30 text-white'
            }`}>
              {message}
            </div>
          )}
          
          {/* Waitlist Count */}
          <div className="bg-white rounded-full px-6 py-3 inline-block shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <p className="text-gray-900 font-semibold">
              🔥 <span className="font-black text-[#88D18A]">{waitlistCount.toLocaleString()}</span> developers already on the waitlist
            </p>
          </div>
          
          {/* Social Proof Points */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/90 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">✓</span>
              <span>Early access pricing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">✓</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
        
        {/* Hidden reCAPTCHA */}
        <ReCAPTCHA
          ref={recaptchaRef}
          size="invisible"
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
        />
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            {/* Hidden for future development */}
            <div className="hidden">
              <h3 className="font-bold text-white mb-4">Tools</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/appengine" className="hover:text-white">Generate app ideas</a></li>
                <li><a href="#" className="hover:text-white">Explore popular apps</a></li>
                <li><a href="#" className="hover:text-white">Analyze competitors</a></li>
                <li><a href="#" className="hover:text-white">Market research</a></li>
              </ul>
            </div>
            
            {/* Hidden for future development */}
            <div className="hidden">
              <h3 className="font-bold text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">API Reference</a></li>
                <li><a href="#" className="hover:text-white">Tutorials</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            
            {/* Hidden for future development */}
            <div className="hidden">
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
                <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="/terms-of-service" className="hover:text-white">Terms of Service</a></li>
                <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex justify-between items-center">
            <p className="text-sm">© 2025 App Ideas Finder. Elevating humanity, one algorithm at a time.</p>
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

