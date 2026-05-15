import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';

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
    { label: 'Nuevos Matches', value: unreadMatches || 0, icon: 'favorite', bg: 'bg-rose-50', text: 'text-rose-600', href: '/propiedades' },
    { label: 'Seguimientos', value: (pendingFollowUps || []).length, icon: 'schedule', bg: 'bg-amber-50', text: 'text-amber-600', href: '/agenda' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div>
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {greeting} 👋
        </h2>
        <p className="text-slate-500 mt-1">Resumen de tu actividad y rendimiento.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}
            className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 flex flex-col justify-between"
          >
            <div className={`${kpi.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined ${kpi.text} text-lg`}>{kpi.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">{kpi.value}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{kpi.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pipeline + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900">Pipeline</h3>
            <Link href="/prospectos" className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {(['nuevo_contacto', 'propuestas_enviadas', 'visita_agendada', 'negociacion', 'tramites', 'cerrado', 'perdido'] as PipelineStage[]).map((stage) => {
              const count = stageCounts[stage] || 0;
              const total = totalProspects || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                  <span className="text-sm text-slate-600 w-40 shrink-0">{STAGE_LABELS[stage]}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] }} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900 mb-4">Seguimientos</h3>
          {(!pendingFollowUps || pendingFollowUps.length === 0) ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">check_circle</span>
              <p className="text-sm text-slate-400">Todo al día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFollowUps.map((fu: any) => (
                <div key={fu.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                  <span className="material-symbols-outlined text-amber-500 text-lg">schedule</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{fu.prospects?.full_name || 'Prospecto'}</p>
                    <p className="text-xs text-slate-400">{fu.interval_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/propiedades/nueva"
          className="flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-200/50 transition-all"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">add_home</span>
          </div>
          <div>
            <p className="font-bold text-lg">Nueva Propiedad</p>
            <p className="text-white/70 text-sm">Agregar al portafolio</p>
          </div>
        </Link>
        <Link href="/prospectos/nuevo"
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-lg transition-all"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-emerald-600">person_add</span>
          </div>
          <div>
            <p className="font-bold text-lg text-slate-800">Nuevo Prospecto</p>
            <p className="text-slate-500 text-sm">Cargar cliente</p>
          </div>
        </Link>
        <Link href="/marketplace"
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-6 hover:border-violet-200 hover:shadow-lg transition-all"
        >
          <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl text-violet-600">explore</span>
          </div>
          <div>
            <p className="font-bold text-lg text-slate-800">Marketplace</p>
            <p className="text-slate-500 text-sm">Explorar propiedades</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
