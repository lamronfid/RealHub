'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { updateProfile } from './actions';
import { DEPARTMENTS } from '@/lib/types';
import Link from 'next/link';

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
    agency_office?: string | null;
    bio: string | null;
    license_number?: string | null;
    specialties?: string[] | null;
    coverage_areas?: string[] | null;
    experience_years?: number | null;
    role?: string | null;
    account_type?: string | null;
    most_sold_types?: string[] | null;
    has_developments?: boolean | null;
    developments_details?: string | null;
  };
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedCoverage, setSelectedCoverage] = useState<string[]>(profile.coverage_areas || []);
  const [selectedMostSold, setSelectedMostSold] = useState<string[]>(profile.most_sold_types || []);
  const [hasDevelopments, setHasDevelopments] = useState<boolean>(!!profile.has_developments);
  const supabase = createClient();

  const getProfileStrength = () => {
    let score = 0;
    const items: Array<{ label: string; field: string; weight: number; completed: boolean }> = [
      { label: 'Foto de Perfil', field: 'avatar_url', weight: 15, completed: !!avatarUrl },
      { label: 'Nombre Completo', field: 'full_name', weight: 15, completed: !!profile.full_name?.trim() },
      { label: 'Teléfono Celular', field: 'phone', weight: 10, completed: !!profile.phone?.trim() },
      { label: 'WhatsApp', field: 'whatsapp', weight: 10, completed: !!profile.whatsapp?.trim() },
      { label: 'Nro. de Licencia (M.U.A.)', field: 'license_number', weight: 15, completed: !!profile.license_number?.trim() },
      { label: 'Nombre de Agencia', field: 'agency_name', weight: 10, completed: !!profile.agency_name?.trim() },
      { label: 'Biografía / Presentación', field: 'bio', weight: 10, completed: !!profile.bio?.trim() },
      { label: 'Zonas de Cobertura', field: 'coverage_areas', weight: 10, completed: selectedCoverage.length > 0 },
      { label: 'Especialidades', field: 'most_sold_types', weight: 5, completed: selectedMostSold.length > 0 },
    ];
    
    items.forEach(i => {
      if (i.completed) score += i.weight;
    });

    return { score, items };
  };

  const { score: profileScore, items: strengthItems } = getProfileStrength();
  const pendingItems = strengthItems.filter(i => !i.completed);

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
    
    // Add all selected coverage areas to form data
    selectedCoverage.forEach(dept => {
      formData.append('coverage_areas', dept);
    });

    // Add selected most sold property types to form data
    selectedMostSold.forEach(type => {
      formData.append('most_sold_types', type);
    });
    formData.set('has_developments', hasDevelopments ? 'true' : 'false');

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

      {/* Profile Strength Indicator */}
      {profileScore < 100 && (
        <div className="bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent border border-indigo-100/50 rounded-3xl p-5 md:p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-305">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest font-heading flex items-center gap-1.5 leading-none">
                <span className="material-symbols-outlined text-indigo-500 text-base">dashboard_customize</span>
                Fortaleza de tu Perfil ({profileScore}%)
              </h4>
              <p className="text-slate-400 text-[11px] font-semibold leading-relaxed">
                Un perfil 100% completo genera hasta **5 veces más confianza** al coordinar visitas co-broke en Paraguay.
              </p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shrink-0 self-start sm:self-center ${
              profileScore >= 80 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                : profileScore >= 50 
                  ? 'bg-amber-50 text-amber-700 border border-amber-150' 
                  : 'bg-rose-50 text-rose-700 border border-rose-150'
            }`}>
              {profileScore >= 80 ? 'Perfil Fuerte' : profileScore >= 50 ? 'Perfil Medio' : 'Perfil Incompleto'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                profileScore >= 80 
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                  : profileScore >= 50 
                    ? 'bg-gradient-to-r from-amber-400 to-amber-550' 
                    : 'bg-gradient-to-r from-indigo-500 to-violet-600'
              }`} 
              style={{ width: `${profileScore}%` }} 
            />
          </div>

          {/* Pending Tasks Badges */}
          {pendingItems.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pendientes por completar:</span>
              <div className="flex flex-wrap gap-1.5">
                {pendingItems.map((item) => (
                  <button 
                    key={item.field} 
                    type="button"
                    className="inline-flex items-center gap-1 bg-white border border-slate-150 hover:border-indigo-405 hover:text-indigo-650 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full transition-colors shadow-3xs cursor-pointer"
                    onClick={() => {
                      const element = document.getElementsByName(item.field)[0] || document.querySelector(`[name="${item.field}"]`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        (element as HTMLInputElement).focus?.();
                      }
                    }}
                  >
                    <span>+</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Avatar Section */}
      <div id="avatar_url" className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100/85 bg-slate-50/50 p-6 rounded-2xl">
        <div className="relative group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 shadow-md ring-4 ring-indigo-500/5" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-slate-200 shadow-md ring-4 ring-indigo-500/5">
              <span className="text-2xl font-bold text-indigo-500 uppercase">
                {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
        <div className="text-center sm:text-left space-y-2">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Foto de Perfil</h3>
          <p className="text-xs text-slate-450">Formatos recomendados: JPG, PNG o WebP. Se comprimirá automáticamente.</p>
          {isUploading && <p className="text-xs text-indigo-600 font-semibold animate-pulse">Subiendo imagen...</p>}
          
          {/* Display User Role and Admin Panel Link */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200">
              Cuenta: {profile.account_type === 'agency' ? 'Bienes y Raíces' : 'Agente Independiente'}
            </span>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200">
              Rol: {profile.role === 'admin' ? 'Administrador' : profile.role === 'superadmin' ? 'Superadmin' : profile.role === 'owner' ? 'Propietario' : 'Agente'}
            </span>
            {profile.account_type === 'agency' && (
              <Link 
                href="/agencia"
                className="bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 text-indigo-700 hover:text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full transition-all inline-flex items-center gap-1 shadow-sm hover:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[14px] font-bold">corporate_fare</span>
                Ver Panel de Inmobiliaria
              </Link>
            )}
            {(profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'owner') && (
              <Link 
                href="/admin"
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full transition-all inline-flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[12px] font-bold">admin_panel_settings</span>
                Acceder al Panel Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">badge</span>
          Información Personal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo <span className="text-rose-500">*</span></label>
            <input name="full_name" defaultValue={profile.full_name} required
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Tu nombre completo" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nro. de Licencia</label>
            <input name="license_number" defaultValue={profile.license_number || ''}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Ej: M.U.A. 1234" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agencia / Inmobiliaria</label>
            <input name="agency_name" defaultValue={profile.agency_name || ''}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Ej: RE/MAX Paraguay o Independiente" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Oficina / Sucursal</label>
            <input name="agency_office" defaultValue={profile.agency_office || ''}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Ej: Oficina Centro, Sucursal Villa Morra, etc." />
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <h3 className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">contact_phone</span>
          Información de Contacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Teléfono Celular <span className="text-rose-500">*</span>
            </label>
            <input name="phone" defaultValue={profile.phone || ''} type="tel" required
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="+595 981 123 456" />
            <p className="text-[9px] text-slate-400 font-medium">Este número se muestra en Marketplace y links de chat directos</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Alternativo</label>
            <input name="whatsapp" defaultValue={profile.whatsapp || ''} type="tel"
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              placeholder="Opcional" />
          </div>
        </div>
      </div>

      {/* Professional Info */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <h3 className="text-[10px] font-extrabold text-indigo-655 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">work</span>
          Información Profesional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Especialidad Principal</label>
            <select name="specialty" defaultValue={profile.specialties?.[0] || 'ambos'}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3.5 px-4 text-xs font-semibold text-slate-800 focus:outline-none transition-all cursor-pointer">
              <option value="venta">Ventas de Inmuebles</option>
              <option value="alquiler">Alquileres</option>
              <option value="ambos">Ventas y Alquileres</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Años de Experiencia</label>
            <select name="experience_years" defaultValue={profile.experience_years?.toString() || ''}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3.5 px-4 text-xs font-semibold text-slate-800 focus:outline-none transition-all cursor-pointer">
              <option value="">No especificado</option>
              <option value="1">Menos de 1 año</option>
              <option value="3">1 - 3 años</option>
              <option value="5">3 - 5 años</option>
              <option value="10">5 - 10 años</option>
              <option value="15">10 - 15 años</option>
              <option value="20">Más de 15 años</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tipos de Propiedades de Especialidad */}
      <div id="most_sold_types" className="space-y-4 pt-6 border-t border-slate-100/80">
        <h3 className="text-[10px] font-extrabold text-indigo-655 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">real_estate_agent</span>
          Tipos de Propiedades de Especialidad (Operaciones más Frecuentes)
        </h3>
        
        <div className="flex flex-wrap gap-2 bg-slate-50/30 p-4 rounded-2xl border border-slate-200/60">
          {[
            { value: 'casa', label: 'Casas' },
            { value: 'departamento', label: 'Departamentos' },
            { value: 'duplex', label: 'Dúplex' },
            { value: 'terreno', label: 'Terrenos / Lotes' },
            { value: 'local_comercial', label: 'Locales Comerciales' },
            { value: 'oficina', label: 'Oficinas' },
            { value: 'deposito', label: 'Depósitos' },
            { value: 'quinta', label: 'Quintas / Countries' },
            { value: 'campo', label: 'Estancias / Campos' },
          ].map(opt => {
            const isSelected = selectedMostSold.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedMostSold(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-indigo-650 border-indigo-650 text-white shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                {isSelected && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Developments / Emprendimientos */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-extrabold text-indigo-655 uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">home_work</span>
            ¿Gestionas Emprendimientos / Edificios en Pozo / Desarrollos?
          </h3>
          <button
            type="button"
            onClick={() => setHasDevelopments(!hasDevelopments)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              hasDevelopments ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                hasDevelopments ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {hasDevelopments && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Detalles de los Emprendimientos
            </label>
            <textarea
              name="developments_details"
              defaultValue={profile.developments_details || ''}
              rows={3}
              className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all resize-none leading-relaxed"
              placeholder="Ej: Edificio More del Sol (unidades de 1 y 2 dorm), Condominio Aqua Village (terrenos y casas)..."
            />
          </div>
        )}
      </div>

      {/* Coverage Areas */}
      <div id="coverage_areas" className="space-y-4 pt-6 border-t border-slate-100/80">
        <h3 className="text-[10px] font-extrabold text-indigo-655 uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">map</span>
          Departamentos de Cobertura (Paraguay)
        </h3>
        
        <div className="flex flex-wrap gap-2 bg-slate-50/30 p-4 rounded-2xl border border-slate-200/60">
          {DEPARTMENTS.map(dept => {
            const isSelected = selectedCoverage.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedCoverage(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                className={`px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-indigo-650 border-indigo-650 text-white shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                {isSelected && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                {dept}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
          <span>Zonas de operación activas:</span>
          <span className="text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md">{selectedCoverage.length} seleccionadas</span>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-4 pt-6 border-t border-slate-100/80">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-indigo-655 uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">description</span>
            Presentación (Bio)
          </label>
          <textarea name="bio" defaultValue={profile.bio || ''} rows={3}
            className="w-full bg-slate-50/50 border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all resize-none leading-relaxed"
            placeholder="Escribe una breve reseña sobre tu trayectoria, zonas de cobertura o especialidades..." />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-6 border-t border-slate-100/80">
        <button type="submit" disabled={isPending || isUploading}
          className="bg-indigo-600 hover:bg-indigo-750 text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:shadow-lg shadow-md shadow-indigo-100 hover:shadow-indigo-200/40 transition-all disabled:opacity-50 active:scale-[0.98] min-w-[200px]"
        >
          {isUploading ? 'Subiendo foto...' : isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
