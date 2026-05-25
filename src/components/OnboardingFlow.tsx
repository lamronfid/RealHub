'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DEPARTMENTS } from '@/lib/types';

const STEPS = [
  { key: 'name', icon: 'badge', title: 'Tu Nombre', subtitle: 'Cómo te conocen tus clientes' },
  { key: 'phone', icon: 'phone_iphone', title: 'Contacto', subtitle: 'Tu teléfono y WhatsApp' },
  { key: 'agency', icon: 'business', title: 'Tu Agencia', subtitle: '¿Trabajas con una inmobiliaria?' },
  { key: 'coverage', icon: 'location_on', title: 'Cobertura', subtitle: '¿En qué zonas operás?' },
  { key: 'specialty', icon: 'workspace_premium', title: 'Especialidad', subtitle: '¿En qué te especializás?' },
  { key: 'experience', icon: 'timeline', title: 'Experiencia', subtitle: '¿Cuánto tiempo llevas en el rubro?' },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [isIndependent, setIsIndependent] = useState(true);
  const [coverageAreas, setCoverageAreas] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  
  // Search zones helper
  const [searchZone, setSearchZone] = useState('');

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canAdvance = () => {
    switch (current.key) {
      case 'name': return fullName.trim().length >= 2;
      case 'phone': return phone.trim().length >= 6;
      case 'agency': return isIndependent || (agencyName.trim().length >= 2);
      case 'coverage': return coverageAreas.length > 0;
      case 'specialty': return specialty !== '';
      case 'experience': return experienceYears !== '';
      default: return true;
    }
  };

  const handleFinish = () => {
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('agent_profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        agency_name: isIndependent ? 'Independiente' : agencyName.trim(),
        coverage_areas: coverageAreas,
        specialties: [specialty],
        experience_years: parseInt(experienceYears) || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      router.refresh();
    });
  };

  const inputClass = "w-full bg-slate-50/50 border border-slate-200/85 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3.5 px-4 text-xs font-semibold text-slate-850 focus:outline-none placeholder-slate-400 transition-all";

  // Filter departments for coverage search
  const filteredDepts = DEPARTMENTS.filter(d => d.toLowerCase().includes(searchZone.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-sky-50 via-indigo-50/40 to-pink-50/20 flex items-center justify-center p-4 font-sans text-slate-800">
      
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200/60">
        <div className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 transition-all duration-500 rounded-r-full" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Step Counter */}
        <div className="text-center mb-5">
          <span className="bg-indigo-50 text-indigo-750 border border-indigo-100/60 text-[10px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
            Paso {step + 1} de {STEPS.length}
          </span>
        </div>

        {/* Floating Card Container */}
        <div className="bg-white/90 border border-slate-100 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/40 flex flex-col justify-between">
          
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100/80 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
              <span className="material-symbols-outlined text-2xl">{current.icon}</span>
            </div>
            <div>
              <h2 className="text-lg font-black font-heading text-slate-900 leading-tight">{current.title}</h2>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-4 min-h-[180px] flex flex-col justify-center">
            
            {/* Step 1: Tu Nombre */}
            {current.key === 'name' && (
              <div className="space-y-2">
                <input 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  className={inputClass} 
                  placeholder="Ej: Juan Pérez" 
                  autoFocus 
                />
                {fullName.trim().length >= 2 && (
                  <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-200">
                    👋 ¡Hola, {fullName.trim().split(' ')[0]}! Qué buen nombre. Continuemos.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Contacto */}
            {current.key === 'phone' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450 mb-1.5">Teléfono Celular</label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className={inputClass} 
                    placeholder="Ej: +595 981 123 456" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-455 mb-1.5">WhatsApp (Opcional)</label>
                  <input 
                    value={whatsapp} 
                    onChange={e => setWhatsapp(e.target.value)} 
                    className={inputClass} 
                    placeholder="Dejar en blanco si es el mismo" 
                  />
                </div>
              </div>
            )}

            {/* Step 3: Tu Agencia (Dual Card Selectors) */}
            {current.key === 'agency' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsIndependent(true); setAgencyName('Independiente'); }}
                    className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      isIndependent 
                        ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 shadow-sm' 
                        : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">person</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider">Independiente</p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-1">Trabajo por mi cuenta</p>
                    </div>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => { setIsIndependent(false); setAgencyName(''); }}
                    className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                      !isIndependent 
                        ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 shadow-sm' 
                        : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider">Con Agencia</p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-1">Inmobiliaria o franquicia</p>
                    </div>
                  </button>
                </div>

                {!isIndependent && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Nombre de la Agencia</label>
                    <input 
                      value={agencyName === 'Independiente' ? '' : agencyName} 
                      onChange={e => setAgencyName(e.target.value)} 
                      className={inputClass} 
                      placeholder="Ej: RE/MAX, Century 21, Inmobiliaria..." 
                      autoFocus
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Cobertura */}
            {current.key === 'coverage' && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                  <input
                    type="text"
                    value={searchZone}
                    onChange={e => setSearchZone(e.target.value)}
                    placeholder="Buscar departamento (ej: Central, Itapúa...)"
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none focus:border-indigo-500 placeholder-slate-400 transition-colors"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1 bg-slate-50/40 p-2.5 rounded-2xl border border-slate-150/50">
                  {filteredDepts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 py-3 px-2 font-semibold">No se encontraron zonas.</p>
                  ) : (
                    filteredDepts.map(dept => {
                      const isSelected = coverageAreas.includes(dept);
                      return (
                        <button 
                          key={dept} 
                          type="button"
                          onClick={() => setCoverageAreas(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                          {dept}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">
                  <span>Zonas elegidas:</span>
                  <span className="text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md">{coverageAreas.length} seleccionadas</span>
                </div>
              </div>
            )}

            {/* Step 5: Especialidad (Modern Cards) */}
            {current.key === 'specialty' && (
              <div className="space-y-2.5">
                {[
                  { value: 'venta', label: 'Ventas de Inmuebles', desc: 'Te enfocas en comercializar y vender propiedades.', icon: 'sell' },
                  { value: 'alquiler', label: 'Alquileres', desc: 'Te especializas en contratos de alquiler y administración.', icon: 'key' },
                  { value: 'ambos', label: 'Ventas y Alquileres', desc: 'Operas en ambos sectores del mercado inmobiliario.', icon: 'compare_arrows' },
                ].map(opt => {
                  const isSelected = specialty === opt.value;
                  return (
                    <button 
                      key={opt.value} 
                      type="button" 
                      onClick={() => setSpecialty(opt.value)}
                      className={`w-full flex items-start gap-3 py-3 px-4 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-xl mt-0.5 ${isSelected ? 'text-indigo-650' : 'text-slate-400'}`}>{opt.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                        <p className="text-[9px] text-slate-450 font-semibold mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                      {isSelected && <span className="material-symbols-outlined text-indigo-600 text-base mt-0.5">check_circle</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 6: Experiencia (Visual Chip Grid) */}
            {current.key === 'experience' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '1', label: 'Menos de 1 año', desc: 'Iniciando en el rubro' },
                  { value: '3', label: '1 - 3 años', desc: 'Consolidando conocimientos' },
                  { value: '5', label: '3 - 5 años', desc: 'Agente experimentado' },
                  { value: '10', label: '5 - 10 años', desc: 'Trayectoria destacada' },
                  { value: '15', label: '10 - 15 años', desc: 'Líder en el mercado' },
                  { value: '20', label: '15+ años', desc: 'Referente y mentor' },
                ].map(opt => {
                  const isSelected = experienceYears === opt.value;
                  return (
                    <button 
                      key={opt.value} 
                      type="button" 
                      onClick={() => setExperienceYears(opt.value)}
                      className={`py-3 px-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between min-h-[75px] cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black text-slate-850 leading-none">{opt.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-indigo-650 text-xs">check_circle</span>}
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold leading-tight mt-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation Action Footer */}
          <div className="flex items-center gap-3 mt-8 border-t border-slate-100 pt-5">
            {step > 0 && (
              <button 
                onClick={() => setStep(s => s - 1)}
                className="px-6 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-850 border border-slate-205 hover:border-slate-350 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Atrás
              </button>
            )}
            <button
              onClick={isLastStep ? handleFinish : () => setStep(s => s + 1)}
              disabled={!canAdvance() || isPending}
              className="flex-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white font-extrabold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:shadow-lg hover:shadow-indigo-100 transition-all disabled:opacity-40 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isLastStep ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span> 
                  <span>Comenzar</span>
                </>
              ) : (
                <>
                  <span>Siguiente</span> 
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
