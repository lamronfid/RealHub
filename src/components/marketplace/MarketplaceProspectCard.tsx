'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import Link from 'next/link';

interface MarketplaceProspectCardProps {
  prospect: any;
  currentAgentId: string;
}

export default function MarketplaceProspectCard({ prospect, currentAgentId }: MarketplaceProspectCardProps) {
  const isOwner = prospect.agent_id === currentAgentId;

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
        <h3 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-slate-900 leading-tight mb-2">
          {typesText}
        </h3>
        <p className="text-slate-500 text-sm flex items-start gap-1.5 mb-4 line-clamp-2">
          <span className="material-symbols-outlined text-[18px] shrink-0">location_on</span>
          {locationsText}
        </p>

        {/* Budget */}
        <div className="mb-6">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Presupuesto</span>
          <p className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-800">
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
          <div className="flex items-center gap-3">
            {prospect.agent_profiles?.avatar_url ? (
              <img src={prospect.agent_profiles.avatar_url} alt="Agente" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <span className="material-symbols-outlined text-slate-400">person</span>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-slate-500 leading-tight">Representado por</p>
              <p className="text-sm font-bold text-slate-900 leading-tight">{isOwner ? 'Tú' : (prospect.agent_profiles?.full_name || 'Agente')}</p>
            </div>
          </div>

          {!isOwner && prospect.agent_profiles?.phone && (
            <a 
              href={agentPhoneLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
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
