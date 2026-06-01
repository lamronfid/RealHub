import type {
  AcmComparable,
  AcmSubjectProperty,
  AcmReportData,
  AcmPricePositioning,
} from '@/types/acm';

export function calcPricePerSqm(price: number, sqm: number | undefined): number | undefined {
  if (!sqm || sqm === 0) return undefined;
  return Math.round(price / sqm);
}

// Similarity formula (100pts total)
export function calcSimilarityScore(
  subject: Partial<AcmSubjectProperty>,
  comparable: Pick<AcmComparable, 'neighborhood' | 'price' | 'sqm' | 'bedrooms' | 'propertyType'>
): number {
  let score = 0;

  // Same neighborhood: 30pts
  if (
    subject.neighborhood &&
    comparable.neighborhood &&
    subject.neighborhood.toLowerCase() === comparable.neighborhood.toLowerCase()
  ) {
    score += 30;
  }

  // Same property type: 20pts
  if (subject.propertyType && comparable.propertyType && subject.propertyType === comparable.propertyType) {
    score += 20;
  }

  // Price within ±15%: 20pts
  if (subject.priceTarget && comparable.price) {
    const diff = Math.abs(subject.priceTarget - comparable.price) / subject.priceTarget;
    if (diff <= 0.15) score += 20;
  }

  // Size within ±15%: 15pts
  if (subject.sqmTotal && comparable.sqm) {
    const diff = Math.abs(subject.sqmTotal - comparable.sqm) / subject.sqmTotal;
    if (diff <= 0.15) score += 15;
  }

  // Same bedrooms: 15pts
  if (subject.bedrooms !== undefined && comparable.bedrooms !== undefined) {
    if (subject.bedrooms === comparable.bedrooms) score += 15;
  }

  return Math.min(score, 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function calcReportData(
  subject: Partial<AcmSubjectProperty>,
  selected: AcmComparable[]
): AcmReportData {
  const prices = selected.map((c) => c.price + (c.adjustment ?? 0));
  const pricesPerSqm = selected
    .filter((c) => c.pricePerSqm !== undefined)
    .map((c) => c.pricePerSqm!);

  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const avgPricePerSqm =
    pricesPerSqm.length > 0
      ? Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length)
      : 0;
  const medianPrice = median(prices);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const suggestedPrice = medianPrice;

  const target = subject.priceTarget ?? 0;
  const diffPct = target > 0 ? (target - avgPrice) / avgPrice : 0;

  let pricePositioning: AcmPricePositioning;
  if (diffPct > 0.25) pricePositioning = 'significantly_above';
  else if (diffPct > 0.1) pricePositioning = 'slightly_above';
  else if (diffPct < -0.1) pricePositioning = 'below_market';
  else pricePositioning = 'within_market';

  const daysMap: Record<AcmPricePositioning, string> = {
    within_market:        '30–60 días',
    slightly_above:       '60–90 días',
    significantly_above:  '90+ días',
    below_market:         '15–30 días',
  };

  const positioningLabel: Record<AcmPricePositioning, string> = {
    within_market:        'dentro del rango de mercado',
    slightly_above:       'levemente por encima del mercado',
    significantly_above:  'significativamente por encima del mercado',
    below_market:         'por debajo del mercado',
  };

  const conclusion =
    `Basado en el análisis de ${selected.length} propiedades comparables en ` +
    `${subject.neighborhood ?? subject.city}, el precio promedio de mercado es ` +
    `USD ${avgPrice.toLocaleString('es-PY')}. El precio objetivo de ` +
    `USD ${target.toLocaleString('es-PY')} está ${positioningLabel[pricePositioning]}. ` +
    `Se recomienda publicar a USD ${suggestedPrice.toLocaleString('es-PY')} para una comercialización óptima.`;

  return {
    averagePrice: avgPrice,
    averagePricePerSqm: avgPricePerSqm,
    medianPrice,
    minPrice,
    maxPrice,
    suggestedPrice,
    pricePositioning,
    conclusion,
    estimatedDaysOnMarket: daysMap[pricePositioning],
  };
}
