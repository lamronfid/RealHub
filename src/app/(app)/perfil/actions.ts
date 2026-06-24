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
  const agencyOffice = formData.get('agency_office') as string;
  const bio = formData.get('bio') as string;
  const avatarUrl = formData.get('avatar_url') as string;
  const licenseNumber = formData.get('license_number') as string;
  const specialty = formData.get('specialty') as string;
  const experienceYearsStr = formData.get('experience_years') as string;
  const coverageAreas = formData.getAll('coverage_areas') as string[];
  const mostSoldTypes = formData.getAll('most_sold_types') as string[];
  const hasDevelopments = formData.get('has_developments') === 'true';
  const developmentsDetails = formData.get('developments_details') as string;

  const experienceYears = experienceYearsStr ? parseInt(experienceYearsStr, 10) : null;
  const specialties = specialty ? [specialty] : [];

  const { error } = await supabase
    .from('agent_profiles')
    .update({
      full_name: fullName || undefined,
      phone: phone || null,
      whatsapp: whatsapp || null,
      agency_name: agencyName || null,
      agency_office: agencyOffice || null,
      bio: bio || null,
      avatar_url: avatarUrl || undefined,
      license_number: licenseNumber || null,
      specialties,
      coverage_areas: coverageAreas,
      experience_years: experienceYears,
      most_sold_types: mostSoldTypes,
      has_developments: hasDevelopments,
      developments_details: hasDevelopments ? (developmentsDetails || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/perfil');
  revalidatePath('/');
  return { success: true };
}
