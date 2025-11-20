'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { checkAdminStatus, hasPermission, type AdminCheck } from '@/lib/is-admin';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalAnalyses: 0,
    totalApiCost: 0,
    recentSignups: [] as any[],
    recentAnalyses: [] as any[]
  });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
      
      // Use the debug endpoint to check admin status
      try {
        const response = await fetch('/api/check-admin');
        const data = await response.json();
        
        console.log('Admin check via API:', data);
        
        if (!data.isAdmin) {
          console.log('Not admin - redirecting to homezone');
          router.push('/homezone');
          return;
        }
        
        const adminStatus = {
          isAdmin: data.isAdmin,
          role: data.role,
          isSuperAdmin: data.role === 'super_admin',
          isSupport: data.role === 'support'
        };
        
        setAdminCheck(adminStatus);
        
        // Fetch dashboard stats
        await fetchStats(adminStatus);
        
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/homezone');
        return;
      }
      
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchStats = async (adminCheck: AdminCheck) => {
    try {
      // Fetch stats from API endpoint (uses service role to bypass RLS)
      const response = await fetch('/api/admin/stats');
      
      if (!response.ok) {
        console.error('Failed to fetch admin stats:', response.status);
        return;
      }
      
      const data = await response.json();
      
      setStats({
        totalUsers: data.totalUsers,
        activeUsers: data.activeUsers,
        totalAnalyses: data.totalAnalyses,
        totalApiCost: data.totalApiCost,
        recentSignups: data.recentSignups,
        recentAnalyses: data.recentAnalyses
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">🔐 Admin Dashboard</h1>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                {adminCheck.role?.toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">
                Back to App
              </a>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Quick Stats (Last 30 Days)</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-1">{stats.activeUsers}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalAnalyses.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Analyses</div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-1">${stats.totalApiCost.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total API Cost</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔗 Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/users"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">👥 User Management</div>
              <div className="text-sm text-gray-600">View and manage user accounts</div>
            </a>
            <a
              href="/admin/analyses"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">📊 Analysis History</div>
              <div className="text-sm text-gray-600">View all app analyses</div>
            </a>
            <a
              href="/admin/revenue"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-green-300"
            >
              <div className="text-lg font-semibold text-green-900 mb-2">💰 Revenue Analytics</div>
              <div className="text-sm text-green-600">MRR, ARR, and revenue insights</div>
            </a>
            <a
              href="/admin/costs"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">📊 API Usage & Costs</div>
              <div className="text-sm text-gray-600">Track API spending and usage</div>
            </a>
            <a
              href="/admin/subscriptions"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">💳 Subscription Management</div>
              <div className="text-sm text-gray-600">Manage user plans and bonuses</div>
            </a>
            <a
              href="/admin/waitlist"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">📝 Waitlist Management</div>
              <div className="text-sm text-gray-600">Manage early access waitlist</div>
            </a>
            <a
              href="/admin/coupons"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-yellow-300"
            >
              <div className="text-lg font-semibold text-yellow-900 mb-2">🎁 Coupons & Promotions</div>
              <div className="text-sm text-gray-600">Manage codes like WAITLIST25 and other promos</div>
            </a>
            <a
              href="/admin/deletions"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-red-300"
            >
              <div className="text-lg font-semibold text-red-900 mb-2">🗑️ Deletion Requests</div>
              <div className="text-sm text-gray-600">Review and process account deletion requests</div>
            </a>
            {adminCheck.isSuperAdmin && (
              <a
                href="/admin/admins"
                className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-purple-300"
              >
                <div className="text-lg font-semibold text-purple-900 mb-2">🔐 Admin Management</div>
                <div className="text-sm text-purple-600">Manage admin users (Super Admin only)</div>
              </a>
            )}
            <a
              href="/admin/health"
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-lg font-semibold text-gray-900 mb-2">⚡ System Health</div>
              <div className="text-sm text-gray-600">Monitor system status</div>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Signups */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🆕 Recent Signups</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {stats.recentSignups.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {stats.recentSignups.map((signup, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50">
                      <div className="font-medium text-gray-900">
                        {signup.first_name} {signup.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(signup.created_at).toLocaleDateString()} at{' '}
                        {new Date(signup.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No recent signups</div>
              )}
            </div>
          </div>

          {/* Recent Analyses */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ Recent Analyses</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {stats.recentAnalyses.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {stats.recentAnalyses.map((analysis, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50">
                      <div className="font-medium text-gray-900">{analysis.app_name}</div>
                      <div className="text-sm text-gray-500">
                        {analysis.review_count} reviews • ${parseFloat(analysis.api_cost).toFixed(4)} cost
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(analysis.created_at).toLocaleDateString()} at{' '}
                        {new Date(analysis.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No analyses tracked yet
                  <div className="text-xs mt-2">Run the SQL migration to start tracking</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

