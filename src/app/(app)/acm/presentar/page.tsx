'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcmStore } from '@/store/acm-store';
import { calcReportData, getComparisonSqm } from '@/lib/acm/calculations';
import Link from 'next/link';

export default function PresentarPage() {
  const router = useRouter();
  const {
    subjectProperty,
    getSelectedComparables,
    setAdjustment,
    reset,
  } = useAcmStore();

  const selected = getSelectedComparables();
  const [presenterView, setPresenterView] = useState(false);

  if (!subjectProperty.operationType || selected.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>No hay datos suficientes para la presentación.</p>
        <button
          onClick={() => router.push('/acm/nuevo')}
          className="mt-4 bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-indigo-700 transition"
        >
          Iniciar nuevo ACM
        </button>
      </div>
    );
  }

  const currencySymbol = 'USD';

  // Derive report data live based on adjustments
  const reportData = calcReportData(subjectProperty, selected);
  const subjectSqm = getComparisonSqm(subjectProperty.propertyType, subjectProperty.sqmTotal, subjectProperty.sqmBuilt);
  const subjectPricePerSqm =
    subjectProperty.priceTarget && subjectSqm
      ? Math.round(subjectProperty.priceTarget / subjectSqm)
      : null;

  const fmt = (n: number) => n.toLocaleString('es-PY');

  // Adjustments presets
  const presets = [
    { label: '🏊‍♂️ Piscina', value: 15000 },
    { label: '🥩 Quincho', value: 8000 },
    { label: '🚗 Cochera', value: 10000 },
    { label: '✨ Renovado', value: 20000 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 -m-4 md:-m-8 transition-colors duration-300">
      
      {/* Top Bar Controls */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">slideshow</span>
            Presentación ACM Interactiva
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {subjectProperty.neighborhood}, {subjectProperty.city} · {selected.length} Propiedades Comparadas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPresenterView(!presenterView)}
            className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition duration-200 border ${
              presenterView
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-650/20'
                : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {presenterView ? 'visibility_off' : 'visibility'}
            </span>
            {presenterView ? 'Modo Presentación (Activo)' : 'Vista Cliente'}
          </button>
          
          <button
            onClick={() => router.push('/acm/reporte')}
            className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-full font-bold text-sm transition"
          >
            Volver al Reporte
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Subject Property Card & live valuation metrics */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Subject property summary card */}
          <div className="bg-slate-850 rounded-3xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full pointer-events-none" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">home</span> Propiedad en Análisis
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-2xl font-extrabold text-white tracking-tight">
                  {subjectProperty.neighborhood}
                </p>
                <p className="text-sm text-slate-400">{subjectProperty.city}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Tipo</p>
                  <p className="font-semibold text-slate-200 mt-0.5 capitalize">{subjectProperty.propertyType}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Sup. Terreno</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{subjectProperty.sqmTotal} m²</p>
                </div>
                {subjectProperty.sqmBuilt && (
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider">Sup. Cubierta</p>
                    <p className="font-semibold text-slate-200 mt-0.5">{subjectProperty.sqmBuilt} m²</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider">Dormitorios</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{subjectProperty.bedrooms}</p>
                </div>
              </div>

              {subjectProperty.priceTarget && (
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Precio Objetivo</p>
                  <p className="text-2xl font-extrabold text-indigo-300 mt-1">
                    {currencySymbol} {fmt(subjectProperty.priceTarget)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Recalculating Metrics Gauge card */}
          <div className="bg-slate-850 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">analytics</span>
              Valuación Sugerida
            </h2>

            <div className="text-center py-4">
              <p className="text-5xl font-black text-emerald-400 tracking-tight transition-all duration-300">
                {currencySymbol} {fmt(reportData.suggestedPrice)}
              </p>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">
                Recomendación de Mercado
              </p>
            </div>

            <div className="space-y-3.5 pt-4 border-t border-slate-850">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Precio Promedio:</span>
                <span className="font-extrabold text-slate-200">{currencySymbol} {fmt(reportData.averagePrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Promedio m²:</span>
                <span className="font-extrabold text-slate-200">{currencySymbol} {fmt(reportData.averagePricePerSqm)}/m²</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Rango Mín/Máx:</span>
                <span className="font-extrabold text-slate-200">
                  {currencySymbol} {fmt(reportData.minPrice)} - {fmt(reportData.maxPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Tiempo Estimado:</span>
                <span className="font-extrabold text-indigo-300">{reportData.estimatedDaysOnMarket}</span>
              </div>
              {reportData.refPricePerSqm && (
                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3 mt-3">
                  <span className="text-slate-400">Ref. Barrio ({subjectProperty.neighborhood}):</span>
                  <span className="font-extrabold text-indigo-300">{currencySymbol} {fmt(reportData.refPricePerSqm)}/m²</span>
                </div>
              )}
              {reportData.refPricePerSqm && reportData.deviationPct !== undefined && reportData.deviationPct !== null && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Desviación del Barrio:</span>
                  <span className={`font-bold ${reportData.deviationPct > 0 ? 'text-amber-405' : 'text-emerald-400'}`}>
                    {reportData.deviationPct > 0 ? '▲' : '▼'} {Math.abs(reportData.deviationPct)}% vs ref
                  </span>
                </div>
              )}
            </div>

            <div className={`mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 ${
              reportData.pricePositioning === 'within_market'
                ? 'bg-green-950/40 border-green-800/80 text-green-300'
                : reportData.pricePositioning === 'slightly_above'
                ? 'bg-yellow-950/40 border-yellow-800/80 text-yellow-350'
                : reportData.pricePositioning === 'below_market'
                ? 'bg-blue-950/40 border-blue-800/80 text-blue-300'
                : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}>
              <span className="text-lg">
                {reportData.pricePositioning === 'within_market' && '🟢'}
                {reportData.pricePositioning === 'slightly_above' && '🟡'}
                {reportData.pricePositioning === 'below_market' && '🔵'}
                {reportData.pricePositioning === 'significantly_above' && '🔴'}
              </span>
              <span>
                {reportData.pricePositioning === 'within_market' && 'Precio en Rango de Mercado'}
                {reportData.pricePositioning === 'slightly_above' && 'Levemente sobre el Mercado'}
                {reportData.pricePositioning === 'below_market' && 'Bajo el Mercado'}
                {reportData.pricePositioning === 'significantly_above' && 'Sobre el Mercado (Alto)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Comparables with Adjustments UI */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">compare_arrows</span>
            Propiedades Comparables
          </h2>

          <div className="space-y-4">
            {selected.map((comp) => {
              const currentAdjustment = comp.adjustment || 0;
              const adjustedPrice = comp.price + currentAdjustment;

              return (
                <div
                  key={comp.id}
                  className="bg-slate-850 rounded-3xl border border-slate-800 p-6 shadow-md transition duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Comp Info */}
                    <div className="flex gap-4">
                      {comp.photo ? (
                        <img
                          src={comp.photo}
                          alt={comp.title}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover bg-slate-800 border border-slate-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-800 flex-shrink-0">
                          <span className="material-symbols-outlined">landscape</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-extrabold text-white text-base md:text-lg line-clamp-1">
                          {comp.title}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-outlined text-[13px]">location_on</span>
                          {comp.neighborhood || comp.location || 'Ubicación no especificada'}
                        </p>
                        <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                          {comp.sqm && <span>📐 {comp.sqm} m²</span>}
                          {comp.bedrooms && <span>🛏️ {comp.bedrooms} Dorms</span>}
                          {comp.similarityScore && (
                            <span className="bg-slate-800 text-indigo-300 font-bold px-2 py-0.5 rounded-md">
                              Similitud: {comp.similarityScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="text-right flex-shrink-0 flex flex-col justify-between h-full min-w-[140px]">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Precio Ajustado
                        </p>
                        <p className="text-2xl font-black text-white mt-1">
                          USD {fmt(adjustedPrice)}
                        </p>
                      </div>
                      
                      {currentAdjustment !== 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          Base: <span className="font-semibold text-slate-300">USD {fmt(comp.price)}</span>
                          <span className={`font-bold ml-1.5 ${
                            currentAdjustment > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {currentAdjustment > 0 ? '+' : ''}
                            {fmt(currentAdjustment)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Interactive Adjustment Sliders & presets (Hidden in presenter view) */}
                  {!presenterView && (
                    <div className="mt-6 pt-5 border-t border-slate-800 space-y-4">
                      
                      {/* Presets Grid */}
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
                          Ajustes Rápidos
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {presets.map((preset) => (
                            <div key={preset.label} className="flex items-center bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                              <span className="text-xs font-semibold px-3 py-1.5 text-slate-300 select-none">
                                {preset.label}
                              </span>
                              <button
                                onClick={() => setAdjustment(comp.id, currentAdjustment + preset.value)}
                                className="bg-slate-750 hover:bg-slate-700 text-green-400 text-xs font-extrabold px-2 py-1.5 transition border-l border-slate-700"
                              >
                                +
                              </button>
                              <button
                                onClick={() => setAdjustment(comp.id, currentAdjustment - preset.value)}
                                className="bg-slate-750 hover:bg-slate-700 text-red-400 text-xs font-extrabold px-2 py-1.5 transition border-l border-slate-700"
                              >
                                -
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Manual Slider & Manual Input */}
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-full">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                            <span>Ajuste Personalizado</span>
                            <span className="text-slate-350">USD {currentAdjustment > 0 ? '+' : ''}{fmt(currentAdjustment)}</span>
                          </div>
                          <input
                            type="range"
                            min="-100000"
                            max="100000"
                            step="1000"
                            value={currentAdjustment}
                            onChange={(e) => setAdjustment(comp.id, parseInt(e.target.value))}
                            className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        
                        <div className="w-full sm:w-auto flex-shrink-0">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                            Valor Exacto
                          </p>
                          <div className="relative rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">$</span>
                            <input
                              type="number"
                              value={currentAdjustment}
                              onChange={(e) => setAdjustment(comp.id, parseInt(e.target.value) || 0)}
                              className="pl-7 pr-3 py-1.5 w-32 bg-transparent text-right text-sm font-semibold text-white focus:outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
