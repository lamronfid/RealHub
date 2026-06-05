import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { AcmSubjectProperty, AcmComparable, AcmReportData, AcmPricePositioning } from '@/types/acm';
import { getComparisonSqm } from '@/lib/acm/calculations';

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
}

const POSITIONING_LABEL: Record<AcmPricePositioning, string> = {
  within_market:       'Dentro del mercado',
  slightly_above:      'Levemente sobre el mercado',
  significantly_above: 'Significativamente sobre el mercado',
  below_market:        'Por debajo del mercado',
};

// Fix #8 — each positioning has its own color scheme in the PDF.
const POSITIONING_COLORS: Record<AcmPricePositioning, { bg: string; border: string; text: string }> = {
  within_market:       { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  slightly_above:      { bg: '#fefce8', border: '#fde68a', text: '#854d0e' },
  significantly_above: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  below_market:        { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
};

const DISCLAIMER =
  'Este análisis es una estimación basada en datos de mercado disponibles al momento de su generación. ' +
  'No constituye una tasación oficial ni reemplaza la opinión de un perito tasador matriculado.';

const fmt = (n: number) => n.toLocaleString('es-PY');

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  // Cover
  coverTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 6 },
  coverSubtitle: { fontSize: 13, color: '#4b5563', marginBottom: 32 },
  brandTag: { fontSize: 10, color: '#6b7280' },
  agentBlock: { marginTop: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 6 },
  agentName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  agentDetail: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  recipientLine: { marginTop: 16, fontSize: 10, color: '#374151' },
  // Section headings
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 10, color: '#111827' },
  // Data grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { width: '22%', marginBottom: 8 },
  cellLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 2 },
  cellValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', padding: '6 4', borderBottom: '1 solid #e5e7eb' },
  tableRow: { flexDirection: 'row', padding: '5 4', borderBottom: '1 solid #f3f4f6' },
  th: { fontSize: 7, color: '#9ca3af', fontFamily: 'Helvetica-Bold' },
  td: { fontSize: 8, color: '#374151' },
  col1: { flex: 3 },
  colSm: { flex: 1.2, textAlign: 'right' },
  colXs: { flex: 0.8, textAlign: 'center' },
  // Stat cards
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, padding: 10, backgroundColor: '#f9fafb', borderRadius: 6 },
  statCardHighlight: { flex: 1, padding: 10, backgroundColor: '#eff6ff', borderRadius: 6, border: '1 solid #bfdbfe' },
  statLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  statValueBlue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  // Positioning banner — base; colors applied dynamically per positioning (#8)
  banner: { padding: 10, borderRadius: 6, marginBottom: 14 },
  bannerText: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  // Conclusion
  conclusionText: { fontSize: 10, color: '#374151', lineHeight: 1.6 },
  notesBlock: { marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6 },
  notesLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 4 },
  notesText: { fontSize: 9, color: '#374151', lineHeight: 1.5 },
  // Disclaimer
  disclaimerBox: { marginTop: 'auto', padding: 12, backgroundColor: '#f9fafb', borderRadius: 6 },
  disclaimerText: { fontSize: 8, color: '#9ca3af', lineHeight: 1.5 },
  // Divider
  divider: { borderBottom: '1 solid #e5e7eb', marginBottom: 16, marginTop: 8 },
  // Date
  dateText: { fontSize: 8, color: '#9ca3af' },
});

