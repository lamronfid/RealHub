'use client';

import { useState } from 'react';
import { useAgentUI } from '@/lib/store';
import NotificationsDropdown from './NotificationsDropdown';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

import VerifiedBadge from './VerifiedBadge';

interface TopBarProps {
  agentName: string;
  agentAvatar?: string | null;
  isVerified?: boolean;
}

export default function TopBar({ agentName, agentAvatar, isVerified }: TopBarProps) {
  const { setMobileMenu } = useAgentUI();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  let pageTitle = 'Dashboard';
  if (pathname.includes('/admin')) pageTitle = 'Administración';
  if (pathname.includes('/propiedades')) pageTitle = 'Propiedades';
  if (pathname.includes('/prospectos')) pageTitle = 'Prospectos';
  if (pathname.includes('/agenda')) pageTitle = 'Agenda';
  if (pathname.includes('/marketplace')) pageTitle = 'The Collection';


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] bg-white/70 backdrop-blur-2xl border-b border-slate-100/80 flex items-center px-4 md:px-8 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenu(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <span className="material-symbols-outlined text-slate-600">menu</span>
      </button>

      {/* Page Title */}
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>

      <div className="flex-1" />

      {/* Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <NotificationsDropdown />
        
        <div className="w-px h-8 bg-slate-200 hidden md:block" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <span className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-700">
              {agentName.split(' ')[0]}
              {isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
            </span>
            {agentAvatar ? (
              <img src={agentAvatar} alt={agentName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
            )}
            <span className="material-symbols-outlined text-slate-400 text-lg hidden md:block">
              expand_more
            </span>
          </button>
          
          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 py-1 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 md:hidden">
                   <div className="flex items-center gap-1 overflow-hidden">
                     <p className="text-sm font-semibold text-slate-800 truncate">{agentName}</p>
                     {isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                   </div>
                   <p className="text-xs text-slate-400">Agente</p>
                </div>
                
                <div className="px-2 py-1 border-b border-slate-100/60">
                  <Link
                    href="/perfil"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-400">person</span>
                    Mi Perfil
                  </Link>
                </div>

                <div className="px-2 py-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
