'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { updateProfile } from './actions';

const avatarCompressionOptions = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

interface ProfileFormProps {
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
    avatar_url: string | null;
    agency_name: string | null;
    bio: string | null;
  };
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    try {
      // Preview
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Compress
      let compressed: File;
      try {
        compressed = await imageCompression(file, avatarCompressionOptions);
      } catch {
        compressed = file;
      }

      // Upload
      const fileName = `avatar_${profile.id}_${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      setError('Error al subir la imagen: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    formData.set('avatar_url', avatarUrl);

    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess('Perfil actualizado correctamente');
        setTimeout(() => setSuccess(''), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 space-y-8 shadow-premium">
      {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-semibold">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-lg">check_circle</span>{success}</div>}

      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100/80">
        <div className="relative group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-md ring-4 ring-indigo-500/5" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center border-2 border-slate-200 shadow-md ring-4 ring-indigo-500/5">
              <span className="text-2xl font-bold text-indigo-400 uppercase">
                {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Foto de Perfil</h3>
          <p className="text-xs text-slate-400">Formatos recomendados: JPG, PNG o WebP. Se comprimirá automáticamente.</p>
          {isUploading && <p className="text-xs text-indigo-600 font-semibold animate-pulse">Subiendo imagen...</p>}
        </div>
      </div>

      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">badge</span>
          Información Personal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo <span className="text-rose-500">*</span></label>
            <input name="full_name" defaultValue={profile.full_name} required
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Tu nombre completo" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agencia / Inmobiliaria</label>
            <input name="agency_name" defaultValue={profile.agency_name || ''}
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Ej: RE/MAX Paraguay" />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <h3 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">contact_phone</span>
          Información de Contacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Teléfono / WhatsApp <span className="text-rose-500">*</span>
            </label>
            <input name="phone" defaultValue={profile.phone || ''} type="tel"
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="+595 981 123 456" />
            <p className="text-[9px] text-slate-400 font-medium">Este número se muestra en Marketplace y links de chat directos</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Alternativo</label>
            <input name="whatsapp" defaultValue={profile.whatsapp || ''} type="tel"
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Opcional" />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">description</span>
            Presentación (Bio)
          </label>
          <textarea name="bio" defaultValue={profile.bio || ''} rows={3}
            className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all resize-none leading-relaxed"
            placeholder="Escribe una breve reseña sobre tu trayectoria, zonas de cobertura o especialidades..." />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-6 border-t border-slate-100/80">
        <button type="submit" disabled={isPending || isUploading}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg shadow-indigo-100 hover:shadow-xl hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.98] min-w-[200px]"
        >
          {isUploading ? 'Subiendo foto...' : isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
