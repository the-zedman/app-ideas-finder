'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function FeedbackWidget() {
  const supabase = createClient();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      
      if (data.user) {
        // Check if user has subscription or bonus access
        try {
          const response = await fetch('/api/subscription/usage');
          if (response.ok) {
            const usage = await response.json();
            // User has access if they have a subscription OR can search (waitlist/VIP bonus)
            setHasAccess(usage.hasSubscription || usage.canSearch);
          }
        } catch (error) {
          console.error('Error checking access:', error);
        }
      }
      
      setLoading(false);
    };
    
    checkAccess();
  }, [supabase]);

  // List of public pages that don't require authentication
  const publicPages = ['/', '/login', '/signup', '/pricing', '/contact', '/about', '/privacy', '/terms'];
  const isSharedAnalysisPage = pathname?.startsWith('/a/');
  
  // Hide feedback button on public pages, if user is not authenticated, or if they don't have access
  if (loading || !user || !hasAccess || publicPages.includes(pathname) || isSharedAnalysisPage) {
    return null;
  }

  const handleClick = () => {
    if (typeof window === 'undefined') return;
    window.location.href = '/feedback';
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
    >
      <span>💡 Feedback & Ideas</span>
      <span className="text-xs font-normal opacity-80">+1 search</span>
    </button>
  );
}

