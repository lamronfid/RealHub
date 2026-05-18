'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const transactionType = formData.get('transaction_type') as string;
  const propertyType = formData.get('property_type') as string;
  const parsePrice = (val: string | null) => {
    if (!val) return null;
    // Remove dots (thousands separators) and replace comma with dot (decimal)
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const salePrice = parsePrice(formData.get('sale_price') as string);
  const rentPrice = parsePrice(formData.get('rent_price') as string);
  const currency = formData.get('currency') as string || 'USD';
  const department = formData.get('department') as string;
  const city = formData.get('city') as string;
  const neighborhood = formData.get('neighborhood') as string;
  const bedrooms = formData.get('bedrooms') ? parseInt(formData.get('bedrooms') as string) : null;
  const bathrooms = formData.get('bathrooms') ? parseInt(formData.get('bathrooms') as string) : null;
  const garages = formData.get('garages') ? parseInt(formData.get('garages') as string) : null;
  const m2Terrain = formData.get('m2_terrain') ? parseFloat(formData.get('m2_terrain') as string) : null;
  const m2Built = formData.get('m2_built') ? parseFloat(formData.get('m2_built') as string) : null;
  const m2Balcony = formData.get('m2_balcony') ? parseFloat(formData.get('m2_balcony') as string) : null;
  const treesCount = formData.get('trees_count') ? parseInt(formData.get('trees_count') as string) : null;
  const constructionYear = formData.get('construction_year') ? parseInt(formData.get('construction_year') as string) : null;
  const furnished = formData.get('furnished') as string || null;
  const exclusive = formData.get('exclusive') === 'true';
  const constructionType = formData.get('construction_type') as string || null;
  const conservationState = formData.get('conservation_state') as string || null;
  const lotShape = formData.get('lot_shape') as string || null;
  const topography = formData.get('topography') as string || null;
  const accessType = formData.get('access_type') as string || null;
  const services = formData.get('services') as string || null;
  const zoning = formData.get('zoning') as string || null;
  const floorNumber = formData.get('floor_number') ? parseInt(formData.get('floor_number') as string) : null;
  const hasElevator = formData.get('has_elevator') === 'true';
  const frontMeters = formData.get('front_meters') ? parseFloat(formData.get('front_meters') as string) : null;
  const floorLocation = formData.get('floor_location') as string || null;
  const amenitiesRaw = formData.get('amenities') as string;
  const amenities = amenitiesRaw ? amenitiesRaw.split(',').filter(Boolean) : [];
  const visibility = 'marketplace';
  const photosRaw = formData.get('photos') as string;
  const photos = photosRaw ? JSON.parse(photosRaw) : [];
  const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
  const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;

  const status = transactionType === 'compra' ? 'En Venta' : 'En Alquiler';

  const { error } = await supabase.from('properties').insert({
    title, description, transaction_type: transactionType, property_type: propertyType,
    sale_price: salePrice, rent_price: rentPrice, currency, department, city, neighborhood,
    bedrooms, bathrooms, garages, m2_terrain: m2Terrain, m2_built: m2Built,
    m2_balcony: m2Balcony, trees_count: treesCount, construction_year: constructionYear,
    furnished, exclusive, amenities, visibility,
    construction_type: constructionType, conservation_state: conservationState,
    lot_shape: lotShape, topography, access_type: accessType,
    services, zoning, floor_number: floorNumber, has_elevator: hasElevator,
    front_meters: frontMeters, floor_location: floorLocation,
    latitude, longitude,
    marketplace_shared_at: new Date().toISOString(),
    status, agent_id: user.id, photos,
  });

  if (error) {
    console.error('ERROR INSERTANDO PROPIEDAD:', error);
    return { error: error.message };
  }

  revalidatePath('/propiedades');
  revalidatePath('/marketplace');
  revalidatePath('/');
  
  return { success: true };
}

export async function toggleMarketplace(propertyId: string, share: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('properties')
    .update({
      visibility: share ? 'marketplace' : 'private',
      marketplace_shared_at: share ? new Date().toISOString() : null,
    })
    .eq('id', propertyId)
    .eq('agent_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/propiedades');
  revalidatePath('/marketplace');
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { error } = await supabase.from('properties').delete().eq('id', propertyId).eq('agent_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/propiedades');
  revalidatePath('/marketplace');
  revalidatePath('/');
  redirect('/propiedades');
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const parsePrice = (val: string | null) => {
    if (!val) return null;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const transactionType = formData.get('transaction_type') as string;
  const propertyType = formData.get('property_type') as string;
  const salePrice = parsePrice(formData.get('sale_price') as string);
  const rentPrice = parsePrice(formData.get('rent_price') as string);
  const currency = formData.get('currency') as string || 'USD';
  const department = formData.get('department') as string;
  const city = formData.get('city') as string;
  const neighborhood = formData.get('neighborhood') as string;
  const bedrooms = formData.get('bedrooms') ? parseInt(formData.get('bedrooms') as string) : null;
  const bathrooms = formData.get('bathrooms') ? parseInt(formData.get('bathrooms') as string) : null;
  const garages = formData.get('garages') ? parseInt(formData.get('garages') as string) : null;
  const m2Terrain = formData.get('m2_terrain') ? parseFloat(formData.get('m2_terrain') as string) : null;
  const m2Built = formData.get('m2_built') ? parseFloat(formData.get('m2_built') as string) : null;
  const furnished = formData.get('furnished') as string || null;
  const exclusive = formData.get('exclusive') === 'true';
  const constructionType = formData.get('construction_type') as string || null;
  const conservationState = formData.get('conservation_state') as string || null;
  const lotShape = formData.get('lot_shape') as string || null;
  const topography = formData.get('topography') as string || null;
  const accessType = formData.get('access_type') as string || null;
  const services = formData.get('services') as string || null;
  const zoning = formData.get('zoning') as string || null;
  const floorNumber = formData.get('floor_number') ? parseInt(formData.get('floor_number') as string) : null;
  const hasElevator = formData.get('has_elevator') === 'true';
  const frontMeters = formData.get('front_meters') ? parseFloat(formData.get('front_meters') as string) : null;
  const floorLocation = formData.get('floor_location') as string || null;
  const amenitiesRaw = formData.get('amenities') as string;
  const amenities = amenitiesRaw ? amenitiesRaw.split(',').filter(Boolean) : [];
  const photosRaw = formData.get('photos') as string;
  const photos = photosRaw ? JSON.parse(photosRaw) : [];
  const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null;
  const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null;

  const { error } = await supabase
    .from('properties')
    .update({
      title, description, transaction_type: transactionType, property_type: propertyType,
      sale_price: salePrice, rent_price: rentPrice, currency, department, city, neighborhood,
      bedrooms, bathrooms, garages, m2_terrain: m2Terrain, m2_built: m2Built,
      furnished, exclusive, amenities, photos,
      construction_type: constructionType, conservation_state: conservationState,
      lot_shape: lotShape, topography, access_type: accessType,
      services, zoning, floor_number: floorNumber, has_elevator: hasElevator,
      front_meters: frontMeters, floor_location: floorLocation,
      latitude, longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId)
    .eq('agent_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/propiedades');
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath('/marketplace');
  revalidatePath('/');
  redirect(`/propiedades/${propertyId}`);
}
