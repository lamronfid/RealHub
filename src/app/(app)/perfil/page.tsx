import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('id, full_name, phone, whatsapp, avatar_url, agency_name, bio')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">Mi Perfil</h2>
        <p className="text-slate-500 text-sm mt-1">Tu información de contacto visible para otros agentes en el Marketplace</p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
