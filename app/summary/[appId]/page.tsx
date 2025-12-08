import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase-admin';

type AnalysisRecord = {
  id: string;
  app_id: string;
  app_name: string;
  app_developer: string | null;
  app_icon_url: string | null;
  review_count: number;
  ratings_count: number | null;
  analysis_time_seconds: number | null;
  created_at: string;
  likes: string[];
  dislikes: string[];
  recommendations: string[];
  keywords: string[];
  definitely_include: string[];
  backlog: any[];
  description: string | null;
  app_names: string[];
  prp: string | null;
  similar_apps: any[];
  pricing_model: string | null;
  market_viability: string | null;
  share_slug: string | null;
};

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdminClient();

async function getAnalysisByAppId(appId: string): Promise<AnalysisRecord | null> {
  // Try to find by app_id (could be "id6739765789" or "6739765789")
  const normalizedId = appId.startsWith('id') ? appId : `id${appId}`;
  const numericId = appId.replace(/^id/, '');
  
  const { data, error } = await supabaseAdmin
    .from('user_analyses')
    .select('*')
    .or(`app_id.eq.${normalizedId},app_id.eq.${numericId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[summary] Failed to load analysis', error);
    return null;
  }

  return data as AnalysisRecord | null;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ appId: string }>;
}): Promise<Metadata> {
  const { appId } = await params;
  const analysis = await getAnalysisByAppId(appId);

  if (!analysis) {
    return {
      title: 'App Analysis Summary | App Ideas Finder',
      description: 'Quick insights from app analysis.'
    };
  }

  const title = `${analysis.app_name} - Quick Insights | App Ideas Finder`;
  const description = `${analysis.review_count.toLocaleString()} reviews analyzed. Key insights: what users love, hate, and your opportunity to build 1% better.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'App Ideas Finder',
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  };
}

// Extract first sentence or truncate
const getFirstInsight = (text: string): string => {
  if (!text) return '';
  // Remove markdown bold markers
  const cleaned = text.replace(/\*\*/g, '');
  // Get first sentence or first 120 chars
  const firstSentence = cleaned.split(/[.!?]/)[0];
  return firstSentence.length > 100 ? firstSentence.slice(0, 97) + '...' : firstSentence + '.';
};

// Extract key point from markdown/text
const extractKeyPoint = (text: string): string => {
  if (!text) return '';
  // Remove markdown formatting
  return text.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim();
};

