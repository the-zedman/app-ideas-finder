'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      console.log('✅ Google Analytics loaded with ID:', GA_MEASUREMENT_ID);
    } else {
      console.warn('⚠️ Google Analytics Measurement ID not found. Add NEXT_PUBLIC_GA_MEASUREMENT_ID to environment variables.');
    }
  }, [GA_MEASUREMENT_ID]);

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => {
          setScriptLoaded(true);
          console.log('✅ Google Analytics script loaded');
        }}
        onError={() => {
          console.warn('⚠️ Google Analytics script blocked or failed to load (may be blocked by ad blocker)');
        }}
      />
      {scriptLoaded && (
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
            `,
          }}
        />
      )}
    </>
  );
}

