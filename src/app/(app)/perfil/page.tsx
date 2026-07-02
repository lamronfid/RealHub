import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';
import OwnReviews from './OwnReviews';
import VerifiedBadge from '@/components/VerifiedBadge';
import Link from 'next/link';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let { data: profile } = await supabase
    .from('agent_profiles')
    .select('id, full_name, phone, whatsapp, avatar_url, agency_name, agency_office, bio, subscription_tier, is_verified, license_number, specialties, coverage_areas, experience_years, role, account_type, most_sold_types, has_developments, developments_details')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
    const isAdminEmail = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

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
      .select('id, full_name, phone, whatsapp, avatar_url, agency_name, agency_office, bio, subscription_tier, is_verified, license_number, specialties, coverage_areas, experience_years, role, account_type, most_sold_types, has_developments, developments_details')
      .single();
      
    profile = newProfile;
  }

  if (!profile) {
    redirect('/');
  }
  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900 flex items-center gap-1.5">
            Mi Perfil
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Tu información de contacto visible para otros agentes en el Marketplace.
            {profile.role !== 'owner' && (
              <>
                {' '}Clic en tu nombre{' '}
                <Link 
                  href={`/perfil/${profile.id}`} 
                  className="text-indigo-600 hover:text-indigo-700 font-bold underline transition-colors"
                >
                  {profile.full_name}
                </Link>{' '}
                para ver tu perfil público.
              </>
            )}
          </p>
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
