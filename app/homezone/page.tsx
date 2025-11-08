'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

export default function HomeZone() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usageData, setUsageData] = useState<any>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [popularApps, setPopularApps] = useState<any[]>([
    { name: 'Instagram', id: '389801252', icon: '' },
    { name: 'Uber', id: '368677368', icon: '' },
    { name: 'Spotify', id: '324684580', icon: '' },
    { name: 'TikTok', id: '835599320', icon: '' }
  ]);
  
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);
        
        // Check admin status
        const adminResponse = await fetch('/api/check-admin');
        const adminData = await adminResponse.json();
        setIsAdmin(adminData.isAdmin || false);
        
        // Check if trial has expired and needs conversion
        await fetch('/api/check-trial-expiry', { method: 'POST' });
        
        // Fetch usage data
        const usageResponse = await fetch('/api/subscription/usage');
        const usage = await usageResponse.json();
        setUsageData(usage);
        
        // Fetch recent analyses
        const { data: analyses } = await supabase
          .from('user_analyses')
          .select('id, app_name, app_icon_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        setRecentAnalyses(analyses || []);
        
        // Fetch affiliate data
        const { data: affiliateInfo } = await supabase
          .from('user_affiliates')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (affiliateInfo) {
          // Fetch commission stats
          const { data: commissions } = await supabase
            .from('affiliate_commissions')
            .select('*')
            .eq('affiliate_user_id', user.id);
          
          const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;
          const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;
          const paid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount), 0) || 0;
          
          setAffiliateData({
            ...affiliateInfo,
            pendingAmount: pending,
            approvedAmount: approved,
            paidAmount: paid,
            recentCommissions: commissions?.slice(0, 5) || []
          });
        }
        
        // Fetch popular app icons from iTunes API
        fetchPopularAppIcons();
      }
      
      setLoading(false);
    };

    init();
  }, []);

  const fetchPopularAppIcons = async () => {
    try {
      // Fetch top free apps from iTunes
      const response = await fetch('https://itunes.apple.com/us/rss/topfreeapplications/limit=100/json');
      const data = await response.json();
      
      if (data?.feed?.entry && data.feed.entry.length > 0) {
        // Extract app info from RSS feed
        const allApps = data.feed.entry.map((entry: any) => ({
          name: entry['im:name']?.label || 'Unknown',
          id: entry.id.attributes['im:id'],
          icon: entry['im:image']?.[2]?.label || entry['im:image']?.[1]?.label || entry['im:image']?.[0]?.label || ''
        }));
        
        // Randomly select 4 apps
        const shuffled = allApps.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);
        
        console.log('Selected popular apps:', selected.map((a: any) => a.name));
        setPopularApps(selected);
      } else {
        // Fallback to hardcoded apps if API fails
        console.warn('Failed to fetch top apps, using fallback');
        setPopularApps([
          { name: 'Instagram', id: '389801252', icon: '' },
          { name: 'Uber', id: '368677368', icon: '' },
          { name: 'Spotify', id: '324684580', icon: '' },
          { name: 'TikTok', id: '835599320', icon: '' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching popular apps:', error);
      // Fallback to hardcoded apps if fetch fails
      setPopularApps([
        { name: 'Instagram', id: '389801252', icon: '' },
        { name: 'Uber', id: '368677368', icon: '' },
        { name: 'Spotify', id: '324684580', icon: '' },
        { name: 'TikTok', id: '835599320', icon: '' }
      ]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getDisplayName = () => {
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
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

  const handleQuickStart = (appId: string) => {
    router.push(`/appengine?app=${encodeURIComponent(appId)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const isFirstTime = recentAnalyses.length === 0;
  const isUnlimited = usageData?.status === 'free_unlimited';
  const searchesUsed = usageData?.searchesUsed || 0;
  const searchesLimit = usageData?.searchesLimit || 10;
  const searchesRemaining = usageData?.searchesRemaining || 0;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (searchesUsed / searchesLimit) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-[#3D405B]">App Ideas Finder</h1>
            </div>

            {/* Main Navigation */}
            <nav className="flex items-center gap-6">
              <a href="/homezone" className="text-[#3D405B] font-semibold">
                Dashboard
              </a>
              <a href="/appengine" className="text-gray-600 hover:text-[#3D405B] transition-colors">
                App Engine
              </a>
              <a href="/billing" className="text-gray-600 hover:text-[#3D405B] transition-colors">
                Billing
              </a>
            </nav>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-[#88D18A] text-white text-sm font-semibold">
                    {getInitials()}
                  </div>
                  {user?.email ? (
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
                <span className="hidden sm:block text-gray-900">{getDisplayName()}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl border border-gray-200 z-50" style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                  <div className="p-4 border-b border-gray-200" style={{ backgroundColor: '#ffffff' }}>
                    <p className="font-semibold text-gray-900">{getDisplayName()}</p>
                    <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2" style={{ backgroundColor: '#ffffff' }}>
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            {isFirstTime ? `Welcome, ${getDisplayName()}! 🎉` : `Welcome Back, ${getDisplayName()}! 👋`}
          </h2>
          <p className="text-gray-600 text-lg">
            {isFirstTime 
              ? "Let's find your next app idea. Analyze your first app below!" 
              : "Ready to discover more app opportunities?"}
          </p>
        </div>

        {/* Usage Card */}
        {!isUnlimited && (
          <div className="bg-white rounded-2xl p-6 mb-8 border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  🔍 Searches This Month
                </h3>
                <p className="text-sm text-gray-600">
                  {usageData?.planName || 'Trial'} Plan
                  {usageData?.status === 'trial' && usageData?.trialTimeRemaining && (
                    <span className="ml-2 text-[#88D18A] font-semibold">
                      • {usageData.trialTimeRemaining.days}d {usageData.trialTimeRemaining.hours}h {usageData.trialTimeRemaining.minutes}m left
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">
                  {searchesUsed} <span className="text-gray-400">/</span> {searchesLimit}
                </div>
                <div className="text-sm text-gray-600">searches used</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all ${
                  usagePercent >= 90 ? 'bg-red-500' : 
                  usagePercent >= 70 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {/* Action based on usage */}
            {searchesRemaining === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium mb-2">⚠️ You've used all your searches this month</p>
                <button className="bg-[#88D18A] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#88D18A]/90">
                  Upgrade Plan or Buy Search Pack
                </button>
              </div>
            ) : searchesRemaining <= 2 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">💡 Only {searchesRemaining} searches remaining this month</p>
              </div>
            ) : null}
          </div>
        )}

        {isUnlimited && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">🎁 Unlimited Access</h3>
                <p className="text-white/90">You have unlimited searches - enjoy!</p>
              </div>
              <div className="text-5xl">∞</div>
            </div>
          </div>
        )}

        {/* Affiliate Dashboard */}
        {affiliateData && (
          <div className="bg-gradient-to-br from-[#88D18A]/10 to-[#6BC070]/10 rounded-2xl p-6 sm:p-8 mb-8 border-2 border-[#88D18A]/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">💰 Affiliate Program</h3>
                <p className="text-gray-600">Earn 25% commission on every referral</p>
              </div>
              <Link 
                href="/affiliate" 
                className="text-sm text-[#88D18A] hover:underline font-semibold"
              >
                Full Details →
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Referrals</div>
                <div className="text-2xl font-bold text-gray-900">{affiliateData.total_referrals || 0}</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Paying Referrals</div>
                <div className="text-2xl font-bold text-gray-900">{affiliateData.paying_referrals || 0}</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Pending Commission</div>
                <div className="text-2xl font-bold text-yellow-600">
                  ${(affiliateData.pendingAmount || 0).toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Total Earned</div>
                <div className="text-2xl font-bold text-[#88D18A]">
                  ${((affiliateData.total_commission_earned || 0) + (affiliateData.paidAmount || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Affiliate Link */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900">Your Affiliate Link</label>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}?ref=${affiliateData.affiliate_code}`;
                    navigator.clipboard.writeText(link);
                    alert('Copied to clipboard!');
                  }}
                  className="text-sm bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Copy Link
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-700 break-all border border-gray-200">
                {typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliateData.affiliate_code}` : `...?ref=${affiliateData.affiliate_code}`}
              </div>
            </div>

            {/* Affiliate Code */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-900">Your Affiliate Code</label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(affiliateData.affiliate_code);
                    alert('Copied to clipboard!');
                  }}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold"
                >
                  Copy Code
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 font-mono text-xl font-bold text-gray-900 text-center border border-gray-200">
                {affiliateData.affiliate_code}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Users can enter this code during signup
              </p>
            </div>

            {/* Commission Breakdown */}
            {affiliateData.recentCommissions && affiliateData.recentCommissions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Commissions</h4>
                <div className="space-y-2">
                  {affiliateData.recentCommissions.map((commission: any) => (
                    <div key={commission.id} className="bg-white rounded-lg p-3 border border-gray-200 flex justify-between items-center text-sm">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {commission.status}
                        </span>
                        <span className="ml-2 text-gray-600">{commission.transaction_type}</span>
                      </div>
                      <div className="font-bold text-[#88D18A]">
                        ${parseFloat(commission.commission_amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>How it works:</strong> Share your link or code with other developers. When they subscribe, 
                you earn 25% commission paid within 7 days after their first month (if they stay active).
              </p>
            </div>
          </div>
        )}

        {/* Quick Start (First Time Users) */}
        {isFirstTime && (
          <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">🚀 Analyze Your First App</h3>
              </div>
              <button
                onClick={fetchPopularAppIcons}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh apps"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Try analyzing one of these popular apps to see what App Ideas Finder can do:
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {popularApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleQuickStart(app.id)}
                  disabled={!usageData?.canSearch}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 hover:border-[#88D18A] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {app.icon ? (
                    <img 
                      src={app.icon} 
                      alt={app.name} 
                      className="w-16 h-16 rounded-2xl mb-2"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-16 h-16 rounded-2xl mb-2 bg-gray-200 flex items-center justify-center text-2xl"
                    style={{ display: app.icon ? 'none' : 'flex' }}
                  >
                    📱
                  </div>
                  <span className="text-sm font-medium text-gray-900">{app.name}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-3">Or search for any app:</p>
              <button
                onClick={() => router.push('/appengine')}
                disabled={!usageData?.canSearch}
                className="w-full bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                Go to App Ideas Engine →
              </button>
            </div>

            {/* What You'll Discover */}
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4">💡 What You'll Discover</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>What users love (keep these features)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>What they hate (avoid these mistakes)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Missing features (your opportunity)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>App names, pricing strategy & more</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Analyses (Returning Users) */}
        {!isFirstTime && (
          <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">📊 Your Recent Analyses</h3>
              <button
                onClick={() => router.push('/appengine')}
                disabled={!usageData?.canSearch}
                className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Analyze Another App
              </button>
            </div>

            {recentAnalyses.length > 0 ? (
              <div className="space-y-4">
                {recentAnalyses.map((analysis) => (
                  <div 
                    key={analysis.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-[#88D18A] hover:shadow-md transition-all group"
                  >
                    {analysis.app_icon_url && (
                      <img 
                        src={analysis.app_icon_url} 
                        alt={analysis.app_name}
                        className="w-16 h-16 rounded-xl"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">{analysis.app_name}</h4>
                      <p className="text-sm text-gray-500">
                        Analyzed on {new Date(analysis.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/appengine?app=${analysis.app_id}`)}
                        className="bg-gray-100 group-hover:bg-[#88D18A] group-hover:text-white text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        View Results
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Get affiliate code
                            const { data: affiliateInfo } = await supabase
                              .from('user_affiliates')
                              .select('affiliate_code')
                              .eq('user_id', user?.id)
                              .single();
                            
                            const response = await fetch('/api/generate-pdf', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                appMeta: {
                                  trackName: analysis.app_name,
                                  artistName: analysis.app_developer,
                                  averageUserRating: 0,
                                  userRatingCount: 0
                                },
                                rollupContent: {
                                  likes: analysis.likes || [],
                                  dislikes: analysis.dislikes || [],
                                  recommendations: analysis.recommendations || [],
                                  keywords: analysis.keywords || [],
                                  definitely: analysis.definitely_include || [],
                                  backlog: analysis.backlog || [],
                                  description: analysis.description ? [analysis.description] : [],
                                  names: analysis.app_names || [],
                                  prp: analysis.prp ? [analysis.prp] : [],
                                  similar: analysis.similar_apps || [],
                                  pricing: analysis.pricing_model ? [analysis.pricing_model] : []
                                },
                                analysisMetrics: {
                                  reviewCount: analysis.review_count || 0,
                                  analysisTimeSeconds: analysis.analysis_time_seconds || 0
                                },
                                affiliateCode: affiliateInfo?.affiliate_code || 'SIGNUP',
                                userEmail: user?.email
                              })
                            });
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${analysis.app_name}-analysis.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } else {
                              alert('Failed to generate PDF');
                            }
                          } catch (error) {
                            console.error('PDF error:', error);
                            alert('Error generating PDF');
                          }
                        }}
                        className="flex items-center gap-1 bg-white border-2 border-gray-200 hover:border-[#88D18A] text-gray-700 hover:text-[#88D18A] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">🔍</div>
                <p>No analyses yet. Start by analyzing an app above!</p>
              </div>
            )}
          </div>
        )}

        {/* Suggested Next Steps (Returning Users) */}
        {!isFirstTime && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔥 Suggested Next Steps</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">•</span>
                <span>Analyze a competitor in your space</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">•</span>
                <span>Compare multiple apps to find patterns</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-2xl">•</span>
                <span>Explore trending apps for inspiration</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

