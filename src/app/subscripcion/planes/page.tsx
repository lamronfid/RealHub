'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlanesPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'entrada' | 'pro' | 'elite' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (e) {
        console.error('Error checking auth state:', e);
      }
    }
    checkAuth();
  }, []);

  const handleSelectPlan = (plan: 'entrada' | 'pro' | 'elite') => {
    setSelectedPlan(plan);
    if (!isAuthenticated) {
      router.push(`/registrar?plan=${plan}`);
    } else {
      router.push(`/subscripcion/checkout?plan=${plan}`);
    }
  };

  return (
    <div className="min-h-[85vh] bg-[#0A0D1A] text-slate-100 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-900 shadow-2xl flex flex-col justify-center">
      
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <span className="material-symbols-outlined text-white text-lg font-bold">domain</span>
          </div>
          <span className="font-heading font-black text-base tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-all">
            Real<span className="text-indigo-400 font-extrabold">Hub</span>
          </span>
        </Link>
        
        {!isAuthenticated ? (
          <Link 
            href="/login"
            id="public-login-btn"
            className="px-6 py-2.5 bg-white/10 hover:bg-white text-slate-100 hover:text-slate-950 border border-white/10 hover:border-white rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-black/20 flex items-center gap-1.5 backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            Log in
          </Link>
        ) : (
          <Link 
            href="/"
            className="px-6 py-2.5 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md shadow-indigo-950/20 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">space_dashboard</span>
            Panel de Agente
          </Link>
        )}
      </div>
      
      {/* Background glow elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-pink-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-16 relative z-10">
        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
          RealHub Membership
        </span>
        <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight !text-white leading-none">
          Eleva tu Negocio al <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">Máximo Nivel</span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-lg mx-auto font-medium">
          Publica propiedades sin límites, destaca tu portafolio y colabora en el ecosistema inmobiliario más ágil de Paraguay.
        </p>
      </div>

      {/* Planes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full relative z-10 mb-8">
        
        {/* Plan Entrada */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-between hover:border-slate-800 transition-all duration-300">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-bold !text-white tracking-tight">Plan Entrada</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Para agentes individuales que inician</p>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-black text-white tracking-tight">$15</span>
              <span className="text-xs text-slate-500 font-medium">/ mes</span>
            </div>
            <hr className="border-white/[0.06] my-6" />
            <ul className="space-y-4 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Hasta 10 propiedades publicadas
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Marketplace nacional ilimitado
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Sistema de Coincidencias en tiempo real
              </li>
              <li className="flex items-center gap-2.5 text-slate-600 line-through">
                <span className="material-symbols-outlined text-slate-600 text-base">close</span>
                Scraper externo de propiedades
              </li>
              <li className="flex items-center gap-2.5 text-slate-600 line-through">
                <span className="material-symbols-outlined text-slate-600 text-base">close</span>
                Insignia de verificación holográfica
              </li>
            </ul>
          </div>
          <button onClick={() => handleSelectPlan('entrada')}
            className="w-full mt-8 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.05] hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Seleccionar Entrada
          </button>
        </div>

        {/* Plan Pro */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-between hover:border-slate-800 transition-all duration-300">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-bold !text-white tracking-tight">Plan Pro</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Mayor alcance y herramientas de búsqueda</p>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="font-heading text-5xl font-black text-white tracking-tight">$30</span>
              <span className="text-xs text-slate-500 font-medium">/ mes</span>
            </div>
            <hr className="border-white/[0.06] my-6" />
            <ul className="space-y-4 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Hasta 25 propiedades publicadas
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Marketplace nacional ilimitado
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Sistema de Coincidencias en tiempo real
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400 text-base">check</span>
                Scraper externo de propiedades (100 búsquedas)
              </li>
              <li className="flex items-center gap-2.5 text-slate-600 line-through">
                <span className="material-symbols-outlined text-slate-600 text-base">close</span>
                Insignia de verificación holográfica
              </li>
            </ul>
          </div>
          <button onClick={() => handleSelectPlan('pro')}
            className="w-full mt-8 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.05] hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Seleccionar Pro
          </button>
        </div>

        {/* Plan Élite — Highlighted Premium */}
        <div className="bg-[#11162A]/60 border-2 border-indigo-500/40 backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-between hover:border-indigo-400 transition-all duration-300 relative shadow-[0_0_50px_rgba(99,102,241,0.15)] overflow-hidden">
          {/* Top Banner Tag */}
          <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-6 rounded-bl-2xl">
            Recomendado
          </div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-heading text-xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-1.5">
                  Plan Élite <span className="material-symbols-outlined text-indigo-400 text-lg">workspace_premium</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">El estándar de oro para líderes del mercado</p>
              </div>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="font-heading text-6xl font-black text-white tracking-tighter bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">$100</span>
              <span className="text-xs text-slate-500 font-medium">/ mes</span>
            </div>
            <hr className="border-white/[0.06] my-6" />
            <ul className="space-y-4 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                Propiedades publicadas ilimitadas
              </li>
              <li className="flex items-center gap-2.5 text-white font-semibold">
                <span className="material-symbols-outlined text-indigo-400 text-base">verified</span>
                Insignia Élite de verificación holográfica
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                Scraper externo ilimitado de propiedades
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                3 Propiedades destacadas al mes (1 semana c/u)
              </li>
              <li className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                Soporte VIP y herramientas avanzadas
              </li>
            </ul>
          </div>
          <button onClick={() => handleSelectPlan('elite')}
            className="w-full mt-8 py-3 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white font-extrabold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
          >
            Obtener Plan Élite
          </button>
        </div>

      </div>


      <div className="text-center relative z-10">
      </div>

    </div>
  );
}
