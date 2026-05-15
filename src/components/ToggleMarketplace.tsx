'use client';

import { toggleMarketplace } from '@/app/(app)/propiedades/actions';
import { useTransition } from 'react';

export default function ToggleMarketplace({ propertyId, isMarketplace }: { propertyId: string; isMarketplace: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await toggleMarketplace(propertyId, !isMarketplace); })}
      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${
        isPending ? 'opacity-50' : ''
      } ${isMarketplace ? 'bg-violet-50 text-violet-600 hover:bg-violet-100' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
    >
      <span className="material-symbols-outlined text-sm">{isMarketplace ? 'visibility' : 'visibility_off'}</span>
      {isMarketplace ? 'Público' : 'Privado'}
    </button>
  );
}
