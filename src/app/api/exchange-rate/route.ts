import { NextResponse } from 'next/server';
import { runRateScript } from '@/lib/exchange-rate';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const data = await runRateScript();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Exchange rate subprocess]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
