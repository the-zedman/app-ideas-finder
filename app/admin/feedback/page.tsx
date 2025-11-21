'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Footer from '@/components/Footer';

type FeedbackItem = {
  id: string;
  user_id: string;
  user_email: string | null;
  category: string;
  message: string;
  page_url: string | null;
  allow_contact: boolean;
  reward_granted: boolean;
  reward_amount: number;
  created_at: string;
  archived?: boolean;
};

type FeedbackResponse = {
  feedback: FeedbackItem[];
  stats: {
    total: number;
    categories: Record<string, number>;
  };
};

const categoryLabels: Record<string, string> = {
  feature: 'Feature request',
  bug: 'Bug / issue',
  love: 'Love note',
  other: 'Other',
  general: 'General',
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const url = new URL('/api/admin/feedback', window.location.origin);
        if (categoryFilter !== 'all') {
          url.searchParams.set('category', categoryFilter);
        }
        if (showArchived) {
          url.searchParams.set('archived', 'true');
        }
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load feedback');
        }
        const data: FeedbackResponse = await res.json();
        setFeedback(data.feedback);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };

    const init = async () => {
      try {
        // Check admin access
        const adminRes = await fetch('/api/check-admin');
        if (!adminRes.ok) {
          router.push('/login');
          return;
        }
        const adminData = await adminRes.json();
        if (!adminData.isAdmin) {
          router.push('/homezone');
          return;
        }
        setIsAdmin(true);
        await fetchFeedback();
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
        setLoading(false);
      }
    };

    init();
  }, [categoryFilter, showArchived, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete feedback');
      }
      setFeedback(feedback.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete feedback');
    } finally {
      setProcessing(null);
    }
  };

  const handleArchive = async (id: string, archive: boolean) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: archive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${archive ? 'archive' : 'unarchive'} feedback`);
      }
      setFeedback(feedback.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${archive ? 'archive' : 'unarchive'} feedback`);
    } finally {
      setProcessing(null);
    }
  };

  const groupedStats = useMemo(() => {
    const total = feedback.length;
    const categories = feedback.reduce<Record<string, number>>((acc, item) => {
      const key = item.category || 'general';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, categories };
  }, [feedback]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder"
                className="h-8 w-8 rounded-lg"
              />
              <a href="/admin" className="text-xl font-bold text-[#3D405B] hover:text-gray-700">
                Admin Dashboard
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Feedback & Ideas</h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">
                Back to HomeZone
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback & Ideas</h1>
            <p className="text-gray-500 mt-1">
              Every submission automatically grants the user +1 bonus search. Follow up quickly while
              ideas are fresh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total submissions</p>
              <p className="text-3xl font-bold text-gray-900">{groupedStats.total}</p>
            </div>
            {Object.entries(groupedStats.categories).map(([key, count]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">
                  {categoryLabels[key] || key || 'General'}
                </p>
                <p className="text-3xl font-bold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {showArchived ? 'Archived feedback' : 'Latest feedback'}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showArchived
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-[#88D18A] text-white hover:bg-[#6bc070]'
                }`}
              >
                {showArchived ? 'View Active' : 'View Archived'}
              </button>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {feedback.length === 0 && (
              <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-xl">
                No feedback yet for this filter.
              </div>
            )}

            {feedback.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-5 hover:border-[#88D18A] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-900">
                      {item.user_email || item.user_id.slice(0, 6)}
                    </span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <span className="text-xs uppercase tracking-wide font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {categoryLabels[item.category] || item.category || 'General'}
                  </span>
                </div>

                <p className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {item.page_url && (
                      <a
                        href={item.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-gray-800"
                      >
                        View page ↗
                      </a>
                    )}
                    <span>
                      Contact? <strong>{item.allow_contact ? 'Yes' : 'No'}</strong>
                    </span>
                    <span>
                      Bonus: {item.reward_granted ? `+${item.reward_amount || 1} search` : 'pending'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {!showArchived ? (
                      <button
                        onClick={() => handleArchive(item.id, true)}
                        disabled={processing === item.id}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processing === item.id ? 'Archiving...' : 'Archive'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(item.id, false)}
                        disabled={processing === item.id}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processing === item.id ? 'Unarchiving...' : 'Unarchive'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={processing === item.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processing === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
}

