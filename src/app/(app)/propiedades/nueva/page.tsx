'use client';

import { createProperty } from '@/app/(app)/propiedades/actions';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploadGrid from '@/components/property/PhotoUploadGrid';
import MapPicker from '@/components/property/MapPicker';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DETAILED_PROPERTY_TYPES, LAND_ONLY_TYPES, COMMERCIAL_TYPES,
  CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS, AMENITIES,
  CONSTRUCTION_TYPES, CONSERVATION_STATES, LOT_SHAPES, TOPOGRAPHY_TYPES, ACCESS_TYPES,
  SERVICES, ZONING_TYPES, FLOOR_LOCATIONS,
} from '@/lib/types';

const STEP_LABELS = ['Básico', 'Detalles', 'Características', 'Fotos & Mapa', 'Publicar'];

export default function NuevaPropiedad() {
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState('');
  const [transactionType, setTransactionType] = useState('compra');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasConstruction, setHasConstruction] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const isDetailed = DETAILED_PROPERTY_TYPES.includes(propertyType as any);
  const isLand = LAND_ONLY_TYPES.includes(propertyType as any);
  const isCommercial = COMMERCIAL_TYPES.includes(propertyType as any);
  const isApartment = propertyType === 'departamento';
  const isLocalComercial = propertyType === 'local_comercial';
  const isHouse = ['casa', 'duplex', 'casa_duplex'].includes(propertyType);
  const availableCities = CITIES[department] || [];
  const availableNeighborhoods = NEIGHBORHOODS[city] || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (photos.length === 0) { setError('Debes subir al menos una foto'); setStep(3); return; }
    setError('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    const finalNeighborhood = neighborhood === '__otro__' ? customNeighborhood : neighborhood;
    formData.set('neighborhood', finalNeighborhood);
    formData.set('photos', JSON.stringify(photos));
    formData.set('amenities', selectedAmenities.join(','));
    formData.set('has_elevator', hasElevator ? 'true' : 'false');
    if (latitude !== null) formData.set('latitude', String(latitude));
    if (longitude !== null) formData.set('longitude', String(longitude));

    startTransition(async () => {
      try {
        const res = await createProperty(formData);
        if (res?.error) throw new Error(res.error);
        router.push('/propiedades');
      } catch (err: any) { setError(err.message || 'Error al guardar.'); }
    });
  };

  const canAdvance = () => {
    if (step === 0) {
      if (!propertyType) return false;
      if (department) {
        if (!city) return false;
        if (!neighborhood) return false;
        if (neighborhood === '__otro__' && !customNeighborhood.trim()) return false;
      }
    }
    return true;
  };

  const ic = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all";

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 mb-2">Nueva Propiedad</h2>

      {/* Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-widest ${i <= step ? 'text-indigo-600' : 'text-slate-300'}`}>{label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium">{error}</div>}

        {/* ═══ STEP 0: Basic Info ═══ */}
        {step === 0 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">info</span>Información Básica</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Título *</label>
              <input name="title" required className={ic} placeholder="Ej: Casa en Villa Morra" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Operación *</label>
                <select name="transaction_type" value={transactionType} onChange={e => setTransactionType(e.target.value)} className={ic}>
                  <option value="compra">Venta</option>
                  <option value="alquiler">Alquiler</option>
                  <option value="ambos">Venta y Alquiler</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tipo *</label>
                <select name="property_type" value={propertyType} onChange={e => setPropertyType(e.target.value)} required className={ic}>
                  <option value="">Seleccionar...</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['compra', 'ambos'].includes(transactionType) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio Venta</label>
                  <input name="sale_price" type="number" min="0" step="any" className={ic} placeholder="Ej: 150000" />
                </div>
              )}
              {['alquiler', 'ambos'].includes(transactionType) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio Alquiler</label>
                  <input name="rent_price" type="number" min="0" step="any" className={ic} placeholder="Ej: 1000" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
                <select name="currency" className={ic}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {/* Location */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Departamento</label>
                <select name="department" value={department} onChange={e => { setDepartment(e.target.value); setCity(''); setNeighborhood(''); }} className={ic}>
                  <option value="">Seleccionar...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ciudad</label>
                <select name="city" value={city} onChange={e => { setCity(e.target.value); setNeighborhood(''); }} className={ic}>
                  <option value="">Seleccionar...</option>
                  {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Barrio</label>
                <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={ic}>
                  <option value="">Seleccionar...</option>
                  {availableNeighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
                  <option value="__otro__">✏️ Otro</option>
                </select>
                {neighborhood === '__otro__' && <input value={customNeighborhood} onChange={e => setCustomNeighborhood(e.target.value)} className={`${ic} mt-2`} placeholder="Nombre del barrio..." />}
                <input type="hidden" name="neighborhood" value={neighborhood === '__otro__' ? customNeighborhood : neighborhood} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 1: Details (bedrooms, bathrooms, m²) ═══ */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">apartment</span>Detalles del Inmueble</h3>

            {/* ── Casa, Departamento, Dúplex, etc ── */}
            {isDetailed && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dormitorios</label><input name="bedrooms" type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños</label><input name="bathrooms" type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Garajes</label><input name="garages" type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Amoblado</label>
                    <select name="furnished" className={ic}>
                      <option value="">No especificado</option>
                      <option value="amoblado">Amoblado</option>
                      <option value="semi">Semi-amoblado</option>
                      <option value="sin">Sin amueblar</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" type="number" className={ic} /></div>
                  {isApartment && <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Balcón</label><input name="m2_balcony" type="number" className={ic} /></div>}
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Año Construcción</label><input name="construction_year" type="number" placeholder="Ej: 2020" className={ic} /></div>
                </div>
                {/* Departamento extras */}
                {isApartment && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Piso del departamento</label><input name="floor_number" type="number" min="1" max="50" className={ic} placeholder="Ej: 5" /></div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">¿Tiene ascensor?</label>
                      <button type="button" onClick={() => setHasElevator(!hasElevator)}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-medium border transition-all ${hasElevator ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                      >{hasElevator ? '✓ Sí, tiene ascensor' : 'No tiene ascensor'}</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Terreno ── */}
            {isLand && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Superficie total (m²)</label><input name="m2_terrain" type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cant. Árboles</label><input name="trees_count" type="number" className={ic} /></div>
                </div>
                {/* Toggle: ¿Tiene construcción? */}
                <div className="pt-2">
                  <button type="button" onClick={() => setHasConstruction(!hasConstruction)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${hasConstruction ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{hasConstruction ? 'check_box' : 'check_box_outline_blank'}</span>
                    ¿Tiene construcción?
                  </button>
                </div>
                {hasConstruction && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" type="number" className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Año Construcción</label><input name="construction_year" type="number" placeholder="Ej: 2020" className={ic} /></div>
                  </div>
                )}
              </div>
            )}

            {/* ── Local Comercial ── */}
            {isLocalComercial && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Superficie total (m²)</label><input name="m2_built" type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Frente (metros)</label><input name="front_meters" type="number" step="0.1" className={ic} placeholder="Ej: 8.5" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Piso</label>
                  <select name="floor_location" className={ic}>
                    <option value="">Seleccionar...</option>
                    {FLOOR_LOCATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Oficina / Depósito / Inmueble Productivo ── */}
            {isCommercial && !isLocalComercial && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" type="number" className={ic} /></div>
              </div>
            )}

            {/* No type selected */}
            {!isDetailed && !isLand && !isCommercial && (
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700 font-medium">
                <span className="material-symbols-outlined text-[16px] mr-1 align-text-bottom">warning</span>
                Seleccioná un tipo de propiedad en el paso anterior para ver los campos específicos.
              </div>
            )}

            {/* Amenities — for detailed types */}
            {isDetailed && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map(a => (
                    <button key={a} type="button" onClick={() => setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedAmenities.includes(a) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >{a}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Physical Characteristics ═══ */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">construction</span>Características Físicas</h3>
            <p className="text-xs text-slate-400">Estos datos mejoran las coincidencias automáticas con prospectos.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Construction type — all except terreno */}
              {!isLand && (
                <>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tipo de Construcción</label>
                    <select name="construction_type" className={ic}><option value="">Seleccionar...</option>{CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Estado de Conservación</label>
                    <select name="conservation_state" className={ic}><option value="">Seleccionar...</option>{CONSERVATION_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                </>
              )}

              {/* Lot shape, topography, access — for casa/duplex/terreno */}
              {(isHouse || isLand) && (
                <>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Forma del Terreno</label>
                    <select name="lot_shape" className={ic}><option value="">Seleccionar...</option>{LOT_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Topografía</label>
                    <select name="topography" className={ic}><option value="">Seleccionar...</option>{TOPOGRAPHY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Acceso</label>
                    <select name="access_type" className={ic}><option value="">Seleccionar...</option>{ACCESS_TYPES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                  </div>
                </>
              )}

              {/* Services — for casa/duplex/terreno */}
              {(isHouse || isLand) && (
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Servicios</label>
                  <select name="services" className={ic}><option value="">Seleccionar...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              )}

              {/* Zoning — terreno only */}
              {isLand && (
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Zonificación</label>
                  <select name="zoning" className={ic}><option value="">Seleccionar...</option>{ZONING_TYPES.map(z => <option key={z} value={z}>{z}</option>)}</select>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Descripción</label>
              <textarea name="description" rows={3} className={`${ic} resize-none`} placeholder="Descripción adicional (opcional)..." />
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Photos & Map ═══ */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">photo_library</span>Fotos & Ubicación</h3>
            <PhotoUploadGrid initialPhotos={[]} maxPhotos={20} onPhotosChange={setPhotos} />

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ubicación en Mapa</h3>
                <button type="button" onClick={() => setShowMap(!showMap)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{showMap ? 'expand_less' : 'map'}</span>
                  {showMap ? 'Ocultar mapa' : 'Marcar en mapa'}
                </button>
              </div>
              {showMap && <MapPicker onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />}
              <input type="hidden" name="latitude" value={latitude ?? ''} />
              <input type="hidden" name="longitude" value={longitude ?? ''} />
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Review & Publish ═══ */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">rocket_launch</span>Publicar</h3>

            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 text-center space-y-3">
              <span className="material-symbols-outlined text-indigo-500 text-4xl">check_circle</span>
              <h4 className="text-lg font-bold text-slate-800">¡Todo listo!</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Tu propiedad se publicará automáticamente en el Marketplace para que otros agentes la vean.
                {photos.length > 0 && <span className="block mt-1 text-indigo-600 font-medium">{photos.length} foto{photos.length !== 1 ? 's' : ''} cargada{photos.length !== 1 ? 's' : ''}</span>}
              </p>
            </div>

            <input type="hidden" name="exclusive" value="false" />
          </div>
        )}

        {/* ═══ Navigation ═══ */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Atrás
            </button>
          ) : <div />}

          {step < 4 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="flex items-center gap-1 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.97]"
            >
              {isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...</> : <><span className="material-symbols-outlined text-[18px]">publish</span> Guardar Propiedad</>}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
