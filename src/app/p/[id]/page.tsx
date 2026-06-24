import { createClient } from '@/lib/supabase/server';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import { notFound } from 'next/navigation';

export default async function PublicPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const { ref } = await searchParams;
  const supabase = await createClient();

  // Fetch the property
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (!property) return notFound();

  // If a ref is provided, fetch THAT agent's info (Agent B) to keep it white-label
  // If no ref is provided, fall back to the owner (Agent A) so we always have contact details.
  let displayAgent = null;
  if (ref) {
    const { data: agentData } = await supabase
      .from('agent_profiles')
      .select('full_name, phone, avatar_url, agency_name')
      .eq('id', ref)
      .single();
    
    if (agentData) displayAgent = agentData;
  }

  if (!displayAgent && property.agent_id) {
    const { data: ownerData } = await supabase
      .from('agent_profiles')
      .select('full_name, phone, avatar_url, agency_name')
      .eq('id', property.agent_id)
      .single();
    
    if (ownerData) displayAgent = ownerData;
  }

  // Pre-compute basic stats
  const isLand = ['terreno', 'loteamiento', 'quinta'].includes(property.property_type);
  const isApt = ['departamento', 'penthouse'].includes(property.property_type);

  const phoneLink = displayAgent?.phone 
    ? `https://wa.me/${displayAgent.phone.replace(/\D/g, '')}?text=Hola! Me interesa la propiedad: ${encodeURIComponent(property.title)} (Ref: ${property.id.substring(0,8)})`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header Image Gallery (Simplified for MVP) */}
      <div className="w-full h-[50vh] md:h-[60vh] bg-slate-200 relative">
        {property.photos && property.photos.length > 0 ? (
          <img src={property.photos[0]} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl font-light mb-2">landscape</span>
            <span className="uppercase tracking-widest font-bold text-sm">Sin Fotos</span>
          </div>
        )}
        <div className="absolute top-6 left-6 flex gap-2">
          <span className="bg-white/90 backdrop-blur text-slate-900 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-sm">
            {property.transaction_type === 'compra' ? 'Venta' : 'Alquiler'}
          </span>
          <span className="bg-slate-900/90 backdrop-blur text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-sm">
            {PROPERTY_TYPE_LABELS[property.property_type as PropertyType] || property.property_type}
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            {property.title}
          </h1>
          
          <p className="text-slate-500 flex items-center gap-2 mb-8 text-lg">
            <span className="material-symbols-outlined">location_on</span>
            {[property.neighborhood, property.city].filter(Boolean).join(', ')}
          </p>

          {/* Pricing */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {property.transaction_type === 'ambos' ? (
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Precio de Venta</p>
                  <p className="font-heading text-3xl font-bold text-emerald-600">
                    {property.currency} {Number(property.sale_price || 0).toLocaleString('es-PY')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Precio de Alquiler</p>
                  <p className="font-heading text-2xl font-bold text-slate-600">
                    {property.currency} {Number(property.rent_price || 0).toLocaleString('es-PY')}/mes
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Precio</p>
                <p className="font-heading text-4xl font-bold text-emerald-600">
                  {property.currency} {Number(property.transaction_type === 'alquiler' ? property.rent_price || 0 : property.sale_price || 0).toLocaleString('es-PY')}
                  {property.transaction_type === 'alquiler' && <span className="text-lg text-slate-400 font-normal">/mes</span>}
                </p>
              </div>
            )}
            {property.expenses > 0 && (
              <div className="md:text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expensas</p>
                <p className="font-heading text-xl font-bold text-slate-700">
                  {property.currency} {Number(property.expenses || 0).toLocaleString('es-PY')}
                </p>
              </div>
            )}
          </div>

          {/* Core Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {property.m2_terrain && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">straighten</span>
                <span className="text-sm text-slate-500 font-medium">Terreno</span>
                <span className="text-lg font-bold text-slate-900">{property.m2_terrain} m²</span>
              </div>
            )}
            {property.m2_built && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">home</span>
                <span className="text-sm text-slate-500 font-medium">Construido</span>
                <span className="text-lg font-bold text-slate-900">{property.m2_built} m²</span>
              </div>
            )}
            {property.bedrooms && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">bed</span>
                <span className="text-sm text-slate-500 font-medium">Dormitorios</span>
                <span className="text-lg font-bold text-slate-900">{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">shower</span>
                <span className="text-sm text-slate-500 font-medium">Baños</span>
                <span className="text-lg font-bold text-slate-900">{property.bathrooms}</span>
              </div>
            )}
            {isLand && property.trees_count && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">park</span>
                <span className="text-sm text-slate-500 font-medium">Árboles</span>
                <span className="text-lg font-bold text-slate-900">{property.trees_count}</span>
              </div>
            )}
            {isApt && property.m2_balcony && (
              <div className="border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-400 mb-2">balcony</span>
                <span className="text-sm text-slate-500 font-medium">Balcón</span>
                <span className="text-lg font-bold text-slate-900">{property.m2_balcony} m²</span>
              </div>
            )}
          </div>

          <div className="prose prose-slate max-w-none">
            <h3 className="text-2xl font-bold mb-4">Descripción</h3>
            <p className="whitespace-pre-wrap text-slate-600 leading-relaxed">
              {property.description || 'Sin descripción detallada.'}
            </p>
          </div>

        </div>
      </main>

      {/* Floating Sticky Footer for Contact (Agent B) */}
      {displayAgent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-md border-t border-slate-100 p-4 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] font-sans">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {displayAgent.avatar_url ? (
                <img src={displayAgent.avatar_url} alt={displayAgent.full_name} className="w-11 h-11 rounded-full object-cover border border-slate-205/80 ring-2 ring-indigo-50" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center border border-indigo-100 shadow-inner shrink-0">
                  <span className="text-white font-bold text-xs">{displayAgent.full_name.substring(0,2).toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Contacto del Agente</p>
                <p className="font-bold text-slate-800 text-sm leading-none">{displayAgent.full_name}</p>
              </div>
            </div>
            
            {phoneLink && (
              <a href={phoneLink} target="_blank" rel="noopener noreferrer" 
                className="bg-[#25D366] hover:bg-[#20ba56] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-100 hover:shadow-emerald-250/30 active:scale-98"
              >
                <span className="material-symbols-outlined text-sm font-bold">chat</span>
                <span>WhatsApp Directo</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
