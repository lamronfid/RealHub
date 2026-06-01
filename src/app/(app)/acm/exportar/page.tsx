'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcmStore } from '@/store/acm-store';

// Loaded client-side only — react-pdf cannot run on the server
const PdfExportButton = dynamic(
  () => import('@/components/acm/PdfExportButton'),
  {
    ssr: false,
    loading: () => (
      <button disabled className="w-full px-6 py-3 bg-blue-200 text-white font-semibold rounded-lg text-sm cursor-wait">
        Cargando generador de PDF...
      </button>
    ),
  }
);

export default function ExportarPage() {
  const router = useRouter();
  const {
    subjectProperty,
    reportData,
    agentNotes,
    recipientName,
    setRecipientName,
    getSelectedComparables,
  } = useAcmStore();

  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');

  if (!reportData || !subjectProperty.operationType) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>No hay reporte para exportar.</p>
        <button
          onClick={() => router.push('/acm/nuevo')}
          className="mt-4 text-blue-600 text-sm hover:underline"
        >
          Iniciar nuevo ACM →
        </button>
      </div>
    );
  }

  const selected = getSelectedComparables();
  const generatedAt = new Date().toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const fileName = `ACM_${(subjectProperty.neighborhood ?? 'barrio').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Exportar PDF</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Completá los datos del agente para personalizar el reporte
          </p>
        </div>
        <button
          onClick={() => router.push('/acm/reporte')}
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          ← Volver al reporte
        </button>
      </div>

      {/* Agent branding form */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos del agente (aparecen en el PDF)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              { label: 'Nombre completo', value: agentName, onChange: setAgentName, placeholder: 'María González' },
              { label: 'Inmobiliaria / Agencia', value: agencyName, onChange: setAgencyName, placeholder: 'Remax Paraguay' },
              { label: 'Teléfono', value: agentPhone, onChange: setAgentPhone, placeholder: '+595 981 000 000' },
              { label: 'Email', value: agentEmail, onChange: setAgentEmail, placeholder: 'maria@remax.com.py' },
            ] as const
          ).map(({ label, value, onChange, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => (onChange as (v: string) => void)(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Preparado para (nombre del cliente)
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Carlos Benítez"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* PDF contents summary */}
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600 space-y-1">
        <p className="font-medium text-gray-800">Contenido del PDF</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-500">
          <li>Portada con datos del agente</li>
          <li>Ficha de la propiedad en análisis</li>
          <li>Tabla de {selected.length} comparables seleccionados</li>
          <li>Análisis de mercado y precio sugerido</li>
          <li>Conclusión{agentNotes ? ' + notas del agente' : ''}</li>
          <li>Aviso legal</li>
        </ul>
        <p className="text-xs text-gray-400 pt-1">Archivo: {fileName}</p>
      </div>

      {/* PDF download — client-only */}
      <div className="flex gap-3">
        <PdfExportButton
          subject={subjectProperty}
          comparables={selected}
          reportData={reportData}
          agentNotes={agentNotes}
          recipientName={recipientName}
          agentName={agentName || undefined}
          agentPhone={agentPhone || undefined}
          agentEmail={agentEmail || undefined}
          agencyName={agencyName || undefined}
          generatedAt={generatedAt}
          fileName={fileName}
        />
      </div>
    </div>
  );
}
