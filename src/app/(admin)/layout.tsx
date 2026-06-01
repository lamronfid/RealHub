import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import TopBar from '@/components/TopBar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify if user is admin
  let { data: profile } = await supabase
    .from('agent_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
  const isAdminEmail = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

  if (profile && isAdminEmail && profile.role !== 'admin') {
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

  const isAdminOrOwner = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';

  if (!profile || !isAdminOrOwner) {
    redirect('/');
  }

  const agentName = profile?.full_name || 'Admin';
  const agentAvatar = profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar agentName={agentName} agentAvatar={agentAvatar} role="admin" />

      <div className="md:ml-[260px] transition-all duration-300 flex flex-col min-h-screen">
        <TopBar agentName={agentName} agentAvatar={agentAvatar} />

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
