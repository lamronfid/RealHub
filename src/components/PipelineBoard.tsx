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
          return (
            <div key={stage} className="bg-white/95 rounded-3xl border border-slate-100/90 p-4 min-h-[450px] shadow-premium flex flex-col">
              
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100/80">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{STAGE_LABELS[stage]}</span>
                <span className="ml-auto text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-lg shrink-0">{items.length}</span>
              </div>

              {/* Items List */}
              <div className="space-y-3 flex-1">
                {items.map(p => {
                  const idx = activeStages.indexOf(stage);
                  const next = activeStages[idx + 1];
                  const prev = activeStages[idx - 1];
                  const count = matchCounts[p.id];
                  return (
                    <div key={p.id}
                      onClick={() => setSelectedProspect(p)}
                      className="group bg-slate-50/50 hover:bg-white rounded-2xl p-4 border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-1 leading-tight">{p.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mb-3 leading-normal">
                          {p.transaction_type === 'compra' ? 'Comprar' : 'Alquilar'}
                          {p.price_max && ` · ${p.currency} ${p.price_max.toLocaleString('es-PY')}`}
                        </p>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="space-y-2" onClick={e => e.stopPropagation()}>
                        
                        {/* Matches Badge */}
                        <div className="flex items-center">
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">compare_arrows</span>
                            Coincidencias{count !== undefined ? `: ${count}` : ''}
                          </span>
                        </div>

                        {/* Navigation / Actions Buttons */}
                        <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100/40">
                          {prev && (
                            <button 
                              onClick={() => moveStage(p.id, prev)} 
                              disabled={isPending} 
                              className="text-[9px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 px-1.5 py-0.5 rounded-md transition-colors disabled:opacity-50"
                              title="Mover a etapa anterior"
                            >
                              ←
                            </button>
                          )}
                          
                          <Link 
                            href={`/prospectos/${p.id}/editar`} 
                            title="Editar prospecto" 
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100/50 hover:bg-slate-100 px-2 py-1 rounded-md flex items-center justify-center border border-slate-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[11px]">edit</span>
                          </Link>
                          
                          {next ? (
                            <button 
                              onClick={() => moveStage(p.id, next)} 
                              disabled={isPending} 
                              className="ml-auto text-[9px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/60 px-2 py-1 rounded-md transition-all active:scale-[0.96] disabled:opacity-50"
                            >
                              Avanzar →
                            </button>
                          ) : (
                            <div className="ml-auto flex gap-1">
                              <button 
                                onClick={() => moveStage(p.id, 'cerrado')} 
                                disabled={isPending} 
                                className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                title="Cerrar prospecto (Éxito)"
                              >
                                ✓
                              </button>
                              <button 
                                onClick={() => moveStage(p.id, 'perdido')} 
                                disabled={isPending} 
                                className="text-[9px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100/50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
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
                })}
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
