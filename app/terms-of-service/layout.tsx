import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'App Ideas Finder terms of service. Read our terms and conditions.',
  alternates: {
    canonical: '/terms-of-service',
  },
};

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

