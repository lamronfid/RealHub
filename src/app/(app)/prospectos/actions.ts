'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProspect(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const transactionType = formData.get('transaction_type') as string;
  const parsePrice = (val: string | null) => {
    if (!val) return null;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const priceMin = parsePrice(formData.get('price_min') as string);
  const priceMax = parsePrice(formData.get('price_max') as string);
  const currency = formData.get('currency') as string || 'USD';
  const notes = formData.get('notes') as string;
  const propertyTypesRaw = formData.get('property_types') as string;
  const propertyTypes = propertyTypesRaw ? propertyTypesRaw.split(',').filter(Boolean) : [];
  const departmentRaw = formData.get('department') as string;
  const departments = departmentRaw ? [departmentRaw] : [];
  const neighborhoodsRaw = formData.get('neighborhoods') as string;
  const neighborhoods = neighborhoodsRaw ? neighborhoodsRaw.split(',').filter(Boolean) : [];

  const roomsMin = formData.get('rooms_min') ? parseInt(formData.get('rooms_min') as string, 10) : null;
  const bathroomsMin = formData.get('bathrooms_min') ? parseInt(formData.get('bathrooms_min') as string, 10) : null;
  const garagesMin = formData.get('garages_min') ? parseInt(formData.get('garages_min') as string, 10) : null;

  const { data: prospect, error } = await supabase.from('prospects').insert({
    agent_id: user.id, full_name: fullName, phone, email,
    transaction_type: transactionType, price_min: priceMin, price_max: priceMax,
    currency, notes, property_types: propertyTypes, departments, neighborhoods,
    rooms_min: roomsMin, bathrooms_min: bathroomsMin, garages_min: garagesMin,
    stage: 'nuevo_contacto',
    visibility: 'marketplace'
  }).select().single();

  if (error) return { error: error.message };

  // Auto-create first follow-up
  if (prospect) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 1);
    await supabase.from('follow_ups').insert({
      prospect_id: prospect.id, agent_id: user.id,
      scheduled_at: followUpDate.toISOString(), interval_label: '24h primer contacto', status: 'pending',
    });
    await supabase.from('pipeline_events').insert({
      prospect_id: prospect.id, agent_id: user.id, to_stage: 'nuevo_contacto',
    });
  }

  revalidatePath('/prospectos');
  revalidatePath('/');
  redirect(`/prospectos/${prospect.id}/matches`);
}

export async function updateProspectStage(prospectId: string, newStage: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: current } = await supabase.from('prospects').select('stage').eq('id', prospectId).single();

  const { error } = await supabase.from('prospects').update({
    stage: newStage, stage_updated_at: new Date().toISOString(),
  }).eq('id', prospectId).eq('agent_id', user.id);

  if (error) return { error: error.message };

  await supabase.from('pipeline_events').insert({
    prospect_id: prospectId, agent_id: user.id,
    from_stage: current?.stage, to_stage: newStage,
  });

  revalidatePath('/prospectos');
  revalidatePath('/');
}

export async function updateProspect(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const parsePrice = (val: string | null) => {
    if (!val) return null;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const transactionType = formData.get('transaction_type') as string;
  const priceMin = parsePrice(formData.get('price_min') as string);
  const priceMax = parsePrice(formData.get('price_max') as string);
  const currency = formData.get('currency') as string || 'USD';
  const notes = formData.get('notes') as string;
  const propertyTypesRaw = formData.get('property_types') as string;
  const propertyTypes = propertyTypesRaw ? propertyTypesRaw.split(',').filter(Boolean) : [];
  const departmentRaw = formData.get('department') as string;
  const departments = departmentRaw ? [departmentRaw] : [];
  const neighborhoodsRaw = formData.get('neighborhoods') as string;
  const neighborhoods = neighborhoodsRaw ? neighborhoodsRaw.split(',').filter(Boolean) : [];
  const roomsMin = formData.get('rooms_min') ? parseInt(formData.get('rooms_min') as string, 10) : null;
  const bathroomsMin = formData.get('bathrooms_min') ? parseInt(formData.get('bathrooms_min') as string, 10) : null;
  const garagesMin = formData.get('garages_min') ? parseInt(formData.get('garages_min') as string, 10) : null;

  const { error } = await supabase
    .from('prospects')
    .update({
      full_name: fullName, phone, email,
      transaction_type: transactionType, price_min: priceMin, price_max: priceMax,
      currency, notes, property_types: propertyTypes, departments, neighborhoods,
      rooms_min: roomsMin, bathrooms_min: bathroomsMin, garages_min: garagesMin,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .eq('agent_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/prospectos');
  revalidatePath('/marketplace');
  revalidatePath('/');
  redirect(`/prospectos`);
}
