'use client';

import { createProperty } from '@/app/(app)/propiedades/actions';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DETAILED_PROPERTY_TYPES, LAND_ONLY_TYPES,
  TRANSACTION_TYPES, CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS, AMENITIES,
} from '@/lib/types';

const mainCompressionOptions = {
  maxSizeMB: 0.8, // Higher quality for main image (up to 800KB)
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp'
};

const galleryCompressionOptions = {
  maxSizeMB: 0.2, // Compress to max 200KB for gallery
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp'
};

export default function NuevaPropiedad() {
  const [propertyType, setPropertyType] = useState('');
  const [transactionType, setTransactionType] = useState('compra');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedMainImage, setCompressedMainImage] = useState<File | null>(null);
  const [compressedGalleryImages, setCompressedGalleryImages] = useState<File[]>([]);
  const [error, setError] = useState('');

  const supabase = createClient();

  const router = useRouter();
  const isDetailed = DETAILED_PROPERTY_TYPES.includes(propertyType as any);
  const isLand = LAND_ONLY_TYPES.includes(propertyType as any);

  async function handleMainImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError('');
    try {
      try {
        const compressed = await imageCompression(file, mainCompressionOptions);
        setCompressedMainImage(compressed);
      } catch (err) {
        const compressed = await imageCompression(file, { ...mainCompressionOptions, useWebWorker: false });
        setCompressedMainImage(compressed);
      }
    } catch (err) {
      console.error('Error compressing main image', err);
      setCompressedMainImage(file); // Fallback to original
    } finally {
      setIsCompressing(false);
    }
  }

  async function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 20) {
      alert('Puedes subir un máximo de 20 fotos para la galería');
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    setError('');
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            return await imageCompression(file, galleryCompressionOptions);
          } catch (e) {
            try {
              return await imageCompression(file, { ...galleryCompressionOptions, useWebWorker: false });
            } catch (e2) {
              return file;
            }
          }
        })
      );
      setCompressedGalleryImages(compressedFiles);
    } catch (err) {
      console.error('Error in gallery compression', err);
    } finally {
      setIsCompressing(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!compressedMainImage) {
      setError('Debes subir una imagen principal');
      return;
    }

    setError('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const uploadedPhotos: string[] = [];

        // 1. Upload main image
        const fileExt = compressedMainImage.name ? compressedMainImage.name.split('.').pop() : 'webp';
        const fileName = `main_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, compressedMainImage);

        if (uploadError) throw new Error(`Error al subir la imagen principal: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        uploadedPhotos.push(publicUrlData.publicUrl);

        // 2. Upload gallery images
        if (compressedGalleryImages.length > 0) {
          const uploadPromises = compressedGalleryImages.map(async (file) => {
            const gExt = file.name ? file.name.split('.').pop() : 'webp';
            const gName = `gallery_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${gExt}`;
            
            const { error: gUploadError } = await supabase.storage
              .from('properties')
              .upload(gName, file);
              
            if (!gUploadError) {
              const { data: gUrlData } = supabase.storage
                .from('properties')
                .getPublicUrl(gName);
              return gUrlData.publicUrl;
            }
            return null;
          });

          const results = await Promise.all(uploadPromises);
          results.forEach(url => {
            if (url) uploadedPhotos.push(url);
          });
        }

        formData.set('photos', JSON.stringify(uploadedPhotos));
        formData.set('amenities', selectedAmenities.join(','));
        
        // Remove file objects from formData so they don't go to server action
        formData.delete('main_image');
        formData.delete('gallery_images');

        const res = await createProperty(formData);
        if (res?.error) throw new Error(res.error);
        
        router.push('/propiedades');
        
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || 'Ocurrió un error al subir las imágenes.');
      }
    });
  };

  const availableCities = CITIES[department] || [];
  const availableNeighborhoods = NEIGHBORHOODS[city] || [];

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900 mb-6">Nueva Propiedad</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium">{error}</div>}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Información Básica</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Título</label>
            <input name="title" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Ej: Casa en Villa Morra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Operación</label>
              <select name="transaction_type" value={transactionType} onChange={e => setTransactionType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              >
                <option value="compra">Venta</option>
                <option value="alquiler">Alquiler</option>
                <option value="ambos">Venta y Alquiler</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tipo</label>
              <select name="property_type" value={propertyType} onChange={e => setPropertyType(e.target.value)} required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              >
                <option value="">Seleccionar...</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {['compra', 'ambos'].includes(transactionType) && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio de Venta</label>
                <input name="sale_price" type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Ej: 150.000" />
              </div>
            )}
            {['alquiler', 'ambos'].includes(transactionType) && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Precio de Alquiler</label>
                <input name="rent_price" type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Ej: 1.000" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
              <select name="currency" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location (Made optional by not adding required) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ubicación</h3>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-md">Opcional</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Departamento</label>
              <select name="department" value={department} onChange={e => { setDepartment(e.target.value); setCity(''); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              >
                <option value="">Seleccionar...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ciudad</label>
              <select name="city" value={city} onChange={e => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              >
                <option value="">Seleccionar...</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Barrio</label>
              <select name="neighborhood"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              >
                <option value="">Seleccionar...</option>
                {availableNeighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Property Details — conditional */}
        {(isDetailed || isLand) && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Detalles</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Terreno</label>
                <input name="m2_terrain" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
              </div>
              {isDetailed && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Construido</label>
                    <input name="m2_built" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                  </div>
                  {propertyType === 'departamento' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Balcón</label>
                      <input name="m2_balcony" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dormitorios</label>
                    <input name="bedrooms" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños</label>
                    <input name="bathrooms" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Garajes</label>
                    <input name="garages" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Amoblado</label>
                    <select name="furnished" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all">
                      <option value="">No especificado</option>
                      <option value="amoblado">Amoblado</option>
                      <option value="semi">Semi-amoblado</option>
                      <option value="sin">Sin amueblar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Año Construcción</label>
                    <input name="construction_year" type="number" placeholder="Ej: 2020" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                  </div>
                </>
              )}
              {isLand && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cant. Árboles</label>
                  <input name="trees_count" type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Amenities */}
        {isDetailed && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => (
                <button key={a} type="button" onClick={() =>
                  setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
                }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedAmenities.includes(a)
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >{a}</button>
              ))}
            </div>
          </div>
        )}

        {/* Photos Upload */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fotos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Foto Principal (Portada) <span className="text-red-500">*</span>
              </label>
              <input 
                name="main_image" 
                type="file" 
                accept="image/*" 
                required 
                onChange={handleMainImageChange}
                className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer" 
              />
            </div>
            <div className="space-y-2">
              <label className="flex justify-between items-center text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                <span>Galería (Máx 20)</span>
                <span className="text-slate-400 font-normal normal-case">Opcional</span>
              </label>
              <input 
                name="gallery_images" 
                type="file" 
                accept="image/*" 
                multiple
                onChange={handleGalleryChange}
                className="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer" 
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Descripción</label>
          <textarea name="description" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none" placeholder="Opcional..." />
        </div>

        {/* Visibility + Submit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex-1"></div>
          <input type="hidden" name="exclusive" value="false" />
          <button type="submit" disabled={isPending || isCompressing}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.97] min-w-[200px]"
          >
            {isCompressing ? 'Comprimiendo imágenes...' : isPending ? 'Guardando Propiedad...' : 'Guardar Propiedad'}
          </button>
        </div>
      </form>
    </div>
  );
}
