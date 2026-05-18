import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import PropertiesGrid from './PropertiesGrid';

export default async function PropiedadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">Mis Propiedades</h2>
          <p className="text-slate-500 text-sm mt-1">{properties?.length || 0} en tu portafolio</p>
        </div>
        <Link href="/propiedades/nueva"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.97]"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Propiedad
        </Link>
      </div>

      {(!properties || properties.length === 0) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">add_home</span>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Sin propiedades aún</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Comienza agregando tu primera propiedad.</p>
          <Link href="/propiedades/nueva"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Agregar Propiedad
          </Link>
        </div>
      ) : (
        <PropertiesGrid properties={properties} />
      )}
    </div>
  );
}
