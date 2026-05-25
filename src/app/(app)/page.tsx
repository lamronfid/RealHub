import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';
import FeedbackButton from '@/components/FeedbackButton';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const agentId = user.id;

  const [
    { count: totalProperties },
    { count: marketplaceProperties },
    { count: totalProspects },
    { data: prospectsByStage },
    { data: pendingFollowUps },
    { count: unreadMatches },
    { count: closedThisMonth },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('visibility', 'marketplace'),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('agent_id', agentId),
    supabase.from('prospects').select('stage').eq('agent_id', agentId),
    supabase.from('follow_ups').select('*, prospects(full_name)').eq('agent_id', agentId).eq('status', 'pending').lte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(5),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', agentId).eq('type', 'match').eq('is_read', false),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('agent_id', agentId).eq('stage', 'cerrado').gte('updated_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

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

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto font-sans">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/75 via-sky-50/55 to-pink-50/40 p-6 md:p-8 text-slate-800 border border-indigo-100/60 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
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
