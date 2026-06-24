'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DEPARTMENTS, CITIES, NEIGHBORHOODS } from '@/lib/types';

export async function getLocations() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('properties').select('department, city, neighborhood');
  
  const dynamicDepartments = new Set<string>(DEPARTMENTS);
  const dynamicCities: Record<string, Set<string>> = {};
  const dynamicNeighborhoods: Record<string, Set<string>> = {};

  // Initialize with static data
  for (const dep of Object.keys(CITIES)) {
    if (!dynamicCities[dep]) dynamicCities[dep] = new Set();
    CITIES[dep].forEach(c => dynamicCities[dep].add(c));
  }
  for (const cit of Object.keys(NEIGHBORHOODS)) {
    if (!dynamicNeighborhoods[cit]) dynamicNeighborhoods[cit] = new Set();
    NEIGHBORHOODS[cit].forEach(n => dynamicNeighborhoods[cit].add(n));
  }

  if (!error && data) {
    data.forEach(row => {
      if (row.department) {
        // Find existing department ignoring case/accents, or add new
        const existingDep = Array.from(dynamicDepartments).find(d => d.toLowerCase().localeCompare(row.department.toLowerCase(), 'es', { sensitivity: 'base' }) === 0);
        const dep = existingDep || row.department;
        dynamicDepartments.add(dep);

        if (row.city) {
          if (!dynamicCities[dep]) dynamicCities[dep] = new Set();
          const existingCity = Array.from(dynamicCities[dep]).find(c => c.toLowerCase().localeCompare(row.city.toLowerCase(), 'es', { sensitivity: 'base' }) === 0);
          const city = existingCity || row.city;
          dynamicCities[dep].add(city);

          if (row.neighborhood) {
            if (!dynamicNeighborhoods[city]) dynamicNeighborhoods[city] = new Set();
            const existingNeigh = Array.from(dynamicNeighborhoods[city]).find(n => n.toLowerCase().localeCompare(row.neighborhood.toLowerCase(), 'es', { sensitivity: 'base' }) === 0);
            const neigh = existingNeigh || row.neighborhood;
            dynamicNeighborhoods[city].add(neigh);
          }
        }
      }
    });
  }

  // Convert Sets to Arrays
  const finalDepartments = Array.from(dynamicDepartments).sort();
  const finalCities: Record<string, string[]> = {};
  for (const dep in dynamicCities) {
    finalCities[dep] = Array.from(dynamicCities[dep]).sort();
  }
  const finalNeighborhoods: Record<string, string[]> = {};
  for (const cit in dynamicNeighborhoods) {
    finalNeighborhoods[cit] = Array.from(dynamicNeighborhoods[cit]).sort();
  }

  return { departments: finalDepartments, cities: finalCities, neighborhoods: finalNeighborhoods };
}

export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  // Check subscription limits
  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('subscription_tier, role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  const email = user.email || '';
  const tier = profile?.subscription_tier || 'free';

  const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
  const isAdminOrOwner = 
    role === 'admin' || 
    role === 'superadmin' || 
    role === 'owner' ||
    adminEmails.includes(email.toLowerCase());

  if (!isAdminOrOwner) {
    const { count: totalProperties } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', user.id);

    const propertiesCount = totalProperties || 0;
    if ((tier === 'free' || tier === 'standard') && propertiesCount >= 10) {
      return { 
        error: 'Límite alcanzado: El Plan Gratuito (Entrada) está limitado a 10 propiedades. Actualizá tu suscripción al Plan Pro o Élite para publicar más.' 
      };
    }
    if (tier === 'pro' && propertiesCount >= 25) {
      return { 
        error: 'Límite alcanzado: El Plan Pro está limitado a 25 propiedades. Actualizá tu suscripción al Plan Élite para tener publicaciones ilimitadas.' 
      };
    }
  }

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

  const status = formData.get('status') as string || 'activa';

  const { data: newProperty, error } = await supabase.from('properties').insert({
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
  }).select('id').single();

  if (error) {
    console.error('ERROR INSERTANDO PROPIEDAD:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('null value in column')) {
      errorMessage = 'Faltan campos obligatorios por completar.';
    } else if (errorMessage.includes('violates foreign key constraint')) {
      errorMessage = 'Referencia a un dato inexistente.';
    }
    return { error: errorMessage };
  }

  revalidatePath('/propiedades');
  revalidatePath('/marketplace');
  revalidatePath('/');
  
  return { success: true, propertyId: newProperty?.id };
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
  const constructionYear = formData.get('construction_year') ? parseInt(formData.get('construction_year') as string) : null;
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
  const status = formData.get('status') as string || 'activa';

  const { error } = await supabase
    .from('properties')
    .update({
      title, description, transaction_type: transactionType, property_type: propertyType,
      sale_price: salePrice, rent_price: rentPrice, currency, department, city, neighborhood,
      bedrooms, bathrooms, garages, m2_terrain: m2Terrain, m2_built: m2Built,
      furnished, exclusive, amenities, photos,
      construction_type: constructionType, construction_year: constructionYear, conservation_state: conservationState,
      lot_shape: lotShape, topography, access_type: accessType,
      services, zoning, floor_number: floorNumber, has_elevator: hasElevator,
      front_meters: frontMeters, floor_location: floorLocation,
      latitude, longitude,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId)
    .eq('agent_id', user.id);

  if (error) {
    console.error('ERROR ACTUALIZANDO PROPIEDAD:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('null value in column')) {
      errorMessage = 'Faltan campos obligatorios por completar.';
    } else if (errorMessage.includes('violates foreign key constraint')) {
      errorMessage = 'Referencia a un dato inexistente.';
    }
    return { error: errorMessage };
  }

  revalidatePath('/propiedades');
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath('/marketplace');
  revalidatePath('/');
  redirect(`/propiedades/${propertyId}`);
}
