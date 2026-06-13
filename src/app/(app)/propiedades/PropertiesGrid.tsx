'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import PropertyFilterBar from '@/components/PropertyFilterBar';
import ToggleMarketplace from '@/components/ToggleMarketplace';
import Link from 'next/link';

export default function PropertiesGrid({ properties }: { properties: any[] }) {
  return (
    <PropertyFilterBar properties={properties}>
      {(filtered) => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <div key={p.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-premium shadow-premium-hover flex flex-col justify-between">
              
              {/* Card Image Area */}
              <Link href={`/propiedades/${p.id}`} className="block relative aspect-[16/10] bg-slate-50 overflow-hidden">
                {p.photos && p.photos.length > 0 ? (
                  <img src={p.photos[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-4xl mb-2 font-light">landscape</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sin Imagen</span>
                  </div>
                )}
                
                {/* Visual overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent opacity-90" />
                
                {/* Floating location text on image */}
                <div className="absolute bottom-3 left-4 right-4 z-10">
                  <p className="text-[11px] font-extrabold text-white/90 drop-shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-indigo-300">location_on</span>
                    {[p.neighborhood, p.city].filter(Boolean).join(', ')}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex gap-1.5 z-10">
                  {p.status === 'off_market' ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm bg-slate-900/95 text-amber-400 border border-amber-500/20 backdrop-blur-md">
                      Off-Market
                    </span>
                  ) : p.status === 'coming_soon' ? (
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm bg-amber-550/90 text-white backdrop-blur-md animate-pulse">
                      Coming Soon
                    </span>
                  ) : (
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-md bg-opacity-90 ${
                      p.transaction_type === 'compra' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {p.status === 'EN VENTA' || p.status === 'En Venta' || p.transaction_type === 'compra' ? 'EN VENTA' : p.status === 'En Alquiler' ? 'EN ALQUILER' : p.status.toUpperCase()}
                    </span>
                  )}
                  {p.visibility === 'marketplace' && (
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm bg-violet-600/90 backdrop-blur-md text-white">Marketplace</span>
                  )}
                </div>
              </Link>

              {/* Card Body Details */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <Link href={`/propiedades/${p.id}`} className="hover:text-indigo-600 transition-colors">
                    <h3 className="font-heading font-extrabold text-base text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.title}</h3>
                  </Link>
                  <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    {PROPERTY_TYPE_LABELS[p.property_type as PropertyType] || p.property_type}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Precio</span>
                  <div className="text-right">
                    {p.transaction_type === 'ambos' ? (
                      <div className="flex flex-col text-right">
                        <span className="text-xs font-bold text-slate-800">V: {p.currency} {p.sale_price?.toLocaleString('es-PY')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">A: {p.currency} {p.rent_price?.toLocaleString('es-PY')}/mes</span>
                      </div>
                    ) : (
                      <span className="text-base font-black text-slate-900 font-heading tracking-tight">
                        {p.currency} {p.transaction_type === 'alquiler' ? p.rent_price?.toLocaleString('es-PY') : p.sale_price?.toLocaleString('es-PY')}
                        {p.transaction_type === 'alquiler' && <span className="text-xs text-slate-400 font-normal"> / mes</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* Attributes & Tools Bar */}
                <div className="flex items-center gap-1.5 pt-3.5 border-t border-slate-100/80">
                  <div className="flex flex-wrap items-center gap-1 text-slate-500 flex-1">
                    {p.bedrooms && (
                      <span className="bg-slate-50 border border-slate-100/60 rounded-lg px-2 py-1 text-[10px] font-semibold flex items-center gap-1 text-slate-600">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">bed</span>
                        {p.bedrooms}
                      </span>
                    )}
                    {p.bathrooms && (
                      <span className="bg-slate-50 border border-slate-100/60 rounded-lg px-2 py-1 text-[10px] font-semibold flex items-center gap-1 text-slate-600">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">bathtub</span>
                        {p.bathrooms}
                      </span>
                    )}
                    {p.m2_built && (
                      <span className="bg-slate-50 border border-slate-100/60 rounded-lg px-2 py-1 text-[10px] font-semibold flex items-center gap-1 text-slate-600">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">square_foot</span>
                        {p.m2_built} m²
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/propiedades/${p.id}/editar`}
                      title="Editar propiedad"
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </Link>
                    <ToggleMarketplace propertyId={p.id} isMarketplace={p.visibility === 'marketplace'} />
                  </div>
                </div>

              </div>

            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-premium">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2 block">filter_alt_off</span>
              <p className="text-slate-400 font-medium text-sm">No hay propiedades que coincidan con los filtros.</p>
            </div>
          )}
        </div>
      )}
    </PropertyFilterBar>
  );
}
