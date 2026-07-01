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
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Agente',
        role: isAdminEmail ? 'admin' : 'agent',
        account_type: user.user_metadata?.account_type || 'agent',
        agency_name: user.user_metadata?.account_type === 'agency' ? user.user_metadata?.agency_name : null,
        subscription_tier: 'elite',
        is_verified: true,
      })
      .select()
      .single();
    profile = newProfile;
  } else {
    // Auto-upgrade existing profiles to Elite and Verified
    let needsUpdate = false;
    const updates: any = {};
    
    if (profile.subscription_tier !== 'elite') {
      updates.subscription_tier = 'elite';
      needsUpdate = true;
    }
    if (!profile.is_verified) {
      updates.is_verified = true;
      needsUpdate = true;
    }
    if (isAdminEmail && profile.role !== 'admin') {
      updates.role = 'admin';
      needsUpdate = true;
    }
    if (user.email && profile.email !== user.email) {
      updates.email = user.email;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const { data: updatedProfile } = await supabase
        .from('agent_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (updatedProfile) {
        profile = updatedProfile;
      }
    }
  }

  const agentName = profile?.full_name || user.email?.split('@')[0] || 'Agente';
  const agentAvatar = profile?.avatar_url || null;
  const needsOnboarding = profile && !profile.onboarding_completed;

  // Retrieve subscription state (with local storage override fallbacks)
  const { isVerified } = getSubscriptionState(profile);

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
        <OnboardingWrapper profile={profile} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <FeedbackButton />
      <RealtimeNotificationToast />

      <Sidebar 
        agentName={agentName} 
        agentAvatar={agentAvatar} 
        isVerified={isVerified} 
        role={profile?.role} 
        accountType={profile?.account_type}
      />

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
