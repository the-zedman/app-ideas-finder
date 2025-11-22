'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Footer from '@/components/Footer';

type Preview = {
  id: string;
  app_name: string;
  app_icon_url: string | null;
  app_id: string;
  created_at: string;
};

type BacklogItem = {
  priority?: string;
  content: string;
};

type SimilarApp = {
  trackName?: string;
  artistName?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  formattedPrice?: string;
  description?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
  [key: string]: any;
};

type Analysis = {
  id: string;
  app_name: string;
  app_icon_url: string | null;
  likes: string[];
  dislikes: string[];
  recommendations: string[];
  keywords: string[];
  definitely_include: string[];
  backlog: (string | BacklogItem)[];
  description: string | null;
  app_names: string[];
  prp: string | null;
  similar_apps: SimilarApp[];
  pricing_model: string | null;
  market_viability: string | null;
  review_count: number;
  analysis_time_seconds?: number | null;
  api_cost?: number | null;
  ratings_count?: number | null;
  app_developer?: string | null;
  [key: string]: any;
};

const MarkdownRenderer = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="text-gray-700 mb-3">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-gray-700">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-gray-700">{children}</ol>,
      li: ({ children }) => <li className="mb-1">{children}</li>,
      a: ({ children, href }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#88D18A] underline">
          {children}
        </a>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-lg font-bold text-gray-900 mb-3">{title}</h4>
    {children}
  </div>
);

const normalizeBacklog = (items: (string | BacklogItem)[] = []): BacklogItem[] =>
  items
    .map((item) =>
      typeof item === 'string'
        ? { content: item, priority: 'Medium' }
        : { priority: item.priority || 'Medium', content: item.content }
    )
    .filter((item) => item.content && item.content.length > 0);

