import type { AcmSubjectProperty, AcmComparable, AcmCurrency, AcmPropertyType } from '@/types/acm';
import { calcPricePerSqm, getComparisonSqm } from './calculations';
import { runSearch } from '@/lib/propsearch-runner';
import { getUsdToPygRate } from '@/lib/exchange-rate';
import { getAgentId } from '@/lib/agent';

const OP_MAP: Record<string, string> = {
  venta:    'Compra',
  alquiler: 'Alquiler',
};

const TYPE_MAP: Record<string, string> = {
  casa:            'Casa',
  departamento:    'Departamento',
  duplex:          'Dúplex',
  terreno:         'Terreno/Lote',
  local_comercial: 'Local comercial',
};

// Fix #2 — rate is fetched live; pygRate passed in so it's fetched once per request.
function parseScraperPrice(
  raw: string,
  pygRate: number,
): { price: number; currency: AcmCurrency } | null {
  const clean = raw.replace(/\./g, '').replace(/,/g, '').trim();
  if (/USD|U\$S|U\$D|US\$/i.test(clean)) {
    const m = clean.match(/(\d+)/);
    if (m) return { price: parseInt(m[1]), currency: 'USD' };
  }
  if (/Gs?\.?|PYG|₲/i.test(clean)) {
    const m = clean.match(/(\d+)/);
    if (m) return { price: Math.round(parseInt(m[1]) / pygRate), currency: 'USD' };
  }
  return null;
}

// Fix #6 — return ±1 bedroom range so ACM finds more comparables.
function bedroomRange(n: number): string[] {
  if (n === 0) return ['0'];
  if (n >= 5) return ['5+'];
  return [n - 1, n, n + 1]
    .filter((v) => v >= 1)
    .flatMap((v) => (v >= 5 ? ['5+'] : [String(v)]));
}

