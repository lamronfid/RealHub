'use client';
import { useState } from 'react';
import { useAcmStore } from '@/store/acm-store';
import { calcReportData, getComparisonSqm } from '@/lib/acm/calculations';
import type { AcmPricePositioning } from '@/types/acm';

const POSITIONING: Record<AcmPricePositioning, { label: string; cls: string; icon: string }> = {
  within_market: {
    label: 'Tu precio está dentro del mercado',
    cls: 'bg-green-50 border-green-200 text-green-800',
    icon: '🟢',
  },
  slightly_above: {
    label: 'Tu precio está levemente por encima del mercado',
    cls: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: '🟡',
  },
  significantly_above: {
    label: 'Tu precio está significativamente por encima del mercado',
    cls: 'bg-red-50 border-red-200 text-red-800',
    icon: '🔴',
  },
  below_market: {
    label: 'Tu precio está por debajo del mercado — oportunidad de ajuste',
    cls: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: '🔵',
  },
};

const fmt = (n: number) => n.toLocaleString('es-PY');

// Fix #3 — inline adjustment input that updates the comparable and triggers recalc.
function AdjustmentInput({ id, value }: { id: string; value?: number }) {
  const { updateComparable } = useAcmStore();
  const [raw, setRaw] = useState(value != null ? String(value) : '');

  function handleBlur() {
    const n = parseInt(raw, 10);
    if (raw === '' || raw === '-') {
      updateComparable(id, { adjustment: undefined });
    } else if (!isNaN(n)) {
      updateComparable(id, { adjustment: n });
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={(e) => setRaw(e.target.value.replace(/[^-\d]/g, ''))}
      onBlur={handleBlur}
      placeholder="0"
      className="w-24 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
    />
  );
}

export default function ReportView() {
  const { subjectProperty, getSelectedComparables, agentNotes, setAgentNotes } =
    useAcmStore();
  const selected = getSelectedComparables();

  // Fix #3 — derive report data live so adjustments are reflected immediately.
  if (selected.length === 0) return null;
  const reportData = calcReportData(subjectProperty, selected);

  const positioning = POSITIONING[reportData.pricePositioning];
  const subjectSqm = getComparisonSqm(subjectProperty.propertyType, subjectProperty.sqmTotal, subjectProperty.sqmBuilt);
  const subjectPricePerSqm =
    subjectProperty.priceTarget && subjectSqm
      ? Math.round(subjectProperty.priceTarget / subjectSqm)
      : null;

  const subjectGridItems = [
    ['Tipo', subjectProperty.propertyType],
    ['Operación', subjectProperty.operationType],
    ['Ubicación', `${subjectProperty.neighborhood}, ${subjectProperty.city}`],
    ['Estado', subjectProperty.propertyCondition?.replace('_', ' ')],
    ['Precio objetivo', subjectProperty.priceTarget ? `USD ${fmt(subjectProperty.priceTarget)}` : '—'],
    ['Precio por m²', subjectPricePerSqm ? `USD ${fmt(subjectPricePerSqm)}` : '—'],
    ['m² totales', subjectProperty.sqmTotal?.toString() ?? '—'],
  ];

  if (subjectProperty.propertyType !== 'terreno' && subjectProperty.sqmBuilt) {
    subjectGridItems.push(['m² construidos', subjectProperty.sqmBuilt.toString()]);
  }

  subjectGridItems.push(['Dormitorios', subjectProperty.bedrooms?.toString() ?? '—']);

  return (
    <div className="space-y-6">
      {/* A — Propiedad sujeto */}
      <section className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Propiedad en Análisis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {subjectGridItems.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-gray-900 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* B — Tabla de comparables */}
      <section className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Tabla de Comparables</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Ajuste (+/-) modifica el precio considerado en el análisis.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Propiedad</th>
                <th className="px-4 py-3 text-right">Precio USD</th>
                <th className="px-4 py-3 text-right">m²</th>
                <th className="px-4 py-3 text-right">USD/m²</th>
                <th className="px-4 py-3 text-center">Dorm.</th>
                <th className="px-4 py-3 text-center">Año</th>
                <th className="px-4 py-3 text-center">Similitud</th>
                <th className="px-4 py-3 text-right">Ajuste USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selected.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.source}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    USD {fmt(c.price + (c.adjustment ?? 0))}
                    {c.adjustment ? (
                      <span className={`block text-xs ${c.adjustment > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        base {fmt(c.price)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.sqm ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.sqm ? `USD ${fmt(Math.round((c.price + (c.adjustment ?? 0)) / c.sqm))}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.bedrooms ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.yearBuilt ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.similarityScore >= 70
                          ? 'bg-green-100 text-green-700'
                          : c.similarityScore >= 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {c.similarityScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdjustmentInput id={c.id} value={c.adjustment} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C — Análisis de mercado */}
      <section className="bg-white rounded-xl border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Análisis de Mercado</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Precio promedio', value: `USD ${fmt(reportData.averagePrice)}`, highlight: false },
            { label: 'Precio/m² promedio', value: `USD ${fmt(reportData.averagePricePerSqm)}`, highlight: false },
            { label: 'Rango de mercado', value: `USD ${fmt(reportData.minPrice)} – ${fmt(reportData.maxPrice)}`, highlight: false },
            { label: 'Precio sugerido', value: `USD ${fmt(reportData.suggestedPrice)}`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-lg p-4 ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
            >
              <p className={`text-xs mb-1 ${highlight ? 'text-blue-500' : 'text-gray-400'}`}>{label}</p>
              <p className={`font-bold text-sm ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
            </div>
          ))}
        </div>

        {reportData.refPricePerSqm && (
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">
              📍 Promedio de referencia histórico para el barrio <span className="font-semibold">{subjectProperty.neighborhood || subjectProperty.city}</span>:
            </span>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-slate-900">USD {fmt(reportData.refPricePerSqm)}/m²</span>
              {reportData.deviationPct !== undefined && reportData.deviationPct !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  reportData.deviationPct > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {reportData.deviationPct > 0 ? '▲' : '▼'} {Math.abs(reportData.deviationPct)}% vs calculado
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`border rounded-lg p-4 ${positioning.cls}`}>
          <p className="font-semibold text-sm">
            {positioning.icon} {positioning.label}
          </p>
        </div>
      </section>

      {/* D — Conclusión */}
      <section className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Conclusión</h2>
        <p className="text-gray-700 text-sm leading-relaxed">{reportData.conclusion}</p>

        <div className="flex gap-8 text-sm">
          <div>
            <p className="text-xs text-gray-400">Precio recomendado de publicación</p>
            <p className="text-xl font-bold text-blue-700">
              USD {fmt(reportData.suggestedPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tiempo estimado en mercado</p>
            <p className="font-semibold text-gray-900">{reportData.estimatedDaysOnMarket}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">
            Notas del agente
          </label>
          <textarea
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
            rows={3}
            placeholder="Agregá observaciones adicionales para el reporte..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700"
          />
        </div>
      </section>
    </div>
  );
}
