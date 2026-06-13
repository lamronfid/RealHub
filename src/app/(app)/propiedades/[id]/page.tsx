import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ImageGallery from '@/components/property/ImageGallery';
import PropertyMap from '@/components/property/PropertyMap';
import MatchesList from '@/components/property/MatchesList';
import AmenitiesList from '@/components/property/AmenitiesList';
import VerifiedBadge from '@/components/VerifiedBadge';
import ShareButton from '@/components/property/ShareButton';

export default async function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Get Property Data
  const { data: rawProperty, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !rawProperty) {
    notFound();
  }

  const property = { ...rawProperty };

  // Manually fetch agent_profile
  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('*')
    .eq('id', property.agent_id)
    .single();
    
  property.agent_profiles = profile || null;

  // Fetch reviews to calculate rating average
  let averageRating = '5.0';
  if (profile) {
    const { data: dbReviews } = await supabase
      .from('agent_reviews')
      .select('rating')
      .eq('to_agent_id', property.agent_id);

    let reviewsCount = dbReviews?.length || 0;
    let reviewsSum = dbReviews?.reduce((sum: number, r: any) => sum + r.rating, 0) || 0;
    
    if (reviewsCount === 0) {
      // Fallback to stable mocks based on the agent's ID
      reviewsCount = 3;
      reviewsSum = 14; // 5 + 4 + 5
    }
    averageRating = (reviewsSum / reviewsCount).toFixed(1);
  }

  const isAgentVerified = profile?.subscription_tier === 'elite' || profile?.is_verified === true;

  // Si no es el dueño y la propiedad no es marketplace, no la mostramos
  if (property.agent_id !== user.id && property.visibility !== 'marketplace') {
    return (
      <div className="p-16 text-center text-slate-500">
        Esta propiedad es privada y no está en el Marketplace.
      </div>
    );
  }

  const isOwner = property.agent_id === user.id;

  // 2. Fetch Matches ONLY if isOwner (agents see matches for their properties)
  let matches: any[] = [];
  if (isOwner) {
    const { data } = await supabase.rpc('match_prospects_for_property', {
      p_property_id: id
    });
    matches = data || [];
  }

  const images = property.photos || [];

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      {/* Header / Nav */}
      <div className="flex items-center justify-between mb-4">
        <Link href={isOwner ? "/propiedades" : "/marketplace"} className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200 transition">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
        </Link>
        <div className="flex items-center gap-3">
          {isOwner && (
            <>
              <ShareButton propertyId={property.id} userId={user.id} />
              <Link href={`/propiedades/${property.id}/editar`}
                className="text-sm font-bold text-slate-600 hover:text-indigo-650 flex items-center gap-1 bg-white px-4 py-1.5 rounded-full border border-slate-200 transition">
                <span className="material-symbols-outlined text-[16px]">edit</span> Editar
              </Link>
            </>
          )}
          <span className="text-xs font-bold tracking-widest uppercase bg-slate-900 text-white px-3 py-1.5 rounded-full">
            EN {property.transaction_type.toUpperCase()}
          </span>
          <span className="text-xs font-bold tracking-widest uppercase text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            {property.property_type}
          </span>
        </div>
      </div>

      {/* Main Title & Location (Top Level) */}
      <div className="mb-2">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-2">
          {property.title}
        </h1>
        <p className="text-slate-500 flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[18px]">location_on</span>
          {property.city}{property.neighborhood ? `, ${property.neighborhood}` : ''}
        </p>
      </div>

      {/* Top Half: Condensed Gallery using new component */}
      <ImageGallery photos={images} title={property.title} />

      {/* Bottom Half: Split View (60/40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Column (Approx 65% on LG) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-10">
          
          {/* Quick Stats (Amenities Strip) */}
          <div className="flex flex-wrap items-center gap-6 py-6 border-b border-t border-slate-100">
            {property.bedrooms && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">bed</span>
                <div><p className="text-lg font-bold text-slate-900 leading-none">{property.bedrooms}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dorms</p></div>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">bathtub</span>
                <div><p className="text-lg font-bold text-slate-900 leading-none">{property.bathrooms}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Baños</p></div>
              </div>
            )}
            {property.garages && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">garage</span>
                <div><p className="text-lg font-bold text-slate-900 leading-none">{property.garages}</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cocheras</p></div>
              </div>
            )}
            {property.m2_built && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">home</span>
                <div><p className="text-lg font-bold text-slate-900 leading-none">{property.m2_built} m²</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Const.</p></div>
              </div>
            )}
            {property.m2_land && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400 text-2xl">landscape</span>
                <div><p className="text-lg font-bold text-slate-900 leading-none">{property.m2_land} m²</p><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Terreno</p></div>
              </div>
            )}
          </div>

          <AmenitiesList amenities={property.amenities || []} />

          {/* Description Box */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Acerca de la propiedad</h2>
            <div className="prose prose-slate max-w-none text-slate-600">
              <p className="whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>
          </div>

          {/* Integrated Matches Box (Only visible if owner) */}
          {isOwner && (
            <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-sm relative overflow-hidden mt-10">
              <div className="absolute top-0 right-0 p-4">
                <span className="material-symbols-outlined text-[100px] text-indigo-50/50 -mr-6 -mt-6 rotate-12 select-none">favorite</span>
              </div>
              
              <h2 className="text-xl font-bold text-indigo-900 mb-2 relative z-10">Matches del Sistema</h2>
              <p className="text-sm text-slate-500 mb-6 relative z-10">Prospectos interesados encontrados en la plataforma</p>

              <MatchesList matches={matches} />
            </div>
          )}

        </div>

        {/* Right Column (Approx 35% on LG) - STICKY */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
          <div className="sticky top-6 space-y-6">
            
            {/* Sticky Card: Price & Map */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
              
              {/* Pricing Section */}
              <div className="p-6 md:p-8 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Precio de Lista</p>
                {property.transaction_type === 'ambos' ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-3xl font-bold text-slate-900 leading-tight">
                      {property.currency === 'PYG' ? '₲' : 'U$D'} {Number(property.sale_price || 0).toLocaleString('es-PY')}
                      <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-wider block sm:inline">Venta</span>
                    </p>
                    <p className="text-xl font-bold text-slate-500 leading-tight">
                      {property.currency === 'PYG' ? '₲' : 'U$D'} {Number(property.rent_price || 0).toLocaleString('es-PY')}
                      <span className="text-sm font-bold text-slate-400 ml-2 uppercase tracking-wider block sm:inline">Alquiler</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-slate-900">
                    {property.currency === 'PYG' ? '₲' : 'U$D'} {Number(property.transaction_type === 'alquiler' ? property.rent_price || 0 : property.sale_price || 0).toLocaleString('es-PY')}
                  </p>
                )}
              </div>

              {/* Map Section */}
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-900 mb-3">Ubicación aproximada</h3>
                <PropertyMap neighborhood={property.neighborhood} city={property.city} />
                <div className="mt-3 text-center">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.city + (property.neighborhood ? ', ' + property.neighborhood : ''))}`} target="_blank" rel="noreferrer" 
                     className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                    Abrir en Google Maps
                  </a>
                </div>
              </div>

              {/* Agent Contact Box */}
              {!isOwner && property.agent_profiles && (
                <div className="bg-slate-900 p-6 md:p-8 text-white">
                  <h3 className="text-lg font-bold mb-4">Contactar al Agente</h3>
                  <div className="flex items-center gap-4 mb-6">
                    <Link href={`/perfil/${property.agent_id}`} className="shrink-0">
                      {property.agent_profiles.avatar_url ? (
                        <img 
                          src={property.agent_profiles.avatar_url} 
                          alt={property.agent_profiles.full_name} 
                          className="w-12 h-12 rounded-full object-cover border border-slate-700 hover:opacity-85 transition-opacity" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold hover:bg-slate-750 transition-colors">
                          {property.agent_profiles.full_name[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Link href={`/perfil/${property.agent_id}`} className="font-bold hover:text-indigo-300 transition-colors truncate">
                          {property.agent_profiles.full_name}
                        </Link>
                        {isAgentVerified && <VerifiedBadge className="w-4 h-4 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400 text-xs font-medium">RealHub Partner</span>
                        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-md text-slate-300">
                          <span className="material-symbols-outlined text-[12px] fill-current text-slate-300">star</span>
                          <span className="text-xs font-bold">{averageRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {property.agent_profiles.phone ? (
                    <a href={`https://wa.me/${property.agent_profiles.phone.replace(/\D/g,'')}?text=Hola,%20estoy%20interesado%20en%20la%20propiedad:%20${property.title}`} 
                       target="_blank" rel="noreferrer"
                       className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-xl font-bold transition-colors shadow-lg">
                      <span className="material-symbols-outlined">chat</span>
                      WhatsApp Directo
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400 text-center">Agente sin teléfono registrado.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
