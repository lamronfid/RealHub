'use client';

import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, type PipelineStage } from '@/lib/types';
import { updateProspectStage } from '@/app/(app)/prospectos/actions';
import { useTransition } from 'react';
import Link from 'next/link';

export default function PipelineBoard({ prospects }: { prospects: any[] }) {
  const [isPending, startTransition] = useTransition();
  const activeStages = PIPELINE_STAGES.filter(s => s !== 'cerrado' && s !== 'perdido');

  const moveStage = (id: string, stage: string) => {
    startTransition(async () => { await updateProspectStage(id, stage); });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {activeStages.map(stage => {
        const items = prospects.filter(p => p.stage === stage);
        return (
          <div key={stage} className="bg-white rounded-2xl border border-slate-100 p-4 min-h-[200px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{STAGE_LABELS[stage]}</span>
              <span className="ml-auto text-xs font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map(p => {
                const idx = activeStages.indexOf(stage);
                const next = activeStages[idx + 1];
                const prev = activeStages[idx - 1];
                return (
                  <div key={p.id} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 mb-1">{p.full_name}</p>
                    <p className="text-xs text-slate-400 mb-2">
                      {p.transaction_type === 'compra' ? 'Comprar' : 'Alquilar'}
                      {p.price_max && ` · ${p.currency} ${p.price_max.toLocaleString('es-PY')}`}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {prev && <button onClick={() => moveStage(p.id, prev)} disabled={isPending} className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded disabled:opacity-50">← Atrás</button>}
                      <Link href={`/prospectos/${p.id}/editar`} title="Editar" className="text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100/50 hover:bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-100"><span className="material-symbols-outlined text-[12px]">edit</span></Link>
                      <Link href={`/prospectos/${p.id}/matches`} title="Ver Matches" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 px-2 py-0.5 rounded flex items-center gap-1 mx-auto border border-indigo-100"><span className="material-symbols-outlined text-[12px]">favorite</span> Matches</Link>
                      {next ? (
                        <button onClick={() => moveStage(p.id, next)} disabled={isPending} className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded disabled:opacity-50">Avanzar →</button>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => moveStage(p.id, 'cerrado')} disabled={isPending} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded disabled:opacity-50">✓</button>
                          <button onClick={() => moveStage(p.id, 'perdido')} disabled={isPending} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded disabled:opacity-50">✗</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
