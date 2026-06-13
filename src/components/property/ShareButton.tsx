'use client';

import { useState } from 'react';

interface ShareButtonProps {
  propertyId: string;
  userId: string;
}

export default function ShareButton({ propertyId, userId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const shareUrl = `${window.location.origin}/p/${propertyId}/cliente?shared_by=${userId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-sm font-bold flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition duration-200 ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {copied ? 'check' : 'share'}
      </span>
      {copied ? '¡Copiado!' : 'Compartir con Cliente'}
    </button>
  );
}
