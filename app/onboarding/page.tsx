'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';

type Preview = {
  id: string;
  app_name: string;
  app_icon_url: string | null;
  app_id: string;
  created_at: string;
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
  backlog: string[];
  description: string | null;
  app_names: string[];
  prp: string | null;
  similar_apps: any[];
  pricing_model: string | null;
  market_viability: string | null;
  review_count: number;
  [key: string]: any;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

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

          {previewCount >= 2 && (
            <div className="text-center bg-gradient-to-r from-[#88D18A] to-[#6BC070] rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">You've Seen What's Possible</h3>
              <p className="text-lg mb-6">Ready to analyze your own app? Start your 3-day trial for just $1</p>
              <button
                onClick={handleStartTrial}
                className="bg-white text-[#88D18A] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
              >
                Start Your Trial →
              </button>
            </div>
          )}
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
              {/* What People Like */}
              {selectedAnalysis.likes && selectedAnalysis.likes.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">1. What People Like</h4>
                  <ul className="space-y-2">
                    {selectedAnalysis.likes.slice(0, 5).map((like: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>{like}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What Users Want */}
              {selectedAnalysis.dislikes && selectedAnalysis.dislikes.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">2. What Users Want</h4>
                  <ul className="space-y-2">
                    {selectedAnalysis.dislikes.slice(0, 5).map((dislike: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-red-500 font-bold">⚠</span>
                        <span>{dislike}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Core Features */}
              {selectedAnalysis.definitely_include && selectedAnalysis.definitely_include.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">4. Core Features to Include</h4>
                  <ul className="space-y-2">
                    {selectedAnalysis.definitely_include.slice(0, 5).map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* App Description */}
              {selectedAnalysis.description && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">7. App Description</h4>
                  <p className="text-gray-700">{selectedAnalysis.description}</p>
                </div>
              )}

              {/* Pricing Model */}
              {selectedAnalysis.pricing_model && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">11. Pricing & Revenue Projections</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedAnalysis.pricing_model.substring(0, 500)}...</p>
                  </div>
                </div>
              )}

              {/* CTA Button */}
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

