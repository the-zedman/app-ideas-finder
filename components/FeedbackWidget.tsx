'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function FeedbackWidget() {
  const supabase = createClient();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, [supabase]);

  // List of public pages that don't require authentication
  const publicPages = ['/', '/login', '/signup', '/pricing', '/contact', '/about', '/privacy', '/terms'];
  const isSharedAnalysisPage = pathname?.startsWith('/a/');
  
  // Hide feedback button on public pages or if user is not authenticated
  if (loading || !user || publicPages.includes(pathname) || isSharedAnalysisPage) {
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

