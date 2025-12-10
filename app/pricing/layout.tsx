import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose your App Ideas Finder plan. Get AI-powered app analysis with flexible pricing options.',
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

