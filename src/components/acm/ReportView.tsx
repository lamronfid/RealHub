'use client';
import { useState } from 'react';
import { useAcmStore } from '@/store/acm-store';
import { calcReportData, getComparisonSqm } from '@/lib/acm/calculations';
import type { AcmPricePositioning } from '@/types/acm';

const POSITIONING: Record<AcmPricePositioning, { label: string; cls: string; icon: string }> = {
  within_market: {
    label: 'Tu precio está dentro del mercado',
    cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800',
    icon: '🟢',
  },
  slightly_above: {
    label: 'Tu precio está levemente por encima del mercado',
    cls: 'bg-amber-500/10 border-amber-500/20 text-amber-800',
    icon: '🟡',
  },
  significantly_above: {
    label: 'Tu precio está significativamente por encima del mercado',
    cls: 'bg-rose-500/10 border-rose-500/20 text-rose-800',
    icon: '🔴',
  },
  below_market: {
    label: 'Tu precio está por debajo del mercado — oportunidad de ajuste',
    cls: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-800',
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
      className="w-24 text-right text-xs border border-slate-205/85 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white/70 backdrop-blur-xs font-bold transition-all shadow-xs"
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
      <section className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-5">
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight font-heading mb-4">Propiedad en Análisis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-sans">
          {subjectGridItems.map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{label}</p>
              <p className="font-extrabold text-slate-805 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* B — Tabla de comparables */}
      <section className="glass-panel shadow-premium rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100/60 space-y-1">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight font-heading">Tabla de Comparables</h2>
          <p className="text-[11px] text-slate-450 font-medium">
            Ajuste (+/-) modifica el precio considerado en el análisis.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 text-slate-450 text-[10px] font-black uppercase tracking-wider border-b border-slate-100/60">
              <tr>
                <th className="px-5 py-4 text-left">Propiedad</th>
                <th className="px-5 py-4 text-right">Precio USD</th>
                <th className="px-5 py-4 text-right">m²</th>
                <th className="px-5 py-4 text-right">USD/m²</th>
                <th className="px-5 py-4 text-center">Dorm.</th>
                <th className="px-5 py-4 text-center">Año</th>
                <th className="px-5 py-4 text-center">Similitud</th>
                <th className="px-5 py-4 text-right">Ajuste USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {selected.map((c) => (
                <tr key={c.id} className="hover:bg-indigo-50/10 transition-colors font-sans">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800 line-clamp-1 leading-snug">{c.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{c.source}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-slate-800">
                    USD {fmt(c.price + (c.adjustment ?? 0))}
                    {c.adjustment ? (
                      <span className={`block text-[10px] font-bold ${c.adjustment > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        base {fmt(c.price)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-500 font-bold">{c.sqm ?? '—'}</td>
                  <td className="px-5 py-4 text-right text-slate-500 font-bold">
                    {c.sqm ? `USD ${fmt(Math.round((c.price + (c.adjustment ?? 0)) / c.sqm))}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-center text-slate-500 font-bold">{c.bedrooms ?? '—'}</td>
                  <td className="px-5 py-4 text-center text-slate-500 font-bold">{c.yearBuilt ?? '—'}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        c.similarityScore >= 70
                          ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                          : c.similarityScore >= 50
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                      }`}
                    >
                      {c.similarityScore}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <AdjustmentInput id={c.id} value={c.adjustment} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* C — Análisis de mercado */}
      <section className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight font-heading mb-4">Análisis de Mercado</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Precio promedio', value: `USD ${fmt(reportData.averagePrice)}`, highlight: false },
            { label: 'Precio/m² promedio', value: `USD ${fmt(reportData.averagePricePerSqm)}`, highlight: false },
            { label: 'Rango de mercado', value: `USD ${fmt(reportData.minPrice)} – ${fmt(reportData.maxPrice)}`, highlight: false },
            { label: 'Precio sugerido', value: `USD ${fmt(reportData.suggestedPrice)}`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-2xl p-5 transition-all shadow-xs ${highlight ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-805' : 'bg-slate-50/50 border border-slate-100/60'}`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${highlight ? 'text-indigo-650' : 'text-slate-400'}`}>{label}</p>
              <p className={`font-black text-sm tracking-tight ${highlight ? 'text-indigo-750' : 'text-slate-800'}`}>{value}</p>
            </div>
          ))}
        </div>

        {reportData.refPricePerSqm && (
          <div className="bg-slate-50/50 border border-slate-100/60 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs text-slate-750 font-sans">
            <span className="font-semibold">
              📍 Promedio de referencia histórico para el barrio <span className="font-extrabold text-slate-850">{subjectProperty.neighborhood || subjectProperty.city}</span>:
            </span>
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900">USD {fmt(reportData.refPricePerSqm)}/m²</span>
              {reportData.deviationPct !== undefined && reportData.deviationPct !== null && (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  reportData.deviationPct > 0 ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20'
                }`}>
                  {reportData.deviationPct > 0 ? '▲' : '▼'} {Math.abs(reportData.deviationPct)}% vs calculado
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`border rounded-2xl p-5 font-sans ${positioning.cls}`}>
          <p className="font-bold text-xs flex items-center gap-2">
            <span>{positioning.icon}</span> <span>{positioning.label}</span>
          </p>
        </div>
      </section>

      {/* D — Conclusión */}
      <section className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6 font-sans">
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight font-heading">Conclusión</h2>
        <p className="text-slate-600 text-xs leading-relaxed font-semibold">{reportData.conclusion}</p>

        <div className="flex gap-10 text-xs">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Precio recomendado de publicación</p>
            <p className="text-xl font-black text-indigo-650">
              USD {fmt(reportData.suggestedPrice)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiempo estimado en mercado</p>
            <p className="font-black text-slate-805">{reportData.estimatedDaysOnMarket}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Notas del agente
          </label>
          <textarea
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
            rows={3}
            placeholder="Agregá observaciones adicionales para el reporte..."
            className="w-full border border-slate-205/85 bg-white/70 backdrop-blur-xs rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-xs"
          />
        </div>
      </section>
    </div>
  );
}
