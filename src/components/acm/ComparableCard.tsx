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
      ? 'bg-green-100 text-green-700'
      : score >= 50
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
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
      className={`relative rounded-xl border-2 bg-white transition-all ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      {/* Image */}
      <div className="relative h-40 rounded-t-xl overflow-hidden bg-gray-100">
        {c.photo ? (
          <img src={c.photo} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            Sin foto
          </div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {c.isInternal ? (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              RealHub
            </span>
          ) : (
            <span className="bg-gray-800/80 text-white text-xs px-2 py-0.5 rounded-full">
              {c.source}
            </span>
          )}
          <SimilarityBadge score={c.similarityScore} />
        </div>

        {/* Checkbox top-right */}
        <label className="absolute top-2 right-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={isDisabled}
            onChange={() => toggleComparable(c.id)}
            className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
          />
        </label>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <p className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug">{c.title}</p>
        <p className="text-xs text-gray-400">{c.location}</p>

        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-gray-900">
            USD {c.price.toLocaleString('es-PY')}
          </span>
          {c.pricePerSqm ? (
            <span className="text-xs text-gray-500">
              USD {c.pricePerSqm.toLocaleString('es-PY')}/m²
            </span>
          ) : (
            <span className="text-xs text-gray-300">Sin datos m²</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {c.sqm && <span>{c.sqm} m²</span>}
          {c.bedrooms !== undefined && <span>{c.bedrooms} dorm.</span>}
          {c.yearBuilt && <span>Año {c.yearBuilt}</span>}
        </div>

        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-blue-600 hover:underline mt-1"
        >
          Ver propiedad →
        </a>

        {/* Cost matrix expandable — only for casa/duplex/local */}
        {showCostMatrix && (
          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              type="button"
              onClick={() => setCostOpen((o) => !o)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <span className="font-medium">Costo de construcción</span>
              <span className="flex items-center gap-1">
                {effectiveCost && cell ? (
                  <span className="text-blue-700 font-semibold">USD {fmtDots(effectiveCost)}/m²</span>
                ) : (
                  <span className="text-gray-300">Sin datos</span>
                )}
                <span>{costOpen ? '▲' : '▼'}</span>
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
