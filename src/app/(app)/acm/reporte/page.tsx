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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reporte ACM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subjectProperty.neighborhood}, {subjectProperty.city} ·{' '}
            {getSelectedComparables().length} comparables seleccionados
          </p>
        </div>
        <button
          onClick={() => router.push('/acm/comparables')}
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← Editar comparables
        </button>
      </div>

      <ReportView />

      <div className="flex flex-wrap gap-3 justify-between pt-2">
        {/* Fix #16 — reset store so agentNotes and comparables don't leak into the next session. */}
        <button
          onClick={() => { reset(); router.push('/acm/nuevo'); }}
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          + Nueva tasación
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              saved
                ? 'bg-green-50 border-green-300 text-green-700 cursor-default'
                : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50'
            }`}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar ACM'}
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Exportar PDF →
          </button>
        </div>
      </div>
    </div>
  );
}
