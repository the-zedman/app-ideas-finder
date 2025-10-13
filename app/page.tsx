'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Home() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Fetch the real waitlist count from Supabase
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
      const unsubscribeToken = crypto.randomUUID()

      // Insert email into Supabase
      const { data, error } = await supabase
        .from('waitlist')
        .insert([{ email: email, unsubscribe_token: unsubscribeToken }])
        .select();

      if (error) {
        if (error.code === '23505') {
          // Duplicate email error
          setMessage('This email is already on the waitlist!');
        } else {
          setMessage('Something went wrong. Please try again.');
        }
      } else {
        // Send confirmation email
        try {
          await fetch('/api/send-confirmation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, unsubscribeToken, recaptchaToken }),
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't fail the whole process if email fails
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
    <div className="min-h-screen bg-[#F0EFEB]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/App Ideas Finder - logo - 200x200.png"
            alt="App Ideas Finder Logo"
            width={60}
            height={60}
            className="w-12 h-12 md:w-16 md:h-16 rounded-lg"
          />
          <h1 className="text-2xl md:text-3xl font-bold text-[#3D405B]">
            App Ideas Finder
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Limited Early Access Badge */}
          <div className="mb-6 inline-block">
            <span className="px-4 py-2 bg-[#E07A5F] text-white text-sm font-bold uppercase tracking-wider rounded-full border-2 border-[#E07A5F] shadow-lg">
              🔥 Limited Early Access
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#3D405B] mb-6 leading-tight">
            Never Run Out of
            <span className="block text-[#E07A5F] mt-2">App Ideas Again</span>
          </h2>

          {/* Attention-grabbing phrases */}
          <div className="mb-8">
            <p className="text-xl md:text-2xl text-[#3D405B] font-semibold italic">
              "Steal App Ideas from Your Competitors"
            </p>
          </div>

          {/* Subheadline */}
          <p className="text-lg md:text-xl lg:text-2xl text-black/80 mb-4 max-w-2xl mx-auto leading-relaxed">
            Discover innovative app ideas using the power of AI.
          </p>
          <p className="text-base md:text-lg text-black/60 mb-6 max-w-2xl mx-auto">
            Be among the first to experience an easier way to find app ideas by joining our early access beta group that will be opening to developers, like you, very soon.
          </p>

          {/* Email Form */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" suppressHydrationWarning>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-6 py-4 rounded-lg text-lg border-2 border-grey bg-white text-black placeholder-black/60 focus:outline-none focus:border-[#E07A5F] focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-[#E07A5F] hover:bg-[#E07A5F]/80 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
              </button>
            </form>
            
            {/* Invisible reCAPTCHA */}
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              size="invisible"
            />

            {/* Success Message */}
            {message && (
              <div className="mt-4 p-4 bg-[#E07A5F]/20 border border-[#E07A5F] rounded-lg">
                <p className="text-black font-medium">{message}</p>
              </div>
            )}
          </div>

          {/* Waitlist Counter */}
          <div className="inline-block px-6 py-3 bg-black/5 backdrop-blur-sm rounded-full border border-grey/40">
            <p className="text-black/70 text-sm md:text-base">
              <span className="font-bold text-[#E07A5F] text-xl md:text-2xl">{waitlistCount}</span>
              {' '}developers already on the waitlist
            </p>
          </div>

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border-2 border-grey">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-black mb-2">A Better Way to Be a Creator</h3>
              <p className="text-black/70">
                Discover what's working in the market and find opportunities your competitors are missing.
              </p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-xl border-2 border-grey">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-black mb-2">Start Building</h3>
              <p className="text-black/70">
                Get actionable insights and resources to turn your ideas into reality.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-2">
        <div className="text-center text-black/40 text-sm">
          <p>&copy; {new Date().getFullYear()} App Ideas Finder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
