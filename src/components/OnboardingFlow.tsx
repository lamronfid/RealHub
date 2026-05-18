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
  const [isIndependent, setIsIndependent] = useState(false);
  const [coverageAreas, setCoverageAreas] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canAdvance = () => {
    switch (current.key) {
      case 'name': return fullName.trim().length >= 2;
      case 'phone': return phone.trim().length >= 6;
      case 'agency': return isIndependent || agencyName.trim().length >= 2;
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

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all";

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex items-center justify-center p-4">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-white/10">
        <div className="h-full bg-white/60 transition-all duration-500 rounded-r-full" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="w-full max-w-md">
        {/* Step counter */}
        <div className="text-center mb-8">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
            Paso {step + 1} de {STEPS.length}
          </span>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur">
            <span className="material-symbols-outlined text-white text-3xl">{current.icon}</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-white/50 text-sm">{current.subtitle}</p>
        </div>

        {/* Step Content */}
        <div className="space-y-4 min-h-[160px]">
          {current.key === 'name' && (
            <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="Ej: Juan Pérez" autoFocus />
          )}

          {current.key === 'phone' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Teléfono</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+595 981 123 456" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">WhatsApp (si es diferente)</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inputClass} placeholder="Mismo número o diferente" />
              </div>
            </>
          )}

          {current.key === 'agency' && (
            <>
              <button type="button" onClick={() => setIsIndependent(!isIndependent)}
                className={`w-full py-3 px-4 rounded-xl text-sm font-medium border transition-all ${
                  isIndependent ? 'bg-white/20 border-white/40 text-white' : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                }`}
              >
                Soy Agente Independiente
              </button>
              {!isIndependent && (
                <input value={agencyName} onChange={e => setAgencyName(e.target.value)} className={inputClass} placeholder="Nombre de tu inmobiliaria / agencia" />
              )}
            </>
          )}

          {current.key === 'coverage' && (
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2">
              {DEPARTMENTS.map(dept => (
                <button key={dept} type="button"
                  onClick={() => setCoverageAreas(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    coverageAreas.includes(dept) ? 'bg-white/20 border-white/40 text-white' : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {current.key === 'specialty' && (
            <div className="space-y-3">
              {[
                { value: 'venta', label: 'Venta', icon: 'sell' },
                { value: 'alquiler', label: 'Alquiler', icon: 'key' },
                { value: 'ambos', label: 'Venta y Alquiler', icon: 'compare_arrows' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setSpecialty(opt.value)}
                  className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium border transition-all ${
                    specialty === opt.value ? 'bg-white/20 border-white/40 text-white' : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {current.key === 'experience' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '1', label: 'Menos de 1 año' },
                { value: '3', label: '1-3 años' },
                { value: '5', label: '3-5 años' },
                { value: '10', label: '5-10 años' },
                { value: '15', label: '10-15 años' },
                { value: '20', label: '15+ años' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setExperienceYears(opt.value)}
                  className={`py-3 px-4 rounded-xl text-xs font-medium border transition-all ${
                    experienceYears === opt.value ? 'bg-white/20 border-white/40 text-white' : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/20 hover:border-white/30 transition-all"
            >
              Atrás
            </button>
          )}
          <button
            onClick={isLastStep ? handleFinish : () => setStep(s => s + 1)}
            disabled={!canAdvance() || isPending}
            className="flex-1 bg-white text-indigo-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
            ) : isLastStep ? (
              <><span className="material-symbols-outlined text-[18px]">rocket_launch</span> Comenzar</>
            ) : (
              <>Siguiente <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
