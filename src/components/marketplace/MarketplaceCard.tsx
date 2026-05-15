'use client';

import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import Link from 'next/link';
import { useState } from 'react';

interface MarketplaceCardProps {
  property: any;
  currentAgentId: string;
}

export default function MarketplaceCard({ property, currentAgentId }: MarketplaceCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/p/${property.id}?ref=${currentAgentId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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

  return (
    <div className="group relative bg-white overflow-hidden border border-slate-100 rounded-3xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 transition-all duration-500 flex flex-col h-full">
      
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
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <span className="bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
            {property.transaction_type === 'compra' ? 'Venta' : 'Alquiler'}
          </span>
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
        <h3 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-slate-900 line-clamp-2 leading-tight mb-2">
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
                <span className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900 leading-tight">V: {property.currency} {property.sale_price?.toLocaleString('es-PY')}</span>
                <span className="font-[family-name:var(--font-outfit)] text-sm font-semibold text-slate-500 leading-tight">A: {property.currency} {property.rent_price?.toLocaleString('es-PY')}</span>
              </div>
            ) : (
              <p className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">
                {property.currency} {property.transaction_type === 'alquiler' ? property.rent_price?.toLocaleString('es-PY') : property.sale_price?.toLocaleString('es-PY')}
              </p>
            )}
          </div>
          
          <a href={phoneLink} target="_blank" rel="noopener noreferrer" 
            className="flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-full transition-all duration-300 shadow-sm"
            title="Contactar al Agente"
          >
            <span className="material-symbols-outlined text-xl">chat</span>
          </a>
        </div>
      </div>

      {/* Agent Info (Footer) */}
      <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 bg-white">
        {property.agent_profiles?.avatar_url ? (
          <img src={property.agent_profiles.avatar_url} alt="Agent" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-600">
              {property.agent_profiles?.full_name?.substring(0,2).toUpperCase() || 'AG'}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{property.agent_profiles?.full_name || 'Agente Independiente'}</p>
          <p className="text-[10px] text-slate-500 truncate">{property.agent_profiles?.agency_name || 'Agente Inmobiliario'}</p>
        </div>
        
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
  );
}
