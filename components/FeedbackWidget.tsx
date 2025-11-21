'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

export default function FeedbackWidget() {
  const supabase = createClient();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Hide feedback button on landing page
  if (pathname === '/') {
    return null;
  }

  const handleClick = () => {
    if (typeof window === 'undefined') return;

    const feedbackUrl = '/feedback';

    if (!user) {
      window.location.href = `/login?redirectTo=${encodeURIComponent(feedbackUrl)}`;
      return;
    }

    window.location.href = feedbackUrl;
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
    >
      <span>💡 Feedback & Ideas</span>
      {user ? <span className="text-xs font-normal opacity-80">+1 search</span> : null}
    </button>
  );
}

