'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcmStore } from '@/store/acm-store';
import ComparableCard from '@/components/acm/ComparableCard';
import FilterBar from '@/components/acm/FilterBar';
import CalculatingOverlay from '@/components/acm/CalculatingOverlay';
import { calcReportData } from '@/lib/acm/calculations';

const MIN_CALC_MS = 3000;

export default function ComparablesPage() {
  const router = useRouter();
  const {
    subjectProperty,
    selectedIds,
    allComparables,
    searchError,
    isCalculating,
    getFilteredComparables,
    getSelectedComparables,
    setReportData,
    setCurrentStep,
    setIsCalculating,
  } = useAcmStore();

  const [calcError, setCalcError] = useState<string | null>(null);

  const filtered = getFilteredComparables();
  const selectedCount = selectedIds.size;
  const canGenerate = selectedCount >= 3;

  async function handleGenerateReport() {
    setCalcError(null);
    setIsCalculating(true);
    const start = Date.now();

    try {
      const selected = getSelectedComparables();
      const reportData = calcReportData(subjectProperty, selected);

      // Enforce minimum 3s feel regardless of how fast the math runs
      const elapsed = Date.now() - start;
      const remaining = MIN_CALC_MS - elapsed;
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }

      setReportData(reportData);
      setCurrentStep(3);
      router.push('/acm/reporte');
    } catch {
      setCalcError('Error al calcular el reporte. Intentá de nuevo.');
    } finally {
      setIsCalculating(false);
    }
  }

  if (!subjectProperty.operationType) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>No hay datos de propiedad. Por favor, comenzá desde el formulario.</p>
        <button
          onClick={() => router.push('/acm/nuevo')}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          Ir al formulario →
        </button>
      </div>
    );
  }

  return (
    <>
      {isCalculating && <CalculatingOverlay />}

      <div className="space-y-6">
        {/* Subject property summary bar */}
        <div className="glass-panel shadow-premium rounded-2xl px-6 py-4.5 flex flex-wrap gap-x-8 gap-y-3 text-xs font-sans border-slate-200/50">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tipo</span>
            <p className="font-extrabold capitalize text-slate-800">{subjectProperty.propertyType} · {subjectProperty.operationType}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Ubicación</span>
            <p className="font-extrabold text-slate-800">{subjectProperty.neighborhood}, {subjectProperty.city}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Precio objetivo</span>
            <p className="font-black text-indigo-650">
              {subjectProperty.currency === 'GS'
                ? `Gs. ${subjectProperty.priceTarget?.toLocaleString('es-PY')}`
                : `USD ${subjectProperty.priceTarget?.toLocaleString('es-PY')}`}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">m²</span>
            <p className="font-extrabold text-slate-850">{subjectProperty.sqmTotal} m²</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Dormitorios</span>
            <p className="font-extrabold text-slate-850">{subjectProperty.bedrooms != null ? subjectProperty.bedrooms : '—'}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">Comparables encontrados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {allComparables.length} propiedades · {filtered.length} visibles con filtros activos
            </p>
          </div>
          <button
            onClick={() => router.push('/acm/nuevo')}
            className="text-xs font-bold text-slate-450 hover:text-indigo-650 transition-colors flex items-center gap-1"
          >
            <span>←</span> Volver al formulario
          </button>
        </div>

        {/* Errors */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {searchError}
          </div>
        )}
        {calcError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {calcError}
          </div>
        )}

        {/* Filters */}
        <FilterBar />

        {/* Not enough comparables */}
        {allComparables.length < 3 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
            No encontramos suficientes comparables. Intentá ampliar el rango de búsqueda.
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Ningún comparable cumple los filtros actuales.</p>
            <button
              onClick={() =>
                useAcmStore
                  .getState()
                  .setFilters({ sources: [], similarityMin: 0, priceMin: undefined, priceMax: undefined })
              }
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ComparableCard
                key={c.id}
                comparable={c}
                subjectPropertyType={subjectProperty.propertyType}
              />
            ))}
          </div>
        )}

        {/* Sticky bottom bar */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200/60 px-6 py-4.5 -mx-6 flex items-center justify-between z-10 shadow-lg shadow-indigo-100/5">
          <div className="text-xs font-sans text-slate-600">
            <span className={`font-black ${canGenerate ? 'text-indigo-600' : 'text-slate-400'}`}>
              {selectedCount} seleccionados
            </span>
            <span className="text-slate-400 font-medium"> (mín. 3, máx. 10)</span>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={!canGenerate || isCalculating}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-650 hover:brightness-110 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[0.99] active:scale-[0.97]"
          >
            Generar Reporte ACM →
          </button>
        </div>
      </div>
    </>
  );
}
