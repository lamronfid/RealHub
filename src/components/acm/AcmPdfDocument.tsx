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

// Register stable Roboto fonts for premium styling
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Bold.ttf', fontWeight: 'bold' }
  ]
});

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
  within_market:       'Precio dentro del rango de mercado',
  slightly_above:      'Precio levemente sobre el promedio de mercado',
  significantly_above: 'Precio significativamente sobre el mercado',
  below_market:        'Precio por debajo del rango de mercado',
};

const POSITIONING_COLORS: Record<AcmPricePositioning, { bg: string; border: string; text: string }> = {
  within_market:       { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  slightly_above:      { bg: '#fefce8', border: '#fde68a', text: '#854d0e' },
  significantly_above: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  below_market:        { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
};

const DISCLAIMER =
  'Este análisis comparativo es una estimación basada en datos de mercado recopilados activamente. ' +
  'No representa una tasación pericial oficial ni reemplaza el dictamen de un tasador matriculado.';

const fmt = (n: number) => Math.round(n).toLocaleString('es-PY');

const styles = StyleSheet.create({
  page: { 
    paddingTop: 50, 
    paddingBottom: 60, 
    paddingHorizontal: 45, 
    fontFamily: 'Roboto', 
    fontSize: 9, 
    color: '#334155' 
  },
  // Header on pages
  pageHeader: {
    position: 'absolute',
    top: 25,
    left: 45,
    right: 45,
    borderBottom: '1 solid #f1f5f9',
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  // Cover page layout
  coverContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 20,
  },
  accentLine: {
    width: 60,
    height: 4,
    backgroundColor: '#4f46e5',
    marginBottom: 20,
  },
  coverTitle: { 
    fontSize: 32, 
    fontFamily: 'Roboto',
    fontWeight: 'bold', 
    color: '#1e1b4b', 
    lineHeight: 1.25,
    marginBottom: 8 
  },
  coverSubtitle: { 
    fontSize: 12, 
    color: '#64748b', 
    lineHeight: 1.5,
    marginBottom: 40 
  },
  agentCard: { 
    padding: 20, 
    backgroundColor: '#f8fafc', 
    borderRadius: 12, 
    border: '1 solid #e2e8f0',
    marginTop: 30
  },
  agentName: { 
    fontSize: 15, 
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6 
  },
  agentDetail: { 
    fontSize: 9, 
    color: '#64748b', 
    marginBottom: 3 
  },
  recipientBlock: {
    marginTop: 25,
    paddingLeft: 4,
  },
  recipientLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  recipientValue: {
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  // General styles
  sectionTitle: { 
    fontSize: 13, 
    fontFamily: 'Roboto',
    fontWeight: 'bold', 
    color: '#1e1b4b',
    marginBottom: 12,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: { 
    borderBottom: '1 solid #e2e8f0', 
    marginVertical: 15 
  },
  // Subject property info grid
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginBottom: 15 
  },
  gridCell: { 
    width: '31%', 
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    border: '1 solid #f1f5f9',
  },
  cellLabel: { 
    fontSize: 7, 
    color: '#94a3b8', 
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 3 
  },
  cellValue: { 
    fontSize: 9, 
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Table style
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#0f172a', 
    padding: '8 6', 
    borderRadius: 6,
    marginBottom: 4
  },
  tableRow: { 
    flexDirection: 'row', 
    padding: '8 6', 
    borderBottom: '1 solid #e2e8f0',
    alignItems: 'center'
  },
  th: { 
    fontSize: 7.5, 
    color: '#ffffff', 
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  td: { 
    fontSize: 8, 
    color: '#334155',
  },
  col1: { flex: 3.5 },
  colSm: { flex: 1.5, textAlign: 'right' },
  colXs: { flex: 1.0, textAlign: 'center' },
  // Stat cards for valuation
  statGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: { 
    flex: 1, 
    padding: 14, 
    backgroundColor: '#f8fafc', 
    borderRadius: 10,
    border: '1 solid #e2e8f0' 
  },
  statCardHighlight: { 
    flex: 1, 
    padding: 14, 
    backgroundColor: '#e0e7ff', 
    borderRadius: 10, 
    border: '1.5 solid #6366f1' 
  },
  statLabel: { 
    fontSize: 7.5, 
    color: '#64748b', 
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4 
  },
  statValue: { 
    fontSize: 14, 
    fontFamily: 'Roboto',
    fontWeight: 'bold', 
    color: '#0f172a' 
  },
  statValueBlue: { 
    fontSize: 16, 
    fontFamily: 'Roboto',
    fontWeight: 'bold', 
    color: '#4f46e5' 
  },
  // Market position banner
  banner: { 
    padding: 10, 
    borderRadius: 8, 
    border: '1 solid', 
    marginBottom: 16 
  },
  bannerText: { 
    fontSize: 9.5, 
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  // Text blocks
  bodyParagraph: { 
    fontSize: 9, 
    color: '#475569', 
    lineHeight: 1.6,
    marginBottom: 10 
  },
  notesBlock: { 
    marginTop: 15, 
    padding: 12, 
    backgroundColor: '#f8fafc', 
    borderRadius: 8,
    borderLeft: '3 solid #6366f1'
  },
  notesLabel: { 
    fontSize: 8, 
    color: '#64748b', 
    fontWeight: 'bold', 
    textTransform: 'uppercase',
    marginBottom: 4 
  },
  notesText: { 
    fontSize: 8.5, 
    color: '#334155', 
    lineHeight: 1.5 
  },
  // Disclaimer
  disclaimerBox: { 
    marginTop: 'auto', 
    padding: 12, 
    backgroundColor: '#f8fafc', 
    borderRadius: 8,
    border: '1 solid #e2e8f0' 
  },
  disclaimerText: { 
    fontSize: 7.5, 
    color: '#94a3b8', 
    lineHeight: 1.4 
  },
  // Dynamic footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 45,
    right: 45,
    borderTop: '1 solid #f1f5f9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94a3b8',
  },
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
    <Document title={`Reporte ACM - ${subject.neighborhood || subject.city || 'Mercado'}`}>
      
      {/* ─── Página 1: Portada ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverContainer}>
          <View>
            <View style={styles.accentLine} />
            <Text style={styles.coverTitle}>Análisis Comparativo{"\n"}de Mercado (ACM)</Text>
            <Text style={styles.coverSubtitle}>
              Tasación preliminar e informe estratégico para {subject.propertyType || 'Propiedad'} en {subject.neighborhood ? `${subject.neighborhood}, ` : ''}{subject.city || 'Paraguay'}.
            </Text>

            <View style={styles.recipientBlock}>
              {recipientName && (
                <>
                  <Text style={styles.recipientLabel}>Preparado especialmente para</Text>
                  <Text style={styles.recipientValue}>{recipientName}</Text>
                </>
              )}
            </View>
          </View>

          <View>
            <View style={styles.agentCard}>
              <Text style={styles.agentName}>{agentName}</Text>
              {agencyName && <Text style={styles.agentDetail}>{agencyName}</Text>}
              {agentPhone && <Text style={styles.agentDetail}>Tel: {agentPhone}</Text>}
              {agentEmail && <Text style={styles.agentDetail}>Email: {agentEmail}</Text>}
            </View>
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 8, color: '#94a3b8' }}>Generado el {generatedAt} · Impulsado por RealHub</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ─── Página 2: Propiedad sujeto ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader} fixed>
          <Text>RealHub · Análisis de Propiedad</Text>
          <Text>{generatedAt}</Text>
        </View>

        <Text style={styles.sectionTitle}>Propiedad de Referencia</Text>
        <Text style={styles.bodyParagraph}>
          A continuación se detallan los parámetros y características de la propiedad que motivó este estudio. Estos valores se compararon con transacciones reales para determinar la posición competitiva.
        </Text>

        <View style={styles.grid}>
          {(() => {
            const subjectSqm = getComparisonSqm(subject.propertyType || '', subject.sqmTotal, subject.sqmBuilt);
            const subjectPricePerSqm =
              subject.priceTarget && subjectSqm
                ? `USD ${fmt(Math.round(subject.priceTarget / subjectSqm))}`
                : '—';

            return [
              ['Operación', subject.operationType],
              ['Propiedad', subject.propertyType],
              ['Estado', subject.propertyCondition?.replace('_', ' ')],
              ['Barrio', subject.neighborhood || '—'],
              ['Ciudad', subject.city || '—'],
              ['Precio Objetivo', subject.priceTarget ? `USD ${fmt(subject.priceTarget)}` : '—'],
              ['m² Construidos', subject.sqmBuilt?.toString() ?? '—'],
              ['m² Totales', subject.sqmTotal?.toString() ?? '—'],
              ['Dormitorios', subject.bedrooms?.toString() ?? '—'],
              ['Cocheras', subject.garages?.toString() ?? '0'],
              ['Baños', subject.bathrooms?.toString() ?? '—'],
              ['Valor / m²', subjectPricePerSqm],
            ].map(([label, value]) => (
              <View style={styles.gridCell} key={label}>
                <Text style={styles.cellLabel}>{label}</Text>
                <Text style={styles.cellValue}>{value ?? '—'}</Text>
              </View>
            ));
          })()}
        </View>

        {subject.amenities && subject.amenities.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.notesLabel}>Amenidades & Adicionales</Text>
            <Text style={{ fontSize: 9, color: '#334155', lineHeight: 1.4 }}>
              {subject.amenities.join(' · ')}
            </Text>
          </View>
        )}

        {subject.notes && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.notesLabel}>Descripción o Comentarios</Text>
            <Text style={{ fontSize: 9, color: '#334155', lineHeight: 1.4 }}>{subject.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>RealHub · Informe de Tasación Comparativa</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ─── Página 3: Comparables ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader} fixed>
          <Text>RealHub · Comparables de Mercado</Text>
          <Text>{generatedAt}</Text>
        </View>

        <Text style={styles.sectionTitle}>Muestra de Mercado Analizada</Text>
        <Text style={styles.bodyParagraph}>
          Se seleccionaron {comparables.length} propiedades similares actualmente listadas o transaccionadas recientemente en zonas aledañas. Los valores muestran similitud estructural y cercanía geográfica.
        </Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.col1]}>Ubicación y Detalles</Text>
          <Text style={[styles.th, styles.colSm]}>Precio USD</Text>
          <Text style={[styles.th, styles.colXs]}>m²</Text>
          <Text style={[styles.th, styles.colSm]}>USD/m²</Text>
          <Text style={[styles.th, styles.colXs]}>Dorm.</Text>
          <Text style={[styles.th, styles.colXs]}>Sim.%</Text>
        </View>

        {comparables.map((c) => (
          <View key={c.id} style={styles.tableRow} wrap={false}>
            <View style={styles.col1}>
              <Text style={[styles.td, { fontFamily: 'Roboto', fontWeight: 'bold', color: '#1e293b' }]}>
                {c.title}
              </Text>
              <Text style={[styles.td, { color: '#64748b', fontSize: 7, marginTop: 1 }]}>
                Fuente: {c.source || 'Marketplace'}
              </Text>
            </View>
            <Text style={[styles.td, styles.colSm]}>{fmt(c.price + (c.adjustment ?? 0))}</Text>
            <Text style={[styles.td, styles.colXs]}>{c.sqm ?? '—'}</Text>
            <Text style={[styles.td, styles.colSm]}>
              {c.sqm ? fmt(Math.round((c.price + (c.adjustment ?? 0)) / c.sqm)) : '—'}
            </Text>
            <Text style={[styles.td, styles.colXs]}>{c.bedrooms ?? '—'}</Text>
            <Text style={[styles.td, styles.colXs, { fontWeight: 'bold', color: c.similarityScore >= 60 ? '#166534' : '#334155' }]}>
              {c.similarityScore}%
            </Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>RealHub · Informe de Tasación Comparativa</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ─── Página 4: Conclusiones de precios ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader} fixed>
          <Text>RealHub · Análisis y Resultados</Text>
          <Text>{generatedAt}</Text>
        </View>

        <Text style={styles.sectionTitle}>Tasación de Mercado Recomendada</Text>
        <Text style={styles.bodyParagraph}>
          En base a la homogeneización de la muestra, se determinaron los promedios y el posicionamiento recomendado.
        </Text>

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Precio promedio</Text>
            <Text style={styles.statValue}>USD {fmt(reportData.averagePrice)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Valor por m² Promedio</Text>
            <Text style={styles.statValue}>USD {fmt(reportData.averagePricePerSqm)}</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rango de Precios</Text>
            <Text style={styles.statValue}>
              USD {fmt(reportData.minPrice)} – {fmt(reportData.maxPrice)}
            </Text>
          </View>
          <View style={styles.statCardHighlight}>
            <Text style={[styles.statLabel, { color: '#4f46e5' }]}>Precio sugerido de salida</Text>
            <Text style={styles.statValueBlue}>USD {fmt(reportData.suggestedPrice)}</Text>
          </View>
        </View>

        {(() => {
          const pc = POSITIONING_COLORS[reportData.pricePositioning];
          return (
            <View style={[styles.banner, { backgroundColor: pc.bg, borderColor: pc.border }]}>
              <Text style={[styles.bannerText, { color: pc.text }]}>
                {POSITIONING_LABEL[reportData.pricePositioning]}
              </Text>
            </View>
          );
        })()}

        <Text style={[styles.sectionTitle, { fontSize: 11, marginTop: 15 }]}>Conclusión del Análisis</Text>
        <Text style={styles.bodyParagraph}>{reportData.conclusion}</Text>

        {agentNotes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notas del asesor inmobiliario</Text>
            <Text style={styles.notesText}>{agentNotes}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 15, paddingLeft: 4 }}>
          <Text style={{ fontSize: 8.5, color: '#64748b' }}>
            Tiempo promedio de absorción estimado en mercado: <Text style={{ fontWeight: 'bold' }}>{reportData.estimatedDaysOnMarket}</Text>
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>RealHub · Informe de Tasación Comparativa</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ─── Página 5: Firmas y Aviso Legal ─── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader} fixed>
          <Text>RealHub · Firma y Cierre</Text>
          <Text>{generatedAt}</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Asesoramiento y Contacto</Text>
          <Text style={styles.bodyParagraph}>
            Estamos a tu disposición para elaborar la estrategia de marketing y comercialización que mejor se adapte a este análisis, buscando maximizar el valor de tu patrimonio en el menor tiempo factible.
          </Text>
        </View>

        <View style={{ marginTop: 40, borderTop: '1 solid #e2e8f0', paddingTop: 20 }}>
          <Text style={[styles.agentName, { fontSize: 13 }]}>{agentName}</Text>
          {agencyName && <Text style={styles.agentDetail}>{agencyName}</Text>}
          {agentPhone && <Text style={styles.agentDetail}>Teléfono: {agentPhone}</Text>}
          {agentEmail && <Text style={styles.agentDetail}>Email: {agentEmail}</Text>}
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={[styles.notesLabel, { color: '#0f172a', marginBottom: 5 }]}>Aviso Legal & Términos</Text>
          <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>RealHub · Informe de Tasación Comparativa</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
