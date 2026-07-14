import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { runSearch } from '@/lib/propsearch-runner';

export const dynamic = 'force-dynamic';

// Major Paraguayan targets for automated crawling
const CRAWL_TARGETS = [
  { tipo: 'casa', operation: 'venta', city: 'Asunción' },
  { tipo: 'departamento', operation: 'venta', city: 'Asunción' },
  { tipo: 'casa', operation: 'alquiler', city: 'Asunción' },
  { tipo: 'departamento', operation: 'alquiler', city: 'Asunción' },
  { tipo: 'casa', operation: 'venta', city: 'Fernando de la Mora' },
  { tipo: 'casa', operation: 'alquiler', city: 'San Lorenzo' },
];

export async function POST(req: NextRequest) {
  try {
    // 1. Cron Authorization Check
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('[Cron Scraper] ERROR: CRON_SECRET is not configured in environment variables.');
      return NextResponse.json({ error: 'Servidor mal configurado. Falta la clave del cron.' }, { status: 500 });
    }

    // Constant-time check or simple safe verification
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const apiUrl = process.env.PROPSEARCH_API_URL || process.env.PROPSEARCH_URL;
    const apiSecret = process.env.PROPSEARCH_SECRET || '';
    
    let allListings: any[] = [];

    console.log(`[Cron Scraper] Starting automated crawl on ${CRAWL_TARGETS.length} targets...`);

    // Process targets in sequence to avoid overloading playwright or target sites
    for (const target of CRAWL_TARGETS) {
      console.log(`[Cron Scraper] Scraping: ${target.tipo} en ${target.operation} - ${target.city}`);
      try {
        let results: any[] = [];
        if (apiUrl) {
          // Query production Python microservice on Railway
          const res = await fetch(`${apiUrl.replace(/\/$/, '')}/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiSecret}`,
            },
            body: JSON.stringify(target),
          });
          if (res.ok) {
            results = await res.json();
          } else {
            console.error(`[Cron Scraper] Failed to fetch microservice for target:`, res.statusText);
          }
        } else {
          // Dev local python process execution
          const raw = await runSearch(target);
          results = JSON.parse(raw);
        }

        if (Array.isArray(results) && results.length > 0) {
          // Map properties with target context details
          const mapped = results.map((r) => ({
            source:     r.source,
            title:      r.title,
            price:      r.price || 'Consultar',
            location:   r.location || '',
            url:        r.url,
            photo:      r.photo || null,
            bedrooms:   r.bedrooms || null,
            operation:  target.operation,
            prop_type:  target.tipo,
            scraped_at: new Date().toISOString(),
          }));
          allListings.push(...mapped);
          console.log(`[Cron Scraper] Mapped ${mapped.length} listings from target.`);
        }
      } catch (err: any) {
        console.error(`[Cron Scraper] Error scraping target:`, err.message);
      }
    }

    if (allListings.length === 0) {
      return NextResponse.json({ success: true, stored: 0, message: 'No new listings found.' });
    }

    // Filter duplicates from the accumulated list before upsert
    const uniqueListings = Array.from(new Map(allListings.map(item => [item.url, item])).values());

    console.log(`[Cron Scraper] Upserting ${uniqueListings.length} total listings to property_listings...`);

    // 2. Write to Supabase using service role to bypass RLS policies
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('property_listings')
      .upsert(uniqueListings, { onConflict: 'url' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      stored: uniqueListings.length,
      message: `Automated scrape completed. Stored ${uniqueListings.length} properties.`
    });

  } catch (err: any) {
    console.error('[Cron Scraper Error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Allow GET request for simple scheduler execution if secret matches query param
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron Scraper] ERROR: CRON_SECRET is not configured in environment variables.');
    return NextResponse.json({ error: 'Servidor mal configurado. Falta la clave del cron.' }, { status: 500 });
  }

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // Delegate execution to the POST handler logic
  return POST(req);
}
