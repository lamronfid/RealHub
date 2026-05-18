'use client';

import { createProperty } from '@/app/(app)/propiedades/actions';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploadGrid from '@/components/property/PhotoUploadGrid';
import MapPicker from '@/components/property/MapPicker';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DETAILED_PROPERTY_TYPES, LAND_ONLY_TYPES, COMMERCIAL_TYPES,
  CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS, AMENITIES, AMENITY_DATA,
  CONSTRUCTION_TYPES, CONSERVATION_STATES, LOT_SHAPES, TOPOGRAPHY_TYPES, ACCESS_TYPES,
  SERVICES, ZONING_TYPES, FLOOR_LOCATIONS,
} from '@/lib/types';

const STEP_LABELS = ['Básico', 'Detalles', 'Características', 'Fotos & Mapa', 'Publicar'];

export default function NuevaPropiedad() {
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState('');
  const [transactionType, setTransactionType] = useState('compra');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');
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

  const [formValues, setFormValues] = useState({
    title: '',
    sale_price: '',
    rent_price: '',
    currency: 'USD',
    bedrooms: '',
    bathrooms: '',
    garages: '',
    furnished: '',
    m2_terrain: '',
    m2_built: '',
    m2_balcony: '',
    construction_year: '',
    floor_number: '',
    trees_count: '',
    front_meters: '',
    floor_location: '',
    construction_type: '',
    conservation_state: '',
    lot_shape: '',
    topography: '',
    access_type: '',
    services: '',
    zoning: '',
    description: '',
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nueva_propiedad_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formValues) setFormValues(parsed.formValues);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.propertyType) setPropertyType(parsed.propertyType);
        if (parsed.transactionType) setTransactionType(parsed.transactionType);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.customDepartment) setCustomDepartment(parsed.customDepartment);
        if (parsed.city) setCity(parsed.city);
        if (parsed.customCity) setCustomCity(parsed.customCity);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.customNeighborhood) setCustomNeighborhood(parsed.customNeighborhood);
        if (parsed.selectedAmenities) setSelectedAmenities(parsed.selectedAmenities);
        if (parsed.photos) setPhotos(parsed.photos);
        if (parsed.latitude !== undefined) setLatitude(parsed.latitude);
        if (parsed.longitude !== undefined) setLongitude(parsed.longitude);
        if (parsed.hasElevator !== undefined) setHasElevator(parsed.hasElevator);
        if (parsed.hasConstruction !== undefined) setHasConstruction(parsed.hasConstruction);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const draft = {
      step, formValues, propertyType, transactionType, department, customDepartment, city, customCity, neighborhood,
      customNeighborhood, selectedAmenities, photos, latitude, longitude, hasElevator, hasConstruction
    };
    localStorage.setItem('nueva_propiedad_draft', JSON.stringify(draft));
  }, [isLoaded, step, formValues, propertyType, transactionType, department, customDepartment, city, customCity, neighborhood, customNeighborhood, selectedAmenities, photos, latitude, longitude, hasElevator, hasConstruction]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'sale_price' || name === 'rent_price') {
      const sanitized = value.replace(/[^0-9]/g, '');
      if (sanitized) {
        const formatted = new Intl.NumberFormat('es-PY').format(Number(sanitized));
        setFormValues(prev => ({ ...prev, [name]: formatted }));
      } else {
        setFormValues(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };

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
    
    const formData = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
      if (value !== '') {
        formData.append(key, value);
      }
    });

    const finalDepartment = department === '__otro__' ? customDepartment : department;
    const finalCity = city === '__otro__' ? customCity : city;
    const finalNeighborhood = neighborhood === '__otro__' ? customNeighborhood : neighborhood;

    formData.append('property_type', propertyType);
    formData.append('transaction_type', transactionType);
    formData.append('department', finalDepartment);
    formData.append('city', finalCity);
    formData.append('neighborhood', finalNeighborhood);
    formData.append('photos', JSON.stringify(photos));
    formData.append('amenities', selectedAmenities.join(','));
    formData.append('has_elevator', hasElevator ? 'true' : 'false');
    if (latitude !== null) formData.append('latitude', String(latitude));
    if (longitude !== null) formData.append('longitude', String(longitude));
    formData.append('exclusive', 'false');

    startTransition(async () => {
      try {
        const res = await createProperty(formData);
        if (res?.error) throw new Error(res.error);
        localStorage.removeItem('nueva_propiedad_draft');
        if (res?.propertyId) {
          router.push(`/propiedades/${res.propertyId}/matches`);
        } else {
          router.push('/propiedades');
        }
      } catch (err: any) { setError(err.message || 'Error al guardar.'); }
    });
  };

  const canAdvance = () => {
    if (step === 0) {
      if (!formValues.title.trim()) return false;
      if (!propertyType) return false;
      if (!department) return false;
      if (department === '__otro__' && !customDepartment.trim()) return false;
      if (!city) return false;
      if (city === '__otro__' && !customCity.trim()) return false;
      if (!neighborhood) return false;
      if (neighborhood === '__otro__' && !customNeighborhood.trim()) return false;
    }
    return true;
  };

  const ic = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all";

  if (!isLoaded) {
    return (
      <div className="max-w-3xl mx-auto pb-24 flex items-center justify-center pt-32">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

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
              <input name="title" value={formValues.title} onChange={handleInputChange} required className={ic} placeholder="Ej: Casa en Villa Morra" />
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
                  <input name="sale_price" value={formValues.sale_price} onChange={handleInputChange} type="text" inputMode="numeric" className={ic} placeholder="Ej: 150000" />
                </div>
              )}
              {['alquiler', 'ambos'].includes(transactionType) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio Alquiler</label>
                  <input name="rent_price" value={formValues.rent_price} onChange={handleInputChange} type="text" inputMode="numeric" className={ic} placeholder="Ej: 1000" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
                <select name="currency" value={formValues.currency} onChange={handleInputChange} className={ic}>
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
                  <option value="__otro__">✏️ Otro</option>
                </select>
                {department === '__otro__' && <input value={customDepartment} onChange={e => setCustomDepartment(e.target.value)} className={`${ic} mt-2`} placeholder="✏️ Otro departamento no listado..." />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ciudad</label>
                <select name="city" value={city} onChange={e => { setCity(e.target.value); setNeighborhood(''); }} className={ic}>
                  <option value="">Seleccionar...</option>
                  {availableCities.filter(c => c !== 'Otro').map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__otro__">✏️ Otro</option>
                </select>
                {city === '__otro__' && <input value={customCity} onChange={e => setCustomCity(e.target.value)} className={`${ic} mt-2`} placeholder="✏️ Otra ciudad no listada..." />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Barrio</label>
                <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={ic}>
                  <option value="">Seleccionar...</option>
                  {availableNeighborhoods.filter(n => n !== 'Otro').map(n => <option key={n} value={n}>{n}</option>)}
                  <option value="__otro__">✏️ Otro</option>
                </select>
                {neighborhood === '__otro__' && <input value={customNeighborhood} onChange={e => setCustomNeighborhood(e.target.value)} className={`${ic} mt-2`} placeholder="✏️ Otro barrio no listado..." />}
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
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dormitorios</label><input name="bedrooms" value={formValues.bedrooms} onChange={handleInputChange} type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños</label><input name="bathrooms" value={formValues.bathrooms} onChange={handleInputChange} type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Garajes</label><input name="garages" value={formValues.garages} onChange={handleInputChange} type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Amoblado</label>
                    <select name="furnished" value={formValues.furnished} onChange={handleInputChange} className={ic}>
                      <option value="">No especificado</option>
                      <option value="amoblado">Amoblado</option>
                      <option value="semi">Semi-amoblado</option>
                      <option value="sin">Sin amueblar</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" value={formValues.m2_terrain} onChange={handleInputChange} type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" value={formValues.m2_built} onChange={handleInputChange} type="number" className={ic} /></div>
                  {isApartment && <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Balcón</label><input name="m2_balcony" value={formValues.m2_balcony} onChange={handleInputChange} type="number" className={ic} /></div>}
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Año Construcción</label><input name="construction_year" value={formValues.construction_year} onChange={handleInputChange} type="number" placeholder="Ej: 2020" className={ic} /></div>
                </div>
                {/* Departamento extras */}
                {isApartment && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Piso del departamento</label><input name="floor_number" value={formValues.floor_number} onChange={handleInputChange} type="number" min="1" max="50" className={ic} placeholder="Ej: 5" /></div>
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
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Superficie total (m²)</label><input name="m2_terrain" value={formValues.m2_terrain} onChange={handleInputChange} type="number" className={ic} /></div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cant. Árboles</label><input name="trees_count" value={formValues.trees_count} onChange={handleInputChange} type="number" className={ic} /></div>
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
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" value={formValues.m2_built} onChange={handleInputChange} type="number" className={ic} /></div>
                    <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Año Construcción</label><input name="construction_year" value={formValues.construction_year} onChange={handleInputChange} type="number" placeholder="Ej: 2020" className={ic} /></div>
                  </div>
                )}
              </div>
            )}

            {/* ── Local Comercial ── */}
            {isLocalComercial && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Superficie total (m²)</label><input name="m2_built" value={formValues.m2_built} onChange={handleInputChange} type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" value={formValues.m2_terrain} onChange={handleInputChange} type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Frente (metros)</label><input name="front_meters" value={formValues.front_meters} onChange={handleInputChange} type="number" step="0.1" className={ic} placeholder="Ej: 8.5" /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Piso</label>
                  <select name="floor_location" value={formValues.floor_location} onChange={handleInputChange} className={ic}>
                    <option value="">Seleccionar...</option>
                    {FLOOR_LOCATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Oficina / Depósito / Inmueble Productivo ── */}
            {isCommercial && !isLocalComercial && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label><input name="m2_built" value={formValues.m2_built} onChange={handleInputChange} type="number" className={ic} /></div>
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label><input name="m2_terrain" value={formValues.m2_terrain} onChange={handleInputChange} type="number" className={ic} /></div>
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
              <div className="pt-4">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {AMENITY_DATA.filter(a => !a.validFor || a.validFor.includes(propertyType as any)).map(amenity => (
                    <button key={amenity.id} type="button" onClick={() => setSelectedAmenities(prev => prev.includes(amenity.id) ? prev.filter(x => x !== amenity.id) : [...prev, amenity.id])}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full hover:shadow-sm ${selectedAmenities.includes(amenity.id) ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
                    >
                      <span className="text-2xl leading-none drop-shadow-sm">{amenity.emoji}</span>
                      <span className="text-sm font-medium leading-tight">{amenity.label}</span>
                    </button>
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
                    <select name="construction_type" value={formValues.construction_type} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Estado de Conservación</label>
                    <select name="conservation_state" value={formValues.conservation_state} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{CONSERVATION_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                </>
              )}

              {/* Lot shape, topography, access — for casa/duplex/terreno */}
              {(isHouse || isLand) && (
                <>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Forma del Terreno</label>
                    <select name="lot_shape" value={formValues.lot_shape} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{LOT_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Topografía</label>
                    <select name="topography" value={formValues.topography} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{TOPOGRAPHY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Acceso</label>
                    <select name="access_type" value={formValues.access_type} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{ACCESS_TYPES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                  </div>
                </>
              )}

              {/* Services — for casa/duplex/terreno */}
              {(isHouse || isLand) && (
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Servicios</label>
                  <select name="services" value={formValues.services} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
              )}

              {/* Zoning — terreno only */}
              {isLand && (
                <div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Zonificación</label>
                  <select name="zoning" value={formValues.zoning} onChange={handleInputChange} className={ic}><option value="">Seleccionar...</option>{ZONING_TYPES.map(z => <option key={z} value={z}>{z}</option>)}</select>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Descripción</label>
              <textarea name="description" value={formValues.description} onChange={handleInputChange} rows={3} className={`${ic} resize-none`} placeholder="Descripción adicional (opcional)..." />
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Photos & Map ═══ */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">photo_library</span>Fotos & Ubicación</h3>
            <PhotoUploadGrid initialPhotos={photos} maxPhotos={20} onPhotosChange={setPhotos} />

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ubicación en Mapa</h3>
                <button type="button" onClick={() => setShowMap(!showMap)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{showMap ? 'expand_less' : 'map'}</span>
                  {showMap ? 'Ocultar mapa' : 'Marcar en mapa'}
                </button>
              </div>
              {showMap && <MapPicker initialLat={latitude ?? undefined} initialLng={longitude ?? undefined} onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />}
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
