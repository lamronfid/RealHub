'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { AgentMatch } from '@/app/api/agent-import/route';

interface Property {
  id?: string;
  title: string;
  operation_type: string;
  property_type: string;
  price: number;
  currency: string;
  neighborhood: string | null;
  city: string | null;
  department: string | null;
  sqm_total: number | null;
  sqm_built: number | null;
  bedrooms: number | null;
  garages: number | null;
  description: string | null;
  main_photo: string | null;
  photos: string[];
  amenities: string[];
  source_url?: string;
}

export default function PortfolioImportWizard({ profile }: { profile: any }) {
  const router = useRouter();
  const [step, setStep] = useState<'search' | 'profiles' | 'loading_properties' | 'properties' | 'success'>('search');
  const [searchTerm, setSearchTerm] = useState(profile?.full_name || '');
  const [searching, setSearching] = useState(false);
  const [profiles, setProfiles] = useState<AgentMatch[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AgentMatch | null>(null);
  const [loadingText, setLoadingText] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search profiles C21 / REMAX
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_agent', name: searchTerm.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setProfiles(data.matches || []);
      setStep('profiles');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al buscar el perfil del agente.');
    } finally {
      setSearching(false);
    }
  };

  // Scrape and fetch properties for selected profile
  const handleSelectProfile = async (agent: AgentMatch) => {
    setSelectedProfile(agent);
    setStep('loading_properties');
    setError(null);
    setLoadingText('Conectando con el portal de la inmobiliaria...');
    
    try {
      setLoadingText('Buscando tus propiedades publicadas...');
      const res = await fetch('/api/agent-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_agent',
          source: agent.source,
          agent_id: agent.agent_id,
          profile_url: agent.profile_url,
        }),
      });
      
      setLoadingText('Analizando detalles e imágenes...');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const list: Property[] = data.properties || [];
      setProperties(list);
      
      // Select all by default
      const ids = new Set<string>();
      list.forEach((_, idx) => ids.add(String(idx)));
      setSelectedIds(ids);

      if (list.length === 0) {
        setStep('search');
        setError('No se encontraron propiedades activas en tu perfil inmobiliario.');
      } else {
        setStep('properties');
      }
    } catch (err: any) {
      console.error(err);
      setStep('search');
      setError(err.message || 'Error al descargar tus propiedades.');
    }
  };

  // Import selected properties into `properties` table
  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const supabase = createClient();
      const selectedProperties = properties.filter((_, idx) => selectedIds.has(String(idx)));
      
      if (selectedProperties.length === 0) {
        throw new Error('Debes seleccionar al menos una propiedad para importar.');
      }

      const rowsToInsert = selectedProperties.map(p => ({
        agent_id: profile.id,
        title: p.title || 'Propiedad Importada',
        description: p.description || '',
        transaction_type: p.operation_type === 'venta' ? 'compra' : (p.operation_type || 'compra'),
        property_type: p.property_type || 'casa',
        sale_price: p.operation_type === 'venta' ? p.price : null,
        rent_price: p.operation_type === 'alquiler' ? p.price : null,
        currency: p.currency === 'GS' ? 'PYG' : (p.currency || 'USD'),
        department: p.department || null,
        city: p.city || 'Asunción',
        neighborhood: p.neighborhood || null,
        bedrooms: p.bedrooms || null,
        garages: p.garages || null,
        m2_terrain: p.sqm_total || null,
        m2_built: p.sqm_built || null,
        amenities: p.amenities || [],
        photos: p.photos || [],
        visibility: 'private', // default to private so they can review first
        status: 'activa',
      }));

      const { error } = await supabase.from('properties').insert(rowsToInsert);
      if (error) throw error;

      setStep('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar las propiedades.');
    } finally {
      setImporting(false);
    }
  };

  const handleSkip = () => {
    document.cookie = "skip_import_wizard=true; path=/; max-age=31536000"; // 1 year
    router.push('/');
    router.refresh();
  };

  const toggleSelect = (idxStr: string) => {
    const next = new Set(selectedIds);
    if (next.has(idxStr)) next.delete(idxStr);
    else next.add(idxStr);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const next = new Set<string>();
    properties.forEach((_, idx) => next.add(String(idx)));
    setSelectedIds(next);
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-10 shadow-premium max-w-4xl mx-auto space-y-8 relative overflow-hidden">
      
      {/* Glow */}
      <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Close Button */}
      <button 
        onClick={handleSkip}
        className="absolute top-6 right-6 w-8 h-8 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-750 transition-colors z-20 cursor-pointer"
        aria-label="Cerrar importador"
      >
        <span className="material-symbols-outlined text-base font-bold">close</span>
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6 relative z-10">
        <div className="space-y-1">
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100/60 text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
            Onboarding RealHub
          </span>
          <h2 className="text-xl md:text-2xl font-black font-heading text-slate-900 tracking-tight">
            Importa tus Propiedades Activas
          </h2>
          <p className="text-slate-400 text-xs font-semibold">
            Buscamos y sincronizamos automáticamente tu cartera de RE/MAX y Century 21.
          </p>
        </div>
        
        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full font-bold text-xs uppercase tracking-wider transition-colors duration-200"
        >
          Agregar Manualmente
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100/80 rounded-2xl p-4 text-xs font-semibold text-rose-600 flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Search Form */}
      {step === 'search' && (
        <div className="space-y-6 max-w-lg mx-auto py-4 text-center">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-650 mx-auto shadow-inner mb-4">
            <span className="material-symbols-outlined text-3xl">search_hands_free</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-heading text-base font-bold text-slate-800">
              ¿Cómo figuras en el sitio de tu franquicia?
            </h3>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed">
              Introduce tu nombre tal como aparece en tu perfil oficial de RE/MAX o Century 21 para que el scraper localice tus propiedades.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej: Miguel Angel Cáceres"
              className="flex-1 bg-slate-50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-850 focus:outline-none placeholder-slate-400 transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-indigo-100 disabled:opacity-45 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {searching ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">travel_explore</span>
                  <span>Buscar Perfil</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Profile Matches */}
      {step === 'profiles' && (
        <div className="space-y-6">
          <div className="space-y-2 text-center max-w-md mx-auto">
            <h3 className="font-heading text-base font-bold text-slate-855">
              Confirmar tu Perfil de Agente
            </h3>
            <p className="text-slate-400 text-xs font-semibold">
              Selecciona tu tarjeta de agente para iniciar la extracción de tus propiedades activas.
            </p>
          </div>

          {profiles.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">person_off</span>
              <p className="text-xs text-slate-500 font-bold">No pudimos encontrar perfiles en la red.</p>
              <button
                onClick={() => setStep('search')}
                className="mt-3 text-xs text-indigo-650 hover:underline font-bold"
              >
                Volver a buscar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
              {profiles.map((p) => (
                <div
                  key={p.agent_id}
                  className="bg-white border border-slate-100 hover:border-indigo-400 hover:shadow-md rounded-2xl p-4 flex items-center gap-4 transition-all duration-200"
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="w-16 h-16 rounded-full object-cover border border-slate-105 bg-slate-50 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 border border-slate-105 shrink-0">
                      <span className="material-symbols-outlined text-2xl">person</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-sm truncate">{p.name}</p>
                    <p className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider mt-0.5">{p.agency}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      {p.listings_count > 0 ? `${p.listings_count} propiedades encontradas` : 'Catalogando propiedades...'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectProfile(p)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                  >
                    Seleccionar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setStep('search')}
              className="text-xs text-slate-400 hover:text-slate-650 font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Loading Scraper */}
      {step === 'loading_properties' && (
        <div className="py-12 text-center space-y-6 max-w-sm mx-auto">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-400 border-l-transparent border-b-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-indigo-50/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-indigo-600 animate-pulse">download</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-sm font-bold text-slate-800">Scrapeando tus propiedades</h3>
            <p className="text-indigo-655 font-extrabold text-[10px] uppercase tracking-wider animate-pulse">{loadingText}</p>
            <p className="text-slate-405 text-[9px] font-medium pt-2 leading-relaxed">
              Esto puede tomar unos 10-20 segundos mientras Playwright descarga las fotos y el contenido estructurado.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Checklist of Properties */}
      {step === 'properties' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/80 text-xs">
            <div>
              <p className="font-extrabold text-slate-800">
                Seleccionadas: {selectedIds.size} de {properties.length}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Las propiedades seleccionadas serán copiadas automáticamente a tu cuenta.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-550 transition-colors cursor-pointer"
              >
                Todas
              </button>
              <button
                onClick={selectNone}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-550 transition-colors cursor-pointer"
              >
                Ninguna
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {properties.map((p, idx) => {
              const idxStr = String(idx);
              const isChecked = selectedIds.has(idxStr);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idxStr)}
                  className={`border rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 cursor-pointer select-none ${
                    isChecked ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' : 'border-slate-100 hover:border-slate-205'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // toggled by parent div click
                    className="w-4 h-4 rounded text-indigo-600 border-slate-200 focus:ring-indigo-500 cursor-pointer shrink-0"
                  />

                  {p.main_photo ? (
                    <img
                      src={p.main_photo}
                      alt={p.title}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <span className="material-symbols-outlined text-xl">landscape</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-xs truncate capitalize">{p.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {p.neighborhood ? `${p.neighborhood}, ` : ''}{p.city}
                    </p>
                    <p className="text-[11px] font-black text-indigo-650 mt-1">
                      {p.currency === 'GS' || p.currency === 'PYG' ? 'Gs.' : 'USD'} {p.price.toLocaleString('es-PY')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <button
              onClick={() => setStep('profiles')}
              className="text-xs text-slate-450 hover:text-slate-650 font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              Elegir otro perfil
            </button>

            <button
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-indigo-100/50 disabled:opacity-45 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {importing ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">cloud_download</span>
                  <span>Importar {selectedIds.size} Propiedades</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success Screen */}
      {step === 'success' && (
        <div className="py-8 text-center space-y-6 max-w-sm mx-auto">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-555 mx-auto shadow-md animate-bounce">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-lg font-black text-slate-800">¡Sincronización Exitosa!</h3>
            <p className="text-slate-404 text-xs leading-relaxed">
              Hemos importado {selectedIds.size} propiedades a tu perfil de RealHub correctamente. Ya están listas en tu panel y disponibles para la ficha de clientes o ACM.
            </p>
          </div>

          <button
            onClick={handleSkip}
            className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Ir al Panel de Agente</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}

    </div>
  );
}
