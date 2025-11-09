'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import CryptoJS from 'crypto-js';
import Footer from '@/components/Footer';

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

function AppEngineContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [analysisMetrics, setAnalysisMetrics] = useState({
    reviewCount: 0,
    analysisTimeSeconds: 0,
    startTime: 0,
    manualTaskHours: 0
  });
  const [apiCallLogs, setApiCallLogs] = useState<Array<{
    callNumber: number;
    inputTokens: number;
    outputTokens: number;
    systemTokens: number;
    totalTokens: number;
    cost: number;
    timestamp: string;
  }>>([]);
  const [grokApiKey, setGrokApiKey] = useState<string>('');
  const [showRollups, setShowRollups] = useState(false);
  const [expandedRollup, setExpandedRollup] = useState<string | null>(null);
  const [rollupStatuses, setRollupStatuses] = useState<{[key: string]: string}>({});
  const [rollupContent, setRollupContent] = useState<{[key: string]: any}>({});
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [appInput, setAppInput] = useState('');
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const [cachedResult, setCachedResult] = useState<any>(null);
  const [showCacheNotice, setShowCacheNotice] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const appInputRef = useRef<HTMLInputElement>(null);
  const hasAutoStarted = useRef(false);
  
  const supabase = createClient();

  // Development bypass mode
  const isDevelopmentBypass = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user || isDevelopmentBypass) {
        setUser(user);
        
        // Fetch profile
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setProfile(profileData);
          
          // Check if user is admin
          const adminResponse = await fetch('/api/check-admin');
          const adminData = await adminResponse.json();
          setIsAdmin(adminData.isAdmin || false);
        }
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

  // Auto-start analysis if app parameter is in URL
  useEffect(() => {
    const appParam = searchParams.get('app');
    if (appParam && grokApiKey && !hasAutoStarted.current && !loading) {
      console.log('Auto-starting analysis for app ID:', appParam);
      hasAutoStarted.current = true;
      
      // Set the input state (which will update the controlled input field)
      setAppInput(appParam);
      
      // Wait for the state to update and the input to render
      setTimeout(() => {
        if (appInputRef.current) {
          appInputRef.current.value = appParam; // Also set ref value as backup
          console.log('Set input field to:', appParam);
          console.log('Input field now contains:', appInputRef.current.value);
          
          // Trigger auto-start
          setShouldAutoStart(true);
        }
      }, 500);
    }
  }, [grokApiKey, searchParams, loading]);

  // Handle clicking outside search results to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-results-container') && !target.closest('input[type="text"]')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDisplayName = () => {
    if (!user && isDevelopmentBypass) return 'Dev User';
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
    if (!user && isDevelopmentBypass) return 'DU';
    // Use custom initials if set, otherwise calculate from name
    if (profile?.custom_initials) {
      return profile.custom_initials.toUpperCase();
    }
    const name = getDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGravatarUrl = (email: string) => {
    const hash = CryptoJS.MD5(email.toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  };

  // Helper function to create rollup bar with exact HTML styling
  // Parse markdown formatting for sections 9 and 11
  const parseMarkdownContent = (text: string) => {
    if (!text) return '';
    
    // Split by lines and process each line
    const lines = text.split('\n');
    let inList = false;
    const processedLines: string[] = [];
    
    lines.forEach((line: string, index: number) => {
      // Handle headings (### 1. Title -> bold title)
      if (line.startsWith('### ') || line.startsWith('## ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        const headingText = line.replace(/^###?\s*\d*\.?\s*/, '').trim();
        processedLines.push(`<div style="font-weight: bold; font-size: 18px; margin: 16px 0 8px 0; color: #1f2937;">${headingText}</div>`);
        return;
      }
      
      // Handle list items (- item)
      if (line.trim().startsWith('- ')) {
        if (!inList) {
          processedLines.push('<ul style="margin: 8px 0; padding-left: 24px; list-style: disc;">');
          inList = true;
        }
        const listText = line.trim().substring(2).replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');
        processedLines.push(`<li style="margin: 4px 0; line-height: 1.6; color: #374151;">${listText}</li>`);
        return;
      }
      
      // Close list if we're no longer in list items
      if (inList && !line.trim().startsWith('- ')) {
        processedLines.push('</ul>');
        inList = false;
      }
      
      // Handle bold text (**text** -> bold text)
      const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');
      
      // Handle regular lines
      if (line.trim()) {
        processedLines.push(`<div style="margin: 4px 0; line-height: 1.6; color: #374151;">${boldText}</div>`);
      } else {
        processedLines.push('<div style="margin: 8px 0;"></div>'); // Empty line spacing
      }
    });
    
    // Close list if still open at end
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('');
  };

  const createRollupBar = (section: string, number: number, title: string, icon: string) => {
    const isExpanded = expandedRollup === section;
    const status = rollupStatuses[section] || 'RESEARCH UNDERWAY';
    const content = rollupContent[section];
    const isDone = status === 'DONE';
    
    return (
      <div 
        key={section} 
        className="rollup-bar mb-4 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200"
        id={`rollup-${section}`} 
        data-section={section}
      >
        <div 
          className={`rollup-header cursor-pointer transition-all duration-300 ${isDone ? 'bg-white' : 'bg-gray-50'}`}
          onClick={(e) => {
            e.preventDefault();
            setExpandedRollup(isExpanded ? null : section);
          }}
        >
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-4 flex-1">
              {/* Icon */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                isDone ? 'bg-[#88D18A]' : 'bg-gray-300'
              } text-white text-xl flex-shrink-0`}>
                {icon}
              </div>
              
              {/* Number and Title */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-500">Section {number}</span>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Complete
                    </span>
                  )}
                  {!isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full animate-pulse">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
              </div>
            </div>
            
            {/* Expand Icon */}
            <div className={`ml-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="rollup-content bg-gray-50 p-6 border-t border-gray-200" id={`content-${section}`}>
            {section === 'keywords' ? (
              <div className="flex flex-wrap gap-2">
                {content?.map((keyword: string, i: number) => (
                  <span key={i} className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-sm text-blue-900 font-medium hover:bg-blue-100 transition-colors">
                    #{keyword}
                  </span>
                ))}
              </div>
            ) : section === 'backlog' ? (
              <div className="space-y-3">
                {content?.map((item: any, i: number) => {
                  const priorityStyles = item.priority === 'High' 
                    ? 'border-red-400 bg-red-50' 
                    : item.priority === 'Medium' 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : 'border-green-400 bg-green-50';
                  
                  const priorityTextColor = item.priority === 'High'
                    ? 'text-red-700'
                    : item.priority === 'Medium'
                    ? 'text-yellow-700'
                    : 'text-green-700';
                  
                  return (
                    <div key={i} className={`${priorityStyles} border-l-4 p-4 rounded-r-lg`}>
                      <div className={`${priorityTextColor} text-xs font-bold uppercase mb-2 flex items-center gap-2`}>
                        <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                        {item.priority} Priority
                      </div>
                      <div className="text-gray-800 text-sm leading-relaxed">
                        {item.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : section === 'description' ? (
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {content?.[0]}
                </p>
              </div>
            ) : section === 'prp' ? (
              <div>
                <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownContent(content?.[0] || '') }}
                />
                <button
                  onClick={() => {
                    const fullText = content?.[0] || '';
                    const splitIndex = fullText.indexOf('---');
                    const promptText = splitIndex !== -1 ? fullText.substring(splitIndex + 3).trim() : fullText;
                    navigator.clipboard.writeText(promptText);
                    alert('PRP prompt copied to clipboard! 📋');
                  }}
                  className="flex items-center gap-2 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Prompt to Clipboard
                </button>
              </div>
            ) : section === 'recommendations' ? (
              <div className="space-y-3">
                {content?.map((item: string, i: number) => {
                  // Parse: [PRIORITY] Title: Description
                  const priorityMatch = item.match(/^\[(CRITICAL|HIGH|MEDIUM)\]\s*(.+?):\s*(.+)$/);
                  if (!priorityMatch) return null;
                  
                  const [, priority, title, description] = priorityMatch;
                  
                  // Priority styling
                  const priorityStyles = priority === 'CRITICAL' 
                    ? 'border-red-500 bg-red-50' 
                    : priority === 'HIGH' 
                    ? 'border-orange-400 bg-orange-50' 
                    : 'border-blue-400 bg-blue-50';
                  
                  const priorityBadgeColor = priority === 'CRITICAL'
                    ? 'bg-red-500 text-white'
                    : priority === 'HIGH'
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-500 text-white';
                  
                  return (
                    <div key={i} className={`${priorityStyles} border-l-4 p-4 rounded-r-lg shadow-sm hover:shadow-md transition-shadow`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`${priorityBadgeColor} text-xs font-bold uppercase px-2 py-1 rounded`}>
                          {priority}
                        </span>
                        <span className="font-bold text-gray-900 text-base">
                          {title}
                        </span>
                      </div>
                      <div className="text-gray-700 text-sm leading-relaxed font-normal pl-0">
                        {description}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : section === 'pricing' ? (
              <div className="prose prose-gray max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdownContent(content?.[0] || '') }}
              />
            ) : section === 'names' ? (
              <div className="flex flex-wrap gap-3">
                {content?.map((name: string, i: number) => (
                  <span key={i} className="bg-[#88D18A]/10 border-2 border-[#88D18A] px-4 py-2 rounded-xl text-base text-gray-900 font-semibold hover:bg-[#88D18A]/20 transition-colors">
                    {name}
                  </span>
                ))}
              </div>
            ) : section === 'similar' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {content?.map((app: any, i: number) => {
                  const name = app.trackName || 'Unknown App';
                  const developer = app.artistName || 'Unknown Developer';
                  const rating = app.averageUserRating ? Number(app.averageUserRating).toFixed(1) : 'N/A';
                  const ratingCount = app.userRatingCount ? app.userRatingCount.toLocaleString() : 'N/A';
                  const icon = app.artworkUrl100 || '';
                  const storeUrl = app.trackViewUrl || '#';
                  const genre = app.primaryGenreName || 'Unknown Genre';
                  const description = app.description ? app.description.substring(0, 120) + '...' : 'No description available';
                  
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                      <div className="flex flex-col items-center text-center mb-3">
                        {icon && (
                          <img 
                            src={icon} 
                            alt={name}
                            className="w-16 h-16 rounded-2xl mb-3 shadow-sm"
                          />
                        )}
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2">{name}</h4>
                        <p className="text-xs text-gray-600 mb-1">{developer}</p>
                        <p className="text-xs text-gray-500 mb-2">{genre}</p>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold text-gray-700">{rating}</span>
                          <span className="text-gray-400">({ratingCount})</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-3">
                        {description}
                      </p>
                      <a 
                        href={storeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-center bg-[#88D18A] hover:bg-[#88D18A]/90 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        View in App Store
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="space-y-2">
                {content?.map((item: string, i: number) => {
                  // Parse markdown bold formatting (**text**)
                  const parseMarkdown = (text: string) => {
                    return text.split(/(\*\*.*?\*\*)/).map((part, index) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        const boldText = part.slice(2, -2);
                        return <strong key={index} className="font-bold text-gray-900">{boldText}</strong>;
                      }
                      return part;
                    });
                  };

                  return (
                    <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
                      <span className="text-[#88D18A] font-bold text-lg flex-shrink-0 mt-0.5">•</span>
                      <span className="flex-1">{parseMarkdown(item)}</span>
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

  // Search for apps by name/keyword
  const searchAppsByName = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/itunes/search?term=${encodeURIComponent(searchTerm)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setShowSearchResults(true);
        } else {
          setShowSearchResults(false);
        }
      } else {
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching apps:', error);
      setShowSearchResults(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setAppInput(value);
    
    // Clear search results if input is empty or too short
    if (!value || value.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }
    
    // Check if it's a URL or ID first
    const appId = extractAppId(value);
    if (appId) {
      setShowSearchResults(false);
      return;
    }
    
    // Debounce search for app names/keywords
    setTimeout(() => {
      searchAppsByName(value);
    }, 300);
  };

  // Handle app selection from search results
  const handleAppSelection = (app: any) => {
    const appId = app.trackId?.toString() || '';
    setAppInput(appId);
    setShowSearchResults(false);
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
  const callAI = async (apiKey: string, messages: any[], provider: string = 'grok', model: string = 'grok-4-fast-reasoning', costAccumulator?: { value: number }) => {
    const endpoint = 'https://api.x.ai/v1/chat/completions';
    const body = {
      model: model,
      messages: messages,
      temperature: 0.2,
      max_tokens: 5000
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
      const totalTokens = data.usage.total_tokens || (inputTokens + outputTokens);
      
      // Grok includes system/overhead tokens in total_tokens but not in prompt/completion
      // The difference represents system/metadata tokens
      const systemTokens = totalTokens - (inputTokens + outputTokens);
      
      // Calculate cost for this call
      // Based on testing: system tokens appear to be billed at OUTPUT rate ($0.5/1M)
      const inputCost = Number((inputTokens * 0.0000002).toFixed(10));
      const systemCost = Number((systemTokens * 0.0000005).toFixed(10)); // System at output rate
      const outputCost = Number((outputTokens * 0.0000005).toFixed(10));
      const callCost = Number((inputCost + systemCost + outputCost).toFixed(10));
      
      // Always log to console for debugging
      console.log(`[API Call] Input: ${inputTokens}, Output: ${outputTokens}, System: ${systemTokens}, Total: ${totalTokens}, Cost: $${callCost.toFixed(6)}`);
      
      // Log mismatch if significant
      if (systemTokens > 0) {
        console.log(`ℹ️ System/overhead tokens detected: ${systemTokens} (${((systemTokens / totalTokens) * 100).toFixed(1)}%)`);
      }
      
      // Track individual call details (show system tokens separately)
      setApiCallLogs(prev => [...prev, {
        callNumber: prev.length + 1,
        inputTokens: inputTokens, // Original prompt tokens
        outputTokens,
        systemTokens: systemTokens, // System/overhead tokens
        totalTokens,
        cost: callCost,
        timestamp: new Date().toISOString()
      }]);
      
      // Update cost tracking (system tokens tracked separately, billed at output rate)
      updateCostTracking(inputTokens, outputTokens, systemTokens);
      
      // If cost accumulator provided, add to it
      if (costAccumulator) {
        costAccumulator.value += callCost;
      }
    } else {
      console.warn('No usage data in API response:', data);
    }
    
    return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  };

  const updateCostTracking = (inputTokens: number, outputTokens: number, systemTokens: number = 0) => {
    setCostTracking(prev => {
      const newTotalInput = prev.totalInputTokens + inputTokens; // Only prompt tokens (billed at $0.20/1M)
      const newTotalOutput = prev.totalOutputTokens + outputTokens + systemTokens; // Completion + system (both billed at $0.50/1M)
      const newTotalCalls = prev.totalCalls + 1;
      
      // Calculate costs (grok-4-fast-reasoning pricing: $0.20 input, $0.50 output per 1M tokens)
      // System tokens are billed at OUTPUT rate based on empirical testing
      // Input: $0.20 per 1M tokens = $0.0000002 per token
      // Output: $0.50 per 1M tokens = $0.0000005 per token
      // System: $0.50 per 1M tokens = $0.0000005 per token
      const inputCostIncrement = Number((inputTokens * 0.0000002).toFixed(10));
      const systemCostIncrement = Number((systemTokens * 0.0000005).toFixed(10));
      const outputCostIncrement = Number((outputTokens * 0.0000005).toFixed(10));
      const totalCost = Number((prev.totalCost + inputCostIncrement + systemCostIncrement + outputCostIncrement).toFixed(10));
      
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

  // Generate definitely include features based on what users like
  const buildDefinitelyIncludePrompt = (appMeta: AppMeta, likes: string[]) => {
    const appName = appMeta?.trackName || appMeta?.collectionName || 'this app';
    const likesText = likes.join(', ');
    
    const prompt = `Based on what users like about ${appName}, create a list of features that should definitely be included in a similar app to ensure user satisfaction.

What users like: ${likesText}

Create 6-10 specific features that should definitely be included, based on what users are praising. These should be:
- Core features that users consistently mention as positive
- Essential functionality that users love
- Key user experience elements that work well
- Features that differentiate the app positively

Format as a simple bullet point list of features to definitely include.

Example:
• Fast and responsive user interface
• Offline functionality
• Dark mode option
• Intuitive navigation
• Real-time synchronization`;

    return [{role:'user', content: prompt}];
  };

  // Generate backlog items based on user feedback
  const buildBacklogPrompt = (appMeta: AppMeta, dislikes: string[], likes: string[]) => {
    const appName = appMeta?.trackName || appMeta?.collectionName || 'this app';
    const dislikesText = dislikes.join(', ');
    const likesText = likes.join(', ');
    
    const prompt = `Based on user feedback for ${appName}, create a prioritized project backlog of specific, actionable development tasks that address user complaints and requests.

What users dislike/want: ${dislikesText}

What users like: ${likesText}

Create 8-12 backlog items that are:
- Specific and actionable development tasks
- Prioritized by user impact and feasibility
- Based directly on user feedback
- Include both bug fixes and feature requests
- Written as clear development tasks

Format each item as:
1. [Priority] Task Title - Brief description of what needs to be built/fixed

Example:
1. [High] Fix App Crashes - Address stability issues causing app to crash on startup
2. [Medium] Add Dark Mode - Implement dark theme option in settings menu

Focus on the most frequently mentioned issues and most requested features.`;

    return [{role:'user', content: prompt}];
  };

  // Generate app description based on features, backlog, and keywords
  const buildAppDescriptionPrompt = (appMeta: AppMeta, definitelyInclude: string[], backlog: any[], keywords: string[]) => {
    const appName = appMeta?.trackName || appMeta?.collectionName || 'this app';
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    
    const prompt = `Based on the analysis, create a compelling 2-3 sentence app description for a new app that addresses user needs and incorporates the best features.

Features to definitely include: ${definitelyIncludeText}

Backlog items to address: ${backlogText}

Keywords: ${keywordsText}

Create a description that:
- Explains what the app does in clear terms
- Highlights why it's good and how it helps users
- Incorporates the most important features and benefits
- Is engaging and compelling for potential users
- Is 2-3 sentences maximum
- Use "This new app" instead of any specific app name

Write as if this is the App Store description for a new, improved app.`;

    return [{role:'user', content: prompt}];
  };

  // Generate app names based on all analysis
  const buildAppNamePrompt = (appMeta: AppMeta, definitelyInclude: string[], backlog: any[], keywords: string[], description: string) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    
    const prompt = `Based on all the analysis and learnings, generate up to 20 creative and compelling app names for a new app.

Features to definitely include: ${definitelyIncludeText}

Backlog items to address: ${backlogText}

Keywords: ${keywordsText}

App description: ${description}

Create app names that are:
- Creative and memorable
- Relevant to the app's functionality
- Easy to pronounce and spell
- App Store friendly (not too long)
- Unique and distinctive
- Appeal to the target audience

Generate 15-20 app names, one per line, without numbers or bullet points.`;

    return [{role:'user', content: prompt}];
  };

  // Generate AI-powered strategic recommendations based on all analysis
  const buildRecommendationsPrompt = (appMeta: AppMeta, likes: string[], dislikes: string[], keywords: string[], definitelyInclude: string[], backlog: any[]) => {
    const appName = appMeta?.trackName || appMeta?.collectionName || 'this app';
    const likesText = likes.join('\n• ');
    const dislikesText = dislikes.join('\n• ');
    const keywordsText = keywords.join(', ');
    const definitelyIncludeText = definitelyInclude.join('\n• ');
    const backlogText = backlog.map((item: any) => item.content).join('\n• ');
    
    const prompt = `You are a product strategy consultant analyzing user feedback for ${appName} to guide the development of a competing or improved app.

CONTEXT:
App Being Analyzed: ${appName}
User Loves: 
• ${likesText}

User Hates/Wants:
• ${dislikesText}

Market Keywords: ${keywordsText}

Planned Core Features:
• ${definitelyIncludeText}

Planned Additional Features:
• ${backlogText}

TASK:
Provide 8-10 strategic, actionable recommendations for building a successful app in this space. Cover these areas:

1. **Development Priorities** - What to build first and why
2. **Market Positioning** - How to differentiate and position the app
3. **Innovation Opportunities** - Novel features or approaches users haven't articulated but would love
4. **Monetization Strategy** - Pricing model, free vs paid features based on user sentiment
5. **Technical Decisions** - Architecture choices based on user complaints (performance, offline, etc)
6. **UX/UI Priorities** - Critical design decisions based on feedback
7. **Launch Strategy** - Target audience, MVP scope, beta testing approach
8. **Competitive Advantages** - Specific ways to beat competitors based on gaps identified

IMPORTANT FORMATTING:
Each recommendation MUST follow this exact format:
[CRITICAL] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning and data references from the user feedback.

Or:
[HIGH] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning and data references from the user feedback.

Or:
[MEDIUM] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning and data references from the user feedback.

Priority levels:
- [CRITICAL] = Must do first, blocking issue or huge opportunity
- [HIGH] = Should do early, significant impact
- [MEDIUM] = Important but can be phased in later

Requirements:
- Start each line with priority tag: [CRITICAL], [HIGH], or [MEDIUM]
- Make the explanation a FULL SENTENCE (15-25 words) that's specific and actionable
- Reference actual user feedback data where possible
- Sort from highest to lowest priority (all CRITICAL first, then HIGH, then MEDIUM)
- Be specific, not generic

Example format:
[CRITICAL] Offline Functionality: Implement offline sync immediately as it was mentioned in 47 reviews and competitors lack robust offline support, giving you a major differentiator.
[HIGH] Privacy-First Positioning: Market as privacy-focused alternative since 82% of negative reviews mention data concerns and users are actively seeking alternatives.`;

    return [{role: 'user', content: prompt}];
  };

  // Generate PRP (Product Requirements Prompt) for AI development
  const buildPRPPrompt = (appMeta: AppMeta, definitelyInclude: string[], backlog: any[], keywords: string[], description: string, appNames: string[], recommendations: string[]) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    const appNamesText = appNames.join(', ');
    const recommendationsText = recommendations.join('\n');
    
    const prompt = `Create a comprehensive Product Requirements Prompt (PRP) that a developer can use to prompt an AI to build this app.

App Description: ${description}

Features to definitely include: ${definitelyIncludeText}

Backlog items to address: ${backlogText}

Keywords: ${keywordsText}

Potential app names: ${appNamesText}

Strategic Recommendations:
${recommendationsText}

Create a detailed PRP that includes:
- Clear project overview and objectives aligned with the strategic recommendations
- Detailed feature specifications (prioritized based on the recommendations)
- User experience requirements
- Technical requirements and constraints (informed by the recommendations)
- Success metrics and goals
- Development phases and priorities (following the recommended approach)
- User stories and use cases

Integrate the strategic recommendations throughout the PRP to ensure the development plan is data-driven and strategically sound. Reference specific recommendations where relevant.

Format as a comprehensive prompt that an AI developer can use to start building the app. Make it detailed, actionable, and comprehensive.`;

    return [{role:'user', content: prompt}];
  };

  // Generate pricing model based on similar apps and app features
  const buildPricingModelPrompt = (appMeta: AppMeta, definitelyInclude: string[], backlog: any[], keywords: string[], description: string, appNames: string[], similarApps: any[]) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    const appNamesText = appNames.join(', ');
    
    // Format similar apps data
    const similarAppsText = similarApps.map((app: any) => 
      `${app.trackName} - ${app.formattedPrice || 'Free'} - ${app.averageUserRating || 'N/A'}★ - ${app.description ? app.description.substring(0, 200) + '...' : 'No description'}`
    ).join('\n');
    
    const prompt = `Based on the analysis of similar apps and the new app features, suggest an appropriate pricing model and specific prices in USD.

New App Description: ${description}

Features to definitely include: ${definitelyIncludeText}

Backlog items to address: ${backlogText}

Keywords: ${keywordsText}

Similar Apps and their pricing:
${similarAppsText}

Create a concise pricing strategy that considers the value proposition and compares against similar apps. Provide:

1. **Executive Summary** - Brief overview of the pricing recommendation
2. **Recommended Pricing Model** - (Free, Paid, Freemium, Subscription, etc.)
3. **Specific Price Points** - Exact USD prices for different tiers
4. **Rationale** - Why this pricing strategy makes sense
5. **Comparison** - How it compares to similar apps

Keep each section concise and focused. Do not include revenue projections.`;

    return [{role:'user', content: prompt}];
  };

  // Search for similar apps using iTunes API
  const searchSimilarApps = async (appMeta: AppMeta) => {
    const appName = appMeta.trackName || appMeta.collectionName || '';
    const appDescription = appMeta.description || '';
    
    console.log('Searching for similar apps:', { appName, appDescription: appDescription.substring(0, 100) + '...' });
    
    // Extract key terms from app name and description for search
    const searchTerms = extractSearchTerms(appName, appDescription);
    console.log('Search terms:', searchTerms);
    
    const similarApps: any[] = [];
    const seenAppIds = new Set();
    
    // Search for each term and collect unique apps
    for (const term of searchTerms) {
      try {
        const url = `/api/itunes/search?term=${encodeURIComponent(term)}&limit=20`;
        console.log('Searching URL:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log(`Search results for "${term}":`, data.resultCount || 0, 'apps found');
          if (data.results && data.results.length > 0) {
            for (const app of data.results) {
              // Skip the original app and duplicates
              if (app.trackId !== appMeta.trackId && !seenAppIds.has(app.trackId)) {
                seenAppIds.add(app.trackId);
                similarApps.push({
                  trackId: app.trackId,
                  trackName: app.trackName,
                  artistName: app.artistName,
                  averageUserRating: app.averageUserRating,
                  userRatingCount: app.userRatingCount,
                  artworkUrl100: app.artworkUrl100,
                  trackViewUrl: app.trackViewUrl,
                  description: app.description,
                  primaryGenreName: app.primaryGenreName,
                  formattedPrice: app.formattedPrice
                });
                
                // Stop when we have enough apps
                if (similarApps.length >= 9) break;
              }
            }
          }
        } else {
          console.error(`Search failed for term "${term}":`, response.status);
        }
      } catch (error) {
        console.error(`Error searching for term "${term}":`, error);
      }
      
      // Stop if we have enough apps
      if (similarApps.length >= 9) break;
    }
    
    console.log('Total similar apps found:', similarApps.length);
    return similarApps.slice(0, 9);
  };

  // Extract search terms from app name and description
  const extractSearchTerms = (appName: string, description: string) => {
    const terms: string[] = [];
    
    // Add the app name itself
    if (appName) {
      terms.push(appName);
      
      // Split app name into words
      const nameWords = appName.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
      terms.push(...nameWords);
    }
    
    // Extract key terms from description
    if (description) {
      const descWords = description.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .filter((word: string) => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'very', 'when', 'here', 'just', 'into', 'your', 'work', 'life', 'only', 'over', 'think', 'back', 'even', 'before', 'move', 'right', 'being', 'good', 'make', 'most', 'useful', 'great', 'best', 'help', 'easy', 'simple', 'new', 'app', 'app', 'apps'].includes(word));
      
      // Get most common words
      const wordCount: { [key: string]: number } = {};
      descWords.forEach((word: string) => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      const sortedWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
      
      terms.push(...sortedWords);
    }
    
    // Remove duplicates and limit
    return [...new Set(terms)].slice(0, 8);
  };

  // Check for cached analysis (less than 14 days old)
  const checkCachedAnalysis = async (appId: string) => {
    try {
      const response = await fetch(`/api/check-cache?appId=${appId}`);
      const data = await response.json();
      
      if (!response.ok || !data.cached) {
        return null;
      }
      
      console.log('Found cached analysis from:', data.cached.created_at);
      return data.cached;
    } catch (error) {
      console.error('Error checking cached analysis:', error);
      return null;
    }
  };

  // Load cached results into the UI
  const loadCachedResults = async (cached: any) => {
    setCachedResult(cached);
    setShowCacheNotice(true);
    
    console.log('Loading cached data:', {
      description: cached.description,
      prp: cached.prp,
      pricing_model: cached.pricing_model
    });
    
    // Fetch app metadata
    const appMetaData = await fetchAppInfo(cached.app_id);
    if (appMetaData) {
      setAppMeta(appMetaData);
    }
    
    // Set rollup content (wrap strings in arrays for consistency with live analysis)
    setRollupContent({
      likes: cached.likes,
      dislikes: cached.dislikes,
      recommendations: cached.recommendations,
      keywords: cached.keywords,
      definitely: cached.definitely_include,
      backlog: cached.backlog,
      description: cached.description ? [cached.description] : [],
      names: cached.app_names,
      prp: cached.prp ? [cached.prp] : [],
      similar: cached.similar_apps,
      pricing: cached.pricing_model ? [cached.pricing_model] : []
    });
    
    // Set all rollup statuses to DONE
    const statuses: {[key: string]: string} = {};
    ['likes', 'dislikes', 'recommendations', 'keywords', 'definitely', 'backlog', 'description', 'names', 'prp', 'similar', 'pricing', 'savings'].forEach(key => {
      statuses[key] = 'DONE';
    });
    setRollupStatuses(statuses);
    
    // Set analysis metrics
    setAnalysisMetrics({
      reviewCount: cached.review_count || 0,
      analysisTimeSeconds: cached.analysis_time_seconds || 0,
      startTime: 0,
      manualTaskHours: 0
    });
    
    // Set cost tracking
    setCostTracking({
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: cached.api_cost || 0
    });
    
    // Show rollups
    setShowRollups(true);
    setStatus('Loaded cached results from ' + new Date(cached.created_at).toLocaleDateString());
  };

  // Main analysis function - matches HTML exactly
  const startAnalysis = async (forceRefresh: boolean = false) => {
    const appInput = appInputRef.current?.value.trim();
    
    console.log('startAnalysis called with input:', appInput, 'forceRefresh:', forceRefresh);
    
    if (!grokApiKey) {
      alert('Grok API key not available. Please check your environment configuration.');
      return;
    }
    
    const appId = extractAppId(appInput || '');
    console.log('Extracted app ID:', appId);
    
    if (!appId) {
      alert('Please enter an App Store URL or App ID.');
      return;
    }

    // Check for cached results first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = await checkCachedAnalysis(appId);
      if (cached) {
        console.log('Found cached analysis from:', cached.created_at);
        loadCachedResults(cached);
        return;
      }
    }

    // Check usage limits before starting new analysis
    try {
      const usageResponse = await fetch('/api/subscription/usage');
      const usageData = await usageResponse.json();
      
      if (!usageData.canSearch) {
        alert('You have reached your monthly search limit. Please upgrade your plan or purchase a Search Pack to continue.');
        return;
      }
    } catch (error) {
      console.error('Error checking usage:', error);
      // Continue anyway if check fails (graceful degradation)
    }

    setIsAnalyzing(true);
    setStatus('Fetching app metadata...');
    setShowRollups(false);
    setExpandedRollup(null);
    setShowCacheNotice(false);
    setCachedResult(null);
    
    // Track total cost locally (not relying on state)
    const costAccumulator = { value: 0 };
    
    // Reset cost tracking for new analysis
    setCostTracking({
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0
    });
    setApiCallLogs([]);
    
    // Track analysis start time
    const startTime = Date.now();
    setAnalysisMetrics({
      reviewCount: 0,
      analysisTimeSeconds: 0,
      startTime: startTime,
      manualTaskHours: 0
    });
    
    // Initialize rollup statuses - match HTML exactly
    const sections = ['likes', 'dislikes', 'recommendations', 'keywords', 'definitely', 'backlog', 'description', 'names', 'prp', 'similar', 'pricing', 'savings'];
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
      
      // Update metrics with review count
      setAnalysisMetrics(prev => ({
        ...prev,
        reviewCount: reviews.length
      }));
      
      setStatus(`Fetched ${reviews.length.toLocaleString()} reviews ${reviews.length >= 490 ? '(Apple RSS API limit) ' : ''}— Preparing AI analysis...`);
      
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

      setStatus(`Sending ${reviews.length.toLocaleString()} reviews to the ideas engine...this will definitely take a few seconds, so please kindly wait`);

      // Send all reviews in one request
      const messages = buildChunkPrompt(appMetaData, allText);
      const raw = await callAI(grokApiKey, messages, 'grok', 'grok-4-fast-reasoning', costAccumulator);

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
      
      const finalParsed: ParsedResults = {
        ai_description: text,
        likes: likes.length > 0 ? likes : ["No specific likes identified"],
        dislikes: dislikes.length > 0 ? dislikes : ["No specific dislikes identified"],
        sentiment: likes.length > dislikes.length * 2 ? "Mostly Positive" : dislikes.length > likes.length * 2 ? "Mostly Negative" : "Mixed",
        recommendations: [] // Will be generated later with AI
      };

      setAnalysisResults(finalParsed);
      
      // Update rollup statuses - mark first 2 as done (recommendations moved to Section 6)
      setRollupStatuses(prev => ({
        ...prev,
        likes: 'DONE',
        dislikes: 'DONE'
      }));
      
      // Store content for rollups
      setRollupContent(prev => ({
        ...prev,
        likes: finalParsed.likes,
        dislikes: finalParsed.dislikes
      }));

      // Generate keywords
      setStatus('Generating keywords for ASO...');
      let keywordsArray: string[] = [];
      try {
        const keywordsMessages = buildKeywordsPrompt(appMetaData, finalParsed.likes);
        const keywordsResponse = await callAI(grokApiKey, keywordsMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (keywordsResponse && keywordsResponse.trim()) {
          keywordsArray = keywordsResponse.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
          setAnalysisResults((prev: ParsedResults) => ({ ...prev, keywords: keywordsArray }));
          
          setRollupStatuses(prev => ({ ...prev, keywords: 'DONE' }));
          setRollupContent(prev => ({ ...prev, keywords: keywordsArray }));
        }
      } catch (error) {
        console.error('Error generating keywords:', error);
      }

      // Generate definitely include features
      setStatus('Generating features to definitely include...');
      let definitelyIncludeFeatures: string[] = [];
      try {
        const definitelyIncludeMessages = buildDefinitelyIncludePrompt(appMetaData, finalParsed.likes);
        const definitelyIncludeResponse = await callAI(grokApiKey, definitelyIncludeMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (definitelyIncludeResponse && definitelyIncludeResponse.trim()) {
          // Parse the features from the text
          const lines = definitelyIncludeResponse.split('\n').filter((line: string) => line.trim().length > 0);
          definitelyIncludeFeatures = lines.map((line: string) => {
            // Remove bullet points and clean up
            const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
            return cleanLine;
          }).filter((feature: string) => feature.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, definitely: 'DONE' }));
          setRollupContent(prev => ({ ...prev, definitely: definitelyIncludeFeatures }));
        }
      } catch (error) {
        console.error('Error generating definitely include features:', error);
      }

      // Generate backlog items
      setStatus('Generating enhanced features to include...');
      let backlogItems: any[] = [];
      try {
        const backlogMessages = buildBacklogPrompt(appMetaData, finalParsed.dislikes, finalParsed.likes);
        const backlogResponse = await callAI(grokApiKey, backlogMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (backlogResponse && backlogResponse.trim()) {
          // Parse the backlog items from the text
          const lines = backlogResponse.split('\n').filter((line: string) => line.trim().length > 0);
          backlogItems = lines.map((line: string) => {
            // Extract priority and content
            const priorityMatch = line.match(/\[(High|Medium|Low)\]/);
            const priority = priorityMatch ? priorityMatch[1] : 'Medium';
            const content = line.replace(/^\d+\.\s*\[(High|Medium|Low)\]\s*/, '').trim();
            
            return {
              priority,
              content
            };
          }).filter((item: any) => item.content.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, backlog: 'DONE' }));
          setRollupContent(prev => ({ ...prev, backlog: backlogItems }));
        }
      } catch (error) {
        console.error('Error generating backlog items:', error);
      }

      // Generate AI-powered strategic recommendations (NEW SECTION 6)
      setStatus('Generating strategic recommendations...');
      let recommendationsArray: string[] = [];
      try {
        const recommendationsMessages = buildRecommendationsPrompt(appMetaData, finalParsed.likes, finalParsed.dislikes, keywordsArray, definitelyIncludeFeatures, backlogItems);
        const recommendationsResponse = await callAI(grokApiKey, recommendationsMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (recommendationsResponse && recommendationsResponse.trim()) {
          // Parse recommendations - they're already formatted with [PRIORITY] tags
          const lines = recommendationsResponse.split('\n').filter((line: string) => line.trim().length > 0);
          recommendationsArray = lines
            .filter((line: string) => /^\[(CRITICAL|HIGH|MEDIUM)\]/.test(line.trim())) // Lines with priority tags
            .map((line: string) => line.trim())
            .filter((rec: string) => rec.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, recommendations: 'DONE' }));
          setRollupContent(prev => ({ ...prev, recommendations: recommendationsArray }));
        }
      } catch (error) {
        console.error('Error generating recommendations:', error);
      }

      // Generate app description (NOW SECTION 7)
      setStatus('Generating app description...');
      let description: string = '';
      try {
        // Use the local variables that were just generated
        const appDescriptionMessages = buildAppDescriptionPrompt(appMetaData, definitelyIncludeFeatures, backlogItems, keywordsArray);
        const appDescriptionResponse = await callAI(grokApiKey, appDescriptionMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (appDescriptionResponse && appDescriptionResponse.trim()) {
          description = appDescriptionResponse.trim();
          setRollupStatuses(prev => ({ ...prev, description: 'DONE' }));
          setRollupContent(prev => ({ ...prev, description: [description] }));
        }
      } catch (error) {
        console.error('Error generating app description:', error);
      }

      // Generate app names
      setStatus('Generating app names...');
      let appNames: string[] = [];
      try {
        // Use the local description variable that was just generated
        const appNameMessages = buildAppNamePrompt(appMetaData, definitelyIncludeFeatures, backlogItems, keywordsArray, description);
        const appNameResponse = await callAI(grokApiKey, appNameMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (appNameResponse && appNameResponse.trim()) {
          // Parse app names from the text
          const lines = appNameResponse.split('\n').filter((line: string) => line.trim().length > 0);
          appNames = lines.map((line: string) => line.trim()).filter((name: string) => name.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, names: 'DONE' }));
          setRollupContent(prev => ({ ...prev, names: appNames }));
        }
      } catch (error) {
        console.error('Error generating app names:', error);
      }

      // Generate PRP (NOW SECTION 10 - includes recommendations)
      setStatus('Generating product requirements prompt...');
      let prpContent: string = '';
      try {
        // Use the local variables that were just generated, including recommendations
        const prpMessages = buildPRPPrompt(appMetaData, definitelyIncludeFeatures, backlogItems, keywordsArray, description, appNames, recommendationsArray);
        const prpResponse = await callAI(grokApiKey, prpMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (prpResponse && prpResponse.trim()) {
          prpContent = prpResponse.trim();
          setRollupStatuses(prev => ({ ...prev, prp: 'DONE' }));
          setRollupContent(prev => ({ ...prev, prp: [prpContent] }));
        }
      } catch (error) {
        console.error('Error generating PRP:', error);
      }

      // Search and display similar apps
      setStatus('Searching for similar apps...');
      let similarApps: any[] = [];
      try {
        similarApps = await searchSimilarApps(appMetaData);
        setRollupStatuses(prev => ({ ...prev, similar: 'DONE' }));
        setRollupContent(prev => ({ ...prev, similar: similarApps }));
      } catch (error) {
        console.error('Error searching for similar apps:', error);
      }

      // Generate pricing model
      setStatus('Analyzing pricing models...');
      let pricingContent: string = '';
      try {
        // Use the local variables that were just generated
        const pricingMessages = buildPricingModelPrompt(appMetaData, definitelyIncludeFeatures, backlogItems, keywordsArray, description, appNames, similarApps);
        const pricingResponse = await callAI(grokApiKey, pricingMessages, 'grok', 'grok-4-fast-reasoning', costAccumulator);
        
        if (pricingResponse && pricingResponse.trim()) {
          pricingContent = pricingResponse.trim();
          setRollupStatuses(prev => ({ ...prev, pricing: 'DONE' }));
          setRollupContent(prev => ({ ...prev, pricing: [pricingContent] }));
        }
      } catch (error) {
        console.error('Error generating pricing model:', error);
      }

      // Calculate final analysis time and manual task estimates
      const endTime = Date.now();
      const analysisTimeSeconds = (endTime - startTime) / 1000;
      
      // Estimate manual time for each analytical task (in hours)
      // These are conservative estimates for a skilled analyst
      const manualTaskEstimates = {
        readingAndSummarizing: reviews.length * 0.5 / 60, // 30 seconds per review to read and categorize likes/dislikes
        keywords: 2, // 2 hours to research and identify ASO keywords
        features: 1.5, // 1.5 hours to identify and document core features
        backlog: 2, // 2 hours to create prioritized feature backlog
        description: 1, // 1 hour to write compelling app description
        naming: 3, // 3 hours to brainstorm and research app names
        prp: 2, // 2 hours to write comprehensive product requirements
        similarApps: 1.5, // 1.5 hours to research and document competitor apps
        pricing: 1.5 // 1.5 hours to analyze pricing strategies
      };
      
      const totalManualTaskHours = Object.values(manualTaskEstimates).reduce((sum, hours) => sum + hours, 0);
      
      setAnalysisMetrics(prev => ({
        ...prev,
        analysisTimeSeconds: analysisTimeSeconds,
        manualTaskHours: totalManualTaskHours
      }));
      
      // Mark Section 12 as done after a brief delay
      setTimeout(() => {
        setRollupStatuses(prev => ({ ...prev, savings: 'DONE' }));
      }, 500);
      
      setStatus('Done.');
      
      // Use accumulated cost from local variable (most accurate)
      const finalApiCost = costAccumulator.value;
      
      // Save analysis to database
      try {
        if (user || isDevelopmentBypass) {
          const userId = user?.id;
          
          // Only save if we have a real user (not dev bypass)
          if (userId) {
            console.log('Saving analysis with cost:', finalApiCost.toFixed(6));
            
            const { error: saveError } = await supabase
              .from('user_analyses')
              .insert({
                user_id: userId,
                app_id: appId,
                app_name: appMetaData.trackName,
                app_developer: appMetaData.artistName,
                app_icon_url: appMetaData.artworkUrl100,
                review_count: reviews.length,
                analysis_time_seconds: analysisTimeSeconds,
                api_cost: finalApiCost,
                likes: finalParsed.likes,
                dislikes: finalParsed.dislikes,
                recommendations: recommendationsArray,
                keywords: keywordsArray,
                definitely_include: definitelyIncludeFeatures,
                backlog: backlogItems,
                description: description,
                app_names: appNames,
                prp: prpContent,
                similar_apps: similarApps,
                pricing_model: pricingContent
              });
            
            if (saveError) {
              console.error('Error saving analysis:', saveError);
            } else {
              console.log('✅ Analysis saved to database with cost:', finalApiCost);
            }
            
            // Increment usage counter (regardless of save success - user used a search)
            try {
              console.log('📊 Incrementing usage counter...');
              const usageResponse = await fetch('/api/subscription/increment-usage', {
                method: 'POST'
              });
              const usageData = await usageResponse.json();
              console.log('✅ Usage incremented:', usageData);
            } catch (usageError) {
              console.error('❌ Failed to increment usage:', usageError);
            }
          }
        }
      } catch (saveError) {
        console.error('Failed to save analysis:', saveError);
        // Don't block the user if save fails - they still get their results
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-start analysis when shouldAutoStart is set
  useEffect(() => {
    if (shouldAutoStart && !isAnalyzing) {
      console.log('Triggering auto-start analysis...');
      console.log('Input ref value:', appInputRef.current?.value);
      setShouldAutoStart(false);
      startAnalysis();
    }
  }, [shouldAutoStart, isAnalyzing]);

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
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes check-draw {
          0% {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
          }
          100% {
            stroke-dasharray: 50;
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .animate-check-draw {
          animation: check-draw 0.5s 0.3s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
          opacity: 0;
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
                  <div className="absolute inset-0 flex items-center justify-center bg-[#88D18A] text-white text-sm font-semibold">
                    {getInitials()}
                  </div>
                  {user && user.email ? (
                    <img
                      src={getGravatarUrl(user.email)}
                      alt="Profile"
                      className="w-full h-full object-cover absolute inset-0 z-10"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
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
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push('/admin');
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors font-medium"
                        >
                          🔐 Admin Dashboard
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/analyses');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                      >
                        📊 Analysis History
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          router.push('/billing');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                      >
                        💳 Billing & Subscription
                      </button>
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
        <div className="bg-white rounded-2xl overflow-visible">
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
            <div className="max-w-4xl mx-auto overflow-visible">
              {/* App Input */}
              <div className="mb-6 overflow-visible">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Store URL, App ID, App Name, or keyword
                </label>
                <div className="relative overflow-visible">
                  <input
                    ref={appInputRef}
                    type="text"
                    value={appInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g. https://apps.apple.com/us/app/.../id6475137430, 6475137430, or 'Instagram'"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
                  />
                  {showSearchResults && searchResults.length > 0 && (
            <div className="search-results-container absolute top-full left-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto z-50 w-auto min-w-[22rem] max-w-[36rem] divide-y divide-gray-100"
                 style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                      {searchResults.map((app, index) => {
                        const name = app.trackName || 'Unknown App';
                        const developer = app.artistName || 'Unknown Developer';
                        const rating = app.averageUserRating ? Number(app.averageUserRating).toFixed(1) : 'N/A';
                        const icon = app.artworkUrl100 || '';
                        
                        return (
                          <div
                            key={index}
                            onClick={() => handleAppSelection(app)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                          >
                            {icon && (
                              <img
                                src={icon}
                                alt={name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{name}</div>
                              <div className="text-sm text-gray-500 truncate">{developer}</div>
                              <div className="text-sm text-gray-500">★ {rating}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center mb-8">
                <button
                  onClick={() => startAnalysis(false)}
                  disabled={isAnalyzing}
                  className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Generate'}
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">TARGET App</h3>
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
                        <strong>Store:</strong> <a href={appMeta.trackViewUrl} target="_blank" className="text-[#88D18A] hover:underline">Open in App Store</a>
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
                  {/* Cache Notice */}
                  {showCacheNotice && cachedResult && (
                    <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#CCDDB7', border: '1px solid #B8D19F' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">💾</div>
                          <div>
                            <h4 className="font-semibold text-green-900 mb-1">Cached Results</h4>
                            <p className="text-sm text-green-800">
                              This analysis was completed on <strong>{new Date(cachedResult.created_at).toLocaleDateString()}</strong> and 
                              is being displayed from our database to save your search credits. The data is less than 14 days old and still relevant.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowCacheNotice(false);
                            setCachedResult(null);
                            startAnalysis(true); // Force refresh
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#88D18A] hover:bg-[#88D18A]/90 text-white text-sm font-medium rounded-lg transition-colors ml-4 whitespace-nowrap"
                          title="Run fresh analysis (will use 1 search credit)"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh Analysis
                        </button>
                      </div>
                      <p className="text-xs text-green-700 mt-2 ml-11">
                        💡 Clicking "Refresh Analysis" will run a new search and consume 1 credit from your monthly allowance.
                      </p>
                    </div>
                  )}
                  
                  {createRollupBar('likes', 1, 'What people like about the TARGET app', '👍')}
                  {createRollupBar('dislikes', 2, "What Users Want (and Don't Want) from the TARGET App", '💭')}
                  {createRollupBar('keywords', 3, 'Suggested keywords for your app', '🔍')}
                  {createRollupBar('definitely', 4, 'Core features to include in your app', '🎯')}
                  {createRollupBar('backlog', 5, 'New and additional features to include in your app', '✨')}
                  {createRollupBar('recommendations', 6, '💎 Strategic Recommendations & Insights', '⭐')}
                  {createRollupBar('description', 7, 'Suggested description for your app', '📝')}
                  {createRollupBar('names', 8, 'Suggested names for your app', '💡')}
                  {createRollupBar('prp', 9, 'PRP (Product Requirements Prompt) for your app', '📋')}
                  {createRollupBar('similar', 10, 'Similar Apps', '📱')}
                  {createRollupBar('pricing', 11, 'Suggested pricing model for your app', '💰')}
                  
                  {/* Section 12: Time & Cost Savings */}
                  {analysisMetrics.reviewCount > 0 && (() => {
                    const status = rollupStatuses['savings'] || 'RESEARCH UNDERWAY';
                    const isDone = status === 'DONE';
                    const isExpanded = expandedRollup === 'savings';
                    
                    return (
                      <div className="rollup-bar mb-4 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
                        <div 
                          className={`rollup-header cursor-pointer transition-all duration-300 ${isDone ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setExpandedRollup(isExpanded ? null : 'savings');
                          }}
                        >
                          <div className="flex justify-between items-center p-5">
                            <div className="flex items-center gap-4 flex-1">
                              {/* Icon */}
                              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                                isDone ? 'bg-[#88D18A]' : 'bg-gray-300'
                              } text-white text-xl flex-shrink-0`}>
                                ⏱️
                              </div>
                              
                              {/* Number and Title */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-sm font-bold text-gray-500">Section 12</span>
                                  {isDone && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                      </svg>
                                      Complete
                                    </span>
                                  )}
                                  {!isDone && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full animate-pulse">
                                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Analyzing...
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 truncate">💎 Value Delivered: Time & Money Saved</h3>
                              </div>
                            </div>
                            
                            {/* Expand Icon */}
                            <div className={`ml-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                        <div className="rollup-content bg-gray-50 p-6 border-t border-gray-200">
                          {(() => {
                            // Constants for calculations
                            const WORDS_PER_MINUTE_READING = 200;
                            const AVERAGE_REVIEW_WORDS = 50;
                            const ANALYSIS_HOURLY_RATE = 75; // $75/hour for human analyst
                            
                            // Calculate reading time
                            const totalWords = analysisMetrics.reviewCount * AVERAGE_REVIEW_WORDS;
                            const readingTimeMinutes = totalWords / WORDS_PER_MINUTE_READING;
                            const readingTimeHours = readingTimeMinutes / 60;
                            
                            // Calculate total manual time: reading + analysis tasks
                            const manualAnalysisHours = readingTimeHours * 2; // Reading + summarizing
                            const manualTaskHours = analysisMetrics.manualTaskHours; // Other analytical tasks
                            const totalManualHours = manualAnalysisHours + manualTaskHours;
                            
                            // Calculate cost savings
                            const manualAnalysisCost = totalManualHours * ANALYSIS_HOURLY_RATE;
                            const aiCost = costTracking.totalCost;
                            const totalSavings = manualAnalysisCost - aiCost;
                            
                            // Calculate time savings
                            const actualTimeSeconds = analysisMetrics.analysisTimeSeconds;
                            const manualTimeSeconds = totalManualHours * 3600;
                            const timeSavedSeconds = manualTimeSeconds - actualTimeSeconds;
                            const timeSavedHours = timeSavedSeconds / 3600;
                            
                            // Format time
                            const formatTime = (seconds: number) => {
                              const hours = Math.floor(seconds / 3600);
                              const minutes = Math.floor((seconds % 3600) / 60);
                              const secs = Math.floor(seconds % 60);
                              if (hours > 0) return `${hours}h ${minutes}m`;
                              if (minutes > 0) return `${minutes}m ${secs}s`;
                              return `${secs}s`;
                            };
                            
                            return (
                              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
                                {/* Intro explaining what this section shows */}
                                <div style={{
                                  background: 'linear-gradient(135deg, #e0f2f7, #b2ebf2)',
                                  padding: '16px',
                                  borderRadius: '8px',
                                  marginBottom: '20px',
                                  border: '2px solid #4dd0e1'
                                }}>
                                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#006064', marginBottom: '8px' }}>
                                    🎯 What App Ideas Finder Just Did For You
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#00838f', lineHeight: '1.6' }}>
                                    This analysis automatically processed <strong>{analysisMetrics.reviewCount.toLocaleString()} real user reviews</strong>, 
                                    extracted actionable insights, and generated comprehensive reports across 12 sections—all in minutes. 
                                    Doing this manually would have taken <strong>{totalManualHours.toFixed(1)} hours</strong> and cost 
                                    <strong> ${manualAnalysisCost.toFixed(2)}</strong>. Below is what we saved you:
                                  </div>
                                </div>
                                
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(2, 1fr)', 
                                  gap: '16px',
                                  marginBottom: '20px'
                                }}>
                                  <div style={{
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                      Reviews Analyzed
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>
                                      {analysisMetrics.reviewCount.toLocaleString()}
                                    </div>
                                  </div>
                                  
                                  <div style={{
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                      Analysis Time (AI)
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                      {formatTime(actualTimeSeconds)}
                                    </div>
                                  </div>
                                  
                                  <div style={{
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                      Manual Analysis Time
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                                      {totalManualHours.toFixed(1)}h
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                                      {manualAnalysisHours.toFixed(1)}h reading + {manualTaskHours.toFixed(1)}h tasks
                                    </div>
                                  </div>
                                  
                                  <div style={{
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                      Time Saved
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                                      {timeSavedHours.toFixed(1)}h
                                    </div>
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: 'linear-gradient(135deg, #88D18A, #6BC070)',
                                  padding: '24px',
                                  borderRadius: '12px',
                                  color: 'white',
                                  marginBottom: '16px',
                                  boxShadow: '0 4px 12px rgba(136, 209, 138, 0.3)'
                                }}>
                                  <div style={{ fontSize: '16px', marginBottom: '12px', opacity: 0.95, fontWeight: '600' }}>
                                    💰 Total Money Saved By Using App Ideas Finder
                                  </div>
                                  <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
                                    ${manualAnalysisCost.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '12px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '6px' }}>
                                    Based on ${ANALYSIS_HOURLY_RATE}/hr professional analyst rate × {totalManualHours.toFixed(1)} hours of manual work
                                  </div>
                                </div>
                                
                                <div style={{
                                  background: '#CCDDB7',
                                  border: '1px solid #B8D19F',
                                  padding: '12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#2d5016'
                                }}>
                                  <strong>💡 Methodology:</strong> Manual time includes reading reviews 
                                  ({WORDS_PER_MINUTE_READING} words/min × 2 for notes) plus analytical tasks: keyword research (2h), 
                                  feature identification (1.5h), backlog creation (2h), description writing (1h), app naming (3h), 
                                  PRP documentation (2h), competitor research (1.5h), and pricing analysis (1.5h). 
                                  Human analyst rate: ${ANALYSIS_HOURLY_RATE}/hour.
                                  {analysisMetrics.reviewCount >= 490 && (
                                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #B8D19F' }}>
                                      <strong>📊 Data Source:</strong> Analyzed the most recent {analysisMetrics.reviewCount.toLocaleString()} reviews 
                                      (Apple RSS API limit). This represents current user feedback and is typically sufficient for 
                                      comprehensive insights. Recent reviews are more valuable as they reflect the current app version.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Completion Animation */}
              {showRollups && rollupStatuses['savings'] === 'DONE' && (
                <div className="mt-12 mb-8">
                  {/* Animated Checkmark */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#88D18A] to-[#6BC070] flex items-center justify-center shadow-2xl animate-scale-in">
                        <svg className="w-16 h-16 text-white animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-[#88D18A] animate-ping opacity-20"></div>
                    </div>
                  </div>
                  
                  {/* Completion Message */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 animate-fade-in-up">
                      🎉 Analysis Complete!
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 mb-6 animate-fade-in-up animation-delay-200">
                      Your comprehensive 12-section app analysis is ready
                    </p>
                    
                    {/* Download PDF Button */}
                    <button
                      onClick={async () => {
                        try {
                          // Get affiliate data
                          const { data: affiliateInfo } = await supabase
                            .from('user_affiliates')
                            .select('affiliate_code')
                            .eq('user_id', user?.id)
                            .single();
                          
                          const response = await fetch('/api/generate-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              appMeta,
                              rollupContent,
                              analysisMetrics,
                              costTracking,
                              affiliateCode: affiliateInfo?.affiliate_code || 'SIGNUP',
                              userEmail: user?.email
                            })
                          });
                          
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${appMeta?.trackName || 'app'}-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } else {
                            alert('Failed to generate PDF. Please try again.');
                          }
                        } catch (error) {
                          console.error('PDF generation error:', error);
                          alert('Error generating PDF. Please try again.');
                        }
                      }}
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-[#88D18A] to-[#6BC070] hover:shadow-2xl text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl animate-fade-in-up animation-delay-400"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Full Analysis as PDF
                    </button>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-300 my-8"></div>
                </div>
              )}

              {/* Cost Tracking - Admin Only */}
              {isAdmin && costTracking.totalCalls > 0 && (
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Complete Engine Cycle (CEC) Cost Breakdown</h3>
                  <div className="font-mono text-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-600 mb-1">Input Tokens</div>
                        <div className="text-xl font-bold text-gray-900">{costTracking.totalInputTokens.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">@$0.20/1M</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="font-semibold text-gray-600 mb-1">Output Tokens</div>
                        <div className="text-xl font-bold text-gray-900">{costTracking.totalOutputTokens.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">@$0.50/1M (includes system)</div>
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
                  
                  {/* Detailed API Call Log */}
                  {apiCallLogs.length > 0 && (
                    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">📋 Detailed API Call Log</h4>
                      <div className="text-xs text-gray-600 max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1 px-2">#</th>
                              <th className="text-left py-1 px-2">Input</th>
                              <th className="text-left py-1 px-2">System</th>
                              <th className="text-left py-1 px-2">Output</th>
                              <th className="text-left py-1 px-2">Total</th>
                              <th className="text-left py-1 px-2">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiCallLogs.map((log, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-1 px-2">{log.callNumber}</td>
                                <td className="py-1 px-2">{log.inputTokens.toLocaleString()}</td>
                                <td className="py-1 px-2 text-gray-500">{log.systemTokens.toLocaleString()}</td>
                                <td className="py-1 px-2">{log.outputTokens.toLocaleString()}</td>
                                <td className="py-1 px-2">{log.totalTokens.toLocaleString()}</td>
                                <td className="py-1 px-2">${log.cost.toFixed(6)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 font-semibold">
                              <td className="py-1 px-2">Total</td>
                              <td className="py-1 px-2">{apiCallLogs.reduce((sum, log) => sum + log.inputTokens, 0).toLocaleString()}</td>
                              <td className="py-1 px-2 text-gray-500">{apiCallLogs.reduce((sum, log) => sum + log.systemTokens, 0).toLocaleString()}</td>
                              <td className="py-1 px-2">{apiCallLogs.reduce((sum, log) => sum + log.outputTokens, 0).toLocaleString()}</td>
                              <td className="py-1 px-2">{apiCallLogs.reduce((sum, log) => sum + log.totalTokens, 0).toLocaleString()}</td>
                              <td className="py-1 px-2">${apiCallLogs.reduce((sum, log) => sum + log.cost, 0).toFixed(6)}</td>
                            </tr>
                          </tfoot>
                        </table>
                        <div className="mt-2 text-xs text-gray-500 italic">
                          💡 System tokens = overhead/metadata (billed at output rate $0.50/1M)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AppEnginePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    }>
      <AppEngineContent />
    </Suspense>
  );
}
