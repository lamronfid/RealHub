import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { results, operation, propType } = await req.json();
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ stored: 0 });
    }

    const rows = results
      .filter((r) => r.url)
      .map((r) => ({
        source:     r.source,
        title:      r.title,
        price:      r.price || 'Consultar',
        location:   r.location || '',
        url:        r.url,
        photo:      r.photo || null,
        bedrooms:   r.bedrooms || null,
        operation:  operation || null,
        prop_type:  propType || null,
        scraped_at: new Date().toISOString(),
      }));

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('property_listings')
      .upsert(rows, { onConflict: 'url' });

    if (error) throw error;
    return NextResponse.json({ stored: rows.length });
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
    console.error('[Store listings]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
