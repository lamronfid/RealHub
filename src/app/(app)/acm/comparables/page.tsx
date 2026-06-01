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
        <div className="bg-white border rounded-xl px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Tipo</span>
            <p className="font-medium capitalize">{subjectProperty.propertyType} · {subjectProperty.operationType}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Ubicación</span>
            <p className="font-medium">{subjectProperty.neighborhood}, {subjectProperty.city}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Precio objetivo</span>
            <p className="font-semibold text-blue-700">
              {subjectProperty.currency === 'GS'
                ? `Gs. ${subjectProperty.priceTarget?.toLocaleString('es-PY')}`
                : `USD ${subjectProperty.priceTarget?.toLocaleString('es-PY')}`}
            </p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">m²</span>
            <p className="font-medium">{subjectProperty.sqmTotal}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Dormitorios</span>
            <p className="font-medium">{subjectProperty.bedrooms}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comparables encontrados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {allComparables.length} propiedades · {filtered.length} visibles con filtros activos
            </p>
          </div>
          <button
            onClick={() => router.push('/acm/nuevo')}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Volver al formulario
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
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 -mx-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className={`font-semibold ${canGenerate ? 'text-blue-700' : 'text-gray-400'}`}>
              {selectedCount} seleccionados
            </span>
            <span className="text-gray-400"> (mín. 3, máx. 10)</span>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={!canGenerate || isCalculating}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Generar Reporte ACM →
          </button>
        </div>
      </div>
    </>
  );
}
