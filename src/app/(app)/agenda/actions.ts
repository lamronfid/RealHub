'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAgendaOptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { prospects: [], properties: [] };

  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, full_name, transaction_type')
    .eq('agent_id', user.id);

  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, transaction_type')
    .eq('agent_id', user.id);

  return { 
    prospects: prospects || [], 
    properties: properties || [] 
  };
}

export async function createAgendaEvent(data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follow_ups')
    .insert({
      ...data,
      agent_id: user.id,
      status: 'pending'
    });

  if (error) throw new Error(error.message);
  revalidatePath('/agenda');
  return { success: true };
}

export async function completeAgendaEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follow_ups')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('agent_id', user.id);

  if (error) throw new Error(error.message);
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}
