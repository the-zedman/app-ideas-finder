'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminVipPage() {
  const [vipData, setVipData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualEmail, setManualEmail] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
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
      
      await fetchVipData();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchVipData = async () => {
    try {
      const response = await fetch('/api/admin/vip');
      const data = await response.json();
      
      if (response.ok) {
        setVipData(data);
      } else {
        console.error('Failed to fetch VIP data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching VIP data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim()) return;
    
    setAddingEmail(true);
    setAddMessage(null);
    
    try {
      const response = await fetch('/api/admin/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: manualEmail.trim(),
          notes: manualNotes.trim() || null,
          invited_by: 'admin'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAddMessage({ type: 'success', text: `Successfully added ${manualEmail} to VIP list!` });
        setManualEmail('');
        setManualNotes('');
        await fetchVipData(); // Refresh the data
      } else {
        setAddMessage({ type: 'error', text: data.error || 'Failed to add VIP user' });
      }
    } catch (error) {
      setAddMessage({ type: 'error', text: 'Failed to add VIP user' });
    } finally {
      setAddingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activated':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">Activated</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Pending</span>;
      case 'expired':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">Expired</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">{status}</span>;
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
              <h1 className="text-xl font-bold text-gray-900">⭐ VIP Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchVipData()}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                🔄 Refresh
              </button>
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
        {/* Manual Add VIP User */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">➕ Add VIP User</h2>
          <form onSubmit={handleAddEmail} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="Enter email address"
                required
                disabled={addingEmail}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={addingEmail || !manualEmail.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {addingEmail ? 'Adding...' : 'Add to VIP List'}
              </button>
            </div>
            <input
              type="text"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Notes (optional) - e.g., Twitter DM, referral source"
              disabled={addingEmail}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 disabled:opacity-50 text-sm"
            />
          </form>
          
          {addMessage && (
            <div className={`mt-3 text-sm ${addMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {addMessage.text}
            </div>
          )}
          
          <p className="mt-3 text-xs text-gray-500">
            VIP users receive 75 free searches + 25% lifetime discount when they sign up with this email
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{vipData?.totalVips || 0}</div>
            <div className="text-sm text-gray-600">Total VIPs</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-yellow-600 mb-1">{vipData?.pendingVips || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-1">{vipData?.activatedVips || 0}</div>
            <div className="text-sm text-gray-600">Activated</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-1">{vipData?.weeklyAdditions || 0}</div>
            <div className="text-sm text-gray-600">Last 7 Days</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-1">{vipData?.monthlyAdditions || 0}</div>
            <div className="text-sm text-gray-600">Last 30 Days</div>
          </div>
        </div>

        {/* VIP Perks Info */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">⭐ VIP Perks (Same as Waitlist)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span className="text-gray-700">75 Free Searches ($39 value)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span className="text-gray-700">Never expire - roll over until used</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">✓</span>
              <span className="text-gray-700">25% Lifetime Discount (VIPTHANKYOU)</span>
            </div>
          </div>
        </div>

        {/* Addition Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">VIP Additions (Last 30 Days)</h2>
          {vipData?.additionTrends && vipData.additionTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vipData.additionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-AU')}
                />
                <Line type="monotone" dataKey="additions" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} name="VIP Additions" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No VIP data available yet</div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Domains */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Email Domains</h2>
            </div>
            <div className="p-6">
              {vipData?.domainBreakdown && vipData.domainBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {vipData.domainBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{item.domain}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        <span className="text-xs text-gray-500">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No data</div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="text-sm font-semibold text-green-600">
                  {vipData?.totalVips > 0 
                    ? ((vipData?.activatedVips / vipData?.totalVips) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Avg per Day (30d)</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vipData?.monthlyAdditions ? (vipData.monthlyAdditions / 30).toFixed(1) : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-xs text-gray-500">
                  {vipData?.lastUpdated 
                    ? new Date(vipData.lastUpdated).toLocaleString('en-AU', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* All VIP Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All VIP Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vipData?.allVips?.map((vip: any) => (
                  <tr key={vip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vip.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(vip.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(vip.created_at).toLocaleDateString('en-AU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}<br/>
                      <span className="text-xs">
                        {new Date(vip.created_at).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vip.invited_by || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {vip.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!vipData?.allVips || vipData.allVips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No VIP users yet. Add your first VIP above!
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

