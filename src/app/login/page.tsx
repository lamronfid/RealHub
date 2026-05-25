'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.href = '/';
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
          <p className="text-slate-400 text-xs mt-1 font-semibold">Plataforma de agentes inmobiliarios</p>
        </div>

        {/* Form */}
        <div className="bg-white/80 border border-slate-100/80 backdrop-blur-xl rounded-3xl p-8 shadow-premium shadow-lg">
          <h2 className="font-heading text-xl font-black text-slate-850 tracking-tight mb-6">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
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
                placeholder="••••••••"
                className="w-full bg-slate-50/50 border border-slate-200/80 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-2xl py-3 px-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-100 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl active:scale-[0.99] transition-all"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <Link
              href="/subscripcion/planes"
              className="text-xs font-semibold text-slate-400 hover:text-indigo-650 transition-colors"
            >
              ¿No tienes cuenta? Ver planes de suscripción
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