export default function OnboardingPage() {
  const router = useRouter();
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const normalizedBacklog = normalizeBacklog(selectedAnalysis?.backlog || []);
  const keywords = selectedAnalysis?.keywords || [];
  const recommendations = selectedAnalysis?.recommendations || [];
  const appNames = selectedAnalysis?.app_names || [];
  const similarApps = (selectedAnalysis?.similar_apps || []) as SimilarApp[];

  useEffect(() => {
    loadPreviews();
    // Load preview count from localStorage
    const count = parseInt(localStorage.getItem('onboarding_preview_count') || '0', 10);
    setPreviewCount(count);
  }, []);

  const loadPreviews = async () => {
    try {
      const res = await fetch('/api/onboarding/previews');
      if (!res.ok) throw new Error('Failed to load previews');
      const data = await res.json();
      setPreviews(data.previews || []);
    } catch (err) {
      console.error('Error loading previews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPreview = async (previewId: string) => {
    if (previewCount >= 2) {
      alert('You\'ve viewed 2 previews. Ready to generate your own? Start your trial!');
      handleStartTrial();
      return;
    }

    setLoadingAnalysis(true);
    try {
      const res = await fetch(`/api/onboarding/preview/${previewId}`);
      if (!res.ok) throw new Error('Failed to load analysis');
      const data = await res.json();
      setSelectedAnalysis(data.analysis);
      setShowModal(true);
      
      // Increment preview count
      const newCount = previewCount + 1;
      setPreviewCount(newCount);
      localStorage.setItem('onboarding_preview_count', newCount.toString());
    } catch (err) {
      console.error('Error loading analysis:', err);
      alert('Failed to load preview. Please try another one.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleStartTrial = () => {
    // Redirect to signup/login, then trial checkout
    router.push('/signup?onboarding=true');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </div>
            <a href="/" className="text-gray-600 hover:text-gray-900">
              Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Step 1: Value Proposition */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-block bg-[#88D18A] text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              THE 1% EDGE
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6" style={{ letterSpacing: '-0.02em' }}>
              You Don't Need to Be Perfect.<br />You Just Need to Be 1% Better.
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              The most successful apps aren't built from scratch—they're built by learning from competitors' mistakes and customers' frustrations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-8">
              <div className="bg-[#88D18A]/10 rounded-2xl p-6 border-2 border-[#88D18A]">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Find Competitor Weaknesses</h3>
                <p className="text-gray-700">
                  Discover what users hate about competing apps—the gaps that become your opportunities.
                </p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="text-4xl mb-3">💡</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Discover Customer Pain Points</h3>
                <p className="text-gray-700">
                  See exactly what users are desperately asking for—the features that will make them switch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Preview Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              See How It Works — Explore Real Analyses
            </h2>
            <p className="text-gray-600 mb-2">
              Pick any app below to see a complete 13-section business opportunity analysis
            </p>
            {previewCount > 0 && (
              <p className="text-sm text-gray-500">
                You've viewed {previewCount} of 2 previews
              </p>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading previews...</div>
            </div>
          ) : previews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No previews available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {previews.map((preview) => (
                <button
                  key={preview.id}
                  onClick={() => handleViewPreview(preview.id)}
                  disabled={loadingAnalysis || previewCount >= 2}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 hover:border-[#88D18A] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preview.app_icon_url ? (
                    <img 
                      src={preview.app_icon_url} 
                      alt={preview.app_name} 
                      className="w-16 h-16 rounded-2xl mb-2"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center text-2xl mb-2">
                      📱
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 text-center line-clamp-2">
                    {preview.app_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* CTA Section - Jump Right In */}
          <div className="text-center bg-gradient-to-r from-[#88D18A] to-[#6BC070] rounded-2xl p-8 md:p-12 mb-8 text-white">
            <h3 className="text-3xl md:text-4xl font-black mb-4" style={{ letterSpacing: '-0.02em' }}>
              Ready to Find Your 1% Edge?
            </h3>
            <p className="text-lg md:text-xl mb-2 opacity-95">
              Don't wait—analyze any app right now and discover hidden opportunities in minutes.
            </p>
            <p className="text-base md:text-lg mb-8 opacity-90">
              Get instant insights from hundreds of real user reviews. Your competitive advantage starts here.
            </p>
            <button
              onClick={handleStartTrial}
              className="bg-white text-[#88D18A] px-10 py-5 rounded-lg font-black text-xl hover:bg-gray-50 transition-all shadow-2xl border-4 border-white transform hover:scale-105"
              style={{ backgroundColor: '#FFFFFF', color: '#256029' }}
            >
              Generate Your Own Analysis →
            </button>
          </div>
        </section>
      </main>

      {/* Preview Modal */}
      {showModal && selectedAnalysis && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                {selectedAnalysis.app_icon_url && (
                  <img 
                    src={selectedAnalysis.app_icon_url} 
                    alt={selectedAnalysis.app_name}
                    className="w-10 h-10 rounded-lg"
                  />
                )}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedAnalysis.app_name}</h3>
                  <div className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold mt-1">
                    Real Analysis — sign up to generate your own
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Analysis Preview */}
            <div className="p-6 space-y-8">
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-5 text-sm text-[#14532D]">
                <p>
                  This report dissects <span className="font-bold">{selectedAnalysis.app_name}</span> across 13 sections—surfacing what users love, hate, and desperately want—so you can ship a version that’s at least 1% better. Every insight is sourced from real App Store feedback, highlighting competitor weaknesses, unmet needs, and monetization angles. In a single read, you get the strategic blueprint to build a stronger app faster, without guesswork.
                </p>
              </div>
              {selectedAnalysis.likes?.length > 0 && (
                <SectionCard title="1. What People Like">
                  <ul className="space-y-2">
                    {selectedAnalysis.likes.map((like, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 font-bold">✓</span>
                        <div className="flex-1">
                          <MarkdownRenderer content={like} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {selectedAnalysis.dislikes?.length > 0 && (
                <SectionCard title="2. What Users Want (or Hate!)">
                  <ul className="space-y-2">
                    {selectedAnalysis.dislikes.map((dislike, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-red-500 font-bold">⚠</span>
                        <div className="flex-1">
                          <MarkdownRenderer content={dislike} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {keywords.length > 0 && (
                <SectionCard title="3. SEO Keywords">
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {selectedAnalysis.definitely_include?.length > 0 && (
                <SectionCard title="4. Core Features to Include in Your New App">
                  <ul className="space-y-2">
                    {selectedAnalysis.definitely_include.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {normalizedBacklog.length > 0 && (
                <SectionCard title="5. Enhanced Features to Add in Your Next Release">
                  <div className="space-y-3">
                    {normalizedBacklog.map((item, idx) => (
                      <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                        <p className="text-xs uppercase tracking-wide text-blue-700 mb-1">{item.priority || 'Medium'} Priority</p>
                        <p className="text-gray-700">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {recommendations.length > 0 && (
                <SectionCard title="6. Strategic Recommendations to Stay 1% Ahead">
                  <ul className="space-y-2 bg-purple-50 border border-purple-200 rounded-xl p-4">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-purple-600 font-bold">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {selectedAnalysis.description && (
                <SectionCard title="7. App Description You Can Build On">
                  <p className="text-gray-700">{selectedAnalysis.description}</p>
                </SectionCard>
              )}

              {appNames.length > 0 && (
                <SectionCard title="8. App Name Ideas for Your Version">
                  <div className="flex flex-wrap gap-2">
                    {appNames.map((name, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {selectedAnalysis.prp && (
                <SectionCard title="9. Product Requirements Prompt">
                  <MarkdownRenderer content={selectedAnalysis.prp} />
                </SectionCard>
              )}

              {similarApps.length > 0 && (
                <SectionCard title="10. Similar Apps to Study">
                  <div className="space-y-3">
                    {similarApps.slice(0, 6).map((app, idx) => (
                      <div key={`${app.trackName}-${idx}`} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          {app.artworkUrl100 ? (
                            <img src={app.artworkUrl100} alt={app.trackName} className="w-10 h-10 rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-lg">📱</div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{app.trackName}</p>
                            <p className="text-sm text-gray-500">{app.artistName}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {app.averageUserRating ? `${app.averageUserRating.toFixed(1)}★ (${app.userRatingCount?.toLocaleString() || 0} ratings)` : 'No rating data'}
                          {app.formattedPrice ? ` • ${app.formattedPrice}` : ''}
                        </p>
                        {app.description && (
                          <p className="text-sm text-gray-600 line-clamp-3">{app.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {selectedAnalysis.pricing_model && (
                <SectionCard title="11. Pricing & Revenue Blueprint for Your App">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MarkdownRenderer content={selectedAnalysis.pricing_model} />
                  </div>
                </SectionCard>
              )}

              {selectedAnalysis.market_viability && (
                <SectionCard title="12. Market Viability & Business Case for Your Version">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MarkdownRenderer content={selectedAnalysis.market_viability} />
                  </div>
                </SectionCard>
              )}

              {(
                selectedAnalysis.analysis_time_seconds ||
                selectedAnalysis.api_cost
              ) && (
                <SectionCard title="13. Time & Money Saved">
                  <div className="space-y-2 text-gray-700">
                    {selectedAnalysis.analysis_time_seconds && (
                      <p>
                        AI generated this report in{' '}
                        <span className="font-semibold">
                          {Math.round(selectedAnalysis.analysis_time_seconds)} seconds
                        </span>{' '}
                        versus the 12+ hours a manual analyst would spend researching.
                      </p>
                    )}
                    <p>
                      Developers typically spend days researching reviews, keywords, pricing, and competitors. This analysis compresses all of that into minutes so you can move faster.
                    </p>
                  </div>
                </SectionCard>
              )}

              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={handleStartTrial}
                  className="w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors"
                >
                  Generate Your Own Analysis →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

