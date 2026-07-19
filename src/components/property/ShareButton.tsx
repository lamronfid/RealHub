'use client';
import { useState, useRef, useEffect } from 'react';

interface ShareButtonProps {
  property: {
    id: string;
    title: string;
    transaction_type: string;
    property_type: string;
    sale_price: number | null;
    rent_price: number | null;
    currency: string;
    city: string | null;
    neighborhood: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    m2_terrain: number | null;
    m2_built: number | null;
  };
  userId: string;
}

export default function ShareButton({ property, userId }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${property.id}/cliente?shared_by=${userId}`;

  const formatWhatsAppMessage = () => {
    const pType = property.property_type ? (property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)) : 'Inmueble';
    const txType = property.transaction_type === 'venta' ? 'Venta' : 'Alquiler';
    const loc = [property.neighborhood, property.city].filter(Boolean).join(', ') || 'Paraguay';
    const price = property.transaction_type === 'venta' ? property.sale_price : property.rent_price;
    const formattedPrice = price ? Math.round(price).toLocaleString('es-PY').replace(/,/g, '.') : 'A Consultar';
    const sqm = property.m2_built || property.m2_terrain || '—';
    return `*🏡 ${pType} en ${txType} - ${loc}*
*Precio:* ${property.currency || 'USD'} ${formattedPrice}
📐 ${sqm} m² | 🛏️ ${property.bedrooms || 0} Dorms | 🛁 ${property.bathrooms || 0} Baños

*${property.title}*

Ver detalles y fotos completas aquí:
${shareUrl}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    } catch (err) {
      console.error('Failed to copy link: ', err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = formatWhatsAppMessage();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-bold flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
      >
        <span className="material-symbols-outlined text-[16px]">share</span>
        <span>Compartir Ficha</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-left transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">link</span>
            <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace de Cliente'}</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-750 hover:bg-emerald-50 hover:text-emerald-700 text-left transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
            <span>Compartir por WhatsApp</span>
          </button>
        </div>
      )}
    </div>
  );
}
