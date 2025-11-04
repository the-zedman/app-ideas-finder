import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.appideasfinder.com'),
  title: {
    default: 'App Ideas Finder - AI-Powered App Analysis & Competitive Intelligence',
    template: '%s | App Ideas Finder'
  },
  description: 'Discover your competitive edge. Analyze any iOS app, uncover what users want, and find what competitors miss. AI-powered insights from hundreds of reviews in seconds.',
  keywords: [
    'app ideas',
    'app analysis',
    'competitive intelligence',
    'app development',
    'iOS app analysis',
    'app store research',
    'competitor analysis',
    'user feedback analysis',
    'app market research',
    'mobile app ideas',
    'app feature ideas',
    'product development',
    'startup ideas',
    'app reviews analysis'
  ],
  authors: [{ name: 'App Ideas Finder' }],
  creator: 'App Ideas Finder',
  publisher: 'App Ideas Finder',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.appideasfinder.com',
    siteName: 'App Ideas Finder',
    title: 'App Ideas Finder - AI-Powered App Analysis & Competitive Intelligence',
    description: 'Discover your competitive edge. Analyze any iOS app, uncover what users want, and find what competitors miss. AI-powered insights from hundreds of reviews in seconds.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'App Ideas Finder - Find Your 1% Edge',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@appideasfinder',
    creator: '@appideasfinder',
    title: 'App Ideas Finder - AI-Powered App Analysis & Competitive Intelligence',
    description: 'Discover your competitive edge. Analyze any iOS app, uncover what users want, and find what competitors miss.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE', // Add when you get it from Google Search Console
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://www.appideasfinder.com" />
      </head>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
