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
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[Summary] ${msg}`);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Fetch analysis data
  useEffect(() => {
    const fetchAnalysis = async () => {
      addLog(`Fetching analysis for appId: ${appId}`);
      try {
        const response = await fetch(`/api/summary/${appId}`);
        addLog(`API response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          addLog(`API error: ${errorText}`);
          throw new Error('Analysis not found');
        }
        const data = await response.json();
        addLog(`Analysis loaded: ${data.analysis?.app_name || 'unknown'}`);
        addLog(`Likes count: ${data.analysis?.likes?.length || 0}`);
        addLog(`Dislikes count: ${data.analysis?.dislikes?.length || 0}`);
        setAnalysis(data.analysis);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load analysis';
        addLog(`Error: ${errMsg}`);
        setError(errMsg);
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
    if (!analysis) {
      addLog('No analysis data, skipping summary generation');
      return;
    }
    
    addLog('Starting summary generation...');
    
    const generateSummaries = async () => {
      const sectionsToSummarize = [
        {
          key: 'likes',
          content: analysis.likes?.join('\n') || '',
          prompt: `Summarize what users LOVE about this app in 2-3 punchy bullet points. Be specific and actionable. Each bullet should be max 15 words. Start each bullet with "• "`
        },
        {
          key: 'dislikes', 
          content: analysis.dislikes?.join('\n') || '',
          prompt: `Summarize the main PAIN POINTS and complaints users have in 2-3 punchy bullet points. Focus on the biggest opportunities for improvement. Each bullet should be max 15 words. Start each bullet with "• "`
        },
        {
          key: 'recommendations',
          content: analysis.recommendations?.join('\n') || '',
          prompt: `Distill these recommendations into 2-3 key strategic actions. Make them specific and actionable. Each bullet should be max 15 words. Start each bullet with "• "`
        },
        {
          key: 'pricing',
          content: analysis.pricing_model || '',
          prompt: `Summarize the pricing strategy in 1-2 sentences. What's the key monetization insight? Be direct and specific.`
        },
        {
          key: 'viability',
          content: analysis.market_viability || '',
          prompt: `Give a 1-2 sentence verdict on market opportunity. Is this worth building? Why or why not? Be direct.`
        }
      ];

      // Generate each summary
      for (const section of sectionsToSummarize) {
        if (!section.content) {
          addLog(`Skipping ${section.key} - no content`);
          continue;
        }
        
        addLog(`Generating summary for: ${section.key}`);
        setSummarizing(prev => ({ ...prev, [section.key]: true }));
        
        try {
          const response = await fetch('/api/grok-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'You are a concise business analyst. Provide extremely brief, punchy summaries. No fluff, no intro text, just the key points.'
                },
                {
                  role: 'user',
                  content: `App: ${analysis.app_name}\n\nOriginal content:\n${section.content}\n\nTask: ${section.prompt}`
                }
              ],
              model: 'grok-3-mini-fast'
            })
          });
          
          addLog(`Grok response for ${section.key}: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            const summary = data.content || null;
            addLog(`Got summary for ${section.key}: ${summary?.substring(0, 50)}...`);
            setSummaries(prev => ({ ...prev, [section.key]: summary }));
          } else {
            const errorText = await response.text();
            addLog(`Grok error for ${section.key}: ${errorText}`);
          }
        } catch (err) {
          addLog(`Exception for ${section.key}: ${err instanceof Error ? err.message : 'unknown'}`);
        } finally {
          setSummarizing(prev => ({ ...prev, [section.key]: false }));
        }
      }

      // Generate overall summary last
      addLog('Generating overall insight...');
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
        
        addLog(`Overall insight response: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          const summary = data.content || null;
          addLog(`Overall insight: ${summary}`);
          setSummaries(prev => ({ ...prev, overall: summary }));
        } else {
          const errorText = await response.text();
          addLog(`Overall insight error: ${errorText}`);
        }
      } catch (err) {
        addLog(`Overall insight exception: ${err instanceof Error ? err.message : 'unknown'}`);
      } finally {
        setSummarizing(prev => ({ ...prev, overall: false }));
        setAllDone(true);
        addLog('✅ ALL SUMMARIES COMPLETE');
      }
    };

    generateSummaries();
  }, [analysis]);

  const ctaUrl = '/?ref=summary';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">😕 {error || 'Analysis not found'}</p>
          <a href="/" className="text-emerald-600 hover:underline">Go back home</a>
          <div className="mt-8 text-left bg-gray-100 p-4 rounded-lg max-w-lg mx-auto">
            <p className="text-xs font-mono text-gray-600 mb-2">Debug Log:</p>
            {debugLog.map((log, i) => (
              <p key={i} className="text-xs font-mono text-gray-500">{log}</p>
            ))}
          </div>
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
    const bgColors: Record<string, string> = {
      emerald: 'bg-emerald-50 border-emerald-200',
      red: 'bg-red-50 border-red-200',
      violet: 'bg-violet-50 border-violet-200',
      amber: 'bg-amber-50 border-amber-200',
      blue: 'bg-blue-50 border-blue-200',
    };
    
    const textColors: Record<string, string> = {
      emerald: 'text-emerald-700',
      red: 'text-red-700',
      violet: 'text-violet-700',
      amber: 'text-amber-700',
      blue: 'text-blue-700',
    };

    return (
      <div className={`${bgColors[color]} border-2 rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{emoji}</span>
          <h3 className={`font-bold ${textColors[color]}`}>{title}</h3>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ml-auto" />
          )}
          {!isLoading && content && (
            <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">✓</span>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
          </div>
        ) : content ? (
          <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
            {content}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic">No data available</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 group">
            <img
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
              App Ideas Finder
            </span>
          </a>
          <a
            href={ctaUrl}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Try it free →
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        {/* Status Banner */}
        {allDone ? (
          <div className="bg-green-100 border-2 border-green-300 rounded-xl p-4 mb-8 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-800">DONE - All Summaries Complete!</p>
              <p className="text-sm text-green-700">AI has finished analyzing all sections.</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-8 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin" />
            <div>
              <p className="font-bold text-amber-800">Generating AI Summaries...</p>
              <p className="text-sm text-amber-700">Please wait while Grok analyzes each section.</p>
            </div>
          </div>
        )}

        {/* App Header */}
        <div className="flex items-start gap-5 mb-8">
          {analysis.app_icon_url ? (
            <img
              src={analysis.app_icon_url}
              alt={analysis.app_name}
              className="w-20 h-20 rounded-2xl shadow-lg flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
              📱
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">
              {analysis.app_name}
            </h1>
            {analysis.app_developer && (
              <p className="text-gray-500 mb-3">{analysis.app_developer}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {appStoreUrl && (
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full text-xs text-gray-600 hover:text-gray-900 transition-all"
                >
                  🍎 App Store
                </a>
              )}
              {fullAnalysisUrl && (
                <a
                  href={fullAnalysisUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs text-emerald-700 transition-all"
                >
                  📄 Full Report
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-600">{analysis.review_count.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 font-medium">Reviews</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-blue-600">
              {analysis.ratings_count ? `${(analysis.ratings_count / 1000).toFixed(0)}K` : 'N/A'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-blue-600/70 font-medium">Ratings</p>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-amber-600">
              {analysis.analysis_time_seconds ? `${Math.round(analysis.analysis_time_seconds)}s` : '<60s'}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-amber-600/70 font-medium">AI Time</p>
          </div>
        </div>

        {/* Overall Insight Banner */}
        <div className="bg-gradient-to-r from-emerald-100 to-blue-100 border-2 border-emerald-200 rounded-2xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Key Insight</p>
                {summarizing.overall && (
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                )}
                {!summarizing.overall && summaries.overall && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">✓</span>
                )}
              </div>
              {summarizing.overall ? (
                <div className="h-6 bg-white/50 rounded animate-pulse w-full" />
              ) : summaries.overall ? (
                <p className="text-lg font-semibold text-gray-800 leading-snug">{summaries.overall}</p>
              ) : (
                <p className="text-gray-400 italic">Generating insight...</p>
              )}
            </div>
          </div>
        </div>

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
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📈</span>
            <h3 className="font-bold text-blue-700">Market Verdict</h3>
            {summarizing.viability && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ml-auto" />
            )}
            {!summarizing.viability && summaries.viability && (
              <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">✓</span>
            )}
          </div>
          {summarizing.viability ? (
            <div className="h-4 bg-blue-100 rounded animate-pulse w-full" />
          ) : summaries.viability ? (
            <p className="text-gray-700 text-sm leading-relaxed">{summaries.viability}</p>
          ) : (
            <p className="text-gray-400 text-sm italic">Generating...</p>
          )}
        </div>

        {/* Keywords */}
        {topKeywords.length > 0 && (
          <div className="mb-10">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 font-medium">🔑 Key Search Terms</p>
            <div className="flex flex-wrap gap-2">
              {topKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-cyan-50 border-2 border-cyan-200 rounded-full text-sm text-cyan-700 font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Debug Log (collapsible) */}
        <details className="mb-8 bg-gray-50 rounded-lg p-4">
          <summary className="text-sm font-medium text-gray-500 cursor-pointer">Debug Log ({debugLog.length} entries)</summary>
          <div className="mt-2 max-h-40 overflow-y-auto">
            {debugLog.map((log, i) => (
              <p key={i} className="text-xs font-mono text-gray-500">{log}</p>
            ))}
          </div>
        </details>

        {/* CTA */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Built with App Ideas Finder</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Get insights like this for <span className="text-emerald-600">any app</span>
          </h2>
          <p className="text-gray-500 mb-6">Analyze competitors. Find gaps. Build 1% better.</p>
          <a
            href={ctaUrl}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105"
          >
            Start Free Analysis →
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 px-5 mt-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} App Ideas Finder</p>
          <div className="flex gap-4">
            <a href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600">Privacy</a>
            <a href="/terms-of-service" className="text-xs text-gray-400 hover:text-gray-600">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
