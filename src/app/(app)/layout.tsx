import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import TopBar from '@/components/TopBar';
import OnboardingWrapper from '@/components/OnboardingWrapper';
import FeedbackButton from '@/components/FeedbackButton';
import { getSubscriptionState } from '@/lib/subscription';
import RealtimeNotificationToast from '@/components/RealtimeNotificationToast';

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

  const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
  const isAdminEmail = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

  // Auto-create profile on first login
  if (!profile) {
    const { data: newProfile } = await supabase
      .from('agent_profiles')
      .insert({
        id: user.id,
        full_name: user.email?.split('@')[0] || 'Agente',
        role: isAdminEmail ? 'admin' : 'agent',
      })
      .select()
      .single();
    profile = newProfile;
  } else if (isAdminEmail && profile.role !== 'admin') {
    // Auto-upgrade existing profile to admin
    const { data: updatedProfile } = await supabase
      .from('agent_profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select()
      .single();
    if (updatedProfile) {
      profile = updatedProfile;
    }
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
      <RealtimeNotificationToast />

      <Sidebar agentName={agentName} agentAvatar={agentAvatar} isVerified={isVerified} role={profile?.role} />

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
