'use client';
import { PDFDownloadLink } from '@react-pdf/renderer';
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
  return (
    <PDFDownloadLink
      document={<AcmPdfDocument {...props} />}
      fileName={props.fileName}
      className="flex-1"
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? 'Preparando PDF...' : '⬇ Descargar PDF'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
