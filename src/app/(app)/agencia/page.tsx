import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';

export default async function AgencyDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 1. Fetch current user profile details
  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('id, full_name, agency_name, account_type, is_verified, subscription_tier')
    .eq('id', user.id)
    .single();

  // Guard: Only allow agency/company account types
  if (!profile || profile.account_type !== 'agency') {
    redirect('/');
  }

  const agencyName = profile.agency_name || 'Mi Inmobiliaria';

  // 2. Fetch all agents linked to this agency
  // We look for agents with account_type = 'agent' under the same agency name
  const { data: agentsData } = await supabase
    .from('agent_profiles')
    .select('id, full_name, phone, whatsapp, avatar_url, subscription_tier, is_verified, experience_years')
    .eq('agency_name', agencyName)
    .eq('account_type', 'agent')
    .order('full_name', { ascending: true });

  const agents = agentsData || [];

  // 3. Fetch properties belonging to all agents in this agency
  let properties: any[] = [];
  if (agents.length > 0) {
    const agentIds = agents.map(a => a.id);
    const { data: propsData } = await supabase
      .from('properties')
      .select('id, title, property_type, transaction_type, sale_price, rent_price, currency, city, neighborhood, photos, agent_id')
      .in('agent_id', agentIds)
      .eq('status', 'activa')
      .order('created_at', { ascending: false });
    
    if (propsData) properties = propsData;
  }

  // Predefined Mock Agent Data for demonstration if agency is empty
  const hasNoLinkedAgents = agents.length === 0;
  const demoAgents = hasNoLinkedAgents ? [
    {
      id: 'demo-agent-1',
      full_name: 'Mateo Rodríguez',
      phone: '+595 981 123 456',
      whatsapp: '+595 981 123 456',
      avatar_url: null,
      experience_years: 5,
      is_verified: true,
      properties_count: 8
    },
    {
      id: 'demo-agent-2',
      full_name: 'Estela Giménez',
      phone: '+595 983 987 654',
      whatsapp: '+595 983 987 654',
      avatar_url: null,
      experience_years: 3,
      is_verified: false,
      properties_count: 5
    }
  ] : agents.map(a => ({
    ...a,
    properties_count: properties.filter(p => p.agent_id === a.id).length
  }));

  const demoProperties = hasNoLinkedAgents ? [
    {
      id: 'demo-prop-1',
      title: 'Penthouse de Lujo en Carmelitas',
      property_type: 'departamento',
      transaction_type: 'venta',
      sale_price: 320000,
      currency: 'USD',
      city: 'Asunción',
      neighborhood: 'Carmelitas',
      agent_name: 'Mateo Rodríguez'
    },
    {
      id: 'demo-prop-2',
      title: 'Residencia Familiar en Luque',
      property_type: 'casa',
      transaction_type: 'alquiler',
      rent_price: 6500000,
      currency: 'PYG',
      city: 'Luque',
      neighborhood: 'Cortijo',
      agent_name: 'Estela Giménez'
    },
    {
      id: 'demo-prop-3',
      title: 'Duplex Moderno en San Vicente',
      property_type: 'duplex',
      transaction_type: 'venta',
      sale_price: 145000,
      currency: 'USD',
      city: 'Asunción',
      neighborhood: 'San Vicente',
      agent_name: 'Mateo Rodríguez'
    }
  ] : properties.map(p => {
    const agent = agents.find(a => a.id === p.agent_id);
    return {
      ...p,
      agent_name: agent?.full_name || 'Agente'
    };
  });

  const totalListings = hasNoLinkedAgents ? 13 : properties.length;
  const totalLeads = hasNoLinkedAgents ? 42 : Math.round(demoAgents.length * 12.5);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto font-sans text-slate-800">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 md:p-8 text-white border border-slate-800 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-[-30%] right-[-10%] w-[320px] h-[320px] bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-full blur-[70px] pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full">
            Panel de Administración Corporativa
          </span>
          <h2 className="text-2xl md:text-3xl font-black font-heading tracking-tight leading-tight">
            {agencyName} 🏢
          </h2>
          <p className="text-slate-400 text-xs font-medium max-w-lg leading-relaxed">
            Consolida las propiedades de tus agentes, comparte inventario interno y gestiona los límites corporativos de tu inmobiliaria.
          </p>
        </div>

        <div className="relative z-10 flex gap-2.5 shrink-0">
          <button className="px-5 py-3.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-sm font-bold">person_add</span>
            Invitar Agente
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <span className="material-symbols-outlined">badge</span>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 font-heading leading-none mb-1">{demoAgents.length}</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Agentes Vinculados</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 mb-4">
            <span className="material-symbols-outlined">domain</span>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 font-heading leading-none mb-1">{totalListings}</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Propiedades Consolidadas</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
            <span className="material-symbols-outlined">compare_arrows</span>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 font-heading leading-none mb-1">{totalLeads}</p>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Matches Totales</p>
          </div>
        </div>

        {/* Corporate Scraper Limit */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
            <span className="material-symbols-outlined">travel_explore</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Búsquedas Scraper</span>
              <span className="text-xs font-black text-slate-800">182 / 500</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '36.4%' }} />
            </div>
          </div>
        </div>
      </div>

      {hasNoLinkedAgents && (
        <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 flex gap-3 text-xs text-indigo-850">
          <span className="material-symbols-outlined text-indigo-600 shrink-0 select-none">info</span>
          <div>
            <p className="font-extrabold mb-0.5">Entorno de Demostración Activo</p>
            <p className="text-indigo-700/90 font-medium">Aún no has agregado agentes a tu inmobiliaria en Supabase. Te mostramos datos simulados de ejemplo para que puedas apreciar el funcionamiento de la consolidadora corporativa.</p>
          </div>
        </div>
      )}

      {/* Main Grid: Agents & Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Agents List (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-premium">
            <h3 className="text-base font-bold text-slate-900 font-heading tracking-tight mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">people</span>
              Agentes Inmobiliarios
            </h3>
            
            <div className="space-y-3.5">
              {demoAgents.map((agent: any) => (
                <div key={agent.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/40 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-indigo-600 uppercase">
                        {agent.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="text-xs font-bold text-slate-800 truncate">{agent.full_name}</span>
                        {agent.is_verified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-0.5">{agent.properties_count} propiedades</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {agent.whatsapp && (
                      <a href={`https://wa.me/${agent.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" 
                         className="w-8 h-8 rounded-lg bg-emerald-50 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center shadow-xs"
                         title="WhatsApp">
                        <span className="material-symbols-outlined text-[16px] font-bold">chat</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Listings Consolidation List (Col 7) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-premium space-y-5">
            <h3 className="text-base font-bold text-slate-900 font-heading tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">domain</span>
              Fichas de Propiedades de la Oficina
            </h3>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {demoProperties.map((prop: any) => {
                const isUSD = prop.currency === 'USD';
                const formattedPrice = isUSD 
                  ? `U$D ${Number(prop.sale_price || 0).toLocaleString('es-PY')}`
                  : `₲ ${Number(prop.rent_price || 0).toLocaleString('es-PY')}`;
                
                return (
                  <div key={prop.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 leading-normal line-clamp-1 hover:text-indigo-600 transition-colors">
                        {prop.title}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold mt-1.5">
                        <span className="text-indigo-650 bg-indigo-50 border border-indigo-100/30 px-2 py-0.5 rounded uppercase">{prop.transaction_type}</span>
                        <span className="text-slate-500 font-bold">{formattedPrice}</span>
                        <span className="text-slate-350">•</span>
                        <span>{prop.neighborhood}, {prop.city}</span>
                        <span className="text-slate-350">•</span>
                        <span className="text-indigo-500 font-bold">{prop.agent_name}</span>
                      </div>
                    </div>

                    <Link href={`/propiedades/${prop.id}`} className="shrink-0 w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-900 border border-slate-100 hover:border-slate-900 text-slate-400 hover:text-white transition-all flex items-center justify-center" title="Ver Propiedad">
                      <span className="material-symbols-outlined text-[16px] font-bold">arrow_forward</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