export default async function SummaryPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const analysis = await getAnalysisByAppId(appId);

  if (!analysis) {
    notFound();
  }

  const numericAppId = analysis.app_id?.match(/\d+/)?.[0];
  const appStoreUrl = numericAppId ? `https://apps.apple.com/app/id${numericAppId}` : undefined;
  const fullAnalysisUrl = analysis.share_slug ? `/a/${analysis.share_slug}` : null;

  // Extract top insights (max 3 each)
  const topLikes = (analysis.likes || []).slice(0, 3).map(extractKeyPoint);
  const topDislikes = (analysis.dislikes || []).slice(0, 3).map(extractKeyPoint);
  const topKeywords = (analysis.keywords || []).slice(0, 6);
  const topRecommendations = (analysis.recommendations || []).slice(0, 3).map(extractKeyPoint);

  // Extract pricing insight
  const pricingInsight = analysis.pricing_model 
    ? getFirstInsight(analysis.pricing_model) 
    : null;

  // Extract market viability headline
  const viabilityInsight = analysis.market_viability
    ? getFirstInsight(analysis.market_viability)
    : null;

  const ctaUrl = '/?ref=summary';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Subtle grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              className="h-8 w-8 rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="text-sm font-semibold text-white/80 tracking-wide group-hover:text-white transition-colors">
              App Ideas Finder
            </span>
          </a>
          <a
            href={ctaUrl}
            className="text-sm font-semibold text-[#88D18A] hover:text-[#a8e8aa] transition-colors"
          >
            Try it free →
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-16 pb-12 px-6">
          <div className="max-w-4xl mx-auto">
            {/* App Info Card */}
            <div className="flex items-start gap-6 mb-10">
              {analysis.app_icon_url ? (
                <img
                  src={analysis.app_icon_url}
                  alt={analysis.app_name}
                  className="w-24 h-24 rounded-3xl shadow-2xl shadow-white/5 flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-4xl flex-shrink-0">
                  📱
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">
                  {analysis.app_name}
                </h1>
                {analysis.app_developer && (
                  <p className="text-lg text-white/50 mb-3">{analysis.app_developer}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {appStoreUrl && (
                    <a
                      href={appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white/70 hover:text-white transition-all"
                    >
                      <span>🍎</span> App Store
                    </a>
                  )}
                  {fullAnalysisUrl && (
                    <a
                      href={fullAnalysisUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#88D18A]/10 hover:bg-[#88D18A]/20 border border-[#88D18A]/30 rounded-full text-sm text-[#88D18A] hover:text-[#a8e8aa] transition-all"
                    >
                      <span>📄</span> Full Report
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
                <p className="text-3xl sm:text-4xl font-black text-emerald-400 mb-1">
                  {analysis.review_count.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-widest text-emerald-400/60 font-semibold">Reviews Analyzed</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-5 text-center">
                <p className="text-3xl sm:text-4xl font-black text-blue-400 mb-1">
                  {analysis.ratings_count ? `${(analysis.ratings_count / 1000).toFixed(0)}K` : 'N/A'}
                </p>
                <p className="text-xs uppercase tracking-widest text-blue-400/60 font-semibold">Total Ratings</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5 text-center">
                <p className="text-3xl sm:text-4xl font-black text-amber-400 mb-1">
                  {analysis.analysis_time_seconds ? `${Math.round(analysis.analysis_time_seconds)}s` : '<60s'}
                </p>
                <p className="text-xs uppercase tracking-widest text-amber-400/60 font-semibold">AI Analysis</p>
              </div>
            </div>
          </div>
        </section>

        {/* Insights Grid */}
        <section className="pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* What Users Love */}
              {topLikes.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 border border-emerald-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xl">💚</span>
                    </div>
                    <h2 className="text-xl font-bold text-emerald-300">What Users Love</h2>
                  </div>
                  <ul className="space-y-3">
                    {topLikes.map((like, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span className="text-white/80 text-sm leading-relaxed">{like}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What Users Hate */}
              {topDislikes.length > 0 && (
                <div className="bg-gradient-to-br from-red-950/50 to-red-900/20 border border-red-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <span className="text-xl">💔</span>
                    </div>
                    <h2 className="text-xl font-bold text-red-300">Pain Points</h2>
                  </div>
                  <ul className="space-y-3">
                    {topDislikes.map((dislike, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">✗</span>
                        <span className="text-white/80 text-sm leading-relaxed">{dislike}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strategic Recommendations */}
              {topRecommendations.length > 0 && (
                <div className="bg-gradient-to-br from-violet-950/50 to-violet-900/20 border border-violet-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <span className="text-xl">🎯</span>
                    </div>
                    <h2 className="text-xl font-bold text-violet-300">Your Opportunity</h2>
                  </div>
                  <ul className="space-y-3">
                    {topRecommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-violet-400 mt-1">→</span>
                        <span className="text-white/80 text-sm leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {topKeywords.length > 0 && (
                <div className="bg-gradient-to-br from-cyan-950/50 to-cyan-900/20 border border-cyan-500/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-xl">🔑</span>
                    </div>
                    <h2 className="text-xl font-bold text-cyan-300">SEO Keywords</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topKeywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-sm text-cyan-300/90 font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Insights */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              {/* Pricing Insight */}
              {pricingInsight && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">💰</span>
                    <h3 className="text-lg font-bold text-white/90">Pricing Intel</h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{pricingInsight}</p>
                </div>
              )}

              {/* Market Viability */}
              {viabilityInsight && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📈</span>
                    <h3 className="text-lg font-bold text-white/90">Market Signal</h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{viabilityInsight}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 border-t border-white/10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">
              Built with App Ideas Finder
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Get insights like this for <span className="text-[#88D18A]">any app</span>
            </h2>
            <p className="text-lg text-white/50 mb-8 max-w-xl mx-auto">
              Analyze competitors. Find gaps. Build 1% better.
            </p>
            <a
              href={ctaUrl}
              className="inline-flex items-center gap-3 bg-[#88D18A] hover:bg-[#7ac47c] text-gray-900 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-[#88D18A]/20"
            >
              Start Free Analysis →
            </a>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} App Ideas Finder
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-white/30 hover:text-white/60 transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-sm text-white/30 hover:text-white/60 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

