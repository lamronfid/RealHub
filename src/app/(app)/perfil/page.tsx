import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';
import OwnReviews from './OwnReviews';
import VerifiedBadge from '@/components/VerifiedBadge';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('id, full_name, phone, whatsapp, avatar_url, agency_name, bio, subscription_tier, is_verified, license_number, specialties, coverage_areas, experience_years, role')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-1.5">
            Mi Perfil
          </h2>
          <p className="text-slate-500 text-sm mt-1">Tu información de contacto visible para otros agentes en el Marketplace</p>
        </div>
        
        {/* Verification status header */}
        <div className="flex items-center gap-2">
          {profile.subscription_tier === 'elite' || profile.is_verified ? (
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl">
              <span>Élite Verificado</span>
              <VerifiedBadge className="w-4 h-4 ml-0.5" />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5">
              <span>Miembro Gratuito</span>
            </div>
          )}
        </div>
      </div>

      <ProfileForm profile={profile} />

      <OwnReviews agentId={profile.id} profile={profile} />
    </div>
  );
}
