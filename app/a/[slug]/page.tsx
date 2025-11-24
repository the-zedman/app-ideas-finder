import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Footer from '@/components/Footer';
import { createAdminClient } from '@/lib/supabase-admin';

type BacklogItem = { priority?: string; content: string };
type SimilarApp = {
  trackName?: string;
  artistName?: string;
  averageUserRating?: number;
  userRatingCount?: number;
  formattedPrice?: string;
  description?: string;
  artworkUrl100?: string;
};

type AnalysisRecord = {
  id: string;
  app_id: string;
  app_name: string;
  app_developer: string | null;
  app_icon_url: string | null;
  review_count: number;
  ratings_count: number | null;
  analysis_time_seconds: number | null;
  api_cost: number | null;
  created_at: string;
  likes: string[];
  dislikes: string[];
  recommendations: string[];
  keywords: string[];
  definitely_include: string[];
  backlog: (BacklogItem | string)[];
  description: string | null;
  app_names: string[];
  prp: string | null;
  similar_apps: SimilarApp[];
  pricing_model: string | null;
  market_viability: string | null;
};

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdminClient();

async function getAnalysis(slug: string): Promise<AnalysisRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('user_analyses')
    .select('*')
    .eq('share_slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[shared-analysis] Failed to load analysis', error);
    return null;
  }

  return data as AnalysisRecord | null;
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const analysis = await getAnalysis(params.slug);

  if (!analysis) {
    return {
      title: 'App Ideas Finder | Analysis not found',
      description: 'This shared analysis link is no longer available.'
    };
  }

  const title = `${analysis.app_name} Analysis | App Ideas Finder`;
  const description = `Complete teardown of ${analysis.app_name}. See what users love, hate, and how to build a 1% better version.`;
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appideasfinder.com'}/a/${params.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
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
      )
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

