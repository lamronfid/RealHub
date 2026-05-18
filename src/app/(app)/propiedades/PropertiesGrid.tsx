'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import PropertyFilterBar from '@/components/PropertyFilterBar';
import ToggleMarketplace from '@/components/ToggleMarketplace';

export default function PropertiesGrid({ properties }: { properties: any[] }) {
  return (
    <PropertyFilterBar properties={properties}>
      {(filtered) => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => (
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
                  <div className="ml-auto">
                    <ToggleMarketplace propertyId={p.id} isMarketplace={p.visibility === 'marketplace'} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2 block">filter_alt_off</span>
              <p className="text-slate-400 font-medium">No hay propiedades que coincidan con los filtros.</p>
            </div>
          )}
        </div>
      )}
    </PropertyFilterBar>
  );
}
