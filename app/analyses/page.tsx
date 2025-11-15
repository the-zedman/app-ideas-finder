'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import Footer from '@/components/Footer';

export default function AnalysesHistory() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'app_name' | 'review_count' | 'ratings_count'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }
      
      setUser(user);
      
      // Fetch all analyses
      const { data: allAnalyses, error } = await supabase
        .from('user_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching analyses:', error);
      } else {
        setAnalyses(allAnalyses || []);
        setFilteredAnalyses(allAnalyses || []);
      }
      
      setLoading(false);
    };

    init();
  }, []);

  // Filter and sort
  useEffect(() => {
    let result = [...analyses];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(analysis => 
        analysis.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.app_developer?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortField === 'app_name') {
        aVal = aVal?.toLowerCase() || '';
        bVal = bVal?.toLowerCase() || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setFilteredAnalyses(result);
  }, [analyses, searchQuery, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#88D18A] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8 rounded-lg"
              />
              <a href="/homezone" className="text-xl font-bold text-[#3D405B] hover:text-gray-700">
                App Ideas Finder
              </a>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-bold text-gray-900">Analysis History</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/homezone" className="text-gray-600 hover:text-gray-900">Back to Dashboard</a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
          {/* Header with count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analysis History</h2>
              <p className="text-gray-600 mt-1">
                {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'} completed
                {filteredAnalyses.length !== analyses.length && (
                  <span className="text-[#88D18A] font-semibold ml-2">
                    ({filteredAnalyses.length} shown)
                  </span>
                )}
              </p>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
              />
              <select
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortField(field as typeof sortField);
                  setSortDirection(direction as 'asc' | 'desc');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#88D18A] focus:border-transparent bg-white"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="app_name-asc">Name (A-Z)</option>
                <option value="app_name-desc">Name (Z-A)</option>
                <option value="review_count-desc">Most Reviews</option>
                <option value="review_count-asc">Least Reviews</option>
                <option value="ratings_count-desc">Most Ratings</option>
                <option value="ratings_count-asc">Least Ratings</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredAnalyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 w-12">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">App</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 hidden sm:table-cell">Developer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 hidden md:table-cell">Reviews</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 hidden lg:table-cell">Ratings</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalyses.map((analysis, index) => (
                    <tr 
                      key={analysis.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {analyses.length - analyses.indexOf(analysis)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {analysis.app_icon_url && (
                            <img 
                              src={analysis.app_icon_url} 
                              alt={analysis.app_name}
                              className="w-10 h-10 rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {analysis.app_name}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden">
                              {analysis.app_developer}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 hidden sm:table-cell">
                        {analysis.app_developer || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">
                        {analysis.review_count?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">
                        {analysis.ratings_count?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div>
                          {new Date(analysis.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(analysis.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/appengine?app=${analysis.app_id}`)}
                            className="text-sm bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/generate-pdf', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    appInfo: {
                                      name: analysis.app_name,
                                      developer: analysis.app_developer,
                                      iconUrl: analysis.app_icon_url
                                    },
                                    analysisData: {
                                      likes: analysis.likes || [],
                                      dislikes: analysis.dislikes || [],
                                      recommendations: analysis.recommendations || [],
                                      keywords: analysis.keywords || [],
                                      definitelyInclude: analysis.definitely_include || [],
                                      backlog: analysis.backlog || [],
                                      description: analysis.description ? [analysis.description] : [],
                                      appNames: analysis.app_names || [],
                                      prp: analysis.prp ? [analysis.prp] : [],
                                      similar: analysis.similar_apps || [],
                                      pricing: analysis.pricing_model ? [analysis.pricing_model] : []
                                    },
                                    analysisMetrics: {
                                      reviewCount: analysis.review_count || 0,
                                      analysisTimeSeconds: analysis.analysis_time_seconds || 0
                                    },
                                    affiliateCode: 'SIGNUP',
                                    userEmail: user?.email
                                  })
                                });
                                
                                if (response.ok) {
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${analysis.app_name}-analysis.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } else {
                                  alert('Failed to generate PDF');
                                }
                              } catch (error) {
                                console.error('PDF error:', error);
                                alert('Error generating PDF');
                              }
                            }}
                            className="text-sm bg-white border border-gray-300 hover:border-[#88D18A] text-gray-700 hover:text-[#88D18A] px-3 py-1.5 rounded-lg font-medium transition-colors"
                            title="Download PDF"
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-lg font-medium mb-2">
                {searchQuery ? 'No analyses match your search' : 'No analyses yet'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#88D18A] hover:underline font-semibold"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

