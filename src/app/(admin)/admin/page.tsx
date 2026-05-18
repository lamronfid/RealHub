import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = {
  title: 'Panel de Administración | RealHub',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch stats in parallel
  const [
    { count: usersCount },
    { count: propertiesCount },
    { count: prospectsCount },
    { data: featureRequests },
  ] = await Promise.all([
    supabase.from('agent_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('prospects').select('*', { count: 'exact', head: true }),
    supabase.from('feature_requests').select('*, agent_profiles(full_name)').order('created_at', { ascending: false }).limit(20),
  ]);

  const stats = [
    { label: 'Usuarios Registrados', value: usersCount || 0, icon: 'group', color: 'bg-blue-500' },
    { label: 'Propiedades Creadas', value: propertiesCount || 0, icon: 'domain', color: 'bg-emerald-500' },
    { label: 'Prospectos Totales', value: prospectsCount || 0, icon: 'people', color: 'bg-indigo-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
        <p className="text-slate-500 text-sm mt-1">Estadísticas generales y control de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${stat.color}`}>
              <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className="text-3xl font-black text-slate-800 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-600">lightbulb</span>
            <h2 className="text-lg font-bold text-slate-800">Solicitudes de Funciones (Feedback)</h2>
          </div>
          <span className="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-xs font-bold">
            {featureRequests?.length || 0} recibidas
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {!featureRequests?.length ? (
            <div className="p-10 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-3 text-slate-300 block">inbox</span>
              Aún no hay sugerencias de los usuarios.
            </div>
          ) : (
            featureRequests.map((req) => (
              <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{req.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        {req.agent_profiles?.full_name || 'Usuario desconocido'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {req.status === 'pending' ? 'Pendiente' : 'Completado'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
