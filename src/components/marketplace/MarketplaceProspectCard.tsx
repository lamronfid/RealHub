'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getAgentReviews, type AgentReview } from '@/lib/reviews';

interface MarketplaceProspectCardProps {
  prospect: any;
  currentAgentId: string;
}

export default function MarketplaceProspectCard({ prospect, currentAgentId }: MarketplaceProspectCardProps) {
  const isOwner = prospect.agent_id === currentAgentId;
  const [reviews, setReviews] = useState<AgentReview[]>([]);

  // Fetch reviews client-side
  useEffect(() => {
    if (prospect.agent_profiles?.id) {
      getAgentReviews(prospect.agent_profiles.id).then(setReviews);
    }
  }, [prospect.agent_profiles?.id]);

  // Format currency
  const formatPrice = (price: number | null) => {
    if (!price) return '';
    return price.toLocaleString('es-PY');
  };

  const hasBudget = prospect.price_min || prospect.price_max;
  let budgetText = 'A convenir';
  if (prospect.price_min && prospect.price_max) {
    budgetText = `${prospect.currency} ${formatPrice(prospect.price_min)} - ${formatPrice(prospect.price_max)}`;
  } else if (prospect.price_max) {
    budgetText = `Hasta ${prospect.currency} ${formatPrice(prospect.price_max)}`;
  } else if (prospect.price_min) {
    budgetText = `Desde ${prospect.currency} ${formatPrice(prospect.price_min)}`;
  }

  // Format Property Types
  const typesText = prospect.property_types && prospect.property_types.length > 0
    ? prospect.property_types.map((t: string) => PROPERTY_TYPE_LABELS[t as PropertyType] || t).join(', ')
    : 'Cualquier tipo';

  // Format Locations
  const locationsText = prospect.neighborhoods && prospect.neighborhoods.length > 0
    ? prospect.neighborhoods.join(', ')
    : prospect.departments && prospect.departments.length > 0
      ? prospect.departments.join(', ')
      : 'Cualquier zona';

  const agentPhoneLink = prospect.agent_profiles?.phone 
    ? `https://wa.me/${prospect.agent_profiles.phone.replace(/\D/g, '')}?text=Hola! Vi tu prospecto en RealHub buscando: ${encodeURIComponent(typesText)} en ${encodeURIComponent(locationsText)}. Creo que tengo una propiedad que le puede interesar.`
    : '#';

  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '5.0';
  const isElite = prospect.agent_profiles?.subscription_tier === 'elite' || prospect.agent_profiles?.is_verified;

  return (
    <div className="group bg-white border border-slate-100 rounded-3xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 transition-all duration-500 flex flex-col h-full overflow-hidden relative">
      
      {/* Top Banner indicating operation */}
      <div className={`py-3 px-6 border-b flex items-center justify-between ${
        prospect.transaction_type === 'alquiler' 
          ? 'bg-blue-50/50 border-blue-100/50 text-blue-800'
          : 'bg-emerald-50/50 border-emerald-100/50 text-emerald-800'
      }`}>
        <span className="font-bold text-sm tracking-wide uppercase">
          Busca {prospect.transaction_type}
        </span>
        <span className="material-symbols-outlined text-[20px] opacity-50">
          {prospect.transaction_type === 'alquiler' ? 'key' : 'real_estate_agent'}
        </span>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Core Request */}
        <h3 className="font-heading text-xl font-bold text-slate-900 leading-tight mb-2">
          {typesText}
        </h3>
        <p className="text-slate-500 text-sm flex items-start gap-1.5 mb-4 line-clamp-2">
          <span className="material-symbols-outlined text-[18px] shrink-0">location_on</span>
          {locationsText}
        </p>

        {/* Budget */}
        <div className="mb-6">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Presupuesto</span>
          <p className="font-heading text-2xl font-bold text-slate-800">
            {budgetText}
          </p>
        </div>

        {/* Specific Needs Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-400 mb-1 block text-[20px]">bed</span>
            <span className="block text-sm font-bold text-slate-700">{prospect.rooms_min ? `${prospect.rooms_min}+` : '-'}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-400 mb-1 block text-[20px]">shower</span>
            <span className="block text-sm font-bold text-slate-700">{prospect.bathrooms_min ? `${prospect.bathrooms_min}+` : '-'}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100/50">
            <span className="material-symbols-outlined text-slate-400 mb-1 block text-[20px]">directions_car</span>
            <span className="block text-sm font-bold text-slate-700">{prospect.garages_min ? `${prospect.garages_min}+` : '-'}</span>
          </div>
        </div>

        {prospect.notes && (
          <div className="mb-6">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Notas del Agente</span>
            <p className="text-sm text-slate-600 line-clamp-3 italic">"{prospect.notes}"</p>
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
          <Link href={`/perfil/${prospect.agent_profiles?.id || '#'}`} className="flex items-center gap-3 group/agent flex-1 min-w-0">
            {prospect.agent_profiles?.avatar_url ? (
              <img src={prospect.agent_profiles.avatar_url} alt="Agente" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <span className="text-xs font-bold text-indigo-600">
                  {prospect.agent_profiles?.full_name?.substring(0,2).toUpperCase() || 'AG'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 leading-tight">Representado por</p>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-sm font-bold text-slate-900 leading-tight group-hover/agent:text-indigo-600 transition-colors flex items-center gap-0.5 truncate">
                  {isOwner ? 'Tú' : (prospect.agent_profiles?.full_name || 'Agente')}
                  {!isOwner && isElite && <VerifiedBadge className="w-3.5 h-3.5 ml-0.5" />}
                </span>
                {!isOwner && totalReviews > 0 && (
                  <div className="bg-slate-100 text-slate-850 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold shrink-0">
                    <span className="material-symbols-outlined text-[10px] fill-current text-slate-800">star</span>
                    <span>{averageRating}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {!isOwner && prospect.agent_profiles?.phone && (
            <a 
              href={agentPhoneLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors ml-2 shrink-0"
              title="Contactar Agente por WhatsApp"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
