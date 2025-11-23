'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

interface WaitlistUser {
  id: string;
  email: string;
  waitlistSignupDate: string;
  hasSignedUp: boolean;
  signupDate: string | null;
  lastSignIn: string | null;
  hasLoggedIn: boolean;
  searchCount: number;
  unsubscribeToken: string | null;
}

export default function WaitlistUsersPage() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, signedUp: 0, notSignedUp: 0 });
  const [filter, setFilter] = useState<'all' | 'signed_up' | 'not_signed_up'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Check admin access
      const response = await fetch('/api/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/homezone');
        return;
      }
      
      await fetchUsers();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/waitlist/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
        setStats({
          total: data.total || 0,
          signedUp: data.signedUp || 0,
          notSignedUp: data.notSignedUp || 0
        });
      } else {
        console.error('Failed to fetch waitlist users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching waitlist users:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!user.email.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Status filter
    if (filter === 'signed_up' && !user.hasSignedUp) {
      return false;
    }
    if (filter === 'not_signed_up' && user.hasSignedUp) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                🔐 Admin Dashboard
              </a>
              <span className="text-gray-400">/</span>
              <a href="/admin/waitlist" className="text-gray-600 hover:text-gray-900">
                Waitlist Management
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Waitlist Users</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchUsers()}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                🔄 Refresh
              </button>
              <a href="/admin/waitlist" className="text-gray-600 hover:text-gray-900">
                Back to Waitlist
              </a>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Waitlist Users</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.signedUp}</div>
            <div className="text-sm text-gray-600">Signed Up</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-1">{stats.notSignedUp}</div>
            <div className="text-sm text-gray-600">Not Signed Up</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('signed_up')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'signed_up'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Signed Up
              </button>
              <button
                onClick={() => setFilter('not_signed_up')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'not_signed_up'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Not Signed Up
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waitlist Signup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Has Signed Up
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Searches
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.waitlistSignupDate).toLocaleDateString()}<br/>
                        <span className="text-xs">{new Date(user.waitlistSignupDate).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.hasSignedUp ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.signupDate ? (
                          <>
                            {new Date(user.signupDate).toLocaleDateString()}<br/>
                            <span className="text-xs">{new Date(user.signupDate).toLocaleTimeString()}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastSignIn ? (
                          <>
                            {new Date(user.lastSignIn).toLocaleDateString()}<br/>
                            <span className="text-xs">{new Date(user.lastSignIn).toLocaleTimeString()}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {user.searchCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No waitlist users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Showing {filteredUsers.length} of {stats.total} waitlist users
        </div>
      </main>
    </div>
  );
}

