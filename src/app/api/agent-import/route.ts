/**
 * Agent import API — finds a real-estate agent on RE/MAX and/or Century21
 * and optionally imports their listings into agent_properties.
 *
 * POST /api/agent-import
 * Body:
 *   { action: 'search_agent', name: string, sources?: ('remax'|'c21')[] }
 *   { action: 'import_agent', source: 'remax'|'c21', agent_id: string, profile_url?: string }
 *
 * Response (search_agent):
 *   { matches: AgentMatch[] }
 *
 * Response (import_agent):
 *   { imported: number, properties: AgentProperty[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { rowToAgentProperty } from '@/types/property';
import type { AgentPropertyRow } from '@/types/property';

// Point to the internal scraper directory
const PROPSEARCH_DIR = path.resolve(process.cwd(), 'scraper');

export interface AgentMatch {
  source: 'remax' | 'c21';
  agent_id: string;
  name: string;
  agency: string;
  photo: string;
  profile_url: string;
  listings_count: number;
  similarity: number;
}

function runAgentScraper(task: unknown): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    // Dynamic command based on OS platform
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const child = spawn(pythonCmd, ['agent_scraper.py'], { cwd: PROPSEARCH_DIR });
    let stdout = '', stderr = '', done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      child.kill();
      reject(new Error('Agent scraper timed out after 90s'));
    }, 90_000);

    child.stdout.on('data', (d: Buffer) => { stdout += d; });
    child.stderr.on('data', (d: Buffer) => { stderr += d; });
    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Agent scraper exited ${code}: ${stderr.slice(0, 300)}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error('Agent scraper returned invalid JSON'));
        }
      }
    });
    child.on('error', (e) => { if (done) return; done = true; clearTimeout(timer); reject(e); });

    child.stdin.write(JSON.stringify(task), 'utf8');
    child.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const currentAgentId = user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action as string;

  // ── search_agent ──────────────────────────────────────────────────────────
  if (action === 'search_agent') {
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    try {
      const matches = await runAgentScraper({
        action:  'search_agent',
        name,
        sources: body.sources ?? ['remax', 'c21'],
      });
      return NextResponse.json({ matches });
    } catch (err) {
      console.error('[agent-import] search error:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Scraper error' },
        { status: 500 }
      );
    }
  }

  // ── import_agent ──────────────────────────────────────────────────────────
  if (action === 'import_agent') {
    const source    = String(body.source ?? '');
    const agentId   = String(body.agent_id ?? '');
    const profileUrl = String(body.profile_url ?? '');

    if (!source || !agentId) {
      return NextResponse.json({ error: 'source and agent_id are required' }, { status: 400 });
    }

    let rawListings: Record<string, unknown>[];
    try {
      rawListings = (await runAgentScraper({
        action:      'import_agent',
        source,
        agent_id:    agentId,
        profile_url: profileUrl,
      })) as Record<string, unknown>[];
    } catch (err) {
      console.error('[agent-import] import error:', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Scraper error' },
        { status: 500 }
      );
    }

    if (!rawListings.length) {
      return NextResponse.json({ imported: 0, properties: [] });
    }

    // Map scraped listings directly to agent_properties rows.
    // The scraper now returns structured data — no string-parsing needed.
    const rows = rawListings.map((r) => ({
      agent_id:           currentAgentId,
      title:              r.title ?? 'Sin título',
      operation_type:     r.operation_type ?? 'venta',
      property_type:      r.property_type ?? 'casa',
      neighborhood:       r.neighborhood ?? null,
      city:               r.city ?? null,
      department:         r.department ?? null,
      price:              r.price != null ? Number(r.price) : 0,
      currency:           r.currency ?? 'USD',
      sqm_total:          r.sqm_total != null ? Number(r.sqm_total) : null,
      sqm_built:          r.sqm_built != null ? Number(r.sqm_built) : null,
      bedrooms:           r.bedrooms != null ? Number(r.bedrooms) : null,
      garages:            r.garages != null ? Number(r.garages) : null,
      year_built:         r.year_built != null ? Number(r.year_built) : null,
      property_condition: r.property_condition ?? null,
      amenities:          Array.isArray(r.amenities) ? r.amenities : [],
      description:        r.description ?? null,
      main_photo:         r.main_photo ?? null,
      photos:             Array.isArray(r.photos) ? r.photos : [],
      visibility:         'private',
      source:             `${source}_import`,
      source_url:         r.source_url ?? null,
      source_agent_id:    agentId,
    }));

    const { data, error } = await supabase
      .from('agent_properties')
      .upsert(rows, { onConflict: 'source_url' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const properties = (data as AgentPropertyRow[]).map(rowToAgentProperty);
    return NextResponse.json({ imported: properties.length, properties });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
