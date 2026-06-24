'use client';
import { useState } from 'react';
import type { AcmComparable, AcmConservacion, AcmTipo, AcmPropertyType } from '@/types/acm';
import { useAcmStore } from '@/store/acm-store';
import {
  getCostCell,
  getTipo,
  detectConservacion,
  CONSERVACION_LABELS,
  TIPO_LABELS,
} from '@/lib/acm/cost-matrix';

const USES_COST_MATRIX: AcmPropertyType[] = ['casa', 'duplex', 'local_comercial'];

function SimilarityBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
      : score >= 50
      ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
      : 'bg-rose-500/10 text-rose-700 border border-rose-500/20';
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>
      {score}% similar
    </span>
  );
}

function fmtDots(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Fix #4 — derive conservacion from listing title using keyword detection.
function deriveInitial(c: AcmComparable): {
  conservacion?: AcmConservacion;
  tipo?: AcmTipo;
} {
  const tipo = c.tipo ?? (c.yearBuilt ? getTipo(c.yearBuilt) : undefined);
  const conservacion = c.conservacion ?? detectConservacion(c.title);
  return { conservacion, tipo };
}

interface Props {
  comparable: AcmComparable;
  subjectPropertyType?: AcmPropertyType;
}

export default function ComparableCard({ comparable: c, subjectPropertyType }: Props) {
  const { selectedIds, toggleComparable, updateComparable } = useAcmStore();
  const isSelected = selectedIds.has(c.id);
  const isDisabled = !isSelected && selectedIds.size >= 10;

  const [costOpen, setCostOpen] = useState(false);

  // Local state for cost matrix overrides — initialised from comparable or auto-detected
  const initial = deriveInitial(c);
  const [conservacion, setConservacion] = useState<AcmConservacion | undefined>(
    c.conservacion ?? initial.conservacion
  );
  const [tipo, setTipo] = useState<AcmTipo | undefined>(
    c.tipo ?? initial.tipo
  );
  const [costPerSqm, setCostPerSqm] = useState<number | undefined>(c.costPerSqm);

  const cell = conservacion && tipo ? getCostCell(conservacion, tipo) : undefined;
  const effectiveCost = costPerSqm ?? cell?.mid;

  const showCostMatrix =
    subjectPropertyType && USES_COST_MATRIX.includes(subjectPropertyType);

  function handleConservacionChange(v: AcmConservacion) {
    setConservacion(v);
    setCostPerSqm(undefined); // reset to new midpoint
    updateComparable(c.id, { conservacion: v, costPerSqm: undefined });
  }

  function handleTipoChange(v: AcmTipo) {
    setTipo(v);
    setCostPerSqm(undefined);
    updateComparable(c.id, { tipo: v, costPerSqm: undefined });
  }

  function handleCostChange(v: number) {
    setCostPerSqm(v);
    updateComparable(c.id, { costPerSqm: v });
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden glass-panel shadow-premium shadow-premium-hover transition-all duration-300 ${
        isSelected ? 'border-indigo-500 scale-[1.01] ring-2 ring-indigo-500/20' : 'border-slate-200/80 hover:scale-[1.01]'
      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-slate-100/50 group/image">
        {c.photo ? (
          <img src={c.photo} alt={c.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-350 text-xs font-semibold">
            Sin foto
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        {/* Badges top-left */}
        <div className="absolute top-3 left-3 flex gap-1 flex-wrap z-10">
          {c.isInternal ? (
            <span className="bg-indigo-650 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
              RealHub
            </span>
          ) : (
            <span className="bg-slate-900/80 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
              {c.source}
            </span>
          )}
          <SimilarityBadge score={c.similarityScore} />
        </div>

        {/* Checkbox top-right */}
        <label className="absolute top-3 right-3 cursor-pointer z-10">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isDisabled}
            onChange={() => toggleComparable(c.id)}
            className="w-5 h-5 rounded accent-indigo-600 cursor-pointer shadow-md transition-all scale-110"
          />
        </label>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3 font-sans">
        <p className="font-bold text-slate-800 text-xs line-clamp-2 leading-relaxed">{c.title}</p>
        <p className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-xs leading-none text-slate-350 shrink-0">location_on</span>
          <span className="truncate">{c.location}</span>
        </p>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-black text-slate-900">
            USD {c.price.toLocaleString('es-PY')}
          </span>
          {c.pricePerSqm ? (
            <span className="text-[11px] font-bold text-slate-500">
              USD {c.pricePerSqm.toLocaleString('es-PY')}/m²
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-350">Sin datos m²</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-bold">
          {c.sqm && <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">{c.sqm} m²</span>}
          {c.bedrooms !== undefined && <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">{c.bedrooms} dorm.</span>}
          {c.yearBuilt && <span className="bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">Año {c.yearBuilt}</span>}
        </div>

        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] font-black uppercase tracking-wider text-indigo-650 hover:text-indigo-800 transition-colors mt-1"
        >
          Ver propiedad →
        </a>

        {/* Cost matrix expandable — only for casa/duplex/local */}
        {showCostMatrix && (
          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              type="button"
              onClick={() => setCostOpen((o) => !o)}
              className="flex items-center justify-between w-full text-[11px] text-slate-500 hover:text-indigo-650 font-bold transition-all py-1"
            >
              <span>Costo de construcción</span>
              <span className="flex items-center gap-1">
                {effectiveCost && cell ? (
                  <span className="text-indigo-650 font-black">USD {fmtDots(effectiveCost)}/m²</span>
                ) : (
                  <span className="text-slate-350">Sin datos</span>
                )}
                <span className="text-[9px]">{costOpen ? '▲' : '▼'}</span>
              </span>
            </button>

            {costOpen && (
              <div className="mt-3 space-y-3 bg-blue-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Conservación</p>
                    <select
                      value={conservacion ?? ''}
                      onChange={(e) => handleConservacionChange(e.target.value as AcmConservacion)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>Seleccioná</option>
                      {(Object.keys(CONSERVACION_LABELS) as AcmConservacion[]).map((k) => (
                        <option key={k} value={k}>{CONSERVACION_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tipo</p>
                    <select
                      value={tipo ?? ''}
                      onChange={(e) => handleTipoChange(e.target.value as AcmTipo)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="" disabled>Seleccioná</option>
                      {(Object.keys(TIPO_LABELS) as AcmTipo[]).map((k) => (
                        <option key={k} value={k}>{TIPO_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {cell && effectiveCost !== undefined ? (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-gray-900">
                        USD {fmtDots(effectiveCost)}<span className="text-xs font-normal text-gray-500">/m²</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={cell.min}
                      max={cell.max}
                      step={1}
                      value={effectiveCost}
                      onChange={(e) => handleCostChange(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>USD {cell.min}</span>
                      <span>USD {cell.max}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    {tipo && conservacion
                      ? 'No hay datos para esta combinación.'
                      : 'Completá los campos para ver el rango.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
