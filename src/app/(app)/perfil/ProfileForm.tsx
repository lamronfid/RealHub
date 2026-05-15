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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-8">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2"><span className="material-symbols-outlined text-lg">check_circle</span>{success}</div>}

      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center border-2 border-slate-200">
              <span className="text-3xl font-bold text-indigo-400">
                {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Foto de Perfil</h3>
          <p className="text-xs text-slate-400">JPG, PNG o WebP. Se comprimirá automáticamente.</p>
          {isUploading && <p className="text-xs text-indigo-600 font-medium mt-1">Subiendo...</p>}
        </div>
      </div>

      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nombre Completo <span className="text-red-500">*</span></label>
            <input name="full_name" defaultValue={profile.full_name} required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              placeholder="Tu nombre completo" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Agencia / Inmobiliaria</label>
            <input name="agency_name" defaultValue={profile.agency_name || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              placeholder="Ej: RE/MAX Paraguay" />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Teléfono / WhatsApp <span className="text-red-500">*</span>
            </label>
            <input name="phone" defaultValue={profile.phone || ''} type="tel"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              placeholder="+595 981 123 456" />
            <p className="text-[10px] text-slate-400 mt-1">Este número se muestra en Marketplace y links de WhatsApp</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">WhatsApp Alternativo</label>
            <input name="whatsapp" defaultValue={profile.whatsapp || ''} type="tel"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
              placeholder="Opcional" />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Bio / Descripción</label>
        <textarea name="bio" defaultValue={profile.bio || ''} rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
          placeholder="Cuéntales a otros agentes sobre tu experiencia..." />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button type="submit" disabled={isPending || isUploading}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.97] min-w-[200px]"
        >
          {isUploading ? 'Subiendo foto...' : isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
