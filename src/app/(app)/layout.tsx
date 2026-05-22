import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import TopBar from '@/components/TopBar';
import OnboardingWrapper from '@/components/OnboardingWrapper';
import FeedbackButton from '@/components/FeedbackButton';
import { getSubscriptionState } from '@/lib/subscription';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get or create agent profile
  let { data: profile } = await supabase
    .from('agent_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Auto-create profile on first login
  if (!profile) {
    const { data: newProfile } = await supabase
      .from('agent_profiles')
      .insert({
        id: user.id,
        full_name: user.email?.split('@')[0] || 'Agente',
      })
      .select()
      .single();
    profile = newProfile;
  }

  const agentName = profile?.full_name || user.email?.split('@')[0] || 'Agente';
  const agentAvatar = profile?.avatar_url || null;
  const needsOnboarding = profile && !profile.onboarding_completed;

  // Retrieve subscription state (with local storage override fallbacks)
  const { isVerified } = getSubscriptionState(profile);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {needsOnboarding && <OnboardingWrapper />}
      <FeedbackButton />

      <Sidebar agentName={agentName} agentAvatar={agentAvatar} isVerified={isVerified} />

      <div className="md:ml-[260px] transition-all duration-300 flex flex-col min-h-screen">
        <TopBar agentName={agentName} agentAvatar={agentAvatar} isVerified={isVerified} />
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
