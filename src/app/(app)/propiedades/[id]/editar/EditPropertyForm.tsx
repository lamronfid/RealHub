'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { updateProperty } from '@/app/(app)/propiedades/actions';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DETAILED_PROPERTY_TYPES, LAND_ONLY_TYPES,
  TRANSACTION_TYPES, CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS, AMENITIES,
} from '@/lib/types';

const galleryCompressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

interface EditPropertyFormProps {
  property: any;
}

export default function EditPropertyForm({ property }: EditPropertyFormProps) {
  const [propertyType, setPropertyType] = useState(property.property_type || '');
  const [transactionType, setTransactionType] = useState(property.transaction_type || 'compra');
  const [department, setDepartment] = useState(property.department || '');
  const [city, setCity] = useState(property.city || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(property.amenities || []);
  const [photos, setPhotos] = useState<string[]>(property.photos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const supabase = createClient();
  const isDetailed = DETAILED_PROPERTY_TYPES.includes(propertyType as any);
  const isLand = LAND_ONLY_TYPES.includes(propertyType as any);

  const formatPrice = (val: number | null) => {
    if (!val) return '';
    return val.toLocaleString('es-PY');
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        let compressed: File;
        try {
          compressed = await imageCompression(file, galleryCompressionOptions);
        } catch {
          compressed = file;
        }
        const fileName = `prop_${property.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
        const { error: upErr } = await supabase.storage.from('properties').upload(fileName, compressed);
        if (upErr) { console.error(upErr); continue; }
        const { data: urlData } = supabase.storage.from('properties').getPublicUrl(fileName);
        uploaded.push(urlData.publicUrl);
      }
      setPhotos(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      setError('Error subiendo fotos: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.set('amenities', selectedAmenities.join(','));
    formData.set('photos', JSON.stringify(photos));

    startTransition(async () => {
      const res = await updateProperty(property.id, formData);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-8">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Título <span className="text-red-500">*</span></label>
        <input name="title" defaultValue={property.title} required
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Descripción</label>
        <textarea name="description" defaultValue={property.description || ''} rows={4}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
      </div>

      {/* Type & Transaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tipo de Propiedad</label>
          <select name="property_type" value={propertyType} onChange={e => setPropertyType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Operación</label>
          <select name="transaction_type" value={transactionType} onChange={e => setTransactionType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="compra">Venta</option>
            <option value="alquiler">Alquiler</option>
            <option value="ambos">Venta + Alquiler</option>
          </select>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
          <select name="currency" defaultValue={property.currency || 'USD'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(transactionType === 'compra' || transactionType === 'ambos') && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio de Venta</label>
            <input name="sale_price" defaultValue={formatPrice(property.sale_price)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="180.000" />
          </div>
        )}
        {(transactionType === 'alquiler' || transactionType === 'ambos') && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio de Alquiler</label>
            <input name="rent_price" defaultValue={formatPrice(property.rent_price)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="1.200" />
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ubicación</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Departamento</label>
            <select name="department" value={department} onChange={e => { setDepartment(e.target.value); setCity(''); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">—</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ciudad</label>
            <select name="city" value={city} onChange={e => setCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">—</option>
              {(CITIES[department] || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Barrio</label>
            <select name="neighborhood" defaultValue={property.neighborhood || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="">—</option>
              {(NEIGHBORHOODS[city] || []).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Specs */}
      {!isLand && isDetailed && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Especificaciones</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dormitorios</label>
              <input name="bedrooms" type="number" min="0" defaultValue={property.bedrooms || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños</label>
              <input name="bathrooms" type="number" min="0" defaultValue={property.bathrooms || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cocheras</label>
              <input name="garages" type="number" min="0" defaultValue={property.garages || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Amoblado</label>
              <select name="furnished" defaultValue={property.furnished || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">—</option>
                <option value="amoblado">Amoblado</option>
                <option value="semi">Semi-amoblado</option>
                <option value="sin">Sin amueblar</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construidos</label>
              <input name="m2_built" type="number" min="0" defaultValue={property.m2_built || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label>
              <input name="m2_terrain" type="number" min="0" defaultValue={property.m2_terrain || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
        </div>
      )}

      {/* Amenities */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Amenities</h3>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(a => (
            <button key={a} type="button"
              onClick={() => setSelectedAmenities(prev =>
                prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
              )}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedAmenities.includes(a)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fotos</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removePhoto(i)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-2xl">delete</span>
              </button>
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-slate-400 text-2xl">add_photo_alternate</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Agregar</span>
            <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" />
          </label>
        </div>
        {isUploading && <p className="text-xs text-indigo-600 font-medium">Subiendo fotos...</p>}
      </div>

      {/* Exclusive */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <input type="hidden" name="exclusive" value={property.exclusive ? 'true' : 'false'} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" defaultChecked={property.exclusive}
            onChange={e => {
              const hiddenInput = e.target.parentElement?.parentElement?.querySelector('input[name="exclusive"]') as HTMLInputElement;
              if (hiddenInput) hiddenInput.value = e.target.checked ? 'true' : 'false';
            }}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-200" />
          <span className="text-sm font-medium text-slate-700">Propiedad en Exclusiva</span>
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
        <button type="submit" disabled={isPending || isUploading}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.97] min-w-[200px]"
        >
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
