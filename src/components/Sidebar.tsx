'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AGENT_NAV_ITEMS } from '@/lib/types';
import { useAgentUI } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import VerifiedBadge from './VerifiedBadge';

interface SidebarProps {
  agentName: string;
  agentAvatar?: string | null;
  isVerified?: boolean;
}

export default function Sidebar({ agentName, agentAvatar, isVerified }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { sidebarCollapsed, toggleSidebar } = useAgentUI();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 hidden md:flex flex-col h-screen border-r border-slate-100 bg-white/80 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.03)] transition-all duration-300 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-[72px] px-5 border-b border-slate-100/80 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">R</span>
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">RealHub</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Agentes</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {AGENT_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-colors shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <span className={`text-[13px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Action */}
      <div className={`px-3 pb-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <Link
          href="/propiedades/nueva"
          className={`flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 font-medium text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.97] ${
            sidebarCollapsed ? 'px-2' : 'px-4'
          }`}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {!sidebarCollapsed && <span>Nueva Propiedad</span>}
        </Link>
      </div>

      {/* Logout Action */}
      <div className={`px-3 pb-2 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
          title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
        >
          <span className="material-symbols-outlined text-[22px] shrink-0">logout</span>
          {!sidebarCollapsed && <span className="text-[13px] font-medium">Cerrar Sesión</span>}
        </button>
      </div>

      {/* Agent Info / Collapse */}
      <div className={`border-t border-slate-100 px-3 py-3 ${sidebarCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={toggleSidebar}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
          title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {agentAvatar ? (
            <img src={agentAvatar} alt={agentName} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-600">
                {agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          )}
          {!sidebarCollapsed && (
            <>
              <div className="flex flex-col text-left overflow-hidden flex-1">
                <div className="flex items-center gap-1 overflow-hidden">
                  <span className="text-sm font-semibold text-slate-800 truncate">{agentName}</span>
                  {isVerified && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
                </div>
                <span className="text-[10px] text-slate-400">Agente</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 text-lg">
                chevron_left
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
