import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function PropertyMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify ownership and get property details
  const { data: property } = await supabase
    .from('properties')
    .select('id, title, visibility')
    .eq('id', id)
    .eq('agent_id', user.id)
    .single();

  if (!property) {
    return <div className="p-8 text-center text-slate-500">Propiedad no encontrada o no tienes permiso.</div>;
  }

  // Fetch matches using our custom SQL function
  const { data: matches } = await supabase.rpc('match_prospects_for_property', {
    p_property_id: id
  });

  // Fetch agent profiles for WhatsApp links
  const agentIds = [...new Set((matches || []).map((m: any) => m.agent_name))];
  let agentProfiles: Record<string, any> = {};
  if (matches && matches.length > 0) {
    // We need the agent_id from the prospect to get their profile
    // Since the RPC only returns agent_name, we'll fetch all marketplace prospect agents
    const prospectIds = matches.map((m: any) => m.prospect_id);
    const { data: prospects } = await supabase
      .from('prospects')
      .select('id, agent_id')
      .in('id', prospectIds);
    
    if (prospects && prospects.length > 0) {
      const uniqueAgentIds = [...new Set(prospects.map(p => p.agent_id))];
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('id, full_name, phone, avatar_url')
        .in('id', uniqueAgentIds);
      
      if (profiles) {
        // Map prospect_id -> agent profile
        prospects.forEach(p => {
          const profile = profiles.find(prof => prof.id === p.agent_id);
          if (profile) agentProfiles[p.id] = profile;
        });
      }
    }
  }

  const potenciales = matches?.filter((m: any) => m.match_score >= 60) || [];
  const otras = matches?.filter((m: any) => m.match_score >= 50 && m.match_score < 60) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/propiedades" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 mb-2 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
          </Link>
          <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 line-clamp-1">
            Matches para: {property.title}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Prospectos interesados encontrados en la plataforma</p>
        </div>
        <div className="flex items-center gap-4 text-center">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <p className="text-xl font-bold text-emerald-600">{potenciales.length}</p>
            <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Potenciales</p>
          </div>
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
            <p className="text-xl font-bold text-amber-600">{otras.length}</p>
            <p className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest">Otras Opciones</p>
          </div>
        </div>
      </div>

      {property.visibility !== 'marketplace' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex gap-3 text-sm">
          <span className="material-symbols-outlined shrink-0">warning</span>
          <p>Esta propiedad no está visible en el Marketplace. Cambia su visibilidad a Marketplace para que otros agentes puedan verla y generar matches automáticamente.</p>
        </div>
      )}

      {(!matches || matches.length === 0) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">search_off</span>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No hay coincidencias</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Actualmente no hay prospectos que busquen algo con estas características.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {potenciales.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Prospectos Potenciales (Match &gt;= 60)
              </h3>
              <div className="grid gap-4">
                {potenciales.map((match: any) => (
                  <MatchCard key={match.prospect_id} match={match} agentProfile={agentProfiles[match.prospect_id]} />
                ))}
              </div>
            </section>
          )}

          {otras.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Otras Coincidencias (Match 50-59)
              </h3>
              <div className="grid gap-4">
                {otras.map((match: any) => (
                  <MatchCard key={match.prospect_id} match={match} agentProfile={agentProfiles[match.prospect_id]} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Mini-component for rendering a match row — fully server-rendered, no onClick
function MatchCard({ match, agentProfile }: { match: any, agentProfile?: any }) {
  const isHighMatch = match.match_score >= 60;
  const whatsappLink = agentProfile?.phone
    ? `https://wa.me/${agentProfile.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi en RealHub que tu prospecto "${match.prospect_name}" podría estar interesado en mi propiedad. ¿Podemos coordinar?`)}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col sm:flex-row items-center gap-6 hover:shadow-lg transition-all">
      {/* Score Badge */}
      <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 border-slate-50"
           style={{ borderColor: isHighMatch ? '#d1fae5' : '#fef3c7' }}>
        <span className={`text-lg font-bold ${isHighMatch ? 'text-emerald-600' : 'text-amber-600'}`}>
          {match.match_score}
        </span>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <h4 className="font-bold text-slate-900 text-lg mb-1">{match.prospect_name}</h4>
        <p className="text-sm text-slate-500">Agente: <span className="font-medium text-slate-700">{match.agent_name}</span></p>
      </div>

      <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
        {whatsappLink ? (
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Contactar Agente
          </a>
        ) : (
          <span className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-400 px-4 py-2.5 rounded-xl font-medium text-sm cursor-not-allowed">
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Sin teléfono
          </span>
        )}
      </div>
    </div>
  );
}
