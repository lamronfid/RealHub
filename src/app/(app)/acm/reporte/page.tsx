'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcmStore } from '@/store/acm-store';
import ReportView from '@/components/acm/ReportView';
import { createClient } from '@/lib/supabase';
import { getAgentId } from '@/lib/agent';
import { calcReportData } from '@/lib/acm/calculations';

export default function ReportePage() {
  const router = useRouter();
  const {
    subjectProperty,
    reportData,
    agentNotes,
    getSelectedComparables,
    setSavedReportId,
    setCurrentStep,
    setReportData,
    reset,
  } = useAcmStore();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!reportData || !subjectProperty.operationType) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>No hay reporte generado.</p>
        <button
          onClick={() => router.push('/acm/nuevo')}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          Iniciar nuevo ACM →
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const selected = getSelectedComparables();
      // Fix #1 — use getAgentId() instead of hardcoded string.
      const { data, error } = await supabase
        .from('acm_reports')
        .insert({
          agent_id:         getAgentId(),
          subject_property: subjectProperty,
          comparables:      selected,
          report_data:      reportData,
          agent_notes:      agentNotes,
        })
        .select('id')
        .single();

      if (error) throw error;
      setSavedReportId(data.id);
      setSaved(true);
    } catch (err) {
      console.error('Error al guardar ACM:', err);
      alert('No se pudo guardar el reporte. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    // Recompute with latest adjustments before navigating to PDF.
    const fresh = calcReportData(subjectProperty, getSelectedComparables());
    setReportData(fresh);
    setCurrentStep(4);
    router.push('/acm/exportar');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between font-sans">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">Reporte ACM</h1>
          <p className="text-xs text-slate-450 mt-1 font-medium">
            {subjectProperty.neighborhood}, {subjectProperty.city} ·{' '}
            {getSelectedComparables().length} comparables seleccionados
          </p>
        </div>
        <button
          onClick={() => router.push('/acm/comparables')}
          className="text-xs font-bold text-slate-450 hover:text-indigo-650 transition-colors flex items-center gap-1"
        >
          <span>←</span> Editar comparables
        </button>
      </div>

      <ReportView />

      <div className="flex flex-wrap gap-3 justify-between pt-2 font-sans">
        {/* Fix #16 — reset store so agentNotes and comparables don't leak into the next session. */}
        <button
          onClick={() => { reset(); router.push('/acm/nuevo'); }}
          className="text-xs font-bold text-slate-450 hover:text-indigo-650 transition-colors"
        >
          + Nueva tasación
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/acm/presentar')}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-705 hover:bg-indigo-500/15 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">slideshow</span>
            Presentar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-all shadow-xs ${
              saved
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-705 cursor-default'
                : 'border-slate-200 bg-white/70 text-slate-700 hover:border-indigo-400 hover:text-indigo-650 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar ACM'}
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-[0.99] active:scale-[0.97]"
          >
            Exportar PDF →
          </button>
        </div>
      </div>
    </div>
  );
}
