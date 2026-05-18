'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

const compressionOptions = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

interface PhotoUploadGridProps {
  initialPhotos?: string[];
  maxPhotos?: number;
  onPhotosChange: (photos: string[]) => void;
  bucketName?: string;
}

export default function PhotoUploadGrid({
  initialPhotos = [],
  maxPhotos = 20,
  onPhotosChange,
  bucketName = 'properties',
}: PhotoUploadGridProps) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) return;
    const batch = files.slice(0, remaining);

    setIsUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      setUploadProgress(`Subiendo ${i + 1} de ${batch.length}...`);
      const file = batch[i];

      let compressed: File;
      try {
        compressed = await imageCompression(file, compressionOptions);
      } catch {
        compressed = file;
      }

      const fileName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from(bucketName).upload(fileName, compressed);
      if (error) { console.error(error); continue; }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      newUrls.push(data.publicUrl);
    }

    const updated = [...photos, ...newUrls];
    setPhotos(updated);
    onPhotosChange(updated);
    setIsUploading(false);
    setUploadProgress('');
  }, [photos, maxPhotos, supabase, bucketName, onPhotosChange]);

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotosChange(updated);
  };

  // Drag & Drop reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const updated = [...photos];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setPhotos(updated);
    onPhotosChange(updated);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = '';
  };

  // Drop zone for new files
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Fotos ({photos.length}/{maxPhotos})
        </h3>
        {photos.length > 0 && (
          <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
            📌 Foto 1 = Portada · Arrastrá para reordenar
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {photos.map((url, i) => (
          <div
            key={`${url}-${i}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
              dragOverIdx === i ? 'border-indigo-400 scale-105' : i === 0 ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
            }`}
          >
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                Portada
              </span>
            )}
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-white text-[14px]">close</span>
            </button>
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              {i + 1}
            </div>
          </div>
        ))}

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleZoneDrop}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all"
          >
            <span className="material-symbols-outlined text-slate-400 text-3xl">add_photo_alternate</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              {isUploading ? 'Subiendo...' : 'Agregar'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-indigo-600 font-medium animate-pulse">{uploadProgress}</p>
      )}
    </div>
  );
}
