'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function HomeZone() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('discover');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#3D405B]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Fixed at top, iOS style */}
      <header className="bg-white border-b border-grey/30 sticky top-0 z-50 backdrop-blur-lg bg-white/80">
        <div className="px-4 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Image
              src="/App Ideas Finder - logo - 200x200.png"
              alt="App Ideas Finder"
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg"
            />
            <h1 className="text-lg font-semibold text-[#3D405B]">
              HomeZone
            </h1>
          </div>
          
          {/* Profile Button - Minimum 44x44pt touch target */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-11 h-11 rounded-full bg-[#E07A5F] flex items-center justify-center text-white font-semibold active:scale-95 transition-transform overflow-hidden"
              aria-label="Profile"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-grey/30 z-50 overflow-hidden">
                  <div className="p-4 border-b border-grey/30">
                    <p className="font-semibold text-[#3D405B]">{getDisplayName()}</p>
                    <p className="text-sm text-[#3D405B]/60 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            router.push('/profile');
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-black/5 text-[#3D405B] transition-colors"
                        >
                          Profile Settings
                        </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Welcome Card */}
          <div className="bg-gradient-to-br from-[#E07A5F] to-[#E07A5F]/80 rounded-2xl p-6 mb-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Welcome Back, {getDisplayName()}!</h2>
            <p className="text-white/90 text-base leading-relaxed">
              Ready to discover your next big app idea? Let's get started.
            </p>
          </div>

          {/* Quick Stats - iOS Style Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-grey/30">
              <div className="text-3xl font-bold text-[#E07A5F] mb-1">0</div>
              <div className="text-sm text-[#3D405B]/70">Ideas Saved</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-grey/30">
              <div className="text-3xl font-bold text-[#E07A5F] mb-1">0</div>
              <div className="text-sm text-[#3D405B]/70">Searches</div>
            </div>
          </div>

          {/* Main Content Cards */}
          <div className="space-y-4">
            {/* Discover Card */}
            <div className="bg-white rounded-2xl border border-grey/30 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#E07A5F]/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#3D405B]">Discover Ideas</h3>
                    <p className="text-sm text-[#3D405B]/60">Find your next project</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/90 active:scale-98 text-white font-semibold rounded-xl transition-all">
                  Start Discovering
                </button>
              </div>
            </div>

            {/* Trending Card */}
            <div className="bg-white rounded-2xl border border-grey/30 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#3D405B]/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#3D405B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#3D405B]">Trending Now</h3>
                    <p className="text-sm text-[#3D405B]/60">See what's popular</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="py-2 px-3 bg-black/5 rounded-lg">
                    <p className="text-sm text-[#3D405B]">AI-powered productivity tools</p>
                  </div>
                  <div className="py-2 px-3 bg-black/5 rounded-lg">
                    <p className="text-sm text-[#3D405B]">Health & wellness apps</p>
                  </div>
                  <div className="py-2 px-3 bg-black/5 rounded-lg">
                    <p className="text-sm text-[#3D405B]">Social collaboration platforms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white rounded-2xl border border-grey/30 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#E07A5F]/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#3D405B]">Recent Activity</h3>
                    <p className="text-sm text-[#3D405B]/60">Your latest actions</p>
                  </div>
                </div>
                <div className="text-center py-8">
                  <p className="text-sm text-[#3D405B]/50">No recent activity yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Tab Bar - iOS style, fixed at bottom */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey/30 backdrop-blur-lg bg-white/80 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-around py-2">
            {/* Discover Tab - Minimum 44x44pt touch target */}
            <button
              onClick={() => setSelectedTab('discover')}
              className={`flex flex-col items-center justify-center w-20 h-12 transition-colors ${
                selectedTab === 'discover' ? 'text-[#E07A5F]' : 'text-[#3D405B]/50'
              }`}
              aria-label="Discover"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs font-medium">Discover</span>
            </button>

            {/* Saved Tab */}
            <button
              onClick={() => setSelectedTab('saved')}
              className={`flex flex-col items-center justify-center w-20 h-12 transition-colors ${
                selectedTab === 'saved' ? 'text-[#E07A5F]' : 'text-[#3D405B]/50'
              }`}
              aria-label="Saved"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="text-xs font-medium">Saved</span>
            </button>

            {/* Trending Tab */}
            <button
              onClick={() => setSelectedTab('trending')}
              className={`flex flex-col items-center justify-center w-20 h-12 transition-colors ${
                selectedTab === 'trending' ? 'text-[#E07A5F]' : 'text-[#3D405B]/50'
              }`}
              aria-label="Trending"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xs font-medium">Trending</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setSelectedTab('profile')}
              className={`flex flex-col items-center justify-center w-20 h-12 transition-colors ${
                selectedTab === 'profile' ? 'text-[#E07A5F]' : 'text-[#3D405B]/50'
              }`}
              aria-label="Profile"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

