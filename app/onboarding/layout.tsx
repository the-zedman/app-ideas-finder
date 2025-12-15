import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Get started with App Ideas Finder. Discover your next app idea in seconds.',
  alternates: {
    canonical: '/onboarding',
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

