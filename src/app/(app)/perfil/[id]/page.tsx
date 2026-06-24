'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAgentReviews, submitAgentReview, AgentReview } from '@/lib/reviews';
import { getSubscriptionState } from '@/lib/subscription';
import VerifiedBadge from '@/components/VerifiedBadge';
import Link from 'next/link';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  casa: 'Casas',
  departamento: 'Departamentos',
  duplex: 'Dúplex',
  terreno: 'Terrenos / Lotes',
  local_comercial: 'Locales Comerciales',
  oficina: 'Oficinas',
  deposito: 'Depósitos',
  quinta: 'Quintas / Countries',
  campo: 'Estancias / Campos',
};

const getExperienceLabel = (years: any) => {
  if (!years) return 'No especificado';
  const y = parseInt(years, 10);
  if (y === 1) return 'Menos de 1 año';
  if (y === 3) return '1 - 3 años';
  if (y === 5) return '3 - 5 años';
  if (y === 10) return '5 - 10 años';
  if (y === 15) return '10 - 15 años';
  if (y === 20) return 'Más de 15 años';
  return `${y} años`;
};

const getSpecialtyLabel = (specialties: any) => {
  const spec = Array.isArray(specialties) ? specialties[0] : specialties;
  if (!spec) return 'Ventas y Alquileres';
  if (spec === 'venta') return 'Ventas de Inmuebles';
  if (spec === 'alquiler') return 'Alquileres';
  if (spec === 'ambos') return 'Ventas y Alquileres';
  return spec;
};

