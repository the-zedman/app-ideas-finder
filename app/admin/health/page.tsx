'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function AdminHealthPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
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
      
      await fetchHealth();
      setLoading(false);
    };

    init();
  }, [router]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      const data = await response.json();
      
      if (response.ok) {
        setHealthData(data);
        setLastChecked(new Date());
      } else {
        console.error('Failed to fetch health data:', data.error);
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'warning') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'healthy') return '🟢';
    if (status === 'warning') return '🟡';
    return '🔴';
  };

  const getOverallStatusColor = (status: string) => {
    if (status === 'healthy') return 'text-green-600';
    if (status === 'warning') return 'text-yellow-600';
    return 'text-red-600';
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
              <h1 className="text-xl font-bold text-gray-900">System Health</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchHealth()}
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
        {/* Overall Status */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                System Status: <span className={getOverallStatusColor(healthData?.overall || 'healthy')}>
                  {healthData?.overall?.toUpperCase()}
                </span>
              </h2>
              <p className="text-sm text-gray-600">
                Last checked: {lastChecked?.toLocaleTimeString() || 'Never'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh (30s)
              </label>
            </div>
          </div>
        </div>

        {/* Service Status Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getStatusColor(healthData?.services?.database?.status || 'healthy')}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Database</h4>
                <span className="text-2xl">{getStatusIcon(healthData?.services?.database?.status || 'healthy')}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Status: {healthData?.services?.database?.message}</div>
                <div>Response: {healthData?.services?.database?.responseTime}ms</div>
                <div className="text-xs opacity-75">Users: {healthData?.services?.database?.userCount}</div>
              </div>
            </div>

            {/* Grok API */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getStatusColor(healthData?.services?.grok?.status || 'healthy')}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Grok API</h4>
                <span className="text-2xl">{getStatusIcon(healthData?.services?.grok?.status || 'healthy')}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Status: {healthData?.services?.grok?.message}</div>
                <div>Response: {healthData?.services?.grok?.responseTime}ms</div>
              </div>
            </div>

            {/* iTunes API */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getStatusColor(healthData?.services?.itunes?.status || 'healthy')}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">iTunes API</h4>
                <span className="text-2xl">{getStatusIcon(healthData?.services?.itunes?.status || 'healthy')}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Status: {healthData?.services?.itunes?.message}</div>
                <div>Response: {healthData?.services?.itunes?.responseTime}ms</div>
              </div>
            </div>

            {/* Auth */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getStatusColor(healthData?.services?.auth?.status || 'healthy')}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Authentication</h4>
                <span className="text-2xl">{getStatusIcon(healthData?.services?.auth?.status || 'healthy')}</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Status: {healthData?.services?.auth?.message}</div>
                <div>Response: {healthData?.services?.auth?.responseTime}ms</div>
                <div className="text-xs opacity-75">Users: {healthData?.services?.auth?.activeUsers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Avg Analysis Time</div>
              <div className="text-3xl font-bold text-gray-900">
                {healthData?.metrics?.avgAnalysisTime ? `${healthData.metrics.avgAnalysisTime.toFixed(1)}s` : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Success Rate</div>
              <div className="text-3xl font-bold text-green-600">
                {healthData?.metrics?.successRate || 0}%
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Analyses</div>
              <div className="text-3xl font-bold text-blue-600">
                {healthData?.metrics?.totalAnalyses || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Last 24 Hours</div>
              <div className="text-3xl font-bold text-purple-600">
                {healthData?.metrics?.last24Hours || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {healthData?.recentErrors && healthData.recentErrors.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {healthData.recentErrors.map((error: any, idx: number) => (
                  <div key={idx} className="p-4">
                    <div className="font-mono text-sm text-red-600">{error.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{error.timestamp}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <div>No recent errors</div>
                <div className="text-xs mt-1">System operating normally</div>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Health Check Info</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Health checks run on-demand (not continuous monitoring)</li>
            <li>• Response times may vary based on API load</li>
            <li>• Grok API test uses minimal tokens (~5 tokens, &lt;$0.001)</li>
            <li>• Enable auto-refresh for real-time monitoring</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

