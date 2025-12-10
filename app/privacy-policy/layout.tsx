import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'App Ideas Finder privacy policy. Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: '/privacy-policy',
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

