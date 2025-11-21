'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const url = new URL('/api/admin/feedback', window.location.origin);
        if (categoryFilter !== 'all') {
          url.searchParams.set('category', categoryFilter);
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

    fetchFeedback();
  }, [categoryFilter]);

  const groupedStats = useMemo(() => {
    const total = feedback.length;
    const categories = feedback.reduce<Record<string, number>>((acc, item) => {
      const key = item.category || 'general';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, categories };
  }, [feedback]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <p className="text-gray-600">Loading feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-200">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
            <h2 className="text-xl font-semibold text-gray-900">Latest feedback</h2>
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

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