export default function AgentPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [isOwnerBlocked, setIsOwnerBlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const supabase = createClient();
        
        // 1. Get current logged in user details
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: currentProf } = await supabase
            .from('agent_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (currentProf) {
            setCurrentProfile(currentProf);
          }
        }

        // 2. Fetch the target agent profile
        // If it's a mock agent, we can generate a mock profile
        if (id.startsWith('mock-agent-')) {
          const index = parseInt(id.replace('mock-agent-', ''), 10);
          const mockNames = ['Sofía Benítez', 'Carlos Maidana', 'María González', 'Julio Benítez'];
          const mockAgencies = ['Génesis Inmobiliaria', 'Maidana Propiedades', 'Century 21 Paraguay', 'Benítez & Asociados'];
          const name = mockNames[index % mockNames.length] || 'Colega RealHub';
          const agency = mockAgencies[index % mockAgencies.length] || 'Inmobiliaria Independiente';
          
          setAgent({
            id,
            full_name: name,
            agency_name: agency,
            agency_office: index % 2 === 0 ? 'Sucursal Central' : 'Sucursal Este',
            phone: '+595 981 555 123',
            whatsapp: '+595 981 555 123',
            bio: `Agente inmobiliario profesional con amplia experiencia en el mercado de Asunción y Gran Asunción. Especializado en cierres rápidos y colaboraciones 50/50.`,
            subscription_tier: index === 0 ? 'elite' : 'free',
            is_verified: index === 0,
            avatar_url: null,
            experience_years: index === 0 ? 10 : 3,
            specialties: ['ambos'],
            coverage_areas: ['Asunción', 'Fernando de la Mora'],
            license_number: 'M.U.A. 4832',
            most_sold_types: ['casa', 'departamento', 'terreno'],
            has_developments: index === 0,
            developments_details: index === 0 ? '• Edificio More del Sol: Unidades premium de 1, 2 y 3 dormitorios en preventa.\n• Condominio Aqua Village: Lotes residenciales exclusivos con laguna artificial.' : null
          });

          // Mock properties for the mock agent
          setProperties([
            {
              id: 'mock-prop-1',
              title: 'Hermoso Departamento en Villa Morra',
              property_type: 'departamento',
              transaction_type: 'alquiler',
              rent_price: 4500000,
              currency: 'PYG',
              bedrooms: 2,
              bathrooms: 2,
              city: 'Asunción',
              neighborhood: 'Villa Morra',
              photos: []
            },
            {
              id: 'mock-prop-2',
              title: 'Residencia Moderna en Luque',
              property_type: 'casa',
              transaction_type: 'venta',
              sale_price: 185000,
              currency: 'USD',
              bedrooms: 3,
              bathrooms: 3,
              city: 'Luque',
              neighborhood: 'Cortijo',
              photos: []
            }
          ]);

          setProspects([
            {
              id: 'mock-prosp-1',
              transaction_type: 'compra',
              property_types: ['casa', 'duplex'],
              currency: 'USD',
              price_max: 120000,
              rooms_min: 3,
              bathrooms_min: 2,
              notes: 'Busca zona Luque o San Lorenzo para su familia.',
              departments: ['Central'],
              created_at: new Date().toISOString()
            }
          ]);
        } else {
          const { data: prof, error } = await supabase
            .from('agent_profiles')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) {
            console.error('Error fetching agent profile:', error.message);
            // fallback mock if profile not found
            setAgent({
              id,
              full_name: 'Agente RealHub',
              agency_name: 'Inmobiliaria Local',
              agency_office: null,
              phone: '+595 981 000 000',
              whatsapp: '+595 981 000 000',
              bio: 'Agente registrado en RealHub.',
              subscription_tier: 'free',
              is_verified: false,
              avatar_url: null,
              experience_years: 1,
              specialties: ['ambos'],
              coverage_areas: ['Asunción'],
              license_number: 'No registrado',
              most_sold_types: [],
              has_developments: false,
              developments_details: null
            });
          } else {
            // Block Owner accounts
            if (prof.role === 'owner') {
              setIsOwnerBlocked(true);
            } else {
              setAgent(prof);

              // 3. Fetch agent's properties
              const { data: props, error: propsErr } = await supabase
                .from('properties')
                .select('*')
                .eq('agent_id', id)
                .or('status.eq.activa,visibility.eq.marketplace')
                .order('created_at', { ascending: false });

              if (!propsErr && props) {
                setProperties(props);
              }

              // 4. Fetch agent's prospects
              const { data: prosps, error: prospsErr } = await supabase
                .from('prospects')
                .select('*')
                .eq('agent_id', id)
                .order('created_at', { ascending: false });

              if (!prospsErr && prosps) {
                setProspects(prosps);
              }
            }
          }
        }

        // 4. Fetch reviews for the agent
        const revs = await getAgentReviews(id);
        setReviews(revs);
      } catch (err) {
        console.error('Error loading public profile data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  // Handle Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setSubmitError('Debes iniciar sesión para dejar una opinión.');
      return;
    }
    if (currentUser.id === id) {
      setSubmitError('No puedes dejarte una opinión a ti mismo.');
      return;
    }
    if (!comment.trim()) {
      setSubmitError('Por favor escribe un comentario.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const fromAgentName = currentProfile?.full_name || currentUser.email?.split('@')[0] || 'Colega';
      const success = await submitAgentReview(currentUser.id, id, rating, comment, fromAgentName);
      
      if (success) {
        setSubmitSuccess('¡Opinión enviada con éxito!');
        setComment('');
        setRating(5);
        
        // Reload reviews
        const updatedReviews = await getAgentReviews(id);
        setReviews(updatedReviews);
        
        setTimeout(() => setSubmitSuccess(''), 3000);
      } else {
        setSubmitError('Hubo un error al guardar tu opinión. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Error de red al guardar la opinión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOwnerBlocked) {
    return (
      <div className="text-center py-16 space-y-4 font-sans bg-slate-950/5 max-w-md mx-auto rounded-3xl p-8 border border-slate-100/50 mt-12">
        <span className="material-symbols-outlined text-5xl text-indigo-500">admin_panel_settings</span>
        <h2 className="text-lg font-bold text-slate-800">Perfil no público</h2>
        <p className="text-xs text-slate-450 leading-relaxed">
          Los perfiles de tipo Propietario (Owner) no están disponibles para vista pública de otros agentes.
        </p>
        <Link href="/marketplace" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
          Ir al Marketplace
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 text-sm font-semibold">Cargando perfil del agente...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-16 space-y-4">
        <span className="material-symbols-outlined text-5xl text-slate-400">person_off</span>
        <h2 className="text-lg font-bold text-slate-800">Agente no encontrado</h2>
        <Link href="/marketplace" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold">
          Volver al Marketplace
        </Link>
      </div>
    );
  }

  // Calculate review statistics
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '5.0';

  const starCounts = [0, 0, 0, 0, 0]; // index 0 for 1 star, index 4 for 5 stars
  reviews.forEach((r) => {
    const starIdx = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    starCounts[starIdx]++;
  });

  const getSubState = () => {
    // If viewing own profile page or if stored locally
    return getSubscriptionState(agent);
  };

  const { tier: agentTier, isVerified: agentVerified } = getSubState();

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-8 font-sans">
      
      {/* Back button */}
      <div>
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-bold transition-all uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a listados
        </Link>
      </div>

      {/* Main Agent Details Header Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
        
        {/* Glow if premium */}
        {agentVerified && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Avatar */}
        <div className="shrink-0 mx-auto md:mx-0">
          {agent.avatar_url ? (
            <img src={agent.avatar_url} alt={agent.full_name} className="w-28 h-28 rounded-2xl object-cover border border-slate-100 shadow-sm" />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-slate-100 flex items-center justify-center shadow-inner">
              <span className="text-4xl font-extrabold text-indigo-500/80">
                {agent.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info Info */}
        <div className="flex-1 space-y-3 text-center md:text-left w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-black text-slate-800 flex items-center justify-center md:justify-start gap-1">
              {agent.full_name}
              {agentVerified && <VerifiedBadge className="w-5.5 h-5.5" />}
            </h1>
            
            {agentVerified && (
              <span className="inline-block bg-gradient-to-r from-sky-400/10 via-indigo-500/10 to-pink-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mx-auto md:mx-0 shrink-0">
                Miembro Élite
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 justify-center md:justify-start">
            <span className="material-symbols-outlined text-slate-400 text-sm">corporate_fare</span>
            <span>
              {agent.agency_name || 'Agente Independiente'}
              {agent.agency_name && agent.agency_office && ` — ${agent.agency_office}`}
            </span>
          </p>

          {agent.bio && (
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {agent.bio}
            </p>
          )}

          {/* Most Sold Property Types tags */}
          {agent.most_sold_types && agent.most_sold_types.length > 0 && (
            <div className="space-y-1.5 pt-2 flex flex-col items-center md:items-start">
              <span className="text-[10px] text-slate-405 font-bold uppercase tracking-wider block">Propiedades de Especialidad:</span>
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                {agent.most_sold_types.map((type: string) => (
                  <span key={type} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200/40">
                    {PROPERTY_TYPE_LABELS[type] || type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Professional Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-t border-b border-slate-100 my-4 text-left font-sans">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Experiencia</span>
              <span className="text-xs font-bold text-slate-700">{getExperienceLabel(agent.experience_years)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Especialidad</span>
              <span className="text-xs font-bold text-slate-700">{getSpecialtyLabel(agent.specialties)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Licencia</span>
              <span className="text-xs font-bold text-slate-700 truncate block">{agent.license_number || 'No especificado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Zonas Cobertura</span>
              <span className="text-xs font-bold text-slate-700 truncate block" title={agent.coverage_areas?.join(', ')}>
                {agent.coverage_areas && agent.coverage_areas.length > 0 
                  ? agent.coverage_areas.join(', ') 
                  : 'Paraguay'}
              </span>
            </div>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all"
              >
                <span className="material-symbols-outlined text-sm">phone</span>
                Llamar
              </a>
            )}
            
            {agent.whatsapp && (
              <a
                href={`https://wa.me/${agent.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Rating Summary Box */}
        <div className="w-full md:w-auto bg-slate-50 rounded-2xl border border-slate-100/60 p-4 text-center shrink-0 space-y-1">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            <span className="material-symbols-outlined fill-current text-2xl">star</span>
            <span className="text-2xl font-black text-slate-800">{averageRating}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {totalReviews} {totalReviews === 1 ? 'Opinión' : 'Opiniones'}
          </p>
        </div>

      </div>

      {/* Developments Section */}
      {agent.has_developments && agent.developments_details && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 rounded-3xl p-6 md:p-8 shadow-xl text-white space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <span className="material-symbols-outlined text-indigo-400 text-2xl">home_work</span>
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-black tracking-wide">
              Desarrollos y Emprendimientos en Pozo
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-white/5 border border-white/10 rounded-2xl p-4">
            {agent.developments_details}
          </p>
        </div>
      )}

      {/* Properties Grid Section */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500 font-bold">domain</span>
            Propiedades del Agente
          </h2>
          <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1 rounded-full border border-indigo-100">
            {properties.length} {properties.length === 1 ? 'Propiedad' : 'Propiedades'}
          </span>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">domain_disabled</span>
            <p className="text-slate-400 text-xs font-semibold">Este agente no tiene propiedades activas publicadas actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => {
              const price = prop.transaction_type === 'venta' ? prop.sale_price : prop.rent_price;
              const formattedPrice = price ? Math.round(price).toLocaleString('es-PY').replace(/,/g, '.') : 'Consultar';
              const photoUrl = prop.photos && prop.photos.length > 0 ? prop.photos[0] : null;

              return (
                <div key={prop.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between font-sans">
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt={prop.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 bg-slate-50">
                        <span className="material-symbols-outlined text-3xl">image</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Sin foto</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      {prop.transaction_type}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1 text-left">
                      <p className="text-indigo-600 font-extrabold text-[13px]">
                        {prop.currency} {formattedPrice} {prop.transaction_type === 'alquiler' && '/ mes'}
                      </p>
                      <h3 className="font-sans font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {prop.title}
                      </h3>
                      <p className="text-[10px] text-slate-450 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {prop.neighborhood}, {prop.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">bed</span>
                        {prop.bedrooms || 0} Dorms
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">bathtub</span>
                        {prop.bathrooms || 0} Baños
                      </span>
                      <span className="capitalize ml-auto bg-slate-50 text-slate-550 border border-slate-100 px-2 py-0.5 rounded-md">
                        {prop.property_type}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 pb-4 shrink-0">
                    <Link
                      href={`/propiedades/${prop.id}`}
                      className="w-full py-2.5 bg-slate-50 hover:bg-indigo-600 border border-slate-100 hover:border-indigo-600 hover:text-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                    >
                      Ver Detalles
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prospects Section (Only show if not agency) */}
      {agent.account_type !== 'agency' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-500 font-bold">people</span>
              Prospectos de Búsqueda Activos
            </h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1 rounded-full border border-indigo-100">
              {prospects.length} {prospects.length === 1 ? 'Prospecto' : 'Prospectos'}
            </span>
          </div>

          {prospects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
              <p className="text-slate-400 text-xs font-semibold">Este agente no tiene prospectos de búsqueda activos actualmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prospects.map((prosp) => {
                const types = prosp.property_types && prosp.property_types.length > 0
                  ? prosp.property_types.map((t: string) => PROPERTY_TYPE_LABELS[t] || t).join(', ')
                  : 'Cualquier tipo';

                const locations = prosp.neighborhoods && prosp.neighborhoods.length > 0
                  ? prosp.neighborhoods.join(', ')
                  : prosp.departments && prosp.departments.length > 0
                    ? prosp.departments.join(', ')
                    : 'Cualquier zona';

                const priceText = prosp.price_min || prosp.price_max
                  ? `${prosp.currency} ${prosp.price_min ? prosp.price_min.toLocaleString('es-PY') : '0'} - ${prosp.price_max ? prosp.price_max.toLocaleString('es-PY') : 'unlimited'}`
                  : 'A convenir';

                return (
                  <div key={prosp.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all text-left">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          prosp.transaction_type === 'alquiler'
                            ? 'bg-blue-50 text-blue-700 border border-blue-150'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                        }`}>
                          Busca {prosp.transaction_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(prosp.created_at).toLocaleDateString('es-PY')}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                        {types}
                      </h4>
                      
                      <p className="text-[11px] text-slate-450 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {locations}
                      </p>

                      <div className="pt-2">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Presupuesto</span>
                        <span className="text-sm font-extrabold text-indigo-650">{priceText}</span>
                      </div>
                    </div>

                    {prosp.notes && (
                      <p className="text-[11px] text-slate-400 italic mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                        "{prosp.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Two columns: Reviews list and Create review form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Reviews list & breakdown (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="font-[family-name:var(--font-outfit)] text-lg font-black text-slate-800">
              Opiniones de otros Colegas Inmobiliarios
            </h2>

            {/* Ratings Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center border-b border-slate-100 pb-6">
              <div className="sm:col-span-4 text-center space-y-1">
                <h3 className="text-4xl font-black text-slate-800">{averageRating}</h3>
                <div className="flex justify-center text-amber-400 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span 
                      key={i} 
                      className={`material-symbols-outlined text-lg ${
                        i < Math.floor(parseFloat(averageRating)) ? 'fill-current' : ''
                      }`}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Promedio General</p>
              </div>

              {/* Progress Bars */}
              <div className="sm:col-span-8 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = starCounts[stars - 1] || 0;
                  const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <span className="w-3 font-semibold text-slate-500 text-right">{stars}</span>
                      <span className="material-symbols-outlined text-[10px] text-slate-400 fill-current">star</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-6 text-slate-400 text-right font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <span className="material-symbols-outlined text-3xl text-slate-300">chat_bubble</span>
                  <p className="text-slate-400 text-xs">Este agente aún no tiene opiniones. ¡Sé el primero en calificarlo!</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 space-y-2 transition-all hover:bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300/40">
                          {rev.from_agent_avatar ? (
                            <img src={rev.from_agent_avatar} alt={rev.from_agent_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-500">
                              {rev.from_agent_name?.charAt(0).toUpperCase() || 'C'}
                            </span>
                          )}
                        </div>
                        <div>
                        {rev.from_agent_id ? (
                          <Link href={`/perfil/${rev.from_agent_id}`}>
                            <h4 className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline transition-colors cursor-pointer">{rev.from_agent_name}</h4>
                          </Link>
                        ) : (
                          <h4 className="text-xs font-bold text-slate-700">{rev.from_agent_name}</h4>
                        )}
                        <span className="text-[9px] text-slate-400 font-semibold">Colega Inmobiliario</span>
                      </div>
                      </div>
                      <div className="text-right">
                        <div className="flex text-amber-400 text-[10px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span 
                              key={i} 
                              className={`material-symbols-outlined text-xs ${
                                i < rev.rating ? 'fill-current' : ''
                              }`}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {new Date(rev.created_at).toLocaleDateString('es-PY', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pl-10">
                      "{rev.comment}"
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Create Review Form (Col 5) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="font-[family-name:var(--font-outfit)] text-base font-black text-slate-800">
                Dejar una Opinión
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Califica tu experiencia colaborando con {agent.full_name}.
              </p>
            </div>

            {currentUser?.id === id ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3 rounded-2xl flex items-start gap-2">
                <span className="material-symbols-outlined text-base shrink-0">info</span>
                <p>Estás viendo tu propio perfil público. No puedes dejarte opiniones a ti mismo.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                
                {submitError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                    <p>{submitError}</p>
                  </div>
                )}

                {submitSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
                    <p>{submitSuccess}</p>
                  </div>
                )}

                {/* Stars selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Puntaje</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isHighlighted = hoveredRating !== null ? star <= hoveredRating : star <= rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(null)}
                          className="focus:outline-none transition-transform active:scale-90"
                        >
                          <span 
                            className={`material-symbols-outlined text-3xl select-none cursor-pointer ${
                              isHighlighted ? 'text-amber-400 fill-current' : 'text-slate-200'
                            }`}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                    <span className="text-xs font-bold text-slate-400 ml-2">
                      {rating === 5 ? 'Excelente' : rating === 4 ? 'Muy Bueno' : rating === 3 ? 'Bueno' : rating === 2 ? 'Regular' : 'Malo'}
                    </span>
                  </div>
                </div>

                {/* Comment area */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Comentarios / Experiencia</label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe cómo fue trabajar en conjunto, si respetó la comisión, la puntualidad, etc."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 rounded-2xl py-3 px-4 text-xs font-medium text-slate-800 focus:outline-none placeholder-slate-400 transition-colors resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">rate_review</span>
                      <span>Publicar Opinión</span>
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
