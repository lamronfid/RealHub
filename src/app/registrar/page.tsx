'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function RegistrarPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan') || 'elite';
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/subscripcion/checkout?plan=${plan}`
      }
    });
    if (error) {
      setError(error.message);
    } else {
      router.push(`/subscripcion/confirmar?plan=${plan}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-[#0A0D1A] px-4 font-sans text-slate-100 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/subscripcion/planes" className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-white text-xl font-bold">domain</span>
            </div>
            <span className="font-heading font-black text-xl tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-all">
              Real<span className="text-indigo-400 font-extrabold">Hub</span>
            </span>
          </Link>
          <p className="text-slate-400 text-xs mt-1">Crea tu cuenta para activar tu <strong className="text-indigo-400 uppercase">Plan {plan}</strong></p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
          <h2 className="font-heading text-xl font-black text-white tracking-tight mb-6">
            Crear tu Cuenta de Agente
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-[#04060C] border border-white/[0.08] focus:border-indigo-500/50 rounded-2xl py-3 px-4 text-xs font-semibold text-white focus:outline-none placeholder-slate-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)]"
            >
              {loading ? 'Creando Cuenta...' : 'Registrar y Continuar'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-white/[0.05] pt-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegistrarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080B16] text-slate-200">
        <p className="text-slate-500 text-xs font-semibold font-sans">Cargando registro...</p>
      </div>
    }>
      <RegistrarPageContent />
    </Suspense>
  );
}
