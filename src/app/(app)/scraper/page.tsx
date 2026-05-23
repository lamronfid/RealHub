'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSubscriptionState } from '@/lib/subscription';
import Link from 'next/link';

export default function ScraperPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<any>(null);
  const [tier, setTier] = useState<string>('free');
  const [searchesUsed, setSearchesUsed] = useState<number>(0);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Form states
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Simulated console logs state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  // Scraped result state
  const [scrapedResult, setScrapedResult] = useState<any>(null);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Fetch user profile and subscription tier
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('agent_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (prof) {
            setProfile(prof);
            const { tier: activeTier } = getSubscriptionState(prof);
            setTier(activeTier);
            setSearchesUsed(prof.scraper_searches_used || 0);
          }
        }
      } catch (err) {
        console.error('Error loading profile in scraper page:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  // 2. Trigger Extraction
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError('');
    setScrapedResult(null);
    setSuccess(false);
    setLoading(true);
    setShowConsole(true);
    setConsoleLogs([]);

    // Console logging simulation helper
    const logSteps = [
      '⚡ [1/5] Conectando con los servidores del portal externo...',
      '🌐 [2/5] Descargando contenido HTML de la propiedad...',
      '🛠️ [3/5] Analizando selectores CSS y extrayendo metadatos...',
      '📦 [4/5] Mapeando campos al catálogo y ciudades de Paraguay...',
      '✅ [5/5] Extracción finalizada con éxito. Procesando vista previa.'
    ];

    for (let i = 0; i < logSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setConsoleLogs((prev) => [...prev, logSteps[i]]);
    }

    try {
      const response = await fetch('/api/scraper/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || 'Ocurrió un error al procesar el scrape.');
        setLoading(false);
        return;
      }

      setScrapedResult(resData.data);
      setSearchesUsed(resData.usage.used);
      setSuccess(true);
    } catch (err: any) {
      setError('Error al comunicar con la pasarela del extractor.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm and Save to Supabase Properties table
  const handleImport = async () => {
    if (!scrapedResult || !profile) return;

    setIsSaving(true);
    setError('');

    try {
      const { data: newProp, error: insertError } = await supabase
        .from('properties')
        .insert({
          agent_id: profile.id,
          title: scrapedResult.title,
          description: scrapedResult.description,
          transaction_type: scrapedResult.transaction_type,
          property_type: scrapedResult.property_type,
          sale_price: scrapedResult.sale_price,
          rent_price: scrapedResult.rent_price,
          currency: scrapedResult.currency,
          department: scrapedResult.department,
          city: scrapedResult.city,
          neighborhood: scrapedResult.neighborhood,
          bedrooms: scrapedResult.bedrooms,
          bathrooms: scrapedResult.bathrooms,
          garages: scrapedResult.garages,
          m2_terrain: scrapedResult.m2_terrain,
          m2_built: scrapedResult.m2_built,
          amenities: scrapedResult.amenities,
          photos: scrapedResult.photos,
          visibility: 'private', // Saved as private initially so the agent can review and edit
          status: scrapedResult.transaction_type === 'compra' ? 'En Venta' : 'En Alquiler'
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/propiedades/${newProp.id}/editar`);
      }, 1500);

    } catch (err: any) {
      console.error('Error inserting property:', err);
      setError('No se pudo guardar la propiedad en la base de datos: ' + err.message);
      setIsSaving(false);
    }
  };

  // Render Loader spinner
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLocked = tier === 'free' || tier === 'standard';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 font-sans">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600 text-3xl">travel_explore</span>
          Extractor de Propiedades (Scraper)
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Importa fichas de propiedades de Clasipar e InfoCasas directamente a tu cartera con un clic.
        </p>
      </div>

      {isLocked ? (
        // 🔒 PREMIUM LOCKED CONTAINER
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-xl p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-pink-500/5 pointer-events-none" />
          
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Característica Premium
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Desbloquea el Scraper de Propiedades
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Ahórrate horas de carga manual de fotos, títulos, características y m². Ingresa cualquier link de InfoCasas o Clasipar y nuestro extractor inteligente se encargará de rellenar la ficha de propiedad por ti de forma inmediata.
            </p>
          </div>

          <div className="pt-4 max-w-xs mx-auto">
            <Link
              href="/subscripcion/planes"
              className="block w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-[0.98]"
            >
              Ver planes de suscripción
            </Link>
          </div>
        </div>
      ) : (
        // 🔓 UNLOCKED FRONT END VIEW
        <div className="space-y-6">
          
          {/* Usage limit card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Estado del Extractor</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">Extractor activo y listo</span>
              </div>
            </div>
            
            <div className="w-full md:w-64 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Uso Mensual</span>
                <span className="text-slate-800">
                  {tier === 'elite' ? 'Búsquedas ilimitadas (Élite)' : `${searchesUsed} / 100 consultas`}
                </span>
              </div>
              {tier !== 'elite' && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(searchesUsed, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Box */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold">Portales Compatibles:</span>
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                InfoCasas Paraguay
              </span>
              <span className="bg-sky-50 border border-sky-100 text-sky-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Clasipar
              </span>
            </div>

            <form onSubmit={handleExtract} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">URL de la Propiedad</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Pega el link de InfoCasas o Clasipar aquí..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-md shadow-indigo-100"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Extrayendo...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">settings_ethernet</span>
                        <span>Extraer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Simulated Live Console Log */}
            {showConsole && (
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 space-y-1 shadow-inner max-h-[160px] overflow-y-auto">
                <div className="flex items-center justify-between text-slate-500 border-b border-white/[0.04] pb-1.5 mb-2 font-sans">
                  <span>Terminal de extracción de datos</span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-600">RealHub-Scrape v1.0</span>
                </div>
                {consoleLogs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed animate-fade-in">{log}</p>
                ))}
                {loading && (
                  <div className="inline-flex items-center gap-1.5 mt-1 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="animate-pulse">Esperando respuesta del servidor...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scraped Results Preview */}
          {success && scrapedResult && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fade-in relative">
              {saveSuccess && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-20 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <span className="material-symbols-outlined text-3xl font-bold">check</span>
                  </div>
                  <div className="text-center">
                    <h4 className="font-heading text-lg font-bold text-slate-900">¡Propiedad Importada Correctamente!</h4>
                    <p className="text-slate-400 text-xs mt-1">Redireccionando al editor para completar el registro...</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Resultados de Extracción
                  </span>
                  <h3 className="font-heading text-lg font-bold text-slate-800 mt-2">Vista Previa de la Ficha</h3>
                </div>
                <div className="bg-slate-50 border border-slate-100 text-slate-500 font-extrabold text-[9px] uppercase tracking-wider px-3 py-1 rounded-md">
                  Fuente: {scrapedResult.source}
                </div>
              </div>

              {/* Scraped Layout Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Images column */}
                <div className="md:col-span-5 space-y-3">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img 
                      src={scrapedResult.photos[0]} 
                      alt="Scraped main" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {scrapedResult.photos.slice(1, 4).map((url: string, i: number) => (
                      <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={url} alt={`Scraped gallery ${i}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details column */}
                <div className="md:col-span-7 space-y-4">
                  {/* Title and Price */}
                  <div>
                    <input 
                      type="text" 
                      value={scrapedResult.title}
                      onChange={(e) => setScrapedResult({ ...scrapedResult, title: e.target.value })}
                      className="w-full text-lg font-bold text-slate-800 border-b border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none pb-1 font-heading" 
                      placeholder="Título de la propiedad"
                    />
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-slate-900 font-heading">
                        {scrapedResult.currency === 'USD' ? '$' : '₲'}
                        {(scrapedResult.sale_price || scrapedResult.rent_price || 0).toLocaleString('es-PY')}
                      </span>
                      <span className="text-slate-400 text-xs font-semibold">
                        / {scrapedResult.transaction_type === 'compra' ? 'Venta Total' : 'Alquiler Mensual'}
                      </span>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Habitaciones</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">bed</span>
                        {scrapedResult.bedrooms || '—'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Baños</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">bathtub</span>
                        {scrapedResult.bathrooms || '—'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Cocheras</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">garage</span>
                        {scrapedResult.garages || '0'}
                      </span>
                    </div>
                    <div className="space-y-0.5 mt-2">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Superficie</span>
                      <span className="text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">square_foot</span>
                        {scrapedResult.m2_built || scrapedResult.m2_terrain || '—'} m²
                      </span>
                    </div>
                    <div className="space-y-0.5 mt-2 col-span-2">
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Ubicación</span>
                      <span className="text-slate-700 flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                        {scrapedResult.neighborhood}, {scrapedResult.city}
                      </span>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Descripción</label>
                    <textarea 
                      value={scrapedResult.description}
                      onChange={(e) => setScrapedResult({ ...scrapedResult, description: e.target.value })}
                      className="w-full text-xs text-slate-500 font-medium bg-slate-50/50 border border-slate-200 rounded-xl p-3 h-28 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Amenities tags */}
                  {scrapedResult.amenities.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Amenities detectados</span>
                      <div className="flex flex-wrap gap-1">
                        {scrapedResult.amenities.map((item: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit import action */}
                  <div className="pt-2">
                    <button
                      onClick={handleImport}
                      disabled={isSaving}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando propiedad...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Confirmar e Importar a mis Propiedades</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
