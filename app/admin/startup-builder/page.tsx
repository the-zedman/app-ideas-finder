'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import Footer from '@/components/Footer';
import type { AdminCheck } from '@/lib/is-admin';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Types
interface ParsedResults {
  ai_description: string;
  likes: string[];
  dislikes: string[];
  sentiment: string;
  recommendations: string[];
}

export default function StartupBuilderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [businessIdea, setBusinessIdea] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [showRollups, setShowRollups] = useState(false);
  const [expandedRollup, setExpandedRollup] = useState<string | null>(null);
  const [rollupStatuses, setRollupStatuses] = useState<{[key: string]: string}>({});
  const [rollupContent, setRollupContent] = useState<{[key: string]: any}>({});
  const [analysisResults, setAnalysisResults] = useState<ParsedResults | null>(null);
  const [analysisMetrics, setAnalysisMetrics] = useState({
    analysisTimeSeconds: 0,
    startTime: 0,
    manualTaskHours: 0
  });
  const [costTracking, setCostTracking] = useState({
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  });
  const [apiCallLogs, setApiCallLogs] = useState<any[]>([]);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/aif');
        return;
      }

      setUser(currentUser);

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
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger confetti when analysis completes
  useEffect(() => {
    if (showRollups && rollupStatuses['viability'] === 'DONE' && !hasShownConfetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setHasShownConfetti(true);
    }
  }, [showRollups, rollupStatuses, hasShownConfetti]);

  // AI API function
  const callAI = async (messages: any[], model: string = 'grok-4-fast-reasoning', costAccumulator?: { value: number }) => {
    const response = await fetch('/api/grok-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        temperature: 0.2,
        max_tokens: 5000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Grok error: ${response.status} ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Extract token usage for cost tracking
    if (data.usage) {
      const inputTokens = data.usage.prompt_tokens || 0;
      const outputTokens = data.usage.completion_tokens || 0;
      const totalTokens = data.usage.total_tokens || (inputTokens + outputTokens);
      const systemTokens = totalTokens - (inputTokens + outputTokens);
      
      const inputCost = Number((inputTokens * 0.0000002).toFixed(10));
      const systemCost = Number((systemTokens * 0.0000005).toFixed(10));
      const outputCost = Number((outputTokens * 0.0000005).toFixed(10));
      const callCost = Number((inputCost + systemCost + outputCost).toFixed(10));
      
      console.log(`[API Call] Input: ${inputTokens}, Output: ${outputTokens}, System: ${systemTokens}, Total: ${totalTokens}, Cost: $${callCost.toFixed(6)}`);
      
      setApiCallLogs(prev => [...prev, {
        callNumber: prev.length + 1,
        inputTokens,
        outputTokens,
        systemTokens,
        totalTokens,
        cost: callCost,
        timestamp: new Date().toISOString()
      }]);
      
      updateCostTracking(inputTokens, outputTokens, systemTokens);
      
      if (costAccumulator) {
        costAccumulator.value += callCost;
      }
    }
    
    return data.content || '';
  };

  const updateCostTracking = (inputTokens: number, outputTokens: number, systemTokens: number = 0) => {
    setCostTracking(prev => {
      const newTotalInput = prev.totalInputTokens + inputTokens;
      const newTotalOutput = prev.totalOutputTokens + outputTokens + systemTokens;
      const newTotalCalls = prev.totalCalls + 1;
      
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

  // Prompt building functions - adapted for business ideas
  const buildBusinessIdeaPrompt = (businessName: string, businessIdea: string) => {
    const prompt = `Analyze this business idea and generate two sets of 6-10 bullet points. The first set is 'what would customers value about this business idea' and the second set is 'what challenges or concerns might customers have, and what features or improvements would address them'.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea:
${businessIdea}`;

    return [{role: 'user', content: prompt}];
  };

  const buildKeywordsPrompt = (businessName: string, businessIdea: string, likes: string[]) => {
    const likesText = likes.join(', ');
    
    const prompt = `Based on the following business idea, generate 20 relevant keywords that would be effective for SEO, App Store Optimization (ASO), and social media marketing:

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 500)}${businessIdea.length > 500 ? '...' : ''}

What customers would value: ${likesText}

Generate 20 keywords that are:
- Relevant to the business functionality and customer benefits
- Popular search terms customers might use
- Good for social media hashtags and marketing
- Specific enough to be effective but broad enough to capture traffic

Format as a simple comma-separated list of keywords.`;

    return [{role: 'user', content: prompt}];
  };

  const buildDefinitelyIncludePrompt = (businessName: string, businessIdea: string, likes: string[]) => {
    const likesText = likes.join(', ');
    
    const prompt = `Based on what customers would value about this business idea, create a list of features that should definitely be included to ensure customer satisfaction.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 500)}${businessIdea.length > 500 ? '...' : ''}

What customers would value: ${likesText}

Create 6-10 specific features that should definitely be included, based on what customers would value. These should be:
- Core features that address the main value proposition
- Essential functionality that customers need
- Key user experience elements that would work well
- Features that differentiate the business positively

Format as a simple bullet point list of features to definitely include.`;

    return [{role: 'user', content: prompt}];
  };

  const buildBacklogPrompt = (businessName: string, businessIdea: string, dislikes: string[], likes: string[]) => {
    const dislikesText = dislikes.join(', ');
    const likesText = likes.join(', ');
    
    const prompt = `Based on this business idea, create a prioritized project backlog of specific, actionable development tasks that address potential customer concerns and requests.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 500)}${businessIdea.length > 500 ? '...' : ''}

Potential customer concerns/requests: ${dislikesText}

What customers would value: ${likesText}

Create 8-12 backlog items that are:
- Specific and actionable development tasks
- Prioritized by customer impact and feasibility
- Based on potential customer needs and concerns
- Include both core features and enhancements
- Written as clear development tasks

Format each item as:
1. [Priority] Task Title - Brief description

Example:
1. [High] User Authentication - Implement secure login system
2. [Medium] Dark Mode - Add dark theme option

Focus on the most important features and most requested enhancements.`;

    return [{role: 'user', content: prompt}];
  };

  const buildRecommendationsPrompt = (businessName: string, businessIdea: string, likes: string[], dislikes: string[], keywords: string[], definitelyInclude: string[], backlog: any[]) => {
    const likesText = likes.join('\n• ');
    const dislikesText = dislikes.join('\n• ');
    const keywordsText = keywords.join(', ');
    const definitelyIncludeText = definitelyInclude.join('\n• ');
    const backlogText = backlog.map((item: any) => item.content).join('\n• ');
    
    const prompt = `You are a product strategy consultant analyzing this business idea to guide its development.

BUSINESS IDEA:
Business Name: ${businessName || 'Unnamed Business'}

Business Concept:
${businessIdea.substring(0, 1000)}${businessIdea.length > 1000 ? '...' : ''}

CUSTOMER INTELLIGENCE:
What Customers Would Value: 
• ${likesText}

Potential Customer Concerns/Requests:
• ${dislikesText}

Market Keywords: ${keywordsText}

PLANNED FEATURES:
Core Features:
• ${definitelyIncludeText}

Additional Features:
• ${backlogText}

TASK:
Provide 8-10 strategic, actionable recommendations for building this business successfully. Focus on qualitative insights. Cover these areas:

1. **Market Opportunity** - Identify the strongest opportunities and potential pain points
2. **Development Priorities** - What to build first and why
3. **Market Positioning** - How to differentiate based on customer needs
4. **Innovation Opportunities** - Novel features or approaches customers would love
5. **Monetization Strategy** - Pricing approach based on the business model
6. **Technical Decisions** - Architecture choices based on requirements
7. **UX/UI Priorities** - Critical design decisions
8. **Launch Strategy** - Target customer segment, MVP scope, and go-to-market approach
9. **Competitive Advantages** - Specific ways to stand out

IMPORTANT FORMATTING:
Each recommendation MUST follow this exact format:
[CRITICAL] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning.

Or:
[HIGH] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning.

Or:
[MEDIUM] Category Title: One clear sentence explaining the strategic recommendation with specific reasoning.

Priority levels:
- [CRITICAL] = Must do first, blocking issue or huge opportunity
- [HIGH] = Should do early, significant impact
- [MEDIUM] = Important but can be phased in later

Requirements:
- Start each line with priority tag: [CRITICAL], [HIGH], or [MEDIUM]
- Make the explanation a FULL SENTENCE (15-25 words) that's specific and actionable
- Sort from highest to lowest priority (all CRITICAL first, then HIGH, then MEDIUM)
- Be specific, not generic`;

    return [{role: 'user', content: prompt}];
  };

  const buildAppDescriptionPrompt = (businessName: string, businessIdea: string, definitelyInclude: string[], backlog: any[], keywords: string[]) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    
    const prompt = `Based on this business idea, create a compelling 2-3 sentence description for the product/service.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 500)}${businessIdea.length > 500 ? '...' : ''}

Core Features: ${definitelyIncludeText}

Additional Features: ${backlogText}

Keywords: ${keywordsText}

Create a description that:
- Explains what the business does in clear terms
- Highlights why it's valuable and how it helps customers
- Incorporates the most important features and benefits
- Is engaging and compelling for potential customers
- Is 2-3 sentences maximum

Write as if this is the product description for the business.`;

    return [{role: 'user', content: prompt}];
  };

  const buildAppNamePrompt = (businessName: string, businessIdea: string, definitelyInclude: string[], backlog: any[], keywords: string[], description: string) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    
    const prompt = `Based on this business idea, generate up to 20 creative and compelling business/product names.

Business Name (if provided): ${businessName || 'None'}

Business Idea: ${businessIdea.substring(0, 500)}${businessIdea.length > 500 ? '...' : ''}

Core Features: ${definitelyIncludeText}

Additional Features: ${backlogText}

Keywords: ${keywordsText}

Product Description: ${description}

Create names that are:
- Creative and memorable
- Relevant to the business functionality
- Easy to pronounce and spell
- Unique and distinctive
- Appeal to the target audience

Generate 15-20 names, one per line, without numbers or bullet points.`;

    return [{role: 'user', content: prompt}];
  };

  const buildPRPPrompt = (businessName: string, businessIdea: string, definitelyInclude: string[], backlog: any[], keywords: string[], description: string, appNames: string[], recommendations: string[]) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    const appNamesText = appNames.join(', ');
    const recommendationsText = recommendations.join('\n');
    
    const prompt = `Create a comprehensive Product Requirements Prompt (PRP) that a developer can use to prompt an AI to build this business/product.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 1000)}${businessIdea.length > 1000 ? '...' : ''}

Product Description: ${description}

Core Features: ${definitelyIncludeText}

Backlog items: ${backlogText}

Keywords: ${keywordsText}

Potential names: ${appNamesText}

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

Format as a comprehensive prompt that an AI developer can use to start building the product. Make it detailed, actionable, and comprehensive.`;

    return [{role: 'user', content: prompt}];
  };

  const buildCompetitorsPrompt = (businessName: string, businessIdea: string, keywords: string[]) => {
    const keywordsText = keywords.join(', ');
    
    const prompt = `Based on this business idea, identify and analyze potential competitors in the market.

Business Name: ${businessName || 'Unnamed Business'}

Business Idea: ${businessIdea.substring(0, 1000)}${businessIdea.length > 1000 ? '...' : ''}

Market Keywords: ${keywordsText}

Provide a comprehensive competitor analysis that includes:
- Direct competitors (businesses solving the same problem)
- Indirect competitors (alternative solutions customers might use)
- For each competitor, identify:
  * Their name
  * What they do
  * Their strengths
  * Their weaknesses
  * Pricing model (if known/applicable)
  * Market position

Format as a structured list with competitor names as headers and details below each. Focus on businesses that would compete for the same customers.`;

    return [{role: 'user', content: prompt}];
  };

  const buildPricingModelPrompt = (businessName: string, businessIdea: string, definitelyInclude: string[], backlog: any[], keywords: string[], description: string, appNames: string[], competitors: any[], likes: string[], dislikes: string[]) => {
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    const keywordsText = keywords.join(', ');
    const appNamesText = appNames.join(', ');
    const likesText = likes.join(', ');
    const dislikesText = dislikes.join(', ');
    
    // Format competitor data
    const competitorText = competitors ? (typeof competitors === 'string' ? competitors : JSON.stringify(competitors)) : 'No competitor data available';
    
    const prompt = `You are a pricing strategist creating a comprehensive monetization strategy and business case for this business idea.

BUSINESS CONCEPT:
Business Name: ${businessName || 'Unnamed Business'}

Description: ${description}

Core Features: ${definitelyIncludeText}

Additional Features: ${backlogText}

Keywords: ${keywordsText}

Suggested Names: ${appNamesText}

CUSTOMER INTELLIGENCE:
What Customers Would Value: ${likesText}

Potential Concerns/Requests: ${dislikesText}

COMPETITIVE LANDSCAPE:
${competitorText}

REQUIRED OUTPUT - Provide comprehensive pricing and revenue analysis:

**1. Competitive Pricing Intelligence**
- Analysis of competitor pricing strategies
- Price sensitivity considerations
- Market positioning opportunities (premium vs budget)

**2. Recommended Pricing Strategy**
- Primary model (Free, Freemium, Paid, Subscription, One-time, Hybrid)
- Specific price points for each tier
- Feature distribution across tiers (what's free vs paid)
- Rationale for each pricing decision

**3. Willingness-to-Pay Analysis**
- Features customers will pay for
- Features that must be free (table stakes)
- Value perception considerations

**4. Revenue Strategy & Scenarios**
- **CRITICAL: All revenue estimates must be EXTREMELY conservative. Industry data shows most businesses make $1K-$10K USD/month. Year 1 revenue for new businesses is typically $5K-$60K USD TOTAL, not per month. Always include "USD" when mentioning dollar amounts.**
- Conservative scenario: Based on slow organic growth and low conversion rates. Typically $5K-$15K USD total Year 1 revenue.
- Realistic scenario: Based on moderate marketing effort and typical conversion. Typically $15K-$40K USD total Year 1 revenue.
- Optimistic scenario: Based on strong product-market fit and viral growth. Typically $40K-$100K USD total Year 1 revenue. **Never exceed $100K USD for Year 1 unless there's proven market validation.**
- Focus on revenue drivers (pricing × conversion × retention)
- **Most businesses never reach $100K USD/year. Be realistic and conservative in all estimates.**

**5. Monetization Do's and Don'ts**
- What to avoid based on competitor analysis
- Pricing patterns that work in this category
- Upsell and cross-sell opportunities

**6. Launch Pricing Strategy**
- Initial pricing for launch (introductory offers?)
- Early adopter benefits
- Price optimization timeline
- A/B testing recommendations

Base recommendations on competitive analysis and customer needs. **MOST IMPORTANTLY: Revenue projections must be EXTREMELY conservative. The vast majority of businesses generate $1K-$10K USD/month. Year 1 revenue for new businesses is typically $5K-$60K USD TOTAL. Most businesses never reach $100K USD/year revenue. Be realistic and conservative in all estimates. Always include "USD" when mentioning dollar amounts.**`;

    return [{role: 'user', content: prompt}];
  };

  const buildMarketViabilityPrompt = (businessName: string, businessIdea: string, likes: string[], dislikes: string[], keywords: string[], definitelyInclude: string[], backlog: any[], competitors: any[]) => {
    const likesText = likes.join('\n• ');
    const dislikesText = dislikes.join('\n• ');
    const definitelyIncludeText = definitelyInclude.join(', ');
    const backlogText = backlog.map((item: any) => item.content).join(', ');
    
    // Format competitor data
    const competitorText = competitors ? (typeof competitors === 'string' ? competitors : JSON.stringify(competitors)) : 'No competitor data available';
    
    const prompt = `You are a market analyst providing a comprehensive business viability assessment for this business idea.

BUSINESS IDEA:
Business Name: ${businessName || 'Unnamed Business'}

Business Concept:
${businessIdea.substring(0, 1500)}${businessIdea.length > 1500 ? '...' : ''}

CUSTOMER SENTIMENT ANALYSIS:
What Customers Would Value:
• ${likesText}

Potential Customer Concerns/Requests:
• ${dislikesText}

COMPETITIVE LANDSCAPE:
${competitorText}

PLANNED FEATURES:
Core: ${definitelyIncludeText}
Additional: ${backlogText}

REQUIRED OUTPUT - Provide comprehensive market viability analysis covering:

**1. Total Addressable Market (TAM)**
- Market size estimation based on business category and industry research
- Growth trends and trajectory for this category
- Market maturity assessment

**2. Serviceable Available Market (SAM)**  
- **IMPORTANT: SAM refers to the total addressable market size across the entire business sector/category, not just this specific business. Be extremely conservative - most business categories represent a fraction of the total market.**
- Realistic market segment size within the broader category that could potentially be reached
- Customer segments most likely to use this solution
- Specific pain points that represent capturable market opportunity
- **Keep estimates realistic - most business categories represent $10M-$100M USD total market size, not billions. Always include "USD" when mentioning dollar amounts.**

**3. Serviceable Obtainable Market (SOM)**
- **IMPORTANT: SOM refers to the realistic market share you could capture within the broader sector, not just from competitors. Be extremely conservative - new businesses typically capture 0.1%-1% of their category market.**
- Realistic market capture potential within the broader category (typically 0.1%-1% for new businesses)
- Target customer segments for launch
- Competitive positioning strategy
- **Keep estimates realistic - new businesses typically capture $10K-$500K USD in market share, not millions. Always include "USD" when mentioning dollar amounts.**

**4. Competitive Analysis**
- Competitor strengths and weaknesses
- Market gaps and opportunities
- Your competitive advantages based on feature analysis

**5. Revenue Potential**
- Pricing strategy based on competitive analysis
- Expected conversion rates based on similar businesses in category
- Realistic Year 1 revenue scenarios (conservative/realistic/optimistic)
- **CRITICAL: Revenue estimates must be VERY conservative. Most businesses generate far less revenue than expected. Industry data shows most businesses make $1K-$10K USD/month. Year 1 revenue for new businesses is typically $5K-$60K USD total, not per month. Be extremely conservative in all estimates. Always include "USD" when mentioning dollar amounts.**
- Key revenue drivers and monetization approach

**6. Risk Assessment**
- Market risks (saturation, competitor response)
- Technical risks
- Business risks (pricing sensitivity, churn indicators)
- Mitigation strategies

**7. Go-to-Market Strategy**
- Target customer segment to launch with
- Key messaging based on competitive advantages
- Launch timeline recommendations
- Success metrics to track

**8. Validation Signals**
- Why this market opportunity is viable
- Evidence of customer demand
- Customer willingness to pay indicators
- Signs this is a real opportunity vs a saturated market

Base your analysis on the business idea, competitive landscape, and category trends. **CRITICAL FOR REVENUE ESTIMATES: Be EXTREMELY conservative. Most businesses make $1K-$10K USD/month. Year 1 revenue for new businesses is typically $5K-$60K USD TOTAL, not per month. Most businesses never reach $100K USD/year. Always include "USD" when mentioning dollar amounts.** Avoid speculative revenue projections that can't be validated. Focus on qualitative market signals and positioning opportunities.`;

    return [{role: 'user', content: prompt}];
  };

  // Main analysis function
  const startAnalysis = async () => {
    if (!businessIdea.trim()) {
      alert('Please enter a business idea to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setStatus('Starting analysis...');
    setHasShownConfetti(false);
    
    const costAccumulator = { value: 0 };
    
    setCostTracking({
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0
    });
    setApiCallLogs([]);
    
    const startTime = Date.now();
    setAnalysisMetrics({
      analysisTimeSeconds: 0,
      startTime: startTime,
      manualTaskHours: 0
    });
    
    // Initialize rollup statuses
    const sections = ['likes', 'dislikes', 'keywords', 'definitely', 'backlog', 'recommendations', 'description', 'names', 'prp', 'competitors', 'pricing', 'viability'];
    const initialStatuses: {[key: string]: string} = {};
    sections.forEach(section => {
      initialStatuses[section] = 'RESEARCH UNDERWAY';
    });
    setRollupStatuses(initialStatuses);
    
    try {
      setStatus('Analyzing business idea...');
      setShowRollups(true);
      
      // Step 1: Analyze business idea (likes/dislikes)
      const messages = buildBusinessIdeaPrompt(businessName, businessIdea);
      const raw = await callAI(messages, 'grok-4-fast-reasoning', costAccumulator);
      
      let summaryText = '';
      if (!raw || raw.trim() === '') {
        summaryText = 'Unable to analyze business idea.';
      } else {
        summaryText = raw.trim();
      }
      
      const text = summaryText.trim();
      
      // Extract likes
      let likes: string[] = [];
      const likesMatch = text.match(/###\s*What\s+Would\s+Customers\s+Value\s+About\s+This\s+Business\s+Idea\s*\n([\s\S]*?)(?=###|$)/i) ||
                        text.match(/###\s*What\s+Do\s+Customers\s+Value\s*\n([\s\S]*?)(?=###|$)/i) ||
                        text.match(/###\s*What\s+Customers\s+Would\s+Value\s*\n([\s\S]*?)(?=###|$)/i);
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
      const dislikesMatch = text.match(/###\s*What\s+Challenges\s+or\s+Concerns\s+Might\s+Customers\s+Have\s*\n([\s\S]*?)(?=###|$)/i) ||
                           text.match(/###\s*Challenges\s+or\s+Concerns\s*\n([\s\S]*?)(?=###|$)/i);
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
        likes: likes.length > 0 ? likes : ["No specific value propositions identified"],
        dislikes: dislikes.length > 0 ? dislikes : ["No specific concerns identified"],
        sentiment: likes.length > dislikes.length * 2 ? "Mostly Positive" : dislikes.length > likes.length * 2 ? "Mostly Negative" : "Mixed",
        recommendations: []
      };

      setAnalysisResults(finalParsed);
      
      setRollupStatuses(prev => ({
        ...prev,
        likes: 'DONE',
        dislikes: 'DONE'
      }));
      
      setRollupContent(prev => ({
        ...prev,
        likes: finalParsed.likes,
        dislikes: finalParsed.dislikes
      }));

      // Generate keywords
      setStatus('Generating keywords...');
      let keywordsArray: string[] = [];
      try {
        const keywordsMessages = buildKeywordsPrompt(businessName, businessIdea, finalParsed.likes);
        const keywordsResponse = await callAI(keywordsMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (keywordsResponse && keywordsResponse.trim()) {
          keywordsArray = keywordsResponse.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
          setRollupStatuses(prev => ({ ...prev, keywords: 'DONE' }));
          setRollupContent(prev => ({ ...prev, keywords: keywordsArray }));
        }
      } catch (error) {
        console.error('Error generating keywords:', error);
      }

      // Generate definitely include features
      setStatus('Generating core features...');
      let definitelyIncludeFeatures: string[] = [];
      try {
        const definitelyIncludeMessages = buildDefinitelyIncludePrompt(businessName, businessIdea, finalParsed.likes);
        const definitelyIncludeResponse = await callAI(definitelyIncludeMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (definitelyIncludeResponse && definitelyIncludeResponse.trim()) {
          const lines = definitelyIncludeResponse.split('\n').filter((line: string) => line.trim().length > 0);
          definitelyIncludeFeatures = lines.map((line: string) => {
            const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
            return cleanLine;
          }).filter((feature: string) => feature.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, definitely: 'DONE' }));
          setRollupContent(prev => ({ ...prev, definitely: definitelyIncludeFeatures }));
        }
      } catch (error) {
        console.error('Error generating core features:', error);
      }

      // Generate backlog items
      setStatus('Generating additional features...');
      let backlogItems: any[] = [];
      try {
        const backlogMessages = buildBacklogPrompt(businessName, businessIdea, finalParsed.dislikes, finalParsed.likes);
        const backlogResponse = await callAI(backlogMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (backlogResponse && backlogResponse.trim()) {
          const lines = backlogResponse.split('\n').filter((line: string) => line.trim().length > 0);
          backlogItems = lines.map((line: string) => {
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

      // Generate strategic recommendations
      setStatus('Generating strategic recommendations...');
      let recommendationsArray: string[] = [];
      try {
        const recommendationsMessages = buildRecommendationsPrompt(businessName, businessIdea, finalParsed.likes, finalParsed.dislikes, keywordsArray, definitelyIncludeFeatures, backlogItems);
        const recommendationsResponse = await callAI(recommendationsMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (recommendationsResponse && recommendationsResponse.trim()) {
          const lines = recommendationsResponse.split('\n').filter((line: string) => line.trim().length > 0);
          recommendationsArray = lines
            .filter((line: string) => /^\[(CRITICAL|HIGH|MEDIUM)\]/.test(line.trim()))
            .map((line: string) => line.trim())
            .filter((rec: string) => rec.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, recommendations: 'DONE' }));
          setRollupContent(prev => ({ ...prev, recommendations: recommendationsArray }));
        }
      } catch (error) {
        console.error('Error generating recommendations:', error);
      }

      // Generate description
      setStatus('Generating product description...');
      let description: string = '';
      try {
        const appDescriptionMessages = buildAppDescriptionPrompt(businessName, businessIdea, definitelyIncludeFeatures, backlogItems, keywordsArray);
        const appDescriptionResponse = await callAI(appDescriptionMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (appDescriptionResponse && appDescriptionResponse.trim()) {
          description = appDescriptionResponse.trim();
          setRollupStatuses(prev => ({ ...prev, description: 'DONE' }));
          setRollupContent(prev => ({ ...prev, description: [description] }));
        }
      } catch (error) {
        console.error('Error generating description:', error);
      }

      // Generate app names
      setStatus('Generating business names...');
      let appNames: string[] = [];
      try {
        const appNameMessages = buildAppNamePrompt(businessName, businessIdea, definitelyIncludeFeatures, backlogItems, keywordsArray, description);
        const appNameResponse = await callAI(appNameMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (appNameResponse && appNameResponse.trim()) {
          const lines = appNameResponse.split('\n').filter((line: string) => line.trim().length > 0);
          appNames = lines.map((line: string) => line.trim()).filter((name: string) => name.length > 0);
          
          setRollupStatuses(prev => ({ ...prev, names: 'DONE' }));
          setRollupContent(prev => ({ ...prev, names: appNames }));
        }
      } catch (error) {
        console.error('Error generating names:', error);
      }

      // Generate PRP
      setStatus('Generating product requirements prompt...');
      let prpContent: string = '';
      try {
        const prpMessages = buildPRPPrompt(businessName, businessIdea, definitelyIncludeFeatures, backlogItems, keywordsArray, description, appNames, recommendationsArray);
        const prpResponse = await callAI(prpMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (prpResponse && prpResponse.trim()) {
          prpContent = prpResponse.trim();
          setRollupStatuses(prev => ({ ...prev, prp: 'DONE' }));
          setRollupContent(prev => ({ ...prev, prp: [prpContent] }));
        }
      } catch (error) {
        console.error('Error generating PRP:', error);
      }

      // Generate competitors (instead of similar apps)
      setStatus('Analyzing competitors...');
      let competitors: any = null;
      try {
        const competitorsMessages = buildCompetitorsPrompt(businessName, businessIdea, keywordsArray);
        const competitorsResponse = await callAI(competitorsMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (competitorsResponse && competitorsResponse.trim()) {
          competitors = competitorsResponse.trim();
          setRollupStatuses(prev => ({ ...prev, competitors: 'DONE' }));
          setRollupContent(prev => ({ ...prev, competitors: [competitors] }));
        }
      } catch (error) {
        console.error('Error generating competitors:', error);
      }

      // Generate pricing
      setStatus('Analyzing pricing strategy...');
      let pricingContent: string = '';
      try {
        const pricingMessages = buildPricingModelPrompt(businessName, businessIdea, definitelyIncludeFeatures, backlogItems, keywordsArray, description, appNames, competitors, finalParsed.likes, finalParsed.dislikes);
        const pricingResponse = await callAI(pricingMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (pricingResponse && pricingResponse.trim()) {
          pricingContent = pricingResponse.trim();
          setRollupStatuses(prev => ({ ...prev, pricing: 'DONE' }));
          setRollupContent(prev => ({ ...prev, pricing: [pricingContent] }));
        }
      } catch (error) {
        console.error('Error generating pricing:', error);
      }

      // Generate market viability
      setStatus('Generating market viability analysis...');
      let marketViabilityContent: string = '';
      try {
        const marketViabilityMessages = buildMarketViabilityPrompt(businessName, businessIdea, finalParsed.likes, finalParsed.dislikes, keywordsArray, definitelyIncludeFeatures, backlogItems, competitors);
        const marketViabilityResponse = await callAI(marketViabilityMessages, 'grok-4-fast-reasoning', costAccumulator);
        
        if (marketViabilityResponse && marketViabilityResponse.trim()) {
          marketViabilityContent = marketViabilityResponse.trim();
          setRollupStatuses(prev => ({ ...prev, viability: 'DONE' }));
          setRollupContent(prev => ({ ...prev, viability: [marketViabilityContent] }));
        }
      } catch (error) {
        console.error('Error generating market viability:', error);
      }

      // Calculate final analysis time
      const endTime = Date.now();
      const analysisTimeSeconds = (endTime - startTime) / 1000;
      
      const manualTaskEstimates = {
        analysis: 2, // 2 hours to analyze business idea
        keywords: 2,
        features: 1.5,
        backlog: 2,
        description: 1,
        naming: 3,
        prp: 2,
        competitors: 1.5,
        pricing: 1.5,
        viability: 2
      };
      
      const totalManualTaskHours = Object.values(manualTaskEstimates).reduce((sum, hours) => sum + hours, 0);
      
      setAnalysisMetrics(prev => ({
        ...prev,
        analysisTimeSeconds: analysisTimeSeconds,
        manualTaskHours: totalManualTaskHours
      }));
      
      
      setStatus('Done.');
      
      const finalApiCost = costAccumulator.value;
      
      // Save analysis to database via API route
      try {
        if (!user) {
          console.error('No user found, cannot save analysis');
          alert('Error: You must be logged in to save analyses. Please refresh the page and try again.');
          return;
        }

        console.log('Saving startup analysis with cost:', finalApiCost.toFixed(6));
        console.log('User ID:', user.id);
        
        const payload = {
          business_name: businessName || null,
          business_idea: businessIdea,
          likes: finalParsed.likes,
          dislikes: finalParsed.dislikes,
          recommendations: recommendationsArray,
          keywords: keywordsArray,
          definitely_include: definitelyIncludeFeatures,
          backlog: backlogItems,
          description: description,
          app_names: appNames,
          prp: prpContent,
          competitors: competitors ? [competitors] : null,
          pricing_model: pricingContent,
          market_viability: marketViabilityContent,
          analysis_time_seconds: analysisTimeSeconds,
          api_cost: finalApiCost
        };

        console.log('Payload keys:', Object.keys(payload));
        console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
        
        const response = await fetch('/api/admin/startup-analyses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const result = await response.json();
        console.log('Response result:', result);

        if (!response.ok) {
          console.error('Error saving startup analysis:', result);
          console.error('Error details:', JSON.stringify(result, null, 2));
          alert(`Error saving analysis: ${result.message || 'Unknown error'}. ${result.hint ? `Hint: ${result.hint}` : ''} ${result.details ? `Details: ${result.details}` : ''} Check console for details.`);
        } else {
          console.log('✅ Startup analysis saved to database with cost:', finalApiCost);
          console.log('Saved analysis ID:', result.analysis?.id);
          console.log('Share slug:', result.analysis?.share_slug);
          setStatus('Analysis complete and saved! You can view it in the history page.');
        }
      } catch (saveError) {
        console.error('Failed to save startup analysis:', saveError);
        alert(`Failed to save analysis: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Markdown renderer component
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

  // Rollup component (reused from app engine)
  const RollupSection = ({ sectionKey, title, icon, content, status }: { sectionKey: string; title: string; icon: string; content: any; status: string }) => {
    const isExpanded = expandedRollup === sectionKey;
    const isDone = status === 'DONE';
    
    const safeArray = (arr: any): string[] => {
      if (!arr) return [];
      if (Array.isArray(arr)) return arr;
      return [];
    };
    
    const safeString = (str: any): string => {
      if (!str) return '';
      if (Array.isArray(str) && str.length > 0) return str[0];
      if (typeof str === 'string') return str;
      return '';
    };
    
    let displayContent: any = null;
    if (sectionKey === 'likes' || sectionKey === 'dislikes' || sectionKey === 'keywords' || sectionKey === 'definitely' || sectionKey === 'backlog' || sectionKey === 'recommendations' || sectionKey === 'names') {
      const items = safeArray(content);
      displayContent = items.length > 0 ? items : [];
    } else if (sectionKey === 'description' || sectionKey === 'prp' || sectionKey === 'competitors' || sectionKey === 'pricing' || sectionKey === 'viability') {
      displayContent = safeString(content);
    }
    
    return (
      <div className="rollup-header bg-white border-2 border-gray-200 rounded-xl p-4 mb-3 cursor-pointer transition-all hover:border-[#88D18A] hover:shadow-md" onClick={() => setExpandedRollup(isExpanded ? null : sectionKey)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="font-bold text-gray-900">{title}</div>
              <div className="text-xs text-gray-500">{status}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDone && <span className="text-green-600 text-sm font-semibold">✓</span>}
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {isExpanded && displayContent && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {sectionKey === 'prp' && typeof displayContent === 'string' && (
              <div className="mb-3 flex justify-end">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(displayContent);
                      alert('PRP copied to clipboard!');
                    } catch (err) {
                      console.error('Failed to copy:', err);
                      alert('Failed to copy to clipboard');
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>
            )}
            {Array.isArray(displayContent) ? (
              <ul className="space-y-2">
                {displayContent.map((item: any, idx: number) => {
                  // Handle backlog items with priority
                  if (typeof item === 'object' && item.priority) {
                    const priorityColor = getPriorityColor(item.priority);
                    return (
                      <li key={idx} className="text-gray-700">
                        <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${priorityColor}`}>
                          [{item.priority}]
                        </span>
                        <MarkdownRenderer content={item.content} />
                      </li>
                    );
                  }
                  // Handle recommendations with priority tags
                  if (typeof item === 'string') {
                    const { priority, content: itemContent } = extractPriority(item);
                    if (priority) {
                      const priorityColor = getPriorityColor(priority);
                      return (
                        <li key={idx} className="text-gray-700">
                          <span className={`px-2 py-1 rounded text-xs font-semibold mr-2 ${priorityColor}`}>
                            [{priority}]
                          </span>
                          <MarkdownRenderer content={itemContent} />
                        </li>
                      );
                    }
                    return (
                      <li key={idx} className="text-gray-700">
                        <MarkdownRenderer content={item} />
                      </li>
                    );
                  }
                  return (
                    <li key={idx} className="text-gray-700">
                      • {JSON.stringify(item)}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-gray-700">
                <MarkdownRenderer content={displayContent} />
              </div>
            )}
          </div>
        )}
      </div>
    );
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
              <a href="/admin" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                🚀 Startup Builder
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a href="/admin/startup-builder/history" className="text-gray-600 hover:text-gray-900">
                View History
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Startup Builder</h1>
          <p className="text-gray-600 max-w-2xl">
            Analyze a business idea and generate a comprehensive 13-section analysis. Enter your business idea below and get strategic insights, features, pricing, and market viability analysis.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name (Optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., TaskMaster Pro"
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Idea *
              </label>
              <textarea
                required
                rows={12}
                value={businessIdea}
                onChange={(e) => setBusinessIdea(e.target.value)}
                placeholder="Describe your business idea in detail. Include what the business does, who it serves, how it works, and any key features or value propositions..."
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#88D18A] focus:border-transparent"
              />
            </div>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !businessIdea.trim()}
              className="w-full bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
            </button>
          </div>
        </div>

        {status && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">{status}</p>
          </div>
        )}

        {showRollups && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analysis Results</h2>
            
            <RollupSection
              sectionKey="likes"
              title="1. What Customers Would Value"
              icon="👍"
              content={rollupContent.likes}
              status={rollupStatuses.likes}
            />
            <RollupSection
              sectionKey="dislikes"
              title="2. Potential Customer Concerns & Requests"
              icon="💭"
              content={rollupContent.dislikes}
              status={rollupStatuses.dislikes}
            />
            <RollupSection
              sectionKey="keywords"
              title="3. Suggested Keywords"
              icon="🔍"
              content={rollupContent.keywords}
              status={rollupStatuses.keywords}
            />
            <RollupSection
              sectionKey="definitely"
              title="4. Core Features to Include"
              icon="🎯"
              content={rollupContent.definitely}
              status={rollupStatuses.definitely}
            />
            <RollupSection
              sectionKey="backlog"
              title="5. Additional Features to Include"
              icon="✨"
              content={rollupContent.backlog}
              status={rollupStatuses.backlog}
            />
            <RollupSection
              sectionKey="recommendations"
              title="6. Strategic Recommendations"
              icon="⭐"
              content={rollupContent.recommendations}
              status={rollupStatuses.recommendations}
            />
            <RollupSection
              sectionKey="description"
              title="7. Suggested Product Description"
              icon="📝"
              content={rollupContent.description}
              status={rollupStatuses.description}
            />
            <RollupSection
              sectionKey="names"
              title="8. Suggested Business Names"
              icon="💡"
              content={rollupContent.names}
              status={rollupStatuses.names}
            />
            <RollupSection
              sectionKey="prp"
              title="9. PRP (Product Requirements Prompt)"
              icon="📋"
              content={rollupContent.prp}
              status={rollupStatuses.prp}
            />
            <RollupSection
              sectionKey="competitors"
              title="10. Competitors"
              icon="📱"
              content={rollupContent.competitors}
              status={rollupStatuses.competitors}
            />
            <RollupSection
              sectionKey="pricing"
              title="11. Pricing Strategy & Revenue Projections"
              icon="💰"
              content={rollupContent.pricing}
              status={rollupStatuses.pricing}
            />
            <RollupSection
              sectionKey="viability"
              title="12. Market Viability & Business Opportunity"
              icon="📊"
              content={rollupContent.viability}
              status={rollupStatuses.viability}
            />
          </div>
        )}

        {costTracking.totalCost > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Total API Cost: ${costTracking.totalCost.toFixed(6)} | 
              Calls: {costTracking.totalCalls} | 
              Input Tokens: {costTracking.totalInputTokens.toLocaleString()} | 
              Output Tokens: {costTracking.totalOutputTokens.toLocaleString()}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