// Fix #15 — background cache of scraped listings to property_listings table.
async function storeListings(
  records: Record<string, unknown>[],
  operation: string,
  propType: string,
): Promise<void> {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  const rows = records
    .filter((r) => r.url)
    .map((r) => ({
      source:     String(r.source ?? ''),
      title:      String(r.title ?? ''),
      price:      String(r.price ?? 'Consultar'),
      location:   r.metros != null ? `${r.location ?? ''} | metros:${r.metros}` : String(r.location ?? ''),
      url:        String(r.url),
      photo:      r.photo ? String(r.photo) : null,
      bedrooms:   r.bedrooms != null ? Number(r.bedrooms) : null,
      operation,
      prop_type:  String(r.tipo ?? r.prop_type ?? propType),
      scraped_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return;
  await supabase.from('property_listings').upsert(rows, { onConflict: 'url' });
}

export async function fetchExternalComparables(
  subject: Partial<AcmSubjectProperty>,
): Promise<AcmComparable[]> {
  try {
    const propType = TYPE_MAP[subject.propertyType ?? 'casa'] ?? 'Casa';
    const propTypes = (propType === 'Casa' || propType === 'Dúplex') ? ['Casa', 'Dúplex'] : [propType];
    const beds = subject.bedrooms !== undefined ? bedroomRange(subject.bedrooms) : [];

    const params = {
      operation:      OP_MAP[subject.operationType ?? 'venta'],
      propType,
      propTypes,
      location:       subject.city ?? '',
      barrios:        subject.neighborhood ? [subject.neighborhood] : [],
      bedrooms:       beds,
      min_price:      undefined, // Price is no longer a factor for the search engine
      max_price:      undefined,
      currency:       subject.currency === 'GS' ? 'PYG' : 'USD',
      resultsPerSite: 20,
    };

    const pygRate = await getUsdToPygRate();

    // 1. Try to fetch from the local database cache first (scraped within last 7 days)
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let cacheQuery = supabase
      .from('property_listings')
      .select('*')
      .eq('operation', params.operation)
      .in('prop_type', params.propTypes)
      .gte('scraped_at', sevenDaysAgo);

    if (params.barrios.length > 0) {
      const barrioConditions = params.barrios.map((b) => `location.ilike.%${b}%`).join(',');
      cacheQuery = cacheQuery.or(barrioConditions);
    } else if (params.location) {
      cacheQuery = cacheQuery.ilike('location', `%${params.location}%`);
    }

    const { data: cachedRows, error: cacheError } = await cacheQuery.limit(100);

    let data: Record<string, unknown>[] = [];

    if (!cacheError && cachedRows && cachedRows.length >= 5) {
      console.log(`[ACM] Cache hit: found ${cachedRows.length} recent listings in database. Skipping live scrape.`);
      data = cachedRows;
    } else {
      console.log(`[ACM] Cache miss or insufficient data. Running live Python scraper...`);
      let raw = await runSearch(params);
      data = JSON.parse(raw);

      // Fallback: if 0 results found for neighborhood, try searching city-wide (without neighborhood constraint)
      if (data.length === 0 && params.barrios.length > 0) {
        console.log(`[ACM] No results for neighborhood ${subject.neighborhood}. Falling back to city-wide search in ${subject.city}.`);
        const fallbackParams = { ...params, barrios: [] };
        raw = await runSearch(fallbackParams);
        data = JSON.parse(raw);
      }

      // Save the newly scraped listings to the database cache in the background
      if (data.length > 0) {
        storeListings(data, params.operation, propType).catch((err) =>
          console.warn('[ACM] Background storeListings error:', err)
        );
      }
    }

    return data.flatMap((r, i) => {
      const parsed = parseScraperPrice(String(r.price ?? ''), pygRate);
      if (!parsed) return [];

      const locStr = String(r.location ?? '');
      // Clean up the location string to remove the metros suffix if present
      const cleanLocStr = locStr.replace(/\s*\|\s*metros:\s*\d*/, '');

      // Retrieve metros (m2) value
      let sqmRaw = r.metros != null ? Number(r.metros) : undefined;
      if (sqmRaw === undefined) {
        const mMatch = locStr.match(/\|\s*metros:\s*(\d+)/);
        if (mMatch) sqmRaw = Number(mMatch[1]);
      }
      const sqm = sqmRaw != null && sqmRaw >= 5 ? sqmRaw : undefined;
      const pricePerSqm = calcPricePerSqm(parsed.price, sqm);

      const locParts = cleanLocStr.split(',');
      const neighborhood = locParts.length > 1 ? locParts[0].trim() : undefined;

      const bedrooms =
        r.bedrooms != null && r.bedrooms !== -1 ? Number(r.bedrooms) : undefined;

      // Map capitalized prop_type back to lowercase AcmPropertyType
      let dbPropType = String(r.prop_type ?? '').toLowerCase();
      if (dbPropType === 'dúplex') dbPropType = 'duplex';
      if (dbPropType === 'terreno/lote') dbPropType = 'terreno';
      const propertyType = (dbPropType || subject.propertyType) as AcmPropertyType | undefined;

      return [{
        id:             `ps-${i}-${String(r.source ?? '').replace(/\W/g, '')}`,
        source:         String(r.source ?? 'Propsearch'),
        title:          String(r.title ?? 'Propiedad'),
        propertyType,
        price:          parsed.price,
        currency:       parsed.currency,
        sqm,
        pricePerSqm,
        bedrooms,
        yearBuilt:      undefined,
        location:       cleanLocStr,
        neighborhood,
        url:            String(r.url ?? ''),
        similarityScore: 0,
        photo:          r.photo ? String(r.photo) : undefined,
        isInternal:     false,
      } satisfies AcmComparable];
    });
  } catch (err) {
    console.warn('[ACM] Propsearch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchInternalComparables(
  subject: Partial<AcmSubjectProperty>,
  agentId: string = getAgentId(), // Fix #1 — single source of truth
): Promise<AcmComparable[]> {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();

  let query = supabase
    .from('agent_properties')
    .select('*')
    .or(`visibility.eq.marketplace,agent_id.eq.${agentId}`)
    .eq('operation_type', subject.operationType)
    .limit(50);

  if (subject.propertyType === 'casa' || subject.propertyType === 'duplex') {
    query = query.in('property_type', ['casa', 'duplex']);
  } else if (subject.propertyType) {
    query = query.eq('property_type', subject.propertyType);
  }

  if (subject.city) {
    query = query.eq('city', subject.city);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[ACM] fetchInternalComparables error:', error.message);
    return [];
  }
  if (!data) return [];

  return (data as Record<string, unknown>[]).map((p) => {
    const sqm = getComparisonSqm(
      p.property_type as string | undefined,
      p.sqm_total != null ? Number(p.sqm_total) : undefined,
      p.sqm_built != null ? Number(p.sqm_built) : undefined
    );
    const pricePerSqm = calcPricePerSqm(Number(p.price), sqm);

    return {
      id:             `int-${p.id}`,
      source:         p.agent_id === agentId ? 'Mis propiedades' : 'Marketplace RealHub',
      title:          String(p.title ?? `${p.property_type} en ${p.neighborhood}`),
      propertyType:   p.property_type as AcmPropertyType | undefined,
      price:          Number(p.price),
      currency:       (p.currency ?? 'USD') as AcmCurrency,
      sqm,
      pricePerSqm,
      bedrooms:       p.bedrooms != null ? Number(p.bedrooms) : undefined,
      yearBuilt:      p.year_built != null ? Number(p.year_built) : undefined,
      location:       `${p.neighborhood ?? ''}, ${p.city}`.replace(/^, /, ''),
      neighborhood:   p.neighborhood != null ? String(p.neighborhood) : undefined,
      city:           p.city != null ? String(p.city) : undefined,
      url:            String(p.source_url ?? `/propiedades/${p.id}`),
      similarityScore: 0,
      photo:          p.main_photo != null ? String(p.main_photo) : undefined,
      isInternal:     true,
    };
  });
}
