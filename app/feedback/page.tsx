'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import Footer from '@/components/Footer';

const categories = [
  { value: 'feature', label: 'Feature request' },
  { value: 'bug', label: 'Bug / issue' },
  { value: 'love', label: 'Love note' },
  { value: 'other', label: 'Other' },
];

export default function FeedbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategory] = useState('feature');
  const [message, setMessage] = useState('');
  const [allowContact, setAllowContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        window.location.href = '/login?redirectTo=/feedback';
        return;
      }
      
      // Check if user has subscription/waitlist/VIP access
      try {
        const usageResponse = await fetch('/api/subscription/usage');
        if (usageResponse.ok) {
          const usage = await usageResponse.json();
          if (!usage.hasSubscription && !usage.canSearch) {
            // User doesn't have access - redirect to pricing
            window.location.href = '/pricing';
            return;
          }
        } else {
          // API error - redirect to pricing to be safe
          window.location.href = '/pricing';
          return;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = '/pricing';
        return;
      }
      
      setUser(currentUser);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      setProfile(profileData);
      
      // Check admin status
      const adminResponse = await fetch('/api/check-admin');
      const adminData = await adminResponse.json();
      setIsAdmin(adminData.isAdmin || false);
      
      setCheckingAuth(false);
    };
    
    init();
  }, [supabase]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
    }
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProfileMenu && !target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProfileMenu]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDisplayName = () => {
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
    // Use custom initials if set, otherwise calculate from name
    if (profile?.custom_initials) {
      return profile.custom_initials.toUpperCase();
    }
    const name = getDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGravatarUrl = (email: string) => {
    const hash = CryptoJS.MD5(email.toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  };

  if (checkingAuth || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Checking your account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder"
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-[#3D405B]">App Ideas Finder</h1>
            </div>
            
            {/* Main Navigation */}
            <nav className="flex items-center gap-6">
              <a href="/homezone" className="text-[#3D405B] font-semibold">
                Dashboard
              </a>
              <a href="/appengine" className="text-gray-600 hover:text-[#3D405B] transition-colors">
                App Engine
              </a>
            </nav>

            {/* Profile Dropdown */}
            <div className="relative profile-menu-container">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-[#88D18A] text-white text-sm font-semibold">
                    {getInitials()}
                  </div>
                  {user?.email ? (
                    <img 
                      src={getGravatarUrl(user.email)}
                      alt="Profile" 
                      className="w-full h-full object-cover absolute inset-0 z-10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                <span className="hidden sm:block text-gray-900">{getDisplayName()}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl border border-gray-200 z-50" style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                  <div className="p-4 border-b border-gray-200" style={{ backgroundColor: '#ffffff' }}>
                    <p className="font-semibold text-gray-900">{getDisplayName()}</p>
                    <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2" style={{ backgroundColor: '#ffffff' }}>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/admin');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors font-medium"
                      >
                        🔐 Admin Dashboard
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        router.push('/analyses');
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                    >
                      📊 Analysis History
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        router.push('/billing');
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                    >
                      💳 Billing & Subscription
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        router.push('/profile');
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                    >
                      👤 Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
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

