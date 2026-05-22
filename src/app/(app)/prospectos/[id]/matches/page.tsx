import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProspectMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify ownership and get prospect details
  const { data: prospect } = await supabase
    .from('prospects')
    .select('id, full_name, client_name')
    .eq('id', id)
    .eq('agent_id', user.id)
    .single();

  if (!prospect) {
    return <div className="p-8 text-center text-slate-500">Prospecto no encontrado o no tienes permiso.</div>;
  }

  // Fetch matches using our custom SQL function
  const { data: matches } = await supabase.rpc('match_properties_for_prospect', {
    p_prospect_id: id
  });

  const potenciales = matches?.filter((m: any) => m.match_score >= 60) || [];
  const otras = matches?.filter((m: any) => m.match_score >= 50 && m.match_score < 60) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/prospectos" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 mb-2 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            Matches para {prospect.client_name || prospect.full_name}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Propiedades compatibles encontradas en el Marketplace</p>
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

      {(!matches || matches.length === 0) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">search_off</span>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No hay coincidencias</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Actualmente no hay propiedades en el Marketplace que coincidan con las necesidades de este prospecto.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {potenciales.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Opciones Potenciales (Match &gt;= 60)
              </h3>
              <div className="grid gap-4">
                {potenciales.map((match: any) => (
                  <MatchCard key={match.property_id} match={match} type="property" />
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
                  <MatchCard key={match.property_id} match={match} type="property" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// Mini-component for rendering a match row
function MatchCard({ match, type }: { match: any, type: 'property' }) {
  const isHighMatch = match.match_score >= 60;
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
        <h4 className="font-bold text-slate-900 text-lg mb-1">{match.property_title}</h4>
        <p className="text-sm text-slate-500">Agente: <span className="font-medium text-slate-700">{match.agent_name}</span></p>
      </div>

      <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
        <Link href={`/p/${match.property_id}`}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Ver Propiedad
        </Link>
      </div>
    </div>
  );
}
