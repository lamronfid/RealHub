'use client';
import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import AcmPdfDocument from './AcmPdfDocument';
import type { AcmSubjectProperty, AcmComparable, AcmReportData } from '@/types/acm';

interface Props {
  subject: Partial<AcmSubjectProperty>;
  comparables: AcmComparable[];
  reportData: AcmReportData;
  agentNotes: string;
  recipientName: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  agencyName?: string;
  generatedAt: string;
  fileName: string;
}

export default function PdfExportButton(props: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Generate the PDF document tree on-demand
      const doc = <AcmPdfDocument {...props} />;
      
      // 2. Imperatively compile the document to a binary Blob
      const blob = await pdf(doc).toBlob();
      
      // 3. Create a temporary download URL and click it programmatically
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = props.fileName;
      document.body.appendChild(link);
      link.click();
      
      // 4. Cleanup resources
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('No se pudo generar el archivo PDF. Por favor, intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex-1 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-[0.99] active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? 'Generando PDF...' : '⬇ Descargar PDF'}
    </button>
  );
}
