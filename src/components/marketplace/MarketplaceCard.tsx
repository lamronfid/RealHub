'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getAgentReviews, type AgentReview } from '@/lib/reviews';

interface MarketplaceCardProps {
  property: any;
  currentAgentId: string;
}

export default function MarketplaceCard({ property, currentAgentId }: MarketplaceCardProps) {
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<AgentReview[]>([]);

  // Fetch agent reviews client-side to calculate ratings
  useEffect(() => {
    if (property.agent_profiles?.id) {
      getAgentReviews(property.agent_profiles.id).then(setReviews);
    }
  }, [property.agent_profiles?.id]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${property.id}?ref=${currentAgentId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate review statistics
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '5.0';

  // Dynamic Ribbon Logic: Determine the 3 most important stats based on property type
  const isLand = ['terreno', 'loteamiento', 'quinta'].includes(property.property_type);
  const isApt = ['departamento', 'penthouse'].includes(property.property_type);
  
  const stats = [];
  
  if (isLand) {
    if (property.m2_terrain) stats.push(`${property.m2_terrain} m² Totales`);
    if (property.trees_count) stats.push(`${property.trees_count} Árboles`);
    if (property.neighborhood) stats.push(property.neighborhood);
  } else if (isApt) {
    if (property.m2_built) stats.push(`${property.m2_built} m² Propios`);
    if (property.m2_balcony) stats.push(`${property.m2_balcony} m² Balcón`);
    if (property.bedrooms) stats.push(`${property.bedrooms} Dormitorios`);
  } else {
    // Default (Houses, Commercial)
    if (property.m2_built) stats.push(`${property.m2_built} m² Const.`);
    if (property.bedrooms) stats.push(`${property.bedrooms} Dormitorios`);
    if (property.bathrooms) stats.push(`${property.bathrooms} Baños`);
  }

  // Fallbacks if stats are empty
  if (stats.length === 0) {
    stats.push(PROPERTY_TYPE_LABELS[property.property_type as PropertyType] || property.property_type);
    if (property.city) stats.push(property.city);
  }

  // Limit to max 3 items for aesthetic reasons
  const displayStats = stats.slice(0, 3);

  const phoneLink = property.agent_profiles?.phone 
    ? `https://wa.me/${property.agent_profiles.phone.replace(/\D/g, '')}?text=Hola! Me interesa la propiedad: ${encodeURIComponent(property.title)}`
    : '#';

  const isElite = property.agent_profiles?.subscription_tier === 'elite' || property.agent_profiles?.is_verified;

  return (
    <div className={`group relative overflow-hidden rounded-3xl transition-all duration-500 flex flex-col h-full ${
      property.is_featured 
        ? 'p-[2px] bg-gradient-to-br from-amber-400 via-indigo-500 to-pink-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]' 
        : 'bg-white border border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200'
    }`}>
      
      {/* Glow Mask for Featured Properties */}
      {property.is_featured && (
        <div className="absolute inset-[2px] bg-white rounded-[22px] -z-10" />
      )}

      <div className="flex flex-col h-full rounded-[22px] overflow-hidden bg-white">
        {/* High-End Image Area */}
        <Link href={`/propiedades/${property.id}`} className="relative aspect-[4/3] bg-slate-100 overflow-hidden block">
          {property.photos && property.photos.length > 0 ? (
            <img src={property.photos[0]} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <span className="material-symbols-outlined text-5xl font-light mb-2">landscape</span>
              <span className="text-xs uppercase tracking-widest font-bold">Sin Imagen</span>
            </div>
          )}
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <div className="flex flex-col gap-1.5">
              {property.status === 'off_market' ? (
                <span className="bg-slate-900/95 text-amber-400 border border-amber-500/20 backdrop-blur text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm w-fit">
                  Off-Market
                </span>
              ) : property.status === 'coming_soon' ? (
                <span className="bg-amber-550/90 text-white backdrop-blur text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm w-fit animate-pulse">
                  Coming Soon
                </span>
              ) : (
                <span className="bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm w-fit">
                  {property.transaction_type === 'compra' ? 'Venta' : 'Alquiler'}
                </span>
              )}
              
              {property.is_featured && (
                <span className="bg-gradient-to-r from-amber-400 via-indigo-500 to-pink-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 w-fit border border-white/10 animate-pulse">
                  <span className="material-symbols-outlined text-[10px] fill-current">workspace_premium</span> Destacado
                </span>
              )}
            </div>
            
            {property.exclusive && (
              <span className="bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">star</span> Exclusiva
              </span>
            )}
          </div>
        </Link>

        {/* Dynamic Ribbon */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider overflow-hidden">
          {displayStats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-4 whitespace-nowrap">
              <span>{stat}</span>
              {idx < displayStats.length - 1 && <div className="w-1 h-1 rounded-full bg-slate-300" />}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-heading text-xl font-bold text-slate-900 line-clamp-2 leading-tight mb-2">
            {property.title}
          </h3>
          
          <p className="text-sm text-slate-400 mb-6 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {[property.neighborhood, property.city].filter(Boolean).join(', ')}
          </p>

          <div className="mt-auto flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Precio</p>
              {property.transaction_type === 'ambos' ? (
                <div className="flex flex-col">
                  <span className="font-heading text-lg font-bold text-slate-900 leading-tight">V: {property.currency} {property.sale_price?.toLocaleString('es-PY')}</span>
                  <span className="font-heading text-sm font-semibold text-slate-500 leading-tight">A: {property.currency} {property.rent_price?.toLocaleString('es-PY')}</span>
                </div>
              ) : (
                <p className="font-heading text-2xl font-bold text-slate-900">
                  {property.currency} {property.transaction_type === 'alquiler' ? property.rent_price?.toLocaleString('es-PY') : property.sale_price?.toLocaleString('es-PY')}
                </p>
              )}
            </div>
            
            <a href={phoneLink} target="_blank" rel="noopener noreferrer" 
              className="flex items-center justify-center w-12 h-12 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-full transition-all duration-300 shadow-sm"
              title="Contactar al Agente"
            >
              <span className="material-symbols-outlined text-xl">chat</span>
            </a>
          </div>
        </div>

        {/* Agent Info (Footer) */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 bg-white">
          <Link href={`/perfil/${property.agent_profiles?.id || '#'}`} className="flex items-center gap-3 flex-1 min-w-0 group/agent">
            {property.agent_profiles?.avatar_url ? (
              <img src={property.agent_profiles.avatar_url} alt="Agent" className="w-8 h-8 rounded-full object-cover border border-slate-100" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <span className="text-xs font-bold text-indigo-600">
                  {property.agent_profiles?.full_name?.substring(0,2).toUpperCase() || 'AG'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-xs font-bold text-slate-900 truncate group-hover/agent:text-indigo-600 transition-colors flex items-center gap-0.5">
                  {property.agent_profiles?.full_name || 'Agente Independiente'}
                  {isElite && <VerifiedBadge className="w-3.5 h-3.5 ml-0.5" />}
                </span>
                {totalReviews > 0 && (
                  <div className="bg-slate-100 text-slate-850 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold shrink-0">
                    <span className="material-symbols-outlined text-[10px] fill-current text-slate-800">star</span>
                    <span>{averageRating}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{property.agent_profiles?.agency_name || 'Agente Inmobiliario'}</p>
            </div>
          </Link>
          
          {/* Copy White-label Link Button */}
          <button
            onClick={handleCopyLink}
            title="Copiar Link para Cliente"
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
