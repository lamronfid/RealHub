import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AgentPropertyRow } from '@/types/property';
import { rowToAgentProperty } from '@/types/property';

// PATCH /api/agent-properties/[id] — update a property
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const agentId = user.id;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    title: 'title', operationType: 'operation_type', propertyType: 'property_type',
    neighborhood: 'neighborhood', city: 'city', department: 'department',
    price: 'price', currency: 'currency', sqmTotal: 'sqm_total', sqmBuilt: 'sqm_built',
    bedrooms: 'bedrooms', garages: 'garages', yearBuilt: 'year_built',
    propertyCondition: 'property_condition', amenities: 'amenities',
    description: 'description', mainPhoto: 'main_photo', photos: 'photos',
    visibility: 'visibility',
  };

  for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
    if (jsKey in body) updates[dbKey] = body[jsKey] ?? null;
  }

  const { data, error } = await supabase
    .from('agent_properties')
    .update(updates)
    .eq('id', id)
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ property: rowToAgentProperty(data as AgentPropertyRow) });
}

// DELETE /api/agent-properties/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const agentId = user.id;
  const { id } = await params;

  const { error } = await supabase
    .from('agent_properties')
    .delete()
    .eq('id', id)
    .eq('agent_id', agentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