export default async function SharedAnalysisPage({ params }: { params: { slug: string } }) {
  const analysis = await getAnalysis(params.slug);

  if (!analysis) {
    notFound();
  }

  const normalizedBacklog = normalizeBacklog(analysis.backlog || []);
  const keywords = analysis.keywords || [];
  const recommendations = analysis.recommendations || [];
  const appNames = analysis.app_names || [];
  const similarApps = (analysis.similar_apps || []) as SimilarApp[];

  const numericAppId = analysis.app_id?.match(/\d+/)?.[0];
  const appStoreUrl = numericAppId ? `https://apps.apple.com/app/id${numericAppId}` : undefined;

  const shareHeaderDate = new Date(analysis.created_at);

  const reviewCountText = analysis.review_count?.toLocaleString() || '0';
  const ratingsCountText = analysis.ratings_count
    ? analysis.ratings_count.toLocaleString()
    : null;

  const ctaUrl = '/signup?ref=share';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="/" className="flex items-center gap-3 group">
              <img
                src="/App Ideas Finder - logo - 200x200.png"
                alt="App Ideas Finder"
                className="h-10 w-10 rounded-xl group-hover:scale-105 transition-transform"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900 uppercase tracking-[0.2em] group-hover:text-[#0c8e4b] transition-colors">
                  App Ideas Finder
                </p>
                <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">appideasfinder.com</p>
              </div>
            </a>
            <a
              href={ctaUrl}
              className="hidden sm:inline-flex items-center gap-2 bg-gray-900 text-[#FCD34D] px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors border border-[#FCD34D]/40"
            >
              Start The Generator →
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-white to-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block bg-[#88D18A] text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              THE SCIENCE OF WINNING
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black text-gray-900 mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              You Don&apos;t Need to Be Perfect. <br className="hidden sm:block" />
              You Just Need to Be 1% Better.
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Every winning app learns from what competitors get wrong. Here’s a complete teardown of{' '}
              <span className="font-semibold text-gray-900">{analysis.app_name}</span> so you can see the gaps,
              craft a better version, and capture the 1% edge.
            </p>
          </div>
        </section>

        <section className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-gray-200 shadow-xl rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  {analysis.app_icon_url ? (
                    <img
                      src={analysis.app_icon_url}
                      alt={analysis.app_name}
                      className="w-16 h-16 rounded-2xl border border-gray-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                      📱
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{analysis.app_name}</h2>
                    {analysis.app_developer && (
                      <p className="text-sm text-gray-500">{analysis.app_developer}</p>
                    )}
                    {appStoreUrl && (
                      <a
                        href={appStoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#88D18A] underline"
                      >
                        View on the App Store
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-gray-500 tracking-[0.3em] mb-1">Analysis Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {shareHeaderDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">{shareHeaderDate.toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-[#15803D] mb-1">{reviewCountText}</p>
                  <p className="text-sm font-semibold text-[#14532D]">App Store Reviews Analyzed</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-blue-700 mb-1">
                    {ratingsCountText ? `${ratingsCountText}` : 'N/A'}
                  </p>
                  <p className="text-sm font-semibold text-blue-800">Total Ratings Considered</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-yellow-700 mb-1">
                    {analysis.analysis_time_seconds
                      ? `${Math.round(analysis.analysis_time_seconds)}s`
                      : '< 60s'}
                  </p>
                  <p className="text-sm font-semibold text-yellow-700">Time to Generate</p>
                </div>
              </div>

              <div className="bg-gray-900 text-white rounded-2xl p-6 mb-8">
                <h3 className="text-2xl font-black mb-3 text-[#FCD34D]">Here&apos;s Your Blueprint</h3>
                <p className="text-gray-100 text-base">
                  This report dissects {analysis.app_name} across 13 sections—surfacing what users love, hate, and
                  desperately want—so you can ship a version that’s at least 1% better. Every insight is sourced
                  directly from real App Store feedback so you can move with certainty, not guesswork.
                </p>
              </div>

              <div className="space-y-8">
                {analysis.likes?.length > 0 && (
                  <SectionCard title="1. What People Like">
                    <ul className="space-y-2">
                      {analysis.likes.map((like, idx) => (
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

                {analysis.dislikes?.length > 0 && (
                  <SectionCard title="2. What Users Want (or Hate!)">
                    <ul className="space-y-2">
                      {analysis.dislikes.map((dislike, idx) => (
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
                  <SectionCard title="3. SEO & ASO Keywords">
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {analysis.definitely_include?.length > 0 && (
                  <SectionCard title="4. Core Features to Keep">
                    <ul className="space-y-2">
                      {analysis.definitely_include.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {normalizedBacklog.length > 0 && (
                  <SectionCard title="5. Upgrades for Your Version">
                    <div className="space-y-3">
                      {normalizedBacklog.map((item, idx) => (
                        <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                          <p className="text-xs uppercase tracking-wide text-blue-700 mb-1">
                            {item.priority || 'Medium'} Priority
                          </p>
                          <p className="text-gray-700">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {recommendations.length > 0 && (
                  <SectionCard title="6. Strategic Recommendations">
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

                {analysis.description && (
                  <SectionCard title="7. App Description to Iterate On">
                    <p className="text-gray-700">{analysis.description}</p>
                  </SectionCard>
                )}

                {appNames.length > 0 && (
                  <SectionCard title="8. Name Ideas for Your Version">
                    <div className="flex flex-wrap gap-2">
                      {appNames.map((name, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {analysis.prp && (
                  <SectionCard title="9. Product Requirements Prompt">
                    <MarkdownRenderer content={analysis.prp} />
                  </SectionCard>
                )}

                {similarApps.length > 0 && (
                  <SectionCard title="10. Competitors Worth Studying">
                    <div className="space-y-3">
                      {similarApps.slice(0, 6).map((app, idx) => (
                        <div key={`${app.trackName}-${idx}`} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            {app.artworkUrl100 ? (
                              <img src={app.artworkUrl100} alt={app.trackName} className="w-10 h-10 rounded-lg" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-lg">
                                📱
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">{app.trackName}</p>
                              <p className="text-sm text-gray-500">{app.artistName}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {app.averageUserRating
                              ? `${app.averageUserRating.toFixed(1)}★ (${app.userRatingCount?.toLocaleString() || 0} ratings)`
                              : 'No rating data'}
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

                {analysis.pricing_model && (
                  <SectionCard title="11. Pricing & Monetization Blueprint">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <MarkdownRenderer content={analysis.pricing_model} />
                    </div>
                  </SectionCard>
                )}

                {analysis.market_viability && (
                  <SectionCard title="12. Market Viability & Business Case">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <MarkdownRenderer content={analysis.market_viability} />
                    </div>
                  </SectionCard>
                )}

                {(analysis.analysis_time_seconds || analysis.api_cost) && (
                  <SectionCard title="13. Time & Money Saved">
                    <div className="space-y-2 text-gray-700">
                      {analysis.analysis_time_seconds && (
                        <p>
                          AI generated this report in{' '}
                          <span className="font-semibold">
                            {Math.round(analysis.analysis_time_seconds)} seconds
                          </span>{' '}
                          versus the 12+ hours a manual analyst would spend researching.
                        </p>
                      )}
                      <p>
                        Developers typically spend days researching reviews, keywords, pricing, and competitors. This
                        analysis compresses all of that into minutes so you can move faster.
                      </p>
                    </div>
                  </SectionCard>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-gray-400 mb-4">
              ⚡ YOUR COMPETITIVE EDGE STARTS HERE
            </p>
            <h3 className="text-4xl font-black mb-4 text-[#FDE68A]" style={{ letterSpacing: '-0.02em' }}>
              Turn Insights Into Your 1% Edge
            </h3>
            <p className="text-lg text-gray-200 max-w-3xl mx-auto mb-8">
              You just saw how App Ideas Finder dissects a category leader in minutes. Imagine running this on any app
              you want—then using the gaps, wishlists, and pricing intel to build the version customers have been begging
              for. The fastest builders don’t guess; they iterate on what’s already working and fix the complaints that
              never get addressed.
            </p>
            <p className="text-base text-gray-300 max-w-2xl mx-auto mb-8">
              Start the generator below, feed it any App Store link, and you’ll get the same full-stack analysis: feature
              teardown, ASO keywords, backlog, pricing strategy, market viability, and a ready-to-run product requirements
              prompt. Everything you need to ship smarter, faster, and 1% better.
            </p>
            <a
              href={ctaUrl}
              className="inline-flex items-center gap-3 bg-yellow-400 text-gray-900 px-10 py-4 rounded-2xl font-black text-lg shadow-2xl border-4 border-yellow-300 transform hover:scale-105 transition-transform"
            >
              Start The Generator →
            </a>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mt-6">
              No fluff. Just unfair advantages.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

