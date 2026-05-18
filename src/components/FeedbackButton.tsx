'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!description.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('feature_requests').insert({
        user_id: user.id,
        description: description.trim(),
      });

      setSubmitted(true);
      setTimeout(() => { setIsOpen(false); setSubmitted(false); setDescription(''); }, 2000);
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 px-4 py-2.5 rounded-2xl shadow-lg shadow-slate-200/50 hover:shadow-indigo-200/30 transition-all duration-300"
      >
        <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">lightbulb</span>
        <span className="text-xs font-bold tracking-wide">¿Ideas?</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/30 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white/90 text-[20px]">lightbulb</span>
            <h3 className="text-sm font-bold text-white">¿Necesitas alguna función?</h3>
          </div>
          <button onClick={() => { setIsOpen(false); setDescription(''); setSubmitted(false); }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <p className="text-[11px] text-white/60 mt-1">
          Describinos y te la armamos. ¡Tu feedback = meses gratis!
        </p>
      </div>

      {/* Body */}
      <div className="p-5">
        {submitted ? (
          <div className="text-center py-4">
            <span className="material-symbols-outlined text-emerald-500 text-4xl mb-2 block">check_circle</span>
            <p className="text-sm font-bold text-slate-800">¡Gracias por tu idea!</p>
            <p className="text-xs text-slate-400 mt-1">Lo revisaremos pronto.</p>
          </div>
        ) : (
          <>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Me gustaría poder exportar mis propiedades a PDF..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
            />
            <button onClick={handleSubmit} disabled={isPending || !description.trim()}
              className="w-full mt-3 bg-indigo-600 text-white font-bold text-xs px-4 py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Enviar Idea
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
