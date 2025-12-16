'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type GalleryItem = {
  id: string;
  app_name: string;
  app_url: string;
  app_icon_url: string | null;
  screenshot_url: string | null;
  description: string;
  is_featured: boolean;
  display_order: number;
  created_at: string;
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/gallery');
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching gallery items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
              />
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/login" className="text-gray-900 hover:text-gray-700 text-sm sm:text-base transition-colors">Sign in</Link>
              <Link href="/onboarding" className="bg-[#88D18A] hover:bg-[#6bc070] text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-semibold text-sm sm:text-base transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            App Showcase
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-4">
            Discover amazing apps created by developers using App Ideas Finder. 
            Each app was built with insights from real user feedback and competitive analysis.
          </p>
          {/* Subtle Call-to-Action */}
          <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
            Want to feature your app here with a DOFOLLOW backlink?
          </p>
          <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">
            <Link href="/onboarding" className="text-[#88D18A] hover:text-[#6bc070] font-semibold underline">
              Join App Ideas Finder
            </Link>
            {' '}to get started.
          </p>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-600 text-lg">Loading gallery...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg">No apps in the gallery yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col"
              >
                {/* Screenshot */}
                <div className="relative w-full bg-gray-100 overflow-hidden">
                  {item.screenshot_url ? (
                    <img
                      src={item.screenshot_url}
                      alt={`${item.app_name} screenshot`}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"><div class="text-gray-400 text-4xl">📱</div></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <div className="text-gray-400 text-4xl">📱</div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* App Icon and Name */}
                  <div className="flex items-start gap-4 mb-4">
                    {item.app_icon_url ? (
                      <img
                        src={item.app_icon_url}
                        alt={item.app_name}
                        className="w-16 h-16 rounded-xl border border-gray-200 flex-shrink-0"
                        onError={(e) => {
                          // Fallback if icon fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><span class="text-2xl">📱</span></div>';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">📱</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {item.app_name}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base text-gray-600 mb-6 flex-1 whitespace-pre-wrap">
                    {item.description}
                  </p>

                  {/* Link Button */}
                  <a
                    href={item.app_url}
                    target="_blank"
                    rel="dofollow noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#88D18A] hover:bg-[#6bc070] text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full"
                  >
                    Visit App
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

