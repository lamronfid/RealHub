'use client';

import { useState, useEffect } from 'react';
import { getAgentReviews, AgentReview } from '@/lib/reviews';
import { getSubscriptionState } from '@/lib/subscription';

interface OwnReviewsProps {
  agentId: string;
  profile: any;
}

export default function OwnReviews({ agentId, profile }: OwnReviewsProps) {
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const { tier, isVerified } = getSubscriptionState(profile);

  useEffect(() => {
    async function loadReviews() {
      if (!agentId) return;
      try {
        const data = await getAgentReviews(agentId);
        setReviews(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, [agentId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-400 text-xs font-semibold mt-2">Cargando opiniones...</p>
      </div>
    );
  }

  // Calculate statistics
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '5.0';

  const starCounts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const starIdx = Math.max(1, Math.min(5, Math.round(r.rating))) - 1;
    starCounts[starIdx]++;
  });

  return (
    <div className="space-y-6">
      
      {/* Premium Elite Upgrade Banner if not elite */}
      {!isVerified && (
        <div className="bg-gradient-to-r from-sky-400/10 via-indigo-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block">
              Plan Recomendado
            </span>
            <h4 className="font-heading text-sm font-black text-slate-800">
              Desbloquea la Insignia de Verificación Élite ⚡
            </h4>
            <p className="text-xs text-slate-400 max-w-md">
              Demuestra confianza a otros colegas inmobiliarios. Los perfiles verificados reciben un 40% más de propuestas compartidas.
            </p>
          </div>
          <a
            href="/subscripcion/planes"
            className="px-5 py-2.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-pink-500 hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 text-center shrink-0"
          >
            Ver Planes Élite
          </a>
        </div>
      )}

      {/* Review details */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-premium">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-heading">Opiniones de Colegas</h3>
            <p className="text-[11px] text-slate-450 font-medium mt-0.5">Lo que otros agentes inmobiliarios opinan al colaborar contigo</p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-650 px-3.5 py-1.5 rounded-xl text-white shadow-md shadow-indigo-650/15">
            <span className="material-symbols-outlined text-white fill-current text-sm">star</span>
            <span className="text-xs font-black text-white">{averageRating}</span>
            <span className="text-[10px] text-indigo-150">({totalReviews})</span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-slate-50 pb-6">
          <div className="md:col-span-4 text-center p-6 bg-slate-50/50 border border-slate-100/80 rounded-2xl">
            <h4 className="text-4xl font-black text-slate-800 font-heading">{averageRating}</h4>
            <div className="flex justify-center text-slate-905 text-xs py-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span 
                  key={i} 
                  className={`material-symbols-outlined text-base ${
                    i < Math.floor(parseFloat(averageRating)) ? 'text-amber-500 fill-current' : 'text-slate-200'
                  }`}
                >
                  star
                </span>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Calificación Promedio</p>
          </div>

          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = starCounts[stars - 1] || 0;
              const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-3 font-bold text-slate-500 text-right">{stars}</span>
                  <span className="material-symbols-outlined text-[10px] text-amber-500 fill-current">star</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-650 rounded-full" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-5 text-slate-400 text-right font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* List of comments */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-semibold">
              Aún no has recibido opiniones de otros colegas.
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-4.5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200/80 shadow-[0_2px_8px_-1px_rgba(15,23,42,0.02)] hover:shadow-md hover:-translate-y-0.5 space-y-2 transition-all duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">{rev.from_agent_name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-500 text-[10px]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span 
                          key={i} 
                          className={`material-symbols-outlined text-[11px] ${
                            i < rev.rating ? 'text-amber-500 fill-current' : 'text-slate-200'
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(rev.created_at).toLocaleDateString('es-PY', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic leading-relaxed pl-1.5 border-l-2 border-slate-200">
                  "{rev.comment}"
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
