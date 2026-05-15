'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;
  const whatsapp = formData.get('whatsapp') as string;
  const agencyName = formData.get('agency_name') as string;
  const bio = formData.get('bio') as string;
  const avatarUrl = formData.get('avatar_url') as string;

  const { error } = await supabase
    .from('agent_profiles')
    .update({
      full_name: fullName || undefined,
      phone: phone || null,
      whatsapp: whatsapp || null,
      agency_name: agencyName || null,
      bio: bio || null,
      avatar_url: avatarUrl || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/perfil');
  revalidatePath('/');
  return { success: true };
}
