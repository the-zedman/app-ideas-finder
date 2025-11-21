'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

const defaultCategories = [
  { value: 'feature', label: 'Feature request' },
  { value: 'bug', label: 'Bug / issue' },
  { value: 'love', label: 'Love note' },
  { value: 'other', label: 'Other' },
];

export default function FeedbackWidget() {
  const supabase = createClient();
  const [showPanel, setShowPanel] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [category, setCategory] = useState('feature');
  const [message, setMessage] = useState('');
  const [allowContact, setAllowContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showPanel && user) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showPanel, user]);

  const handleToggle = () => {
    if (!user) {
      const redirect = typeof window !== 'undefined' ? window.location.pathname : '/';
      window.location.href = `/login?redirectTo=${encodeURIComponent(redirect)}`;
      return;
    }
    setShowPanel((prev) => !prev);
    setStatusMessage(null);
    setErrorMessage(null);
  };

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
          data.message ||
            'Thanks for the feedback! We added +1 bonus search to your account.'
        );
      }
    } catch (error) {
      console.error('Feedback submit error:', error);
      setErrorMessage('Unexpected error sending feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-40 bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
      >
        <span>💡 Feedback & Ideas</span>
        {user ? <span className="text-xs font-normal opacity-80">+1 search</span> : null}
      </button>

      {mounted && showPanel && user && typeof document !== 'undefined' &&
        createPortal(
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 2147483646,
            }}
            onClick={handleToggle}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: '100%',
              maxWidth: '420px',
              zIndex: 2147483647,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div
              className="w-full h-full bg-white shadow-2xl p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Help us get 1% better</h2>
                <p className="text-sm text-gray-500">
                  Share an idea or issue and we’ll drop +1 bonus search into your account immediately.
                </p>
              </div>
              <button
                onClick={handleToggle}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold"
                aria-label="Close feedback panel"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  What type of note is this?
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {defaultCategories.map((cat) => (
                    <option value={cat.value} key={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tell us what to fix or build next
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#88D18A]"
                  placeholder="Be specific so we can act fast. Attach links or steps if helpful."
                />
                <p className="text-xs text-gray-500 mt-1">
                  We read every single note. 5 seconds from you = weeks saved for us.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
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
                className="w-full bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send feedback & claim +1 search'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Feedback powered by App Ideas Finder · {pageUrl ? new URL(pageUrl).pathname : ''}
              </p>
            </form>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

