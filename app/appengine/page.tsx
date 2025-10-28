'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import CryptoJS from 'crypto-js';

// Types
interface AppMeta {
  trackId: number;
  trackName: string;
  collectionName?: string;
  artistName: string;
  averageUserRating: number;
  userRatingCount: number;
  artworkUrl100: string;
  trackViewUrl: string;
  description: string;
}

interface Review {
  title: string;
  author: string;
  rating: string;
  date: string;
  text: string;
}

interface ParsedResults {
  ai_description: string;
  likes: string[];
  dislikes: string[];
  sentiment: string;
  recommendations: string[];
}

export default function AppEnginePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [costTracking, setCostTracking] = useState({
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  });
  const [grokApiKey, setGrokApiKey] = useState<string>('');
  const [showRollups, setShowRollups] = useState(false);
  const [expandedRollup, setExpandedRollup] = useState<string | null>(null);
  const [rollupStatuses, setRollupStatuses] = useState<{[key: string]: string}>({});
  const [rollupContent, setRollupContent] = useState<{[key: string]: any}>({});
  
  const router = useRouter();
  const appInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  // Development bypass mode
  const isDevelopmentBypass = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user || isDevelopmentBypass) {
        setUser(user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    getUser();
  }, [router, isDevelopmentBypass]);

  useEffect(() => {
    // Fetch the Grok API key from environment
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/grok-key');
        if (response.ok) {
          const data = await response.json();
          setGrokApiKey(data.apiKey || '');
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };

    fetchApiKey();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDisplayName = () => {
    if (!user && isDevelopmentBypass) return 'Dev User';
    return user?.user_metadata?.full_name || 
           user?.user_metadata?.name || 
           user?.email?.split('@')[0] || 
           'User';
  };

  const getInitials = () => {
    if (!user && isDevelopmentBypass) return 'DU';
    const name = user?.user_metadata?.full_name || 
                 user?.user_metadata?.name || 
                 user?.email?.split('@')[0] || 
                 'User';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGravatarUrl = (email: string) => {
    const hash = CryptoJS.MD5(email.toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  };

  // Helper function to create rollup bar with exact HTML styling
  const createRollupBar = (section: string, number: number, title: string, gradient: string) => {
    const isExpanded = expandedRollup === section;
    const status = rollupStatuses[section] || 'RESEARCH UNDERWAY';
    const content = rollupContent[section];
    
    return (
      <div key={section} className="rollup-bar" id={`rollup-${section}`} data-section={section}
           style={{
             marginBottom: '8px',
             borderRadius: '12px',
             overflow: 'hidden',
             boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
             transition: 'all 0.3s ease',
             background: gradient
           }}>
        <div className="rollup-header" 
             style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               padding: '16px 20px',
               cursor: 'pointer',
               transition: 'all 0.3s ease',
               userSelect: 'none',
               background: gradient,
               color: 'white'
             }}
             onClick={() => setExpandedRollup(isExpanded ? null : section)}>
          <div className="rollup-title" 
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '12px',
                 flex: 1
               }}>
            <span className="rollup-number" 
                  style={{
                    fontWeight: 'bold',
                    fontSize: '16px',
                    minWidth: '24px'
                  }}>{number}.</span>
            <span className="rollup-name" 
                  style={{
                    fontWeight: 600,
                    fontSize: '16px',
                    flex: 1
                  }}>{title}</span>
            <span className={`rollup-status ${status === 'RESEARCH UNDERWAY' ? 'researching' : ''}`}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    animation: status === 'RESEARCH UNDERWAY' ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }}>
              {status}
            </span>
          </div>
          <div className={`rollup-icon ${isExpanded ? 'expanded' : ''}`}
               style={{
                 fontSize: '18px',
                 fontWeight: 'bold',
                 transition: 'transform 0.3s ease',
                 minWidth: '24px',
                 textAlign: 'center',
                 transform: isExpanded ? 'rotate(45deg)' : 'none'
               }}>
            {isExpanded ? '−' : 
             status === 'DONE' ? '+' : '⟳'}
          </div>
        </div>
        {isExpanded && (
          <div className="rollup-content" id={`content-${section}`}
               style={{
                 padding: '0 20px 20px 20px',
                 background: '#fafbfc',
                 borderTop: '1px solid #e1e5e9'
               }}>
            {section === 'keywords' ? (
              <div className="flex flex-wrap gap-2">
                {content?.map((keyword: string, i: number) => (
                  <span key={i} className="bg-blue-100 px-2 py-1 rounded text-xs text-gray-700">
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <ul id={`${section}List`} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {content?.map((item: string, i: number) => {
                  // Parse markdown bold formatting (**text**)
                  const parseMarkdown = (text: string) => {
                    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        const boldText = part.slice(2, -2);
                        return <strong key={index} style={{ fontWeight: 'bold' }}>{boldText}</strong>;
                      }
                      return part;
                    });
                  };

                  return (
                    <li key={i} style={{ 
                      marginBottom: '4px', 
                      paddingLeft: '16px', 
                      position: 'relative',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      color: '#374151'
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        color: '#6B7280',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}>•</span>
                      {parseMarkdown(item)}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper functions
  const escapeHTML = (s: string) => {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
  };

  const extractAppId = (input: string) => {
    if (!input) return '';
    input = input.trim();
    if (/^\d+$/.test(input)) return input;
    const m = input.match(/id(\d+)/);
    return m ? m[1] : '';
  };

  // iTunes API functions
  const fetchAppInfo = async (appId: string): Promise<AppMeta | null> => {
    try {
      const response = await fetch(`/api/itunes/lookup?id=${appId}&country=us`);
      if (!response.ok) return null;
      const data = await response.json();
      return (data.resultCount && data.results && data.results[0]) ? data.results[0] : null;
    } catch (error) {
      console.error('Error fetching app info:', error);
      return null;
    }
  };

  const fetchAllReviews = async (appId: string, sort: string = 'mostRecent'): Promise<Review[]> => {
    let page = 1;
    const all: Review[] = [];
    
    while (true) {
      try {
        const response = await fetch(`/api/itunes/reviews?id=${appId}&sort=${sort}&page=${page}`);
        if (!response.ok) break;
        const data = await response.json();
        if (!data.feed || !data.feed.entry) break;
        
        const entries = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];
        const reviews = entries.slice(1);
        if (!reviews || reviews.length === 0) break;
        
        all.push(...reviews.map((e: any) => ({
          title: e.title?.label || '',
          author: e.author?.name?.label || '',
          rating: e['im:rating']?.label || '',
          date: e.updated?.label || '',
          text: e.content?.label || ''
        })));
        
        page++;
        if (page > 200) break; // Safety limit
      } catch (error) {
        console.error('Error fetching reviews:', error);
        break;
      }
    }
    
    return all;
  };

  // AI API function
  const callAI = async (apiKey: string, messages: any[], provider: string = 'grok', model: string = 'grok-4-fast-reasoning') => {
    const endpoint = 'https://api.x.ai/v1/chat/completions';
    const body = {
      model: model,
      messages: messages,
      temperature: 0.2,
      max_tokens: 1200
    };
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Grok error: ${response.status} ${txt}`);
    }
    
    const data = await response.json();
    
    // Extract token usage for cost tracking
    if (data.usage) {
      const inputTokens = data.usage.prompt_tokens || 0;
      const outputTokens = data.usage.completion_tokens || 0;
      updateCostTracking(inputTokens, outputTokens);
    }
    
    return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  };

  const updateCostTracking = (inputTokens: number, outputTokens: number) => {
    setCostTracking(prev => {
      const newTotalInput = prev.totalInputTokens + inputTokens;
      const newTotalOutput = prev.totalOutputTokens + outputTokens;
      const newTotalCalls = prev.totalCalls + 1;
      
      // Calculate costs (grok-4-fast-reasoning pricing)
      const inputCost = (newTotalInput / 1000000) * 0.20;
      const outputCost = (newTotalOutput / 1000000) * 0.50;
      const totalCost = inputCost + outputCost;
      
      return {
        totalCalls: newTotalCalls,
        totalInputTokens: newTotalInput,
        totalOutputTokens: newTotalOutput,
        totalCost: totalCost
      };
    });
  };

  // Prompt building functions
  const buildChunkPrompt = (appMeta: AppMeta, reviewsChunk: string) => {
    const header = `Summarize these app reviews into two sets of 6-10 bullet points. The first set is 'what do users like about the app' and the second set is 'what do users dislike about this app and what features do they want added or changed'.

${reviewsChunk}`;

    return [{role: 'user', content: header}];
  };

  const buildKeywordsPrompt = (appMeta: AppMeta, likes: string[]) => {
    const appName = appMeta?.trackName || appMeta?.collectionName || 'this app';
    const appDescription = appMeta?.description || '';
    const likesText = likes.join(', ');
    
    const prompt = `Based on the following information about ${appName}, generate 20 relevant keywords that would be effective for App Store Optimization (ASO) and social media marketing:

App Description: ${appDescription}

What users like: ${likesText}

Generate 20 keywords that are:
- Relevant to the app's functionality and user benefits
- Popular search terms users might use
- Good for social media hashtags and marketing
- Specific enough to be effective but broad enough to capture traffic

Format as a simple comma-separated list of keywords.`;

    return [{role: 'user', content: prompt}];
  };

  // Main analysis function - matches HTML exactly
  const startAnalysis = async () => {
    const appInput = appInputRef.current?.value.trim();
    
    if (!grokApiKey) {
      alert('Grok API key not available. Please check your environment configuration.');
      return;
    }
    
    const appId = extractAppId(appInput || '');
    if (!appId) {
      alert('Please enter an App Store URL or App ID.');
      return;
    }

    setIsAnalyzing(true);
    setStatus('Fetching app metadata...');
    setShowRollups(false);
    setExpandedRollup(null);
    
    // Initialize rollup statuses - match HTML exactly
    const sections = ['likes', 'dislikes', 'recommendations', 'keywords', 'definitely', 'backlog', 'description', 'names', 'prp', 'similar', 'pricing'];
    const initialStatuses: {[key: string]: string} = {};
    sections.forEach(section => {
      initialStatuses[section] = 'RESEARCH UNDERWAY';
    });
    setRollupStatuses(initialStatuses);
    
    try {
      const appMetaData = await fetchAppInfo(appId);
      if (!appMetaData) {
        setStatus('App metadata not found via lookup.');
        setIsAnalyzing(false);
        return;
      }
      
      setAppMeta(appMetaData);
      setStatus('Fetching reviews (this may take a few seconds)...');
      
      const reviews = await fetchAllReviews(appId, 'mostRecent');
      setStatus(`Fetched ${reviews.length} reviews. Preparing AI analysis...`);
      
      if (reviews.length === 0) {
        setStatus('No reviews found for this app.');
        setIsAnalyzing(false);
        return;
      }

      // Show rollup container and spinner - match HTML
      setShowRollups(true);
      setStatus('App Ideas Engine Engaged');

      // Prepare combined review text
      const texts = reviews.map((r: Review) => `${r.title ? r.title + ' — ' : ''}${r.text} (by ${r.author}, rating ${r.rating})`);
      const allText = texts.join('\n\n---\n\n');

      setStatus('Sending all reviews to the ideas engine...this will definitely take a few seconds, so please kindly wait');

      // Send all reviews in one request
      const messages = buildChunkPrompt(appMetaData, allText);
      const raw = await callAI(grokApiKey, messages, 'grok', 'grok-4-fast-reasoning');

      // Parse the response exactly like HTML
      let summaryText = '';
      if (!raw || raw.trim() === '') {
        summaryText = 'Unable to analyze reviews.';
      } else {
        summaryText = raw.trim();
      }

      // Parse structured data from AI response
      const text = summaryText.trim();
      
      // Extract likes
      let likes: string[] = [];
      const likesMatch = text.match(/###\s*What\s+Do\s+Users\s+Like\s+About\s+the\s+App\s*\n([\s\S]*?)(?=###|$)/i);
      if (likesMatch) {
        likes = likesMatch[1].trim()
          .split('\n')
          .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0);
      } else {
        const lines = text.split('\n');
        const firstHalf = lines.slice(0, Math.floor(lines.length / 2));
        likes = firstHalf
          .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0);
      }
      
      // Extract dislikes
      let dislikes: string[] = [];
      const dislikesMatch = text.match(/###\s*What\s+Do\s+Users\s+Dislike\s+About\s+This\s+App\s+and\s+What\s+Features\s+Do\s+They\s+Want\s+Added\s+or\s+Changed\s*\n([\s\S]*?)(?=###|$)/i);
      if (dislikesMatch) {
        dislikes = dislikesMatch[1].trim()
          .split('\n')
          .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0);
      } else {
        const lines = text.split('\n');
        const secondHalf = lines.slice(Math.floor(lines.length / 2));
        dislikes = secondHalf
          .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
          .filter((line: string) => line.length > 0);
      }
      
      // Generate recommendations
      const recommendations: string[] = [];
      if (dislikes.length > 0) {
        const lowerDislikes = dislikes.join(' ').toLowerCase();
        if (lowerDislikes.includes('bug') || lowerDislikes.includes('crash') || lowerDislikes.includes('error')) {
          recommendations.push('Fix bugs and improve app stability');
        }
        if (lowerDislikes.includes('slow') || lowerDislikes.includes('performance')) {
          recommendations.push('Optimize app performance and speed');
        }
        if (lowerDislikes.includes('expensive') || lowerDislikes.includes('price') || lowerDislikes.includes('cost')) {
          recommendations.push('Review pricing strategy and offer more affordable options');
        }
        if (lowerDislikes.includes('interface') || lowerDislikes.includes('ui') || lowerDislikes.includes('design')) {
          recommendations.push('Improve user interface and design');
        }
        if (lowerDislikes.includes('feature') || lowerDislikes.includes('functionality')) {
          recommendations.push('Add missing features and functionality');
        }
        if (lowerDislikes.includes('support') || lowerDislikes.includes('help')) {
          recommendations.push('Enhance customer support and help system');
        }
      }
      
      // Add general recommendations if needed
      while (recommendations.length < 3) {
        if (recommendations.length === 0) {
          recommendations.push('Continue improving overall app quality');
        } else if (recommendations.length === 1) {
          recommendations.push('Maintain current positive user experience');
        } else {
          recommendations.push('Regular user feedback collection and implementation');
        }
      }
      
      const finalParsed: ParsedResults = {
        ai_description: text,
        likes: likes.length > 0 ? likes : ["No specific likes identified"],
        dislikes: dislikes.length > 0 ? dislikes : ["No specific dislikes identified"],
        sentiment: likes.length > dislikes.length * 2 ? "Mostly Positive" : dislikes.length > likes.length * 2 ? "Mostly Negative" : "Mixed",
        recommendations: recommendations
      };

      setAnalysisResults(finalParsed);
      
      // Update rollup statuses - mark first 3 as done
      setRollupStatuses(prev => ({
        ...prev,
        likes: 'DONE',
        dislikes: 'DONE', 
        recommendations: 'DONE'
      }));
      
      // Store content for rollups
      setRollupContent(prev => ({
        ...prev,
        likes: finalParsed.likes,
        dislikes: finalParsed.dislikes,
        recommendations: finalParsed.recommendations
      }));

      // Generate keywords
      setStatus('Generating keywords for ASO...');
      try {
        const keywordsMessages = buildKeywordsPrompt(appMetaData, finalParsed.likes);
        const keywordsResponse = await callAI(grokApiKey, keywordsMessages, 'grok', 'grok-4-fast-reasoning');
        
        if (keywordsResponse && keywordsResponse.trim()) {
          const keywords = keywordsResponse.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
          setAnalysisResults((prev: ParsedResults) => ({ ...prev, keywords }));
          
          setRollupStatuses(prev => ({ ...prev, keywords: 'DONE' }));
          setRollupContent(prev => ({ ...prev, keywords }));
        }
      } catch (error) {
        console.error('Error generating keywords:', error);
      }

      setStatus('Done.');
      
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user && !isDevelopmentBypass) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .rollup-header:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-grey/30 sticky top-0 z-50 backdrop-blur-lg bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8 mr-3"
              />
              <h1 className="text-[#3D405B] text-xl font-bold">App Ideas Finder</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="/homezone" className="text-gray-600 hover:text-[#3D405B] transition-colors">
                Dashboard
              </a>
              <a href="/appengine" className="text-[#3D405B] font-semibold">
                App Engine
              </a>
            </nav>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  {user && user.email ? (
                    <img
                      src={getGravatarUrl(user.email)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="homezone-gravatar-initials absolute inset-0 flex items-center justify-center bg-[#E07A5F] text-white text-sm font-semibold">
                    {getInitials()}
                  </div>
                </div>
                <span className="hidden sm:block">{getDisplayName()}</span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="relative">
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                    style={{ 
                      backgroundColor: '#ffffff',
                      opacity: 1,
                      zIndex: 9999
                    }}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <p className="font-semibold text-gray-900">{getDisplayName()}</p>
                      <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/profile');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* App Ideas Engine Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">App Ideas Engine</h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Analyze App Store reviews and generate comprehensive app development insights using AI. 
                Get actionable recommendations, feature suggestions, and market analysis.
              </p>
            </div>

            {/* Engine Interface */}
            <div className="max-w-4xl mx-auto">
              {/* App Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Store URL, App ID, or App Name
                </label>
                <input
                  ref={appInputRef}
                  type="text"
                  placeholder="e.g. https://apps.apple.com/us/app/.../id6475137430, 6475137430, or 'Instagram'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] focus:border-transparent"
                />
                <div id="searchResults" className="hidden mt-2 border border-gray-200 rounded-lg bg-white max-h-48 overflow-y-auto"></div>
              </div>

              {/* Start Button */}
              <div className="text-center mb-8">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="bg-[#E07A5F] hover:bg-[#E07A5F]/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Get Reviews + App Ideas'}
                </button>
                <div id="spinner" className="hidden ml-4 inline-block"></div>
              </div>

              {/* Status */}
              {status && (
                <div className="text-center text-sm text-gray-600 mb-8">
                  {status}
                </div>
              )}

              {/* Summary Container */}
              {appMeta && (
                <div className="mb-8">
                  <div className="bg-gray-50 rounded-xl p-6 flex gap-4 items-start">
                    <img 
                      src={appMeta.artworkUrl100} 
                      alt="App icon" 
                      className="w-24 h-24 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{appMeta.trackName}</h3>
                      <p className="text-sm text-gray-600 mb-1"><strong>Developer:</strong> {appMeta.artistName}</p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Rating:</strong> {appMeta.averageUserRating?.toFixed(1)} ★ ({appMeta.userRatingCount?.toLocaleString()} ratings)
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Store:</strong> <a href={appMeta.trackViewUrl} target="_blank" className="text-[#E07A5F] hover:underline">Open in App Store</a>
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {appMeta.description?.substring(0, 200)}...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rollup Bars Container - Match HTML exactly */}
              {showRollups && (
                <div className="section mb-8">
                  {createRollupBar('likes', 1, 'What people like', 'linear-gradient(135deg, #462403, #592D04)')}
                  {createRollupBar('dislikes', 2, 'What people dislike / want', 'linear-gradient(135deg, #592D04, #6C3604)')}
                  {createRollupBar('recommendations', 3, 'Top recommendations', 'linear-gradient(135deg, #6C3604, #7E4005)')}
                  {createRollupBar('keywords', 4, 'Suggested keywords', 'linear-gradient(135deg, #7E4005, #914906)')}
                  {createRollupBar('definitely', 5, 'Core features to include', 'linear-gradient(135deg, #914906, #A77445)')}
                  {createRollupBar('backlog', 6, 'Enhanced features to include', 'linear-gradient(135deg, #A77445, #B65C07)')}
                  {createRollupBar('description', 7, 'Suggested app description', 'linear-gradient(135deg, #B65C07, #C86508)')}
                  {createRollupBar('names', 8, 'Suggested App Names', 'linear-gradient(135deg, #C86508, #DB6E09)')}
                  {createRollupBar('prp', 9, 'PRP (Product Requirements Prompt)', 'linear-gradient(135deg, #DB6E09, #E07109)')}
                  {createRollupBar('similar', 10, 'Similar Apps', 'linear-gradient(135deg, #E07109, #F0790A)')}
                  {createRollupBar('pricing', 11, 'Suggested Pricing Model', 'linear-gradient(135deg, #F0790A, #FF8A1A)')}
                </div>
              )}

              {/* Cost Tracking */}
              {costTracking.totalCalls > 0 && (
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Complete Engine Cycle (CEC) Cost Breakdown</h3>
                  <div className="font-mono text-sm">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-600 mb-1">Total API Calls</div>
                        <div className="text-xl font-bold text-gray-900">{costTracking.totalCalls}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-600 mb-1">Input Tokens</div>
                        <div className="text-xl font-bold text-gray-900">{costTracking.totalInputTokens.toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-600 mb-1">Output Tokens</div>
                        <div className="text-xl font-bold text-gray-900">{costTracking.totalOutputTokens.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-semibold text-gray-900">Total CEC Cost:</div>
                        <div className="text-2xl font-bold text-green-600">${costTracking.totalCost.toFixed(4)} USD</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>💡 Pricing: Input $0.20/1M tokens • Output $0.50/1M tokens</div>
                        <div>📊 Model: grok-4-fast-reasoning</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
