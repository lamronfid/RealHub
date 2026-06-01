import { NextResponse } from 'next/server';
import { runRateScript } from '@/lib/exchange-rate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await runRateScript();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Exchange rate subprocess]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
