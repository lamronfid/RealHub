import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';
import FeedbackButton from '@/components/FeedbackButton';
import { cookies } from 'next/headers';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ wizard?: string }>;
}) {
  const params = await searchParams;
  const showWizardParam = params.wizard === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const agentId = user.id;

  const cookieStore = await cookies();
  const skipWizard = cookieStore.get('skip_import_wizard')?.value === 'true';

  const [
    { data: agentPropsRaw },
    { count: marketplaceProperties },
    { count: totalProspects },
    { data: prospectsByStage },
    { data: pendingFollowUps },
    { count: unreadMatches },
    { count: closedThisMonth },
    { data: profile },
  ] = await Promise.all([
    supabase.from('properties').select('transaction_type, property_type').eq('agent_id', agentId),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('visibility', 'marketplace'),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
    supabase.from('prospects').select('stage').eq('agent_id', agentId),
    supabase.from('follow_ups').select('*, prospects(full_name)').eq('agent_id', agentId).eq('status', 'pending').lte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(5),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', agentId).eq('type', 'match').eq('is_read', false),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('stage', 'cerrado').gte('updated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('agent_profiles').select('*').eq('id', agentId).single(),
  ]);

  const agentPropertiesList = agentPropsRaw || [];
  const totalProperties = agentPropertiesList.length;
  const isWizardActive = showWizardParam || (totalProperties === 0 && !skipWizard);

  // Calculate sales/rent metrics
  let salesCount = 0;
  let rentCount = 0;
  agentPropertiesList.forEach((p) => {
    if (p.transaction_type === 'venta') salesCount++;
    else if (p.transaction_type === 'alquiler') rentCount++;
  });

  // Calculate category distribution
  let residentialCount = 0;
  let commercialCount = 0;
  let landCount = 0;
  agentPropertiesList.forEach((p) => {
    const t = (p.property_type || '').toLowerCase();
    if (['casa', 'departamento', 'duplex', 'quinta', 'quinta_country'].includes(t)) {
      residentialCount++;
    } else if (['local_comercial', 'oficina', 'deposito', 'deposito_tinglado', 'edificio', 'comercial'].includes(t)) {
      commercialCount++;
    } else if (['terreno', 'terreno_lote', 'campo', 'estancia_campo'].includes(t)) {
      landCount++;
    } else {
      residentialCount++; // fallback
    }
  });

  const stageCounts: Record<string, number> = {};
  (prospectsByStage || []).forEach((p) => {
    stageCounts[p.stage] = (stageCounts[p.stage] || 0) + 1;
  });

  const kpis = [
    { label: 'Propiedades', value: totalProperties || 0, icon: 'domain', bg: 'bg-indigo-50', text: 'text-indigo-600', href: '/propiedades' },
    { label: 'En Marketplace', value: marketplaceProperties || 0, icon: 'storefront', bg: 'bg-violet-50', text: 'text-violet-600', href: '/marketplace' },
    { label: 'Prospectos', value: totalProspects || 0, icon: 'people', bg: 'bg-emerald-50', text: 'text-emerald-600', href: '/prospectos' },
    { label: 'Cierres del Mes', value: closedThisMonth || 0, icon: 'verified', bg: 'bg-blue-50', text: 'text-blue-600', href: '/prospectos' },
    { label: 'Coincidencias', value: unreadMatches || 0, icon: 'compare_arrows', bg: 'bg-rose-50', text: 'text-rose-600', href: '/propiedades' },
    { label: 'Seguimientos', value: (pendingFollowUps || []).length, icon: 'schedule', bg: 'bg-amber-50', text: 'text-amber-600', href: '/agenda' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const currentTier = profile?.subscription_tier || 'free';
  const maxProperties = currentTier === 'elite' ? Infinity : currentTier === 'pro' ? 25 : 10;
  const currentPropsCount = totalProperties || 0;
  const progressPct = maxProperties === Infinity ? 100 : Math.min(100, Math.round((currentPropsCount / maxProperties) * 100));
  const planName = currentTier === 'elite' ? 'Élite' : currentTier === 'pro' ? 'Pro' : 'Gratuito';
  const barColor = progressPct >= 90 ? 'bg-rose-500' : progressPct >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-600';
  const limitLabel = maxProperties === Infinity ? 'Ilimitadas' : `${currentPropsCount} de ${maxProperties}`;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto font-sans">
      
      {/* Top Banner and Limit Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Banner */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/75 via-sky-50/55 to-pink-50/40 p-6 md:p-8 text-slate-800 border border-indigo-100/60 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Background glow effects */}
          <div className="absolute top-[-45%] right-[-10%] w-[320px] h-[320px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-[70px] pointer-events-none" />
          <div className="absolute bottom-[-45%] left-[-10%] w-[240px] h-[240px] bg-pink-500/80 rounded-full blur-[50px] pointer-events-none opacity-10" />
          
          <div className="relative z-10 space-y-2">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/80 text-[9px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
              Panel de Control
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-heading tracking-tight leading-tight text-slate-900">
              {greeting}, ¡bienvenido a RealHub! 👋
            </h2>
            <p className="text-slate-500 text-xs font-semibold max-w-md leading-relaxed">
              Aquí tienes el resumen de rendimiento y seguimientos activos de tu portafolio inmobiliario en Paraguay.
            </p>
          </div>
          
          <div className="relative z-10 flex gap-2.5 shrink-0">
            <Link href="/propiedades/nueva" className="px-5 py-3.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all active:scale-[0.98]">
              Nueva Propiedad
            </Link>
          </div>
        </div>

        {/* Subscription & Property Limits Indicator */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-premium relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading">
                Mi Plan de Suscripción
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full ${
                currentTier === 'elite' 
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 border border-amber-300/30' 
                  : currentTier === 'pro' 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}>
                Plan {planName}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">Propiedades Activas</span>
                <span className="text-slate-900">{limitLabel}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between gap-4">
            {currentTier === 'elite' ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="material-symbols-outlined text-sm font-bold">verified</span>
                <span>Límite Máximo Activo</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-slate-400 font-semibold leading-tight max-w-[150px]">
                  {progressPct >= 80 ? '¡Estás cerca del límite! Mejora para no perder oportunidades.' : 'Aumenta tus límites para agregar más propiedades.'}
                </p>
                <Link href="/subscripcion/planes" className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm font-bold">upgrade</span>
                  Mejorar Plan
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Synchronization Banner (for agents with 0 properties who skipped the wizard) */}
      {totalProperties === 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50/90 via-indigo-50/75 to-sky-50/60 p-6 md:p-8 text-slate-800 border border-indigo-100/80 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Subtle gradient background glows */}
          <div className="absolute top-[-45%] right-[-10%] w-[320px] h-[320px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-[70px] pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <span className="bg-indigo-100/70 text-indigo-800 border border-indigo-200/50 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">
              Sincronización de Cartera
            </span>
            <h3 className="text-xl md:text-2xl font-black font-heading tracking-tight leading-tight text-slate-900">
              ¿Tenés propiedades publicadas en RE/MAX o Century 21?
            </h3>
            <p className="text-slate-700 text-xs md:text-sm lg:text-[15px] font-bold max-w-2xl leading-relaxed">
              No las cargues una por una. Nuestro importador automático puede buscar tu perfil de agente y copiar tus publicaciones activas a RealHub en un solo clic.
            </p>
          </div>
          
          <div className="relative z-10 shrink-0">
            <Link
              href="/?wizard=true"
              className="inline-flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white font-extrabold text-xs md:text-sm uppercase tracking-wider rounded-2xl hover:bg-indigo-700 transition-all hover:scale-[1.01] shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm md:text-base font-bold">travel_explore</span>
              <span>Iniciar Asistente</span>
            </Link>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}
            className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-premium shadow-premium-hover flex flex-col justify-between"
          >
            <div className={`${kpi.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
              <span className={`material-symbols-outlined ${kpi.text} text-lg`}>{kpi.icon}</span>
            </div>
            <div>
              <p className="font-heading text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">{kpi.value}</p>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5">{kpi.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics Charts */}
      {totalProperties > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Venta vs Alquiler */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-805 uppercase tracking-widest font-heading mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-500 text-lg">compare_arrows</span>
                Distribución de Operaciones
              </h3>
              <p className="text-slate-400 text-xs font-semibold">Proporción de tus propiedades captadas para venta y alquiler.</p>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500" /> Venta ({salesCount})</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-400" /> Alquiler ({rentCount})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-650 h-full transition-all duration-500" 
                  style={{ width: `${totalProperties > 0 ? (salesCount / totalProperties) * 100 : 0}%` }} 
                  title={`Venta: ${totalProperties > 0 ? Math.round((salesCount / totalProperties) * 100) : 0}%`}
                />
                <div 
                  className="bg-gradient-to-r from-violet-400 to-violet-500 h-full transition-all duration-500" 
                  style={{ width: `${totalProperties > 0 ? (rentCount / totalProperties) * 100 : 0}%` }}
                  title={`Alquiler: ${totalProperties > 0 ? Math.round((rentCount / totalProperties) * 100) : 0}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>{totalProperties > 0 ? Math.round((salesCount / totalProperties) * 100) : 0}% Ventas</span>
                <span>{totalProperties > 0 ? Math.round((rentCount / totalProperties) * 100) : 0}% Alquileres</span>
              </div>
            </div>
          </div>

          {/* Card 2: Categorías de Inmuebles */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-805 uppercase tracking-widest font-heading mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-500 text-lg">holiday_village</span>
                Categorías de Inmuebles
              </h3>
              <p className="text-slate-400 text-xs font-semibold">Segmentación de tu cartera por tipo de inmueble.</p>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Residencial', count: residentialCount, color: 'bg-emerald-500' },
                { label: 'Comercial', count: commercialCount, color: 'bg-blue-500' },
                { label: 'Terrenos', count: landCount, color: 'bg-amber-500' },
              ].map((cat) => {
                const pct = totalProperties > 0 ? Math.round((cat.count / totalProperties) * 100) : 0;
                return (
                  <div key={cat.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{cat.label} ({cat.count})</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-105 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${cat.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-premium">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-500 text-lg">stacked_bar_chart</span>
              Embudo de Ventas (Pipeline)
            </h3>
            <Link href="/prospectos" className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700">Ver todo →</Link>
          </div>
          <div className="space-y-4">
            {(['nuevo_contacto', 'propuestas_enviadas', 'visita_agendada', 'negociacion', 'tramites', 'cerrado', 'perdido'] as PipelineStage[]).map((stage) => {
              const count = stageCounts[stage] || 0;
              const total = totalProspects || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stage} className="flex items-center gap-4 group">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                  <span className="text-xs font-semibold text-slate-600 w-36 shrink-0 group-hover:text-slate-900 transition-colors">{STAGE_LABELS[stage]}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden relative">
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] }} />
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 w-8 text-right bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-premium flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-500 text-lg">event_upcoming</span>
              Próximos Seguimientos
            </h3>
            {(!pendingFollowUps || pendingFollowUps.length === 0) ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">check_circle</span>
                <p className="text-xs text-slate-400 font-medium">¡Todo al día por hoy!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFollowUps.map((fu: any) => (
                  <div key={fu.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100/80 hover:border-slate-200 transition-all duration-200">
                    <span className="material-symbols-outlined text-slate-400 text-lg">schedule</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{fu.prospects?.full_name || 'Prospecto'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{fu.interval_label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/agenda" className="w-full text-center mt-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-colors block">
            Ver Agenda Completa
          </Link>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/propiedades/nueva"
          className="flex items-center gap-4 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-2xl">add_home</span>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base tracking-tight">Nueva Propiedad</p>
            <p className="text-indigo-200 text-xs mt-0.5">Agregar al portafolio</p>
          </div>
        </Link>
        
        <Link href="/prospectos/nuevo"
          className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-premium hover:border-emerald-250 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl text-emerald-600">person_add</span>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base text-slate-800 tracking-tight">Nuevo Prospecto</p>
            <p className="text-slate-400 text-xs mt-0.5">Registrar cliente</p>
          </div>
        </Link>

        <Link href="/marketplace"
          className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-premium hover:border-violet-250 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0 border border-violet-100">
            <span className="material-symbols-outlined text-2xl text-violet-600">explore</span>
          </div>
          <div>
            <p className="font-heading font-extrabold text-base text-slate-800 tracking-tight">Marketplace</p>
            <p className="text-slate-400 text-xs mt-0.5">Explorar propiedades</p>
          </div>
        </Link>
      </div>

      <FeedbackButton />
    </div>
  );
}
