'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type AdminCheck } from '@/lib/is-admin';
import { createClient } from '@/lib/supabase-client';

export default function AdminAnalysesPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    totalCost: 0,
    avgCost: 0,
    mostAnalyzedApp: 'N/A'
  });
  const [loading, setLoading] = useState(true);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
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
      
      await fetchAnalyses();
      setLoading(false);
    };

    init();
  }, [router]);

  const fetchAnalyses = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (dateFilter) params.append('date', dateFilter);
      
      const response = await fetch(`/api/admin/analyses?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setAnalyses(data.analyses);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch analyses:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  useEffect(() => {
    if (adminCheck) {
      fetchAnalyses();
    }
  }, [search, dateFilter]);

  const handleDelete = async (analysisId: string, appName: string) => {
    if (!confirm(`Delete analysis of "${appName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/analyses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId })
      });
      
      if (response.ok) {
        await fetchAnalyses(); // Refresh list
      } else {
        const data = await response.json();
        alert('Failed to delete: ' + data.error);
      }
    } catch (error) {
      alert('Error deleting analysis');
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
              <h1 className="text-xl font-bold text-gray-900">Analysis History</h1>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalAnalyses}</div>
            <div className="text-sm text-gray-600">Total Analyses</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-1">${stats.totalCost.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total API Cost</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-1">${stats.avgCost.toFixed(4)}</div>
            <div className="text-sm text-gray-600">Avg Cost/Analysis</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-lg font-bold text-blue-600 mb-1 truncate">{stats.mostAnalyzedApp}</div>
            <div className="text-sm text-gray-600">Most Analyzed App</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by App Name
              </label>
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Analyses Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {analysis.app_icon_url && (
                          <img 
                            src={analysis.app_icon_url} 
                            alt={analysis.app_name}
                            className="w-10 h-10 rounded-lg"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {analysis.app_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {analysis.app_developer}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {analysis.profiles?.first_name} {analysis.profiles?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{analysis.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {analysis.review_count?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {analysis.analysis_time_seconds ? `${Math.floor(analysis.analysis_time_seconds)}s` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(analysis.api_cost || 0).toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(analysis.created_at).toLocaleDateString()}<br/>
                      <span className="text-xs">{new Date(analysis.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/admin/analyses/${analysis.id}`}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                      >
                        View
                      </a>
                      {adminCheck?.isSuperAdmin && (
                        <button
                          onClick={() => handleDelete(analysis.id, analysis.app_name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {analyses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No analyses found
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

