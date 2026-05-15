'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AGENT_NAV_ITEMS } from '@/lib/types';

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50">
      {AGENT_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px]`}
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
