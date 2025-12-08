'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

type Summaries = {
  likes: string | null;
  dislikes: string | null;
  recommendations: string | null;
  pricing: string | null;
  viability: string | null;
  overall: string | null;
};

export default function SummaryPage() {
  const params = useParams();
  const appId = params.appId as string;
  
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Summaries>({
    likes: null,
    dislikes: null,
    recommendations: null,
    pricing: null,
    viability: null,
    overall: null,
  });
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const [allDone, setAllDone] = useState(false);

  // Fetch analysis data
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/summary/${appId}`);
        if (!response.ok) {
          throw new Error('Analysis not found');
        }
        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };
    
    if (appId) {
      fetchAnalysis();
    }
  }, [appId]);

  // Generate summaries once analysis is loaded
  useEffect(() => {
    if (!analysis) return;
    
    const generateSummaries = async () => {
      const sectionsToSummarize = [
        {
          key: 'likes',
          content: analysis.likes?.join('\n') || '',
          prompt: `Summarize what users LOVE about this app in 2-3 punchy bullet points. Be specific and actionable. Each bullet should be max 15 words.`
        },
        {
          key: 'dislikes', 
          content: analysis.dislikes?.join('\n') || '',
          prompt: `Summarize the main PAIN POINTS and complaints users have in 2-3 punchy bullet points. Focus on the biggest opportunities for improvement. Each bullet should be max 15 words.`
        },
        {
          key: 'recommendations',
          content: analysis.recommendations?.join('\n') || '',
          prompt: `Distill these recommendations into 2-3 key strategic actions. Make them specific and actionable. Each bullet should be max 15 words.`
        },
        {
          key: 'pricing',
          content: analysis.pricing_model || '',
          prompt: `Summarize the pricing strategy in 1-2 sentences. What's the key monetization insight?`
        },
        {
          key: 'viability',
          content: analysis.market_viability || '',
          prompt: `Give a 1-2 sentence verdict on market opportunity. Is this worth building? Why or why not?`
        }
      ];

      // Generate each summary
      for (const section of sectionsToSummarize) {
        if (!section.content) continue;
        
        setSummarizing(prev => ({ ...prev, [section.key]: true }));
        
        try {
          const response = await fetch('/api/grok-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'You are a concise business analyst. Provide extremely brief, punchy summaries. No fluff, no intro text, just the key points. Use bullet points where requested.'
                },
                {
                  role: 'user',
                  content: `App: ${analysis.app_name}\n\nOriginal content:\n${section.content}\n\nTask: ${section.prompt}`
                }
              ],
              model: 'grok-3-mini-fast'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content || null;
            setSummaries(prev => ({ ...prev, [section.key]: summary }));
          }
        } catch (err) {
          console.error(`Failed to summarize ${section.key}:`, err);
        } finally {
          setSummarizing(prev => ({ ...prev, [section.key]: false }));
        }
      }

      // Generate overall summary last
      setSummarizing(prev => ({ ...prev, overall: true }));
      try {
        const overallContent = `
App: ${analysis.app_name}
Reviews analyzed: ${analysis.review_count}
What users love: ${analysis.likes?.slice(0, 3).join('; ')}
What users hate: ${analysis.dislikes?.slice(0, 3).join('; ')}
Key recommendations: ${analysis.recommendations?.slice(0, 3).join('; ')}
        `.trim();

        const response = await fetch('/api/grok-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You write punchy, memorable one-liners for social media. Maximum impact in minimum words.'
              },
              {
                role: 'user',
                content: `Based on this app analysis, write a single compelling sentence (max 20 words) that captures the #1 insight or opportunity. Make it shareable on Twitter/X.\n\n${overallContent}`
              }
            ],
            model: 'grok-3-mini-fast'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content || null;
          setSummaries(prev => ({ ...prev, overall: summary }));
        }
      } catch (err) {
        console.error('Failed to generate overall summary:', err);
      } finally {
        setSummarizing(prev => ({ ...prev, overall: false }));
        setAllDone(true);
      }
    };

    generateSummaries();
  }, [analysis]);

  const ctaUrl = '/?ref=summary';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">😕 {error || 'Analysis not found'}</p>
          <a href="/" className="text-emerald-400 hover:underline">Go back home</a>
        </div>
      </div>
    );
  }

  const numericAppId = analysis.app_id?.match(/\d+/)?.[0];
  const appStoreUrl = numericAppId ? `https://apps.apple.com/app/id${numericAppId}` : undefined;
  const fullAnalysisUrl = analysis.share_slug ? `/a/${analysis.share_slug}` : null;
  const topKeywords = (analysis.keywords || []).slice(0, 5);

  const SummaryCard = ({ 
    title, 
    emoji, 
    color, 
    content, 
    isLoading 
  }: { 
    title: string; 
    emoji: string; 
    color: string; 
    content: string | null; 
    isLoading: boolean;
  }) => {
    const colorClasses: Record<string, string> = {
      emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
      red: 'from-red-500/20 to-red-600/5 border-red-500/30',
      violet: 'from-violet-500/20 to-violet-600/5 border-violet-500/30',
      amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30',
      blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    };
    
    const textColors: Record<string, string> = {
      emerald: 'text-emerald-300',
      red: 'text-red-300',
      violet: 'text-violet-300',
      amber: 'text-amber-300',
      blue: 'text-blue-300',
    };

    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{emoji}</span>
          <h3 className={`font-bold ${textColors[color]}`}>{title}</h3>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin ml-auto" />
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
            <div className="h-4 bg-white/10 rounded animate-pulse w-4/5" />
          </div>
        ) : content ? (
          <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
            {content}
          </div>
        ) : (
          <p className="text-white/40 text-sm italic">No data available</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-violet-950/20 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
              App Ideas Finder
            </span>
          </a>
          <a
            href={ctaUrl}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Try it free →
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-10">
        {/* App Header */}
        <div className="flex items-start gap-5 mb-8">
          {analysis.app_icon_url ? (
            <img
              src={analysis.app_icon_url}
              alt={analysis.app_name}
              className="w-20 h-20 rounded-2xl shadow-xl flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl flex-shrink-0">
              📱
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
              {analysis.app_name}
            </h1>
            {analysis.app_developer && (
              <p className="text-white/50 mb-3">{analysis.app_developer}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {appStoreUrl && (
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all"
                >
                  🍎 App Store
                </a>
              )}
              {fullAnalysisUrl && (
                <a
                  href={fullAnalysisUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs text-emerald-400 transition-all"
                >
                  📄 Full Report
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{analysis.review_count.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Reviews</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">
              {analysis.ratings_count ? `${(analysis.ratings_count / 1000).toFixed(0)}K` : 'N/A'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Ratings</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-amber-400">
              {analysis.analysis_time_seconds ? `${Math.round(analysis.analysis_time_seconds)}s` : '<60s'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">AI Time</p>
          </div>
        </div>

        {/* Overall Insight Banner */}
        {(summaries.overall || summarizing.overall) && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-violet-500/20 border border-white/20 rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1 font-medium">Key Insight</p>
                {summarizing.overall ? (
                  <div className="h-5 bg-white/10 rounded animate-pulse w-full" />
                ) : (
                  <p className="text-lg font-semibold text-white leading-snug">{summaries.overall}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <SummaryCard
            title="What Users Love"
            emoji="💚"
            color="emerald"
            content={summaries.likes}
            isLoading={summarizing.likes || false}
          />
          <SummaryCard
            title="Pain Points"
            emoji="💔"
            color="red"
            content={summaries.dislikes}
            isLoading={summarizing.dislikes || false}
          />
          <SummaryCard
            title="Your Opportunity"
            emoji="🎯"
            color="violet"
            content={summaries.recommendations}
            isLoading={summarizing.recommendations || false}
          />
          <SummaryCard
            title="Pricing Intel"
            emoji="💰"
            color="amber"
            content={summaries.pricing}
            isLoading={summarizing.pricing || false}
          />
        </div>

        {/* Market Viability */}
        {(summaries.viability || summarizing.viability) && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📈</span>
              <h3 className="font-bold text-blue-300">Market Verdict</h3>
              {summarizing.viability && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin ml-auto" />
              )}
            </div>
            {summarizing.viability ? (
              <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
            ) : (
              <p className="text-white/80 text-sm leading-relaxed">{summaries.viability}</p>
            )}
          </div>
        )}

        {/* Keywords */}
        {topKeywords.length > 0 && (
          <div className="mb-10">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3 font-medium">🔑 Key Search Terms</p>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-sm text-cyan-300 font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {!allDone && (
          <div className="text-center mb-8">
            <p className="text-white/40 text-sm">
              ⚡ Generating AI summaries...
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-xs uppercase tracking-wider text-white/30 mb-3">Built with App Ideas Finder</p>
          <h2 className="text-2xl font-bold text-white mb-3">
            Get insights like this for <span className="text-emerald-400">any app</span>
          </h2>
          <p className="text-white/50 mb-6">Analyze competitors. Find gaps. Build 1% better.</p>
          <a
            href={ctaUrl}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
          >
            Start Free Analysis →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 px-5 mt-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <p className="text-xs text-white/30">© {new Date().getFullYear()} App Ideas Finder</p>
          <div className="flex gap-4">
            <a href="/privacy" className="text-xs text-white/30 hover:text-white/60">Privacy</a>
            <a href="/terms" className="text-xs text-white/30 hover:text-white/60">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
