'use client';

import dynamic from 'next/dynamic';

// Lazy load to keep initial bundle small
const OnboardingFlow = dynamic(() => import('@/components/OnboardingFlow'), { ssr: false });

export default function OnboardingWrapper() {
  return <OnboardingFlow />;
}
