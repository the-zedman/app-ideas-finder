import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Footer from '@/components/Footer';
import CopyButton from '@/components/CopyButton';
import { createAdminClient } from '@/lib/supabase-admin';

type BacklogItem = { priority?: string; content: string };

type StartupAnalysisRecord = {
  id: string;
  business_name: string | null;
  business_idea: string;
  created_at: string;
  analysis_time_seconds: number | null;
  api_cost: number | null;
  likes: string[] | null;
  dislikes: string[] | null;
  recommendations: string[] | null;
  keywords: string[] | null;
  definitely_include: string[] | null;
  backlog: (BacklogItem | string)[] | null;
  description: string | null;
  app_names: string[] | null;
  prp: string | null;
  competitors: any | null;
  pricing_model: string | null;
  market_viability: string | null;
};

export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

async function getStartupAnalysis(slug: string): Promise<StartupAnalysisRecord | null> {
  try {
    // Check if required env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[shared-startup-analysis] Missing Supabase environment variables');
      return null;
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('startup_analyses')
      .select('*')
      .eq('share_slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[shared-startup-analysis] Failed to load analysis', error);
      return null;
    }

    return data as StartupAnalysisRecord | null;
  } catch (err) {
    console.error('[shared-startup-analysis] Error loading analysis', err);
    return null;
  }
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const analysis = await getStartupAnalysis(params.slug);

  if (!analysis) {
    return {
      title: 'App Ideas Finder | Analysis not found',
      description: 'This shared analysis link is no longer available.'
    };
  }

  const businessName = analysis.business_name || 'Business Idea';
  const title = `${businessName} Analysis | App Ideas Finder`;
  const description = `Complete business analysis of ${businessName}. See strategic insights, features, pricing, and market viability.`;
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://appideasfinder.com'}/s/${params.slug}`;

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

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-lg font-bold text-gray-900 mb-3">{title}</h4>
    {children}
  </div>
);

const normalizeBacklog = (items: (string | BacklogItem)[] | null = []): BacklogItem[] =>
  (items || [])
    .map((item) =>
      typeof item === 'string'
        ? { content: item, priority: 'Medium' }
        : { priority: item.priority || 'Medium', content: item.content }
    )
    .filter((item) => item.content && item.content.length > 0);

const getPriorityColor = (priority: string) => {
  const upper = priority.toUpperCase();
  if (upper === 'CRITICAL') return 'text-red-700 bg-red-100';
  if (upper === 'HIGH') return 'text-orange-700 bg-orange-100';
  if (upper === 'MEDIUM') return 'text-yellow-700 bg-yellow-100';
  if (upper === 'LOW') return 'text-blue-700 bg-blue-100';
  return 'text-gray-700 bg-gray-100';
};

const extractPriority = (text: string): { priority: string | null; content: string } => {
  const match = text.match(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)$/);
  if (match) {
    return { priority: match[1], content: match[2] };
  }
  return { priority: null, content: text };
};

export default async function SharedStartupAnalysisPage({ params }: { params: { slug: string } }) {
  const analysis = await getStartupAnalysis(params.slug);

  if (!analysis) {
    notFound();
  }

  const normalizedBacklog = normalizeBacklog(analysis.backlog);
  const keywords = analysis.keywords || [];
  const recommendations = analysis.recommendations || [];
  const appNames = analysis.app_names || [];
  const likes = analysis.likes || [];
  const dislikes = analysis.dislikes || [];

  const shareHeaderDate = new Date(analysis.created_at);

  const ctaUrl = '/?ref=share';

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
        <section className="bg-gradient-to-b from-gray-50 to-white py-12 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                {analysis.business_name || 'Business Idea'} Analysis
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Complete business analysis with strategic insights, features, pricing, and market viability assessment.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Generated on {shareHeaderDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-6 mb-8">
              <h3 className="text-2xl font-black mb-3 text-[#FCD34D]">Here&apos;s Your Business Blueprint</h3>
              <p className="text-gray-100 text-base">
                This report analyzes the business idea across 13 sections—identifying customer value, potential concerns,
                strategic recommendations, and market opportunities—so you can build with confidence and clarity.
              </p>
            </div>

            <div className="space-y-8">
              {likes.length > 0 && (
                <SectionCard title="1. What Customers Would Value">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {likes.map((like, idx) => (
                        <li key={idx} className="text-gray-700">
                          <MarkdownRenderer content={like} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionCard>
              )}

              {dislikes.length > 0 && (
                <SectionCard title="2. Potential Customer Concerns & Requests">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {dislikes.map((dislike, idx) => (
                        <li key={idx} className="text-gray-700">
                          <MarkdownRenderer content={dislike} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionCard>
              )}

              {keywords.length > 0 && (
                <SectionCard title="3. Suggested Keywords">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{keywords.join(', ')}</p>
                  </div>
                </SectionCard>
              )}

              {analysis.definitely_include && analysis.definitely_include.length > 0 && (
                <SectionCard title="4. Core Features to Include">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {analysis.definitely_include.map((feature, idx) => (
                        <li key={idx} className="text-gray-700">
                          <MarkdownRenderer content={feature} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionCard>
              )}

              {normalizedBacklog.length > 0 && (
                <SectionCard title="5. Additional Features to Include">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {normalizedBacklog.map((item, idx) => {
                        const priorityColor = getPriorityColor(item.priority || 'Medium');
                        return (
                          <li key={idx} className="text-gray-700">
                            <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${priorityColor}`}>
                              [{item.priority}]
                            </span>
                            <MarkdownRenderer content={item.content} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </SectionCard>
              )}

              {recommendations.length > 0 && (
                <SectionCard title="6. Strategic Recommendations & Insights">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {recommendations.map((rec, idx) => {
                        const { priority, content } = extractPriority(rec);
                        if (priority) {
                          const priorityColor = getPriorityColor(priority);
                          return (
                            <li key={idx} className="text-gray-700">
                              <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${priorityColor}`}>
                                [{priority}]
                              </span>
                              <MarkdownRenderer content={content} />
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="text-gray-700">
                            <MarkdownRenderer content={rec} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </SectionCard>
              )}

              {analysis.description && (
                <SectionCard title="7. Suggested Product Description">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MarkdownRenderer content={analysis.description} />
                  </div>
                </SectionCard>
              )}

              {appNames.length > 0 && (
                <SectionCard title="8. Suggested Business Names">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{appNames.join(', ')}</p>
                  </div>
                </SectionCard>
              )}

              {analysis.prp && (
                <SectionCard title="9. PRP (Product Requirements Prompt)">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <CopyButton text={analysis.prp} />
                    <MarkdownRenderer content={analysis.prp} />
                  </div>
                </SectionCard>
              )}

              {analysis.competitors && (
                <SectionCard title="10. Competitors">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MarkdownRenderer content={
                      typeof analysis.competitors === 'string' 
                        ? analysis.competitors 
                        : Array.isArray(analysis.competitors) 
                          ? analysis.competitors.join('\n')
                          : JSON.stringify(analysis.competitors)
                    } />
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
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Want to analyze your own business idea?</h2>
            <p className="text-lg text-gray-300 mb-8">
              Join App Ideas Finder and get comprehensive business analysis for your startup ideas.
            </p>
            <a
              href={ctaUrl}
              className="inline-block bg-[#88D18A] hover:bg-[#6bc070] text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg"
            >
              Get Started →
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
