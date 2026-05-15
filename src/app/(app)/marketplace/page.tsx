import { createClient } from '@/lib/supabase/server';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import MarketplaceProspectCard from '@/components/marketplace/MarketplaceProspectCard';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MarketplacePage(props: {
  searchParams?: Promise<{ type?: string, view?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const searchParams = await props.searchParams;
  const currentView = searchParams?.view || 'properties';
  const currentType = searchParams?.type || 'all';

  let properties: any[] = [];
  let prospects: any[] = [];
  let fetchError = null;

  if (currentView === 'properties') {
    let query = supabase
      .from('properties')
      .select('*')
      .eq('visibility', 'marketplace')
      .order('marketplace_shared_at', { ascending: false });

    if (currentType !== 'all') {
      query = query.eq('property_type', currentType);
    }

    const { data: rawProperties, error } = await query;
    fetchError = error;
    properties = rawProperties || [];

    if (properties.length > 0) {
      const agentIds = properties.map((p: any) => p.agent_id);
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('id, full_name, avatar_url, phone, agency_name')
        .in('id', agentIds);

      properties = properties.map((p: any) => ({
        ...p,
        agent_profiles: profiles?.find(profile => profile.id === p.agent_id) || null
      }));
    }
  } else if (currentView === 'prospects') {
    const { data: rawProspects, error } = await supabase
      .from('prospects')
      .select('id, agent_id, transaction_type, price_min, price_max, currency, departments, cities, neighborhoods, property_types, rooms_min, rooms_max, bathrooms_min, bathrooms_max, garages_min, size_min, size_max, furnished_preference, amenities, notes, visibility, created_at')
      .eq('visibility', 'marketplace')
      .order('created_at', { ascending: false });
      
    fetchError = error;
    prospects = rawProspects || [];

    if (prospects.length > 0) {
      const agentIds = prospects.map((p: any) => p.agent_id);
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('id, full_name, avatar_url, phone, agency_name')
        .in('id', agentIds);

      prospects = prospects.map((p: any) => ({
        ...p,
        agent_profiles: profiles?.find(profile => profile.id === p.agent_id) || null
      }));
    }
  }
  
  if (fetchError) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl max-w-2xl mx-auto mt-20">
        <h2 className="font-bold text-xl mb-2">Error cargando el marketplace</h2>
        <p className="text-sm font-mono">{fetchError.message}</p>
        <p className="text-sm mt-4">Detalles: {JSON.stringify(fetchError.details)}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            The Collection
          </h2>
          <p className="text-slate-500 mt-2 max-w-xl">
            Explora {currentView === 'properties' ? 'las propiedades más exclusivas' : 'los clientes interesados'} compartidos por la red de agentes de RealHub.
          </p>
        </div>

        {/* View Toggles */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <Link href="/marketplace?view=properties"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentView === 'properties'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            Propiedades
          </Link>
          <Link href="/marketplace?view=prospects"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentView === 'prospects'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            Prospectos
          </Link>
        </div>
      </div>

      {/* Filters (Only for Properties view) */}
      {currentView === 'properties' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <a href="/marketplace?view=properties"
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              currentType === 'all' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            Todo
          </a>
          {['casa', 'departamento', 'terreno'].map(type => (
            <a key={type} href={`/marketplace?view=properties&type=${type}`}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                currentType === type 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/50'
              }`}
            >
              {PROPERTY_TYPE_LABELS[type as PropertyType] || type}
            </a>
          ))}
        </div>
      )}

      {/* Grid */}
      {currentView === 'properties' ? (
        (!properties || properties.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 font-light">search_off</span>
            <h3 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-800 mb-2">No se encontraron propiedades</h3>
            <p className="text-slate-400 max-w-md">No hay propiedades compartidas en el marketplace que coincidan con tu búsqueda actual.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map(property => (
              <MarketplaceCard key={property.id} property={property} currentAgentId={user.id} />
            ))}
          </div>
        )
      ) : (
        (!prospects || prospects.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 font-light">search_off</span>
            <h3 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-800 mb-2">No se encontraron prospectos</h3>
            <p className="text-slate-400 max-w-md">Ningún agente ha compartido los requerimientos de sus prospectos en la red pública todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {prospects.map(prospect => (
              <MarketplaceProspectCard key={prospect.id} prospect={prospect} currentAgentId={user.id} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
