'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAdminStatus, type AdminCheck } from '@/lib/is-admin';
import { createClient } from '@/lib/supabase-client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
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
      
      setAdminCheck({
        isAdmin: data.isAdmin,
        role: data.role,
        isSuperAdmin: data.role === 'super_admin',
        isSupport: data.role === 'support'
      });
      setCurrentAdminId(data.userId);
      
      await fetchUsers();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (providerFilter) params.append('provider', providerFilter);
      if (activityFilter) params.append('activity', activityFilter);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (adminCheck) {
      fetchUsers();
    }
  }, [search, providerFilter, activityFilter]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleDisableToggle = async (targetUser: any) => {
    if (!adminCheck?.isSuperAdmin) return;

    const action = targetUser.disabled ? 'enable' : 'disable';
    const confirmMessage =
      action === 'disable'
        ? `Disable ${targetUser.email}? They will be prevented from logging in.`
        : `Re-enable ${targetUser.email}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setActionLoading(`disable-${targetUser.id}`);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setActionMessage({
        type: 'success',
        text: data.message || `User ${action === 'disable' ? 'disabled' : 'enabled'} successfully.`,
      });

      await fetchUsers();
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update user status',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (!adminCheck?.isSuperAdmin || targetUser.id === currentAdminId) return;

    const confirmDelete = confirm(
      `Delete ${targetUser.email}? This will permanently remove their account, data, and revoke access.`
    );

    if (!confirmDelete) return;

    setActionLoading(`delete-${targetUser.id}`);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setActionMessage({ type: 'success', text: 'User deleted successfully.' });
      await fetchUsers();
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete user',
      });
    } finally {
      setActionLoading(null);
    }
  };

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
              <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">
                Back to Dashboard
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
        {/* Notifications */}
        {actionMessage && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              actionMessage.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Provider
              </label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Providers</option>
                <option value="email">Email</option>
                <option value="google">Google</option>
                <option value="github">GitHub</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity
              </label>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Users</option>
                <option value="active">Active (has analyses)</option>
                <option value="inactive">Inactive (no analyses)</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{users.length}</span> users
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analyses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                          </div>
                        </div>
                        {user.disabled && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.analysis_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={`/admin/users/${user.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </a>
                        {adminCheck?.isSuperAdmin && (
                          <>
                            <button
                              className={`text-xs font-semibold px-3 py-1 rounded border transition ${
                                user.disabled
                                  ? 'border-green-300 text-green-700 hover:bg-green-50'
                                  : 'border-red-300 text-red-600 hover:bg-red-50'
                              } ${actionLoading === `disable-${user.id}` ? 'opacity-70 cursor-not-allowed' : ''}`}
                              disabled={actionLoading === `disable-${user.id}`}
                              onClick={() => handleDisableToggle(user)}
                            >
                              {actionLoading === `disable-${user.id}`
                                ? 'Updating...'
                                : user.disabled
                                  ? 'Enable'
                                  : 'Disable'}
                            </button>
                            <button
                              className={`text-xs font-semibold px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 ${
                                actionLoading === `delete-${user.id}` || user.id === currentAdminId
                                  ? 'opacity-60 cursor-not-allowed'
                                  : ''
                              }`}
                              disabled={actionLoading === `delete-${user.id}` || user.id === currentAdminId}
                              onClick={() => handleDeleteUser(user)}
                            >
                              {actionLoading === `delete-${user.id}` ? 'Deleting...' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No users found matching your filters
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

