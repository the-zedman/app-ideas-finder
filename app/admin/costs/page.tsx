'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type AdminCheck } from '@/lib/is-admin';
import { createClient } from '@/lib/supabase-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminCostsPage() {
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  
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
      
      // Support role cannot view costs
      if (data.role === 'support') {
        alert('Support role does not have access to cost data');
        router.push('/admin');
        return;
      }
      
      setAdminCheck({
        isAdmin: data.isAdmin,
        role: data.role,
        isSuperAdmin: data.role === 'super_admin',
        isSupport: data.role === 'support'
      });
      
      await fetchCostData();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchCostData = async () => {
    try {
      const response = await fetch('/api/admin/costs');
      const data = await response.json();
      
      if (response.ok) {
        setCostData(data);
      } else {
        console.error('Failed to fetch cost data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching cost data:', error);
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

  const getTrendColor = (trend: string) => {
    if (trend === 'increasing') return 'text-red-600';
    if (trend === 'decreasing') return 'text-green-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return '↑';
    if (trend === 'decreasing') return '↓';
    return '→';
  };

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
              <h1 className="text-xl font-bold text-gray-900">API Usage & Costs</h1>
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
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total API Cost</div>
            <div className="text-3xl font-bold text-gray-900">${costData?.totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">This Month</div>
            <div className="text-3xl font-bold text-purple-600">${costData?.monthCost.toFixed(2)}</div>
            <div className={`text-xs mt-1 ${getTrendColor(costData?.trend)}`}>
              {getTrendIcon(costData?.trend)} {costData?.trend}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Avg per Analysis</div>
            <div className="text-3xl font-bold text-green-600">${costData?.avgCost.toFixed(4)}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Projected (Month)</div>
            <div className="text-3xl font-bold text-blue-600">${costData?.projection.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">Based on current rate</div>
          </div>
        </div>

        {/* Cost Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Costs (Last 30 Days)</h2>
          {costData?.dailyCosts && costData.dailyCosts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costData.dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(3)}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${parseFloat(value).toFixed(4)}`, 'Cost']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No cost data available yet</div>
          )}
        </div>

        {/* Cost Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Costs by User */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Users by Cost</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {costData?.costsByUser?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{item.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${item.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!costData?.costsByUser || costData.costsByUser.length === 0) && (
                <div className="text-center py-8 text-gray-500">No data</div>
              )}
            </div>
          </div>

          {/* Costs by App */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Apps by Cost</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">App</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {costData?.costsByApp?.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.app}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${item.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!costData?.costsByApp || costData.costsByApp.length === 0) && (
                <div className="text-center py-8 text-gray-500">No data</div>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Cost Management Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Grok API pricing: Input $0.20/1M tokens, Output $0.50/1M tokens</li>
            <li>• Average analysis uses ~50K tokens (~$0.01)</li>
            <li>• Monitor daily costs to catch anomalies</li>
            <li>• Set cost alerts in production (feature coming soon)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

