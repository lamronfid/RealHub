'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface ProspectDrawerProps {
  prospect: any;
  onClose: () => void;
}

export default function ProspectDrawer({ prospect, onClose }: ProspectDrawerProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const { data } = await supabaseRef.current.rpc('match_properties_for_prospect', { p_prospect_id: prospect.id });
      setMatches(data || []);
      setLoading(false);
    };
    fetchMatches();
  }, [prospect.id]);

  const strongMatches = matches.filter(m => m.score >= 30);
  const weakMatches = matches.filter(m => m.score < 30 && m.score > 0);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs z-[80] transition-opacity duration-300" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white/95 backdrop-blur-xl border-l border-slate-100/80 shadow-2xl z-[90] overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-100/70 px-6 py-4.5 flex items-center gap-3.5 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100/80 text-slate-500 hover:text-slate-800 transition-all active:scale-90">
              <span className="material-symbols-outlined text-[20px] font-bold">close</span>
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold font-heading text-slate-900 truncate leading-snug">{prospect.full_name}</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {prospect.transaction_type === 'compra' ? 'Busca comprar' : 'Busca alquilar'}
                {prospect.price_max && ` · Hasta ${prospect.currency} ${prospect.price_max.toLocaleString('es-PY')}`}
              </p>
            </div>
            <Link href={`/prospectos/${prospect.id}/editar`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 active:scale-90">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </Link>
          </div>

          <div className="p-6 space-y-6">
            {/* Search Summary */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading">Resumen de Búsqueda</h4>
              <div className="bg-slate-50/50 border border-slate-100/75 rounded-2xl p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                {prospect.property_types?.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">home</span>
                    <div className="flex flex-wrap gap-1.5">
                      {prospect.property_types.map((t: string) => (
                        <span key={t} className="text-xs bg-white border border-slate-100 px-2.5 py-0.5 rounded-lg font-bold text-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          {PROPERTY_TYPE_LABELS[t as PropertyType] || t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {(prospect.price_min || prospect.price_max) && (
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">payments</span>
                    <span className="text-xs text-slate-700 font-bold">
                      {prospect.currency} {prospect.price_min?.toLocaleString('es-PY') || '0'} – {prospect.price_max?.toLocaleString('es-PY') || '∞'}
                    </span>
                  </div>
                )}
                
                {prospect.departments?.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">location_on</span>
                    <span className="text-xs text-slate-600 font-semibold">{prospect.departments.join(', ')}</span>
                  </div>
                )}
                
                {prospect.neighborhoods?.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">map</span>
                    <div className="flex flex-wrap gap-1">
                      {prospect.neighborhoods.map((n: string) => (
                        <span key={n} className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-650 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100/50">
                  {prospect.rooms_min && (
                    <div className="flex flex-col items-center p-2 bg-white border border-slate-100 rounded-xl">
                      <span className="material-symbols-outlined text-slate-450 text-[16px] mb-0.5">bed</span>
                      <span className="text-[10px] text-slate-700 font-bold">{prospect.rooms_min}+ Dorms</span>
                    </div>
                  )}
                  {prospect.bathrooms_min && (
                    <div className="flex flex-col items-center p-2 bg-white border border-slate-100 rounded-xl">
                      <span className="material-symbols-outlined text-slate-455 text-[16px] mb-0.5">bathtub</span>
                      <span className="text-[10px] text-slate-700 font-bold">{prospect.bathrooms_min}+ Baños</span>
                    </div>
                  )}
                  {prospect.garages_min && (
                    <div className="flex flex-col items-center p-2 bg-white border border-slate-100 rounded-xl">
                      <span className="material-symbols-outlined text-slate-455 text-[16px] mb-0.5">garage</span>
                      <span className="text-[10px] text-slate-700 font-bold">{prospect.garages_min}+ Coch</span>
                    </div>
                  )}
                </div>
                
                {prospect.notes && (
                  <div className="pt-3 border-t border-slate-100/60">
                    <p className="text-xs text-slate-500 italic bg-white p-3 border border-slate-50 rounded-xl leading-relaxed">
                      "{prospect.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Matches */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                Coincidencias ({matches.length})
              </h4>

              {loading ? (
                <div className="flex flex-col items-center gap-2 py-8 justify-center bg-slate-50/50 border border-slate-100/50 rounded-2xl">
                  <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Buscando propiedades...</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="bg-slate-50/50 rounded-2xl p-8 text-center border border-slate-100">
                  <span className="material-symbols-outlined text-slate-300 text-3xl mb-1 block">search_off</span>
                  <p className="text-xs text-slate-400 font-semibold">No se encontraron propiedades coincidentes</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Strong Matches */}
                  {strongMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Coincidencia Fuerte ({strongMatches.length})
                      </p>
                      <div className="space-y-2">
                        {strongMatches.slice(0, 5).map(m => (
                          <Link key={m.id} href={`/propiedades/${m.id}`}
                            className="block bg-gradient-to-br from-emerald-50/30 to-emerald-50/10 rounded-2xl p-4 border border-emerald-100 hover:border-emerald-250 hover:bg-emerald-50/40 transition-all duration-300 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-800 truncate flex-1 leading-snug font-heading">{m.title}</p>
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-200/50 px-2 py-0.5 rounded-md ml-2 shrink-0">{m.score} pts</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">location_on</span>
                              {[m.neighborhood, m.city].filter(Boolean).join(', ')}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weak Matches */}
                  {weakMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Otras Coincidencias ({weakMatches.length})
                      </p>
                      <div className="space-y-2">
                        {weakMatches.slice(0, 3).map(m => (
                          <Link key={m.id} href={`/propiedades/${m.id}`}
                            className="block bg-slate-50/30 rounded-2xl p-4 border border-slate-100/80 hover:bg-slate-50/80 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-700 truncate flex-1 leading-snug">{m.title}</p>
                              <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md ml-2 shrink-0">{m.score} pts</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href={`/prospectos/${prospect.id}/matches`}
                    className="block text-center text-xs font-black text-indigo-650 hover:text-indigo-800 py-2.5 transition-all bg-indigo-50/40 rounded-xl hover:bg-indigo-50 border border-indigo-100/40"
                  >
                    Ver todas las coincidencias →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp CTA Footer */}
        {prospect.phone && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/30">
            <a
              href={`https://wa.me/${prospect.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[0.99] active:scale-[0.97] transition-all"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">chat</span>
              Contactar por WhatsApp
            </a>
          </div>
        )}

      </div>
    </>
  );
}
