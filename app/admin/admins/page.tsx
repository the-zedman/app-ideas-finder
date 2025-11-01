'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Check super admin access
      const response = await fetch('/api/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin || data.role !== 'super_admin') {
        alert('Super admin access required');
        router.push('/admin');
        return;
      }
      
      await fetchAdmins();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admin/admins');
      const data = await response.json();
      
      if (response.ok) {
        setAdmins(data.admins);
        setCurrentUserId(data.currentUserId);
      } else {
        console.error('Failed to fetch admins:', data.error);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, role: newAdminRole })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowAddModal(false);
        setNewAdminEmail('');
        setNewAdminRole('admin');
        await fetchAdmins();
      } else {
        alert(data.error || 'Failed to add admin');
      }
    } catch (error) {
      alert('Error adding admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string, userName: string) => {
    const roles = ['super_admin', 'admin', 'support'];
    const currentIndex = roles.indexOf(currentRole);
    
    const newRole = window.prompt(
      `Change role for ${userName}\n\nCurrent: ${currentRole}\n\nEnter new role (super_admin, admin, or support):`,
      currentRole
    );
    
    if (!newRole || newRole === currentRole) return;
    
    if (!roles.includes(newRole)) {
      alert('Invalid role. Must be: super_admin, admin, or support');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchAdmins();
      } else {
        alert(data.error || 'Failed to change role');
      }
    } catch (error) {
      alert('Error changing role');
    }
  };

  const handleRemoveAdmin = async (userId: string, role: string, userName: string) => {
    if (role === 'super_admin') {
      alert('Cannot remove super admin. Change role to admin first, then remove.');
      return;
    }
    
    if (!confirm(`Remove ${userName} as ${role}? They will lose admin access.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchAdmins();
      } else {
        alert(data.error || 'Failed to remove admin');
      }
    } catch (error) {
      alert('Error removing admin');
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
              <h1 className="text-xl font-bold text-gray-900">Admin Management</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Admin Button */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Users</h2>
            <p className="text-sm text-gray-600 mt-1">{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            + Add Admin
          </button>
        </div>

        {/* Admins Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => {
                const isYou = admin.user_id === currentUserId;
                const isSuperAdmin = admin.role === 'super_admin';
                
                return (
                  <tr key={admin.user_id} className={isYou ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.name} {isYou && <span className="text-purple-600">(You)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        isSuperAdmin ? 'bg-purple-100 text-purple-800' :
                        admin.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {admin.role.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.created_by_email || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!isYou && (
                        <>
                          <button
                            onClick={() => handleChangeRole(admin.user_id, admin.role, admin.name)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Change Role
                          </button>
                          {!isSuperAdmin && (
                            <button
                              onClick={() => handleRemoveAdmin(admin.user_id, admin.role, admin.name)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Admin</h3>
            <form onSubmit={handleAddAdmin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">User must already have an account</p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="admin">Admin - Full access except admin management</option>
                  <option value="support">Support - View users and analyses only</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAdminEmail('');
                    setNewAdminRole('admin');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

