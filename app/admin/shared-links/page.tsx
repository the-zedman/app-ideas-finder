'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Footer from '@/components/Footer';
import type { AdminCheck } from '@/lib/is-admin';

type SharedApp = {
  analysis_id: string;
  app_id: string;
  app_name: string;
  app_developer: string | null;
  app_icon_url: string | null;
  review_count: number | null;
  ratings_count: number | null;
  created_at: string;
  share_slug: string;
};

export default function AdminSharedLinksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [apps, setApps] = useState<SharedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/check-admin');
      const data = await response.json();

      if (!data.isAdmin) {
        router.push('/homezone');
        return;
      }

      const adminStatus: AdminCheck = {
        isAdmin: data.isAdmin,
        role: data.role,
        isSuperAdmin: data.role === 'super_admin',
        isSupport: data.role === 'support'
      };

      setAdminCheck(adminStatus);
      await fetchApps('');
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApps = async (searchTerm: string) => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);

      // Always request enough rows so we can render the full catalog
      params.set('limit', '2000');

      const response = await fetch(`/api/admin/shared-links?${params.toString()}`);
      if (!response.ok) {
        console.error('Failed to fetch shared apps');
        return;
      }

      const data = await response.json();
      setApps(data.apps || []);
    } catch (error) {
      console.error('Error loading shared apps', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!adminCheck) return;
    const delay = setTimeout(() => {
      fetchApps(search);
    }, 250);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, adminCheck]);

  const handleShare = (slug: string) => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/a/${slug}`;
    window.open(shareUrl, '_blank', 'noopener');
  };

  const handleCopy = async (slug: string) => {
    if (typeof window === 'undefined' || !navigator?.clipboard) {
      alert('Copy not supported in this environment');
      return;
    }
    const shareUrl = `${window.location.origin}/a/${slug}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard');
  };

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

  if (!adminCheck?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                🔗 Shared App Links
              </a>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded">
                BETA
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">
                Back to Dashboard
              </a>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Shared App Links</h1>
          <p className="text-gray-600 max-w-2xl">
            Instantly pull up the public analysis link for any app that has been run through App Ideas Finder.
            Each link showcases the latest analysis for that app and can be shared externally.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by App Name or ID</label>
              <input
                type="text"
                placeholder="e.g. Calm, Instagram, 6475137430"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fetchApps(search)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh List'}
              </button>
              <button
                onClick={() => {
                  setSearch('');
                  fetchApps('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={refreshing}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Analysis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apps.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No analyses found yet.
                    </td>
                  </tr>
                )}

                {apps.map((app) => (
                  <tr key={app.analysis_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {app.app_icon_url ? (
                          <img
                            src={app.app_icon_url}
                            alt={app.app_name}
                            className="w-10 h-10 rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">📱</div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{app.app_name}</div>
                          {app.app_developer && (
                            <div className="text-xs text-gray-500">{app.app_developer}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{app.app_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.created_at).toLocaleDateString()} <br />
                      <span className="text-xs text-gray-400">
                        {new Date(app.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShare(app.share_slug)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          View Link
                        </button>
                        <button
                          onClick={() => handleCopy(app.share_slug)}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

