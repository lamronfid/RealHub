'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ConfirmarSuscripcionPageContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'elite';
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

  return (
    <div className="min-h-[80vh] bg-[#0A0D1A] text-slate-100 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-900 shadow-2xl flex flex-col justify-center items-center">
      
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <Link href="/subscripcion/planes" className="flex items-center gap-2 group">
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
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main card */}
      <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 text-center relative z-10 space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
          <span className="material-symbols-outlined text-3xl">mail_lock</span>
        </div>

        <div className="space-y-2">
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Verificación Requerida
          </span>
          <h2 className="font-heading text-2xl font-black text-white">
            ¡Casi está listo!
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Hemos enviado un enlace de confirmación seguro a tu casilla de correo electrónico registrada. Haz clic en el enlace para activar tu <strong className="text-white font-semibold uppercase">Plan {plan}</strong>.
          </p>
        </div>

        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 text-white font-extrabold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">forward_to_inbox</span>
          Ir a mi correo (Gmail / Outlook)
        </a>

        <div className="pt-2">
          <Link href="/subscripcion/planes" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a Planes
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmarSuscripcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] bg-[#0A0D1A] text-slate-100 rounded-3xl p-6 md:p-12 pt-24 md:pt-32 relative overflow-hidden border border-slate-900 shadow-2xl flex flex-col justify-center items-center">
        <div className="max-w-md w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 text-center relative z-10 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <span className="material-symbols-outlined text-3xl">mail_lock</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-black text-white">
              Cargando...
            </h2>
          </div>
        </div>
      </div>
    }>
      <ConfirmarSuscripcionPageContent />
    </Suspense>
  );
}
