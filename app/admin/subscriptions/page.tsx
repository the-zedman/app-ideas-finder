'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Check admin access
      const response = await fetch('/api/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin || data.role === 'support') {
        alert('Admin access required');
        router.push('/admin');
        return;
      }
      
      await fetchSubscriptions();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setSubscriptions(data.subscriptions);
      } else {
        console.error('Failed to fetch subscriptions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [search, statusFilter]);

  const handleChangePlan = async (newPlanId: string, newStatus: string) => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          planId: newPlanId,
          status: newStatus
        })
      });
      
      if (response.ok) {
        setShowChangePlanModal(false);
        setSelectedUser(null);
        await fetchSubscriptions();
      } else {
        const data = await response.json();
        alert('Failed to update: ' + data.error);
      }
    } catch (error) {
      alert('Error updating subscription');
    }
  };

  const handleAwardBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const response = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          bonusType: formData.get('bonusType'),
          bonusValue: parseInt(formData.get('bonusValue') as string),
          bonusDuration: formData.get('bonusDuration'),
          reason: formData.get('reason')
        })
      });
      
      if (response.ok) {
        setShowBonusModal(false);
        setSelectedUser(null);
        form.reset();
        alert('Bonus awarded successfully!');
      } else {
        const data = await response.json();
        alert('Failed to award bonus: ' + data.error);
      }
    } catch (error) {
      alert('Error awarding bonus');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      trial: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      free_unlimited: 'bg-purple-100 text-purple-800'
    };
    
    return colors[status] || 'bg-gray-100 text-gray-800';
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
              <h1 className="text-xl font-bold text-gray-900">Subscription Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">Back to Dashboard</a>
              <button onClick={handleLogout} className="text-red-600 hover:text-red-700">Sign Out</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="free_unlimited">Free Unlimited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lifetime Spend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sub.user_name}</div>
                    <div className="text-xs text-gray-500">{sub.user_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sub.subscription_plans?.name || sub.plan_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(sub.status)}`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sub.searches_used} / {sub.searches_limit === -1 ? '∞' : sub.searches_limit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ${(sub.lifetime_spend || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => {
                        setSelectedUser(sub);
                        setShowChangePlanModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Change Plan
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(sub);
                        setShowBonusModal(true);
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Award Bonus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {subscriptions.length === 0 && (
            <div className="text-center py-12 text-gray-500">No subscriptions found</div>
          )}
        </div>
      </main>

      {/* Change Plan Modal */}
      {showChangePlanModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-8 max-w-md w-full mx-4" style={{ backgroundColor: '#ffffff' }}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Change Plan for {selectedUser.user_name}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <select id="planSelect" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="trial">Trial (10 searches, 3 days)</option>
                <option value="core_monthly">Core Monthly (73 searches, $37/mo)</option>
                <option value="core_annual">Core Annual (73 searches, $399/yr)</option>
                <option value="prime_monthly">Prime Monthly (227 searches, $79/mo)</option>
                <option value="prime_annual">Prime Annual (227 searches, $799/yr)</option>
                <option value="free_unlimited">Free Unlimited (∞ searches)</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select id="statusSelect" className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="free_unlimited">Free Unlimited</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChangePlanModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const planId = (document.getElementById('planSelect') as HTMLSelectElement).value;
                  const status = (document.getElementById('statusSelect') as HTMLSelectElement).value;
                  handleChangePlan(planId, status);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award Bonus Modal */}
      {showBonusModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-8 max-w-md w-full mx-4" style={{ backgroundColor: '#ffffff' }}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Award Bonus to {selectedUser.user_name}</h3>
            
            <form onSubmit={handleAwardBonus}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Type</label>
                <select name="bonusType" required className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="fixed_searches">Fixed Searches</option>
                  <option value="percentage_increase">Percentage Increase</option>
                  <option value="affiliate_reward">Affiliate Reward</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Value (searches or %)</label>
                <input
                  type="number"
                  name="bonusValue"
                  required
                  min="1"
                  placeholder="e.g., 25 searches or 50%"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <select name="bonusDuration" required className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="once">One-time</option>
                  <option value="monthly">Monthly (recurring)</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="e.g., Welcome bonus"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBonusModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Award Bonus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

