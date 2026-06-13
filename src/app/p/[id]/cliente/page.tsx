import { createClient } from '@/lib/supabase/server';
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import { notFound } from 'next/navigation';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shared_by?: string; ref?: string }>;
}

export default async function ClientPropertyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { shared_by, ref } = await searchParams;
  const agentId = shared_by || ref;

  const supabase = await createClient();

  // Fetch the property details
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (!property) return notFound();

  // Fetch the sharing agent profile if provided
  let displayAgent = null;
  if (agentId) {
    const { data: agentData } = await supabase
      .from('agent_profiles')
      .select('full_name, phone, avatar_url, agency_name')
      .eq('id', agentId)
      .single();

    if (agentData) {
      displayAgent = agentData;
    }
  }

  // Set up helper flags
  const isLand = ['terreno', 'lote'].includes(property.property_type);
  const isApt = ['departamento', 'pozo'].includes(property.property_type);

  // Pre-calculate prices
  const showSalePrice = property.transaction_type === 'compra' || property.transaction_type === 'ambos';
  const showRentPrice = property.transaction_type === 'alquiler' || property.transaction_type === 'ambos';

  // Format currency symbols
  const currencySymbol = property.currency === 'PYG' ? '₲' : 'U$D';

  const waMessage = `Hola! Me interesa la propiedad: ${property.title} (Ref: ${property.id.substring(0, 8)})`;
  const phoneLink = displayAgent?.phone
    ? `https://wa.me/${displayAgent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-36 font-sans antialiased text-slate-800">
      {/* Top Premium Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 font-bold text-2xl">domain</span>
            <span className="font-heading font-extrabold text-slate-900 tracking-tight text-xl">
              Ficha de Propiedad
            </span>
          </div>
          {displayAgent && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span>Presentado por {displayAgent.full_name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Image Grid / Carousel */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden shadow-md bg-slate-100">
          {property.photos && property.photos.length > 0 ? (
            <>
              {/* Main Photo (Takes 2 cols on md screens) */}
              <div className="md:col-span-2 relative h-[40vh] md:h-[50vh] overflow-hidden group">
                <img
                  src={property.photos[0]}
                  alt={property.title}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-white/95 backdrop-blur text-slate-900 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
                    {property.transaction_type === 'compra'
                      ? 'Venta'
                      : property.transaction_type === 'alquiler'
                      ? 'Alquiler'
                      : 'Venta / Alquiler'}
                  </span>
                  <span className="bg-slate-950/90 backdrop-blur text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
                    {PROPERTY_TYPE_LABELS[property.property_type as PropertyType] || property.property_type}
                  </span>
                </div>
              </div>

              {/* Side Photos (1 col, grid of 2 rows) */}
              <div className="hidden md:grid grid-rows-2 gap-3 h-[50vh]">
                <div className="relative overflow-hidden group">
                  <img
                    src={property.photos[1] || property.photos[0]}
                    alt="Property detail"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                  />
                </div>
                <div className="relative overflow-hidden group">
                  <img
                    src={property.photos[2] || property.photos[0]}
                    alt="Property detail"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-102"
                  />
                  {property.photos.length > 3 && (
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center backdrop-blur-xs">
                      <span className="text-white text-lg font-bold">
                        +{property.photos.length - 3} fotos
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-3 h-[40vh] flex flex-col items-center justify-center text-slate-400 py-16">
              <span className="material-symbols-outlined text-7xl font-light mb-2">landscape</span>
              <span className="uppercase tracking-widest font-extrabold text-xs">Sin Fotos Disponibles</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Details (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs">
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-2 tracking-tight">
                {property.title}
              </h1>
              
              <p className="text-slate-500 flex items-center gap-1.5 text-sm md:text-base font-medium mb-6">
                <span className="material-symbols-outlined text-indigo-500 text-[18px]">location_on</span>
                {[property.neighborhood, property.city, property.department].filter(Boolean).join(', ')}
              </p>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-t border-b border-slate-100">
                {property.bedrooms && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">bed</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{property.bedrooms}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Dormitorios</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">bathtub</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{property.bathrooms}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Baños</p>
                    </div>
                  </div>
                )}
                {property.garages && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">garage</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{property.garages}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Cocheras</p>
                    </div>
                  </div>
                )}
                {property.m2_built && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">home</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{property.m2_built} m²</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Construido</p>
                    </div>
                  </div>
                )}
                {property.m2_terrain && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">landscape</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none">{property.m2_terrain} m²</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Terreno</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Descripción</h2>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed text-sm md:text-base">
                  {property.description || 'Sin descripción detallada.'}
                </p>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Amenities & Características</h2>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-slate-50 border border-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Extra Photo Gallery (Scroll view of all photos) */}
            {property.photos && property.photos.length > 1 && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xs">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Galería de Fotos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {property.photos.map((photo: string, idx: number) => (
                    <div key={idx} className="relative h-60 rounded-2xl overflow-hidden bg-slate-100">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover hover:scale-102 transition duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Contact sidebar (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Precio de Lista</h2>
              <div className="space-y-4">
                {showSalePrice && (
                  <div>
                    {property.transaction_type === 'ambos' && <p className="text-xs font-bold text-slate-400">Venta</p>}
                    <p className="font-heading text-3xl font-extrabold text-emerald-600">
                      {currencySymbol} {Number(property.sale_price || 0).toLocaleString('es-PY')}
                    </p>
                  </div>
                )}
                {showRentPrice && (
                  <div>
                    {property.transaction_type === 'ambos' && <p className="text-xs font-bold text-slate-400">Alquiler</p>}
                    <p className="font-heading text-3xl font-extrabold text-emerald-600">
                      {currencySymbol} {Number(property.rent_price || 0).toLocaleString('es-PY')}
                      <span className="text-sm font-normal text-slate-400">/mes</span>
                    </p>
                  </div>
                )}
                {property.expenses > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-500 font-medium">Expensas:</span>
                    <span className="text-sm font-bold text-slate-800">
                      {currencySymbol} {Number(property.expenses).toLocaleString('es-PY')}
                    </span>
                  </div>
                )}
              </div>

              {/* Sharing Agent Box inside Sidebar (For larger screens) */}
              {displayAgent && (
                <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                  <div className="inline-block relative">
                    {displayAgent.avatar_url ? (
                      <img
                        src={displayAgent.avatar_url}
                        alt={displayAgent.full_name}
                        className="w-16 h-16 rounded-full object-cover mx-auto border-2 border-indigo-100 shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg mx-auto shadow-xs">
                        {displayAgent.full_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 font-extrabold text-slate-900 text-base">{displayAgent.full_name}</h3>
                  {displayAgent.agency_name && (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {displayAgent.agency_name}
                    </p>
                  )}
                  {phoneLink && (
                    <a
                      href={phoneLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold transition duration-200 shadow-lg shadow-emerald-500/10"
                    >
                      <span className="material-symbols-outlined text-[20px]">chat</span>
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Floating Sticky Footer for Contact (Agent B) for Mobile Screens */}
      {displayAgent && phoneLink && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-150 p-4 z-50 shadow-[0_-10px_45px_rgba(0,0,0,0.08)] block lg:hidden">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {displayAgent.avatar_url ? (
                <img
                  src={displayAgent.avatar_url}
                  alt={displayAgent.full_name}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-indigo-650 flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm">
                    {displayAgent.full_name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Agente de Contacto</p>
                <p className="font-extrabold text-slate-900 text-sm leading-tight">{displayAgent.full_name}</p>
              </div>
            </div>
            
            <a
              href={phoneLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition duration-200 text-sm shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