export default function AcmPdfDocument({
  subject,
  comparables,
  reportData,
  agentNotes,
  recipientName,
  agentName = 'Agente RealHub',
  agentPhone = '',
  agentEmail = '',
  agencyName = 'RealHub',
  generatedAt,
}: Props) {
  return (
    <Document title="Análisis Comparativo de Mercado — RealHub">
      {/* ─── Página 1: Portada ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.brandTag}>RealHub · ACM</Text>
        <View style={{ height: 32 }} />
        <Text style={styles.coverTitle}>Análisis Comparativo{'\n'}de Mercado</Text>
        <Text style={styles.coverSubtitle}>
          {subject.propertyType} · {subject.operationType} · {subject.neighborhood}, {subject.city}
        </Text>

        <View style={styles.divider} />

        <View style={styles.agentBlock}>
          <Text style={styles.agentName}>{agentName}</Text>
          {agencyName && <Text style={styles.agentDetail}>{agencyName}</Text>}
          {agentPhone && <Text style={styles.agentDetail}>{agentPhone}</Text>}
          {agentEmail && <Text style={styles.agentDetail}>{agentEmail}</Text>}
        </View>

        {recipientName && (
          <Text style={styles.recipientLine}>Preparado para: {recipientName}</Text>
        )}

        <View style={{ marginTop: 'auto' }}>
          <Text style={styles.dateText}>Generado el {generatedAt}</Text>
        </View>
      </Page>

      {/* ─── Página 2: Propiedad sujeto ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Propiedad en Análisis</Text>
        <View style={styles.grid}>
          {(() => {
            const subjectSqm = getComparisonSqm(subject.propertyType, subject.sqmTotal, subject.sqmBuilt);
            const subjectPricePerSqm =
              subject.priceTarget && subjectSqm
                ? `USD ${fmt(Math.round(subject.priceTarget / subjectSqm))}`
                : '—';

            return [
              ['Tipo de operación', subject.operationType],
              ['Tipo de propiedad', subject.propertyType],
              ['Estado', subject.propertyCondition?.replace('_', ' ')],
              ['Ubicación', `${subject.neighborhood}, ${subject.city}`],
              ['Precio objetivo', subject.priceTarget ? `USD ${fmt(subject.priceTarget)}` : '—'],
              ['m² totales', subject.sqmTotal?.toString() ?? '—'],
              ['m² construidos', subject.sqmBuilt?.toString() ?? '—'],
              ['Dormitorios', subject.bedrooms?.toString() ?? '—'],
              ['Garages', subject.garages?.toString() ?? '0'],
              ['Año construcción', subject.yearBuilt?.toString() ?? '—'],
              ['Precio por m²', subjectPricePerSqm],
            ].map(([label, value]) => (
              <View style={styles.gridCell} key={label}>
                <Text style={styles.cellLabel}>{label}</Text>
                <Text style={styles.cellValue}>{value ?? '—'}</Text>
              </View>
            ));
          })()}
        </View>

        {subject.amenities && subject.amenities.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.cellLabel}>Amenidades</Text>
            <Text style={{ fontSize: 9, color: '#374151' }}>
              {subject.amenities.join(' · ')}
            </Text>
          </View>
        )}

        {subject.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.cellLabel}>Notas adicionales</Text>
            <Text style={{ fontSize: 9, color: '#374151' }}>{subject.notes}</Text>
          </View>
        )}
      </Page>

      {/* ─── Página 3: Comparables ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>
          Propiedades Comparables ({comparables.length})
        </Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.col1]}>Propiedad</Text>
          <Text style={[styles.th, styles.colSm]}>Precio USD</Text>
          <Text style={[styles.th, styles.colXs]}>m²</Text>
          <Text style={[styles.th, styles.colSm]}>USD/m²</Text>
          <Text style={[styles.th, styles.colXs]}>Dorm.</Text>
          <Text style={[styles.th, styles.colXs]}>Sim.%</Text>
        </View>

        {/* Fix #14 — wrap={false} prevents a row from being split across pages. */}
        {comparables.map((c) => (
          <View key={c.id} style={styles.tableRow} wrap={false}>
            <View style={styles.col1}>
              <Text style={[styles.td, { fontFamily: 'Helvetica-Bold' }]}>
                {c.title}
              </Text>
              <Text style={[styles.td, { color: '#9ca3af', fontSize: 7 }]}>{c.source}</Text>
            </View>
            <Text style={[styles.td, styles.colSm]}>{fmt(c.price + (c.adjustment ?? 0))}</Text>
            <Text style={[styles.td, styles.colXs]}>{c.sqm ?? '—'}</Text>
            <Text style={[styles.td, styles.colSm]}>
              {c.sqm ? fmt(Math.round((c.price + (c.adjustment ?? 0)) / c.sqm)) : '—'}
            </Text>
            <Text style={[styles.td, styles.colXs]}>{c.bedrooms ?? '—'}</Text>
            <Text style={[styles.td, styles.colXs]}>{c.similarityScore}%</Text>
          </View>
        ))}
      </Page>

      {/* ─── Página 4: Análisis y conclusión ─── */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Análisis de Mercado</Text>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Precio promedio</Text>
            <Text style={styles.statValue}>USD {fmt(reportData.averagePrice)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Precio/m² promedio</Text>
            <Text style={styles.statValue}>USD {fmt(reportData.averagePricePerSqm)}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rango de mercado</Text>
            <Text style={styles.statValue}>
              USD {fmt(reportData.minPrice)} – {fmt(reportData.maxPrice)}
            </Text>
          </View>
          <View style={styles.statCardHighlight}>
            <Text style={[styles.statLabel, { color: '#3b82f6' }]}>Precio sugerido</Text>
            <Text style={styles.statValueBlue}>USD {fmt(reportData.suggestedPrice)}</Text>
          </View>
        </View>

        {/* Fix #8 — dynamic colors per positioning. */}
        {(() => {
          const pc = POSITIONING_COLORS[reportData.pricePositioning];
          return (
            <View style={[styles.banner, { backgroundColor: pc.bg, border: `1 solid ${pc.border}` }]}>
              <Text style={[styles.bannerText, { color: pc.text }]}>
                {POSITIONING_LABEL[reportData.pricePositioning]}
              </Text>
            </View>
          );
        })()}

        <Text style={styles.conclusionText}>{reportData.conclusion}</Text>

        {agentNotes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notas del agente</Text>
            <Text style={styles.notesText}>{agentNotes}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>
            Tiempo estimado en mercado: {reportData.estimatedDaysOnMarket}
          </Text>
        </View>
      </Page>

      {/* ─── Página 5: Cierre ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.disclaimerBox}>
          <Text style={[styles.notesLabel, { marginBottom: 6 }]}>Aviso Legal</Text>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.agentName}>{agentName}</Text>
          {agencyName && <Text style={styles.agentDetail}>{agencyName}</Text>}
          {agentPhone && <Text style={styles.agentDetail}>{agentPhone}</Text>}
          {agentEmail && <Text style={styles.agentDetail}>{agentEmail}</Text>}
        </View>

        <View style={{ marginTop: 'auto' }}>
          <Text style={styles.brandTag}>Generado con RealHub · {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
