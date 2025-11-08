'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('');
    setStatusType('');

    try {
      // Execute reCAPTCHA
      const recaptchaToken = await recaptchaRef.current?.executeAsync();
      
      if (!recaptchaToken) {
        setStatusMessage('reCAPTCHA verification failed. Please try again.');
        setStatusType('error');
        setIsSubmitting(false);
        return;
      }

      // Send contact form
      const response = await fetch('/api/send-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken
        }),
      });

      if (response.ok) {
        setStatusMessage('Thank you for your message! We\'ll get back to you soon.');
        setStatusType('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatusMessage('Failed to send message. Please try again.');
        setStatusType('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setStatusMessage('An error occurred. Please try again.');
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
      recaptchaRef.current?.reset();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="//" className="flex items-center gap-2">
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
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Contact Us</h1>
          <p className="text-base sm:text-lg text-gray-600 px-4">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mb-8 sm:mb-12">
          {/* Contact Info */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📧</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <a href="mailto:info@appideasfinder.com" className="text-[#88D18A] hover:underline">
                    info@appideasfinder.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-3xl">💬</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Support</h3>
                  <p className="text-gray-600">
                    We typically respond within 24 hours
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="text-3xl">🚀</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Feedback</h3>
                  <p className="text-gray-600">
                    We value your ideas and suggestions
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/pricing" className="hover:text-[#88D18A]">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/affiliate" className="hover:text-[#88D18A]">
                    Affiliate Program
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-[#88D18A]">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="hover:text-[#88D18A]">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent resize-none"
                  placeholder="Tell us more..."
                />
              </div>

              {/* Hidden reCAPTCHA */}
              <ReCAPTCHA
                ref={recaptchaRef}
                size="invisible"
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
              />

              {statusMessage && (
                <div
                  className={`p-4 rounded-lg ${
                    statusType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="https://policies.google.com/terms" className="underline" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{' '}
                apply.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
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
          </div>
          
          {/* Badges Section */}
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a href="https://huzzler.so/products/J8grXvhghC/app-ideas-finder?utm_source=huzzler_product_website&utm_medium=badge&utm_campaign=badge" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img alt="Featured on Huzzler" src="https://huzzler.so/assets/images/embeddable-badges/featured.png" className="h-12" />
              </a>
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

