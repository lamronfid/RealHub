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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[80]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[90] overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center gap-3 z-10">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">close</span>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{prospect.full_name}</h3>
            <p className="text-xs text-slate-400">
              {prospect.transaction_type === 'compra' ? 'Busca comprar' : 'Busca alquilar'}
              {prospect.price_max && ` · Hasta ${prospect.currency} ${prospect.price_max.toLocaleString('es-PY')}`}
            </p>
          </div>
          <Link href={`/prospectos/${prospect.id}/editar`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">edit</span>
          </Link>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumen de Búsqueda</h4>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              {prospect.property_types?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px] mt-0.5">home</span>
                  <div className="flex flex-wrap gap-1">
                    {prospect.property_types.map((t: string) => (
                      <span key={t} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-600">
                        {PROPERTY_TYPE_LABELS[t as PropertyType] || t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.price_min || prospect.price_max ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px]">payments</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {prospect.currency} {prospect.price_min?.toLocaleString('es-PY') || '0'} – {prospect.price_max?.toLocaleString('es-PY') || '∞'}
                  </span>
                </div>
              ) : null}
              {prospect.departments?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px] mt-0.5">location_on</span>
                  <span className="text-xs text-slate-600 font-medium">{prospect.departments.join(', ')}</span>
                </div>
              )}
              {prospect.neighborhoods?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px] mt-0.5">map</span>
                  <div className="flex flex-wrap gap-1">
                    {prospect.neighborhoods.map((n: string) => (
                      <span key={n} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {prospect.rooms_min && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px]">bed</span>
                  <span className="text-xs text-slate-600 font-medium">{prospect.rooms_min}+ habitaciones</span>
                </div>
              )}
              {prospect.bathrooms_min && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px]">bathtub</span>
                  <span className="text-xs text-slate-600 font-medium">{prospect.bathrooms_min}+ baños</span>
                </div>
              )}
              {prospect.garages_min && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-[16px]">garage</span>
                  <span className="text-xs text-slate-600 font-medium">{prospect.garages_min}+ cocheras</span>
                </div>
              )}
              {prospect.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 italic">"{prospect.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Matches */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
              Coincidencias ({matches.length})
            </h4>

            {loading ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <span className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                <span className="text-xs text-slate-400">Buscando coincidencias...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <span className="material-symbols-outlined text-slate-200 text-3xl mb-2 block">search_off</span>
                <p className="text-xs text-slate-400">Sin coincidencias aún</p>
              </div>
            ) : (
              <>
                {/* Strong Matches */}
                {strongMatches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                      Fuertes ({strongMatches.length})
                    </p>
                    {strongMatches.slice(0, 5).map(m => (
                      <Link key={m.id} href={`/propiedades/${m.id}`}
                        className="block bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 hover:bg-emerald-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800 truncate flex-1">{m.title}</p>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-2">{m.score}pts</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{[m.neighborhood, m.city].filter(Boolean).join(', ')}</p>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Weak Matches */}
                {weakMatches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                      Menores ({weakMatches.length})
                    </p>
                    {weakMatches.slice(0, 3).map(m => (
                      <Link key={m.id} href={`/propiedades/${m.id}`}
                        className="block bg-amber-50/30 rounded-xl p-3 border border-amber-100/50 hover:bg-amber-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700 truncate flex-1">{m.title}</p>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-2">{m.score}pts</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <Link href={`/prospectos/${prospect.id}/matches`}
                  className="block text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 py-2 transition-colors"
                >
                  Ver todas las coincidencias →
                </Link>
              </>
            )}
          </div>

          {/* WhatsApp CTA */}
          {prospect.phone && (
            <a
              href={`https://wa.me/${prospect.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-emerald-600 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </>
  );
}
