'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Check admin access
      const response = await fetch('/api/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin) {
        alert('Admin access required');
        router.push('/admin');
        return;
      }
      
      await fetchRevenueData();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchRevenueData = async () => {
    try {
      const response = await fetch('/api/admin/revenue');
      const data = await response.json();
      
      if (response.ok) {
        setRevenueData(data);
      } else {
        console.error('Failed to fetch revenue data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getCurrentRevenue = () => {
    if (!revenueData) return 0;
    switch (timeframe) {
      case 'day': return revenueData.dailyRevenue;
      case 'week': return revenueData.weeklyRevenue;
      case 'month': return revenueData.monthlyRevenue;
      case 'year': return revenueData.yearlyRevenue;
      default: return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
              <h1 className="text-xl font-bold text-gray-900">Revenue Analytics</h1>
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
        {/* Timeframe Selector */}
        <div className="mb-6 flex justify-end">
          <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
            {(['day', 'week', 'month', 'year'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Key Revenue Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Current Period Revenue */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-lg" style={{ color: 'white' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'white', opacity: 0.9 }}>
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}ly Revenue
              </div>
              <div className="text-4xl font-bold mb-1" style={{ color: 'white' }}>
                {formatCurrency(getCurrentRevenue())}
              </div>
              <div className="text-sm" style={{ color: 'white', opacity: 0.75 }}>
                Estimated for current {timeframe}
              </div>
            </div>

            {/* MRR */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg" style={{ color: 'white' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'white', opacity: 0.9 }}>MRR</div>
              <div className="text-4xl font-bold mb-1" style={{ color: 'white' }}>
                {formatCurrency(revenueData?.mrr || 0)}
              </div>
              <div className="text-sm" style={{ color: 'white', opacity: 0.75 }}>
                Monthly Recurring Revenue
              </div>
            </div>

            {/* ARR */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg" style={{ color: 'white' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'white', opacity: 0.9 }}>ARR</div>
              <div className="text-4xl font-bold mb-1" style={{ color: 'white' }}>
                {formatCurrency(revenueData?.arr || 0)}
              </div>
              <div className="text-sm" style={{ color: 'white', opacity: 0.75 }}>
                Annual Recurring Revenue
              </div>
            </div>

            {/* Lifetime Revenue */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg" style={{ color: 'white' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'white', opacity: 0.9 }}>Lifetime Revenue</div>
              <div className="text-4xl font-bold mb-1" style={{ color: 'white' }}>
                {formatCurrency(revenueData?.lifetimeRevenue || 0)}
              </div>
              <div className="text-sm" style={{ color: 'white', opacity: 0.75 }}>
                Total all-time revenue
              </div>
            </div>

            {/* Next Month Projected */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 shadow-lg" style={{ color: 'white' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'white', opacity: 0.9 }}>
                {revenueData?.nextMonthName || 'Next Month'} Projected
              </div>
              <div className="text-4xl font-bold mb-1" style={{ color: 'white' }}>
                {formatCurrency(revenueData?.nextMonthProjectedRevenue || 0)}
              </div>
              <div className="text-sm" style={{ color: 'white', opacity: 0.75 }}>
                Based on renewal dates
              </div>
            </div>
          </div>
        </div>

        {/* Customer Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Customer Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Customers */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">Total Customers</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {revenueData?.totalCustomers || 0}
              </div>
              <div className="text-sm text-gray-500">
                All signups ({revenueData?.totalSubscribers || 0} with subscriptions)
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">Active Subscriptions</div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {revenueData?.activeSubscriptions || 0}
              </div>
              <div className="text-sm text-gray-500">Currently paying</div>
            </div>

            {/* New Customers */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">New Customers (30d)</div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {revenueData?.newCustomers || 0}
              </div>
              <div className="text-sm text-gray-500">Last 30 days</div>
            </div>

            {/* Churn Rate */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">Churn Rate</div>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {revenueData?.churnRate || 0}%
              </div>
              <div className="text-sm text-gray-500">
                {revenueData?.churnedCustomers || 0} churned this month
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Additional Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ARPU */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">ARPU</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(revenueData?.arpu || 0)}
              </div>
              <div className="text-sm text-gray-500">Average Revenue Per User</div>
            </div>

            {/* Customer Lifetime Value (simplified estimate) */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">Est. LTV</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency((revenueData?.arpu || 0) * 12)}
              </div>
              <div className="text-sm text-gray-500">Estimated Customer Lifetime Value</div>
            </div>

            {/* Revenue Per Customer */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-600 mb-2">Revenue/Customer</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {formatCurrency(
                  revenueData?.totalCustomers > 0
                    ? revenueData?.lifetimeRevenue / revenueData?.totalCustomers
                    : 0
                )}
              </div>
              <div className="text-sm text-gray-500">Lifetime average</div>
            </div>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Revenue by Plan</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueData?.revenueByPlan && Object.entries(revenueData.revenueByPlan).map(([plan, data]: [string, any]) => (
                  <tr key={plan} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(data.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((data.revenue / revenueData.mrr) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(!revenueData?.revenueByPlan || Object.keys(revenueData.revenueByPlan).length === 0) && (
              <div className="text-center py-12 text-gray-500">No revenue data available</div>
            )}
          </div>
        </div>

        {/* High-Value Customers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⭐ High-Value Customers</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueData?.highValueCustomers?.map((customer: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.plan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(customer.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(!revenueData?.highValueCustomers || revenueData.highValueCustomers.length === 0) && (
              <div className="text-center py-12 text-gray-500">No high-value customers yet</div>
            )}
          </div>
        </div>

        {/* Note about data accuracy */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="font-bold text-yellow-900 mb-1">Note on Revenue Calculations</div>
              <div className="text-sm text-yellow-800">
                Current revenue metrics are estimated based on active subscriptions. For 100% accurate revenue tracking,
                integrate with your actual Stripe payment history or create a dedicated payments tracking table.
                These numbers provide directional insights but may not reflect actual cash collected.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

