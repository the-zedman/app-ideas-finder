'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import Footer from '@/components/Footer';

const categories = [
  { value: 'feature', label: 'Feature request' },
  { value: 'bug', label: 'Bug / issue' },
  { value: 'love', label: 'Love note' },
  { value: 'other', label: 'Other' },
];

export default function FeedbackPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [category, setCategory] = useState('feature');
  const [message, setMessage] = useState('');
  const [allowContact, setAllowContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login?redirectTo=/feedback';
      } else {
        setUser(data.user);
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Please share a little detail so we can act on it.');
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          category,
          allowContact,
          pageUrl,
        }),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text };
      }

      if (!response.ok) {
        setErrorMessage(data.error || data.details || 'Failed to send feedback. Please try again.');
      } else {
        setMessage('');
        setStatusMessage(
          data.message || 'Thanks for the feedback! We added +1 bonus search to your account.'
        );
      }
    } catch (error) {
      console.error('Feedback submit error:', error);
      setErrorMessage('Unexpected error sending feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Checking your account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <a href="/homezone" className="text-lg font-semibold text-[#3D405B] hover:text-black">
              ← Back to dashboard
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-sm font-semibold text-gray-800">{user.email}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#3D405B] font-semibold">
              {user.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-8">
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#88D18A]/20 text-sm font-semibold text-[#256029] mb-4">
                  💡 You get +1 bonus search for every note
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Help us get 1% better</h1>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Great products are built with real feedback. Tell us what needs fixing, what you
                  love, or what’s missing. Every actionable note earns you an extra search credit on
                  the spot.
                </p>

                <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">⚡</span>
                    <div>
                      <p className="font-semibold">Fast turnaround</p>
                      <p className="text-gray-500">We triage feedback daily and ship improvements.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🎁</span>
                    <div>
                      <p className="font-semibold">+1 search credit</p>
                      <p className="text-gray-500">
                        Thank-you credit lands in your account instantly (no limits right now).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🔒</span>
                    <div>
                      <p className="font-semibold">Your data stays private</p>
                      <p className="text-gray-500">We only contact you if you opt in for follow-up.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        What type of note is this?
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#88D18A]"
                      >
                        {categories.map((cat) => (
                          <option value={cat.value} key={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">
                        Tell us what to fix or build next
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={7}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#88D18A]"
                        placeholder="Be specific so we can act fast. Attach links or steps if helpful."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        We read every single note. 5 seconds from you = weeks saved for us.
                      </p>
                    </div>

                    <label className="flex items-center gap-3 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={allowContact}
                        onChange={(e) => setAllowContact(e.target.checked)}
                        className="rounded border-gray-300 text-[#88D18A] focus:ring-[#88D18A]"
                      />
                      You can follow up with me if you need more context.
                    </label>

                    {errorMessage && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {errorMessage}
                      </div>
                    )}

                    {statusMessage && (
                      <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        {statusMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Sending...' : 'Send feedback & claim +1 search'}
                    </button>

                    <p className="text-xs text-gray-400 text-center">
                      Feedback powered by App Ideas Finder · {pageUrl ? new URL(pageUrl).pathname : ''}
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

