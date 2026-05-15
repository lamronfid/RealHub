import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import ToggleMarketplace from '@/components/ToggleMarketplace';

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200 transition-all duration-500">
              <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden">
                {p.photos && p.photos.length > 0 ? (
                  <img src={p.photos[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-4xl mb-2 font-light">landscape</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sin Imagen</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm backdrop-blur ${
                    p.transaction_type === 'compra' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'
                  }`}>
                    {p.status === 'EN VENTA' || p.transaction_type === 'compra' ? 'EN VENTA' : p.status}
                  </span>
                  {p.visibility === 'marketplace' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm bg-violet-500/90 backdrop-blur text-white">Marketplace</span>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{p.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                    {[p.neighborhood, p.city, p.department].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                    {PROPERTY_TYPE_LABELS[p.property_type as PropertyType] || p.property_type}
                  </span>
                  <div className="text-right">
                    {p.transaction_type === 'ambos' ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">V: {p.currency} {p.sale_price?.toLocaleString('es-PY')}</span>
                        <span className="text-xs text-slate-500">A: {p.currency} {p.rent_price?.toLocaleString('es-PY')}/mes</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-slate-900">
                        {p.currency} {p.transaction_type === 'alquiler' ? p.rent_price?.toLocaleString('es-PY') : p.sale_price?.toLocaleString('es-PY')}
                        {p.transaction_type === 'alquiler' && <span className="text-sm text-slate-400 font-normal">/mes</span>}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                  {p.bedrooms && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-base">bed</span><span className="text-xs font-medium text-slate-600">{p.bedrooms}</span></div>}
                  {p.bathrooms && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-base">bathtub</span><span className="text-xs font-medium text-slate-600">{p.bathrooms}</span></div>}
                  {p.m2_built && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-base">square_foot</span><span className="text-xs font-medium text-slate-600">{p.m2_built} m²</span></div>}
                  <div className="ml-auto flex items-center gap-2">
                    <Link href={`/propiedades/${p.id}`} title="Ver Detalles y Matches" className="text-slate-400 hover:text-indigo-600 transition-colors bg-white hover:bg-indigo-50 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-indigo-200">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Link>
                    <ToggleMarketplace propertyId={p.id} isMarketplace={p.visibility === 'marketplace'} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
