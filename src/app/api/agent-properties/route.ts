import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import type { AgentPropertyRow } from '@/types/property';
import { rowToAgentProperty } from '@/types/property';

// TODO: Replace with real auth once RealHub auth is integrated.
// This will become:  const agentId = (await supabase.auth.getUser()).data.user?.id
const PLACEHOLDER_AGENT_ID = 'current-agent-id';

function getAgentId(): string {
  return PLACEHOLDER_AGENT_ID;
}

// GET /api/agent-properties — list this agent's properties
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const agentId  = getAgentId();

  const { searchParams } = new URL(req.url);
  const operationType = searchParams.get('operationType');
  const propertyType  = searchParams.get('propertyType');
  const city          = searchParams.get('city');
  const visibility    = searchParams.get('visibility');

  let query = supabase
    .from('agent_properties')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (operationType) query = query.eq('operation_type', operationType);
  if (propertyType)  query = query.eq('property_type', propertyType);
  if (city)          query = query.eq('city', city);
  if (visibility)    query = query.eq('visibility', visibility);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    properties: (data as AgentPropertyRow[]).map(rowToAgentProperty),
  });
}

// POST /api/agent-properties — create a new property
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const agentId  = getAgentId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const required = ['title', 'operationType', 'propertyType', 'city', 'price', 'currency'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const row = {
    agent_id:           agentId,
    title:              body.title,
    operation_type:     body.operationType,
    property_type:      body.propertyType,
    neighborhood:       body.neighborhood ?? null,
    city:               body.city,
    department:         body.department ?? null,
    price:              Number(body.price),
    currency:           body.currency,
    sqm_total:          body.sqmTotal != null ? Number(body.sqmTotal) : null,
    sqm_built:          body.sqmBuilt != null ? Number(body.sqmBuilt) : null,
    bedrooms:           body.bedrooms != null ? Number(body.bedrooms) : null,
    garages:            body.garages != null ? Number(body.garages) : null,
    year_built:         body.yearBuilt != null ? Number(body.yearBuilt) : null,
    property_condition: body.propertyCondition ?? null,
    amenities:          Array.isArray(body.amenities) ? body.amenities : [],
    description:        body.description ?? null,
    main_photo:         body.mainPhoto ?? null,
    photos:             Array.isArray(body.photos) ? body.photos : [],
    visibility:         body.visibility ?? 'private',
    source:             body.source ?? 'manual',
    source_url:         body.sourceUrl ?? null,
    source_agent_id:    body.sourceAgentId ?? null,
  };

  const { data, error } = await supabase
    .from('agent_properties')
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ property: rowToAgentProperty(data as AgentPropertyRow) }, { status: 201 });
}
