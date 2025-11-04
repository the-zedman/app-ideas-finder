'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      console.log('✅ Google Analytics loaded with ID:', GA_MEASUREMENT_ID);
    } else {
      console.warn('⚠️ Google Analytics Measurement ID not found. Add NEXT_PUBLIC_GA_MEASUREMENT_ID to environment variables.');
    }
  }, [GA_MEASUREMENT_ID]);

  if (!GA_MEASUREMENT_ID) {
    console.warn('⚠️ GA_MEASUREMENT_ID is missing');
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => console.log('✅ Google Analytics script loaded')}
        onError={() => console.error('❌ Failed to load Google Analytics script')}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
            console.log('✅ Google Analytics configured for:', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}

