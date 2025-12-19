'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Footer from '@/components/Footer';
import type { AdminCheck } from '@/lib/is-admin';

type StartupAnalysis = {
  id: string;
  business_name: string | null;
  business_idea: string;
  created_by: string | null;
  share_slug: string | null;
  likes: string[] | null;
  dislikes: string[] | null;
  recommendations: string[] | null;
  keywords: string[] | null;
  definitely_include: string[] | null;
  backlog: any[] | null;
  description: string | null;
  app_names: string[] | null;
  prp: string | null;
  competitors: any | null;
  pricing_model: string | null;
  market_viability: string | null;
  analysis_time_seconds: number | null;
  api_cost: number | null;
  created_at: string;
  updated_at: string;
};

export default function StartupBuilderHistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [analyses, setAnalyses] = useState<StartupAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<StartupAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/check-admin');
      const data = await response.json();

      if (!data.isAdmin) {
        router.push('/homezone');
        return;
      }

      const adminStatus: AdminCheck = {
        isAdmin: data.isAdmin,
        role: data.role,
        isSuperAdmin: data.role === 'super_admin',
        isSupport: data.role === 'support'
      };

      setAdminCheck(adminStatus);
      await fetchAnalyses();
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/admin/startup-analyses');
      if (!response.ok) {
        console.error('Failed to fetch startup analyses');
        return;
      }

      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (error) {
      console.error('Error loading startup analyses', error);
    }
  };

  const handleViewDetails = (analysis: StartupAnalysis) => {
    setSelectedAnalysis(analysis);
    setShowDetails(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/startup-analyses/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAnalyses();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting analysis', error);
      alert('Failed to delete analysis');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Markdown renderer
  const MarkdownRenderer = ({ content }: { content: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="text-gray-700 mb-3">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-3 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold text-gray-900 mb-2 mt-3">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-bold text-gray-900 mb-2 mt-2">{children}</h4>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-gray-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-gray-700">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#88D18A] underline">
            {children}
          </a>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );

  // Helper to get priority color
  const getPriorityColor = (priority: string) => {
    const upper = priority.toUpperCase();
    if (upper === 'CRITICAL') return 'text-red-700 bg-red-100';
    if (upper === 'HIGH') return 'text-orange-700 bg-orange-100';
    if (upper === 'MEDIUM') return 'text-yellow-700 bg-yellow-100';
    if (upper === 'LOW') return 'text-blue-700 bg-blue-100';
    return 'text-gray-700 bg-gray-100';
  };

  // Helper to extract priority from recommendation string
  const extractPriority = (text: string): { priority: string | null; content: string } => {
    const match = text.match(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)$/);
    if (match) {
      return { priority: match[1], content: match[2] };
    }
    return { priority: null, content: text };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <a href="/admin/startup-builder" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                📋 Startup Builder History
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin/startup-builder" className="text-gray-600 hover:text-gray-900">
                New Analysis
              </a>
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Startup Builder History</h1>
          <p className="text-gray-600 max-w-2xl">
            View and manage all business idea analyses. Click on any analysis to view full details.
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg">No analyses yet. Create your first analysis in Startup Builder.</p>
            <a href="/admin/startup-builder" className="mt-4 inline-block text-[#88D18A] hover:text-[#6bc070] font-semibold">
              Go to Startup Builder →
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Idea Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyses.map((analysis) => (
                    <tr key={analysis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {analysis.business_name || 'Unnamed Business'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 line-clamp-1 max-w-md">
                          {analysis.business_idea.substring(0, 150)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString()} <br />
                        <span className="text-xs text-gray-400">
                          {new Date(analysis.created_at).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {analysis.share_slug ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleShare(analysis.share_slug!)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              View Link
                            </button>
                            <button
                              onClick={() => handleCopy(analysis.share_slug!)}
                              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No share link</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Details Modal */}
      {showDetails && selectedAnalysis && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAnalysis.business_name || 'Unnamed Business'}
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  Created: {new Date(selectedAnalysis.created_at).toLocaleString()}
                </p>
                {selectedAnalysis.share_slug && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare(selectedAnalysis.share_slug!)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-sm"
                    >
                      View Public Link
                    </button>
                    <button
                      onClick={() => handleCopy(selectedAnalysis.share_slug!)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                    >
                      Copy Link
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-6" style={{ backgroundColor: '#ffffff' }}>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Business Idea</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.business_idea}</p>
              </div>

              {selectedAnalysis.likes && selectedAnalysis.likes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">1. What Customers Would Value</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedAnalysis.likes.map((like, idx) => (
                      <li key={idx}>{like}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.dislikes && selectedAnalysis.dislikes.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">2. Potential Customer Concerns</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedAnalysis.dislikes.map((dislike, idx) => (
                      <li key={idx}>{dislike}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.keywords && selectedAnalysis.keywords.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">3. Suggested Keywords</h3>
                  <p className="text-gray-700">{selectedAnalysis.keywords.join(', ')}</p>
                </div>
              )}

              {selectedAnalysis.definitely_include && selectedAnalysis.definitely_include.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">4. Core Features to Include</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedAnalysis.definitely_include.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.backlog && selectedAnalysis.backlog.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">5. Additional Features</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedAnalysis.backlog.map((item, idx) => (
                      <li key={idx}>
                        {typeof item === 'object' && item.priority ? (
                          <span><strong>[{item.priority}]</strong> {item.content}</span>
                        ) : (
                          <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.recommendations && selectedAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">6. Strategic Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.description && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">7. Suggested Product Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.description}</p>
                </div>
              )}

              {selectedAnalysis.app_names && selectedAnalysis.app_names.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">8. Suggested Business Names</h3>
                  <p className="text-gray-700">{selectedAnalysis.app_names.join(', ')}</p>
                </div>
              )}

              {selectedAnalysis.prp && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">9. PRP (Product Requirements Prompt)</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.prp}</p>
                </div>
              )}

              {selectedAnalysis.competitors && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">10. Competitors</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {typeof selectedAnalysis.competitors === 'string' 
                      ? selectedAnalysis.competitors 
                      : Array.isArray(selectedAnalysis.competitors) 
                        ? selectedAnalysis.competitors.join('\n')
                        : JSON.stringify(selectedAnalysis.competitors)}
                  </p>
                </div>
              )}

              {selectedAnalysis.pricing_model && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">11. Pricing Strategy & Revenue Projections</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.pricing_model}</p>
                </div>
              )}

              {selectedAnalysis.market_viability && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">12. Market Viability & Business Opportunity</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.market_viability}</p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">13. Analysis Metrics</h3>
                <div className="grid grid-cols-2 gap-4 text-gray-700">
                  <div>
                    <strong>Analysis Time:</strong> {selectedAnalysis.analysis_time_seconds ? `${Math.round(selectedAnalysis.analysis_time_seconds)}s` : 'N/A'}
                  </div>
                  <div>
                    <strong>API Cost:</strong> ${selectedAnalysis.api_cost?.toFixed(6) || '0.000000'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
