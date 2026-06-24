'use client';

import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';
import { updateProspectStage } from '@/app/(app)/prospectos/actions';
import { useState, useTransition, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import ProspectDrawer from '@/components/ProspectDrawer';
import Link from 'next/link';

export default function PipelineBoard({ prospects }: { prospects: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const activeStages = PIPELINE_STAGES.filter(s => s !== 'cerrado' && s !== 'perdido');
  const supabaseRef = useRef(createClient());

  // Fetch match counts for all prospects
  useEffect(() => {
    const fetchCounts = async () => {
      const supabase = supabaseRef.current;
      const counts: Record<string, number> = {};
      for (const p of prospects) {
        const { data } = await supabase.rpc('match_properties_for_prospect', { p_prospect_id: p.id });
        counts[p.id] = data?.length || 0;
      }
      setMatchCounts(counts);
    };
    if (prospects.length > 0) fetchCounts();
  }, [prospects]);

  const moveStage = (id: string, stage: string) => {
    startTransition(async () => { await updateProspectStage(id, stage); });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {activeStages.map(stage => {
          const items = prospects.filter(p => p.stage === stage);
          const stageColor = STAGE_COLORS[stage];
          
          return (
            <div 
              key={stage} 
              className="bg-white/70 backdrop-blur-md rounded-3xl border-t-4 border-l border-r border-b border-slate-105 shadow-premium flex flex-col min-h-[500px] transition-all duration-300"
              style={{ borderTopColor: stageColor }}
            >
              
              {/* Column Header */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-100/70 bg-slate-50/30 rounded-t-[20px]">
                <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: stageColor }} />
                <span className="text-[11px] font-black text-slate-700 font-heading uppercase tracking-widest truncate">
                  {STAGE_LABELS[stage]}
                </span>
                <span 
                  className="ml-auto text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 border transition-all"
                  style={{ 
                    backgroundColor: `${stageColor}12`, 
                    color: stageColor, 
                    borderColor: `${stageColor}30` 
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Items List */}
              <div className="p-3 space-y-3.5 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                {items.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-200/60 rounded-2xl flex flex-col items-center justify-center text-slate-350 select-none">
                    <span className="material-symbols-outlined text-lg mb-1">inbox</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider">Vacío</span>
                  </div>
                ) : (
                  items.map(p => {
                    const idx = activeStages.indexOf(stage);
                    const next = activeStages[idx + 1];
                    const prev = activeStages[idx - 1];
                    const count = matchCounts[p.id];
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedProspect(p)}
                        className="group bg-white/95 hover:bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-lg shadow-premium-hover transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                      >
                        {/* Interactive Left Hover Line Accent */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ backgroundColor: stageColor }}
                        />
                        
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-650 transition-colors mb-1 font-heading leading-snug">
                            {p.full_name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mb-3 flex items-center gap-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase ${
                              p.transaction_type === 'compra' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-sky-50 text-sky-650 border border-sky-100/50'
                            }`}>
                              {p.transaction_type === 'compra' ? 'Comprar' : 'Alquilar'}
                            </span>
                            {p.price_max && (
                              <span className="text-slate-700 font-semibold">
                                · {p.currency} {p.price_max.toLocaleString('es-PY')}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                          
                          {/* Matches Badge */}
                          <div className="flex items-center">
                            <span 
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all border ${
                                count && count > 0 
                                  ? 'bg-indigo-50 border-indigo-100 text-indigo-700 ring-2 ring-indigo-500/5' 
                                  : 'bg-slate-50 border-slate-100 text-slate-400'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px] font-bold">compare_arrows</span>
                              Coincidencias{count !== undefined ? `: ${count}` : ''}
                            </span>
                          </div>

                          {/* Navigation / Actions Buttons */}
                          <div className="flex flex-wrap items-center gap-1 pt-1.5">
                            {prev && (
                              <button 
                                onClick={() => moveStage(p.id, prev)} 
                                disabled={isPending} 
                                className="text-[9px] font-black text-slate-450 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-100/80 px-2 py-1 rounded-lg transition-all disabled:opacity-50 active:scale-[0.93]"
                                title="Mover a etapa anterior"
                              >
                                ←
                              </button>
                            )}
                            
                            <Link 
                              href={`/prospectos/${p.id}/editar`} 
                              title="Editar prospecto" 
                              className="text-[9px] font-bold text-slate-405 hover:text-indigo-650 bg-slate-50 hover:bg-indigo-50/50 px-2.5 py-1 rounded-lg flex items-center justify-center border border-slate-100 hover:border-indigo-100/55 transition-all active:scale-[0.93]"
                            >
                              <span className="material-symbols-outlined text-[12px] font-bold">edit</span>
                            </Link>
                            
                            {next ? (
                              <button 
                                onClick={() => moveStage(p.id, next)} 
                                disabled={isPending} 
                                className="ml-auto text-[9px] font-black text-indigo-700 bg-indigo-50/65 hover:bg-indigo-600 hover:text-white border border-indigo-150/40 px-3 py-1 rounded-lg transition-all active:scale-[0.94] disabled:opacity-50 shadow-sm hover:shadow-md"
                              >
                                Avanzar →
                              </button>
                            ) : (
                              <div className="ml-auto flex gap-1">
                                <button 
                                  onClick={() => moveStage(p.id, 'cerrado')} 
                                  disabled={isPending} 
                                  className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-150/40 px-2.5 py-1 rounded-lg transition-all active:scale-[0.94] disabled:opacity-50"
                                  title="Cerrar prospecto (Éxito)"
                                >
                                  ✓
                                </button>
                                <button 
                                  onClick={() => moveStage(p.id, 'perdido')} 
                                  disabled={isPending} 
                                  className="text-[9px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-150/40 px-2.5 py-1 rounded-lg transition-all active:scale-[0.94] disabled:opacity-50"
                                  title="Perder prospecto"
                                >
                                  ✗
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Slide-out drawer */}
      {selectedProspect && (
        <ProspectDrawer prospect={selectedProspect} onClose={() => setSelectedProspect(null)} />
      )}
    </>
  );
}
