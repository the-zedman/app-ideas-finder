'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

type DeletionRequest = {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'completed' | 'declined';
  reason?: string | null;
  requested_at: string;
  processed_at?: string | null;
  processed_by_email?: string | null;
  subscription_status?: string | null;
  admin_note?: string | null;
};

export default function AdminDeletionRequestsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, declined: 0 });
  const [filter, setFilter] = useState<'pending' | 'completed' | 'declined' | ''>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const response = await fetch('/api/check-admin');
      const data = await response.json();

      if (!data.isAdmin) {
        router.push('/homezone');
        return;
      }

      setIsAdmin(true);
      await fetchRequests();
      setLoading(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [filter, isAdmin]);

  const fetchRequests = async () => {
    try {
      const query = filter ? `?status=${filter}` : '';
      const response = await fetch(`/api/admin/deletion-requests${query}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load requests');
      }

      setRequests(data.requests || []);
      setStats(data.stats || { pending: 0, completed: 0, declined: 0 });
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load requests',
      });
    }
  };

  const handleDecline = async (request: DeletionRequest) => {
    if (!confirm(`Mark request from ${request.email} as declined?`)) return;

    setActionLoading(`decline-${request.id}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/deletion-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'declined' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      setMessage({ type: 'success', text: 'Request marked as declined.' });
      await fetchRequests();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update request',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (request: DeletionRequest) => {
    if (
      !confirm(
        `Delete account ${request.email}? This cannot be undone and will remove all data.`
      )
    ) {
      return;
    }

    setActionLoading(`delete-${request.id}`);
    setMessage(null);

    try {
      const deleteResponse = await fetch(`/api/admin/users/${request.user_id}`, {
        method: 'DELETE',
      });
      const deleteData = await deleteResponse.json();

      if (!deleteResponse.ok) {
        throw new Error(deleteData.error || 'Failed to delete user');
      }

      await fetch(`/api/admin/deletion-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', adminNote: 'Deleted via deletion queue' }),
      });

      setMessage({ type: 'success', text: 'User deleted and request closed.' });
      await fetchRequests();
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete user',
      });
    } finally {
      setActionLoading(null);
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                🔐 Admin Dashboard
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Deletion Requests</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-red-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending Requests</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-600">{stats.declined}</div>
            <div className="text-sm text-gray-600">Declined</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filter by status</h2>
            <p className="text-sm text-gray-600">Review pending or historical requests</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['pending', 'completed', 'declined', ''].map((value) => (
              <button
                key={value || 'all'}
                onClick={() => setFilter(value as typeof filter)}
                className={`px-4 py-2 rounded-lg border font-semibold text-sm transition ${
                  filter === value
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {value === ''
                  ? 'All'
                  : value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{request.email}</div>
                      {request.processed_by_email && (
                        <div className="text-xs text-gray-500">
                          Processed by {request.processed_by_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.requested_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.subscription_status || 'n/a'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                      <div className="text-gray-800 whitespace-pre-line">
                        {request.reason || '—'}
                      </div>
                      {request.admin_note && (
                        <div className="text-xs text-gray-500 mt-2">
                          Admin note: {request.admin_note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleDeleteUser(request)}
                            disabled={actionLoading === `delete-${request.id}`}
                            className={`px-3 py-1 rounded border text-xs font-semibold ${
                              actionLoading === `delete-${request.id}`
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                : 'border-red-300 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {actionLoading === `delete-${request.id}` ? 'Deleting...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleDecline(request)}
                            disabled={actionLoading === `decline-${request.id}`}
                            className={`px-3 py-1 rounded border text-xs font-semibold ${
                              actionLoading === `decline-${request.id}`
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {actionLoading === `decline-${request.id}` ? 'Updating...' : 'Decline'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {request.processed_at
                            ? `Processed ${new Date(request.processed_at).toLocaleString()}`
                            : 'Updated'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {requests.length === 0 && (
            <div className="text-center py-12 text-gray-500">No requests found.</div>
          )}
        </div>
      </main>
    </div>
  );
}

