import { NextRequest, NextResponse } from 'next/server';
import { fetchExternalComparables, fetchInternalComparables } from '@/lib/acm/api';
import { calcSimilarityScore } from '@/lib/acm/calculations';
import type { AcmSubjectProperty } from '@/types/acm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subject: Partial<AcmSubjectProperty> = body.subject;
    const agentId: string = body.agentId;

    if (!subject || !agentId) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const [externalResult, internalResult] = await Promise.allSettled([
      fetchExternalComparables(subject),
      fetchInternalComparables(subject, agentId),
    ]);

    const external = externalResult.status === 'fulfilled' ? externalResult.value : [];
    const internal = internalResult.status === 'fulfilled' ? internalResult.value : [];

    if (externalResult.status === 'rejected') {
      console.error('[ACM] External scraper error:', externalResult.reason);
    }
    if (internalResult.status === 'rejected') {
      console.error('[ACM] Internal query error:', internalResult.reason);
    }

    const combined = [...external, ...internal].map((c) => ({
      ...c,
      similarityScore: calcSimilarityScore(subject, c),
    }));

    const sorted = combined.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json({ comparables: sorted, totalFound: sorted.length });
  } catch (err) {
    console.error('[ACM] Unexpected error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
