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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50/50 via-indigo-50/30 to-pink-50/20 px-4 font-sans text-slate-800 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/subscripcion/planes" className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-white text-xl font-bold">domain</span>
            </div>
            <span className="font-heading font-black text-xl tracking-wider bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-indigo-600 transition-all">
              Real<span className="text-indigo-600 font-extrabold">Hub</span>
            </span>
          </Link>
          <p className="text-slate-400 text-xs mt-1 font-semibold">Crea tu cuenta para activar tu <strong className="text-indigo-600 uppercase">Plan {plan}</strong></p>
        </div>

        {/* Form */}
        <div className="bg-white/80 border border-slate-100/80 backdrop-blur-xl rounded-3xl p-8 shadow-premium shadow-lg">
          <h2 className="font-heading text-xl font-black text-slate-850 tracking-tight mb-6">
            Crear tu Cuenta de Agente
          </h2>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-semibold text-emerald-600">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-100 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl active:scale-[0.99] transition-all"
            >
              {loading ? 'Creando Cuenta...' : 'Registrar y Continuar'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-400 hover:text-indigo-655 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <p className="text-slate-450 text-xs font-semibold font-sans">Cargando registro...</p>
      </div>
    }>
      <RegistrarPageContent />
    </Suspense>
  );
}

