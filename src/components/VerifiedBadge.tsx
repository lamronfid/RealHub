import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  tooltip?: string;
}

export default function VerifiedBadge({ className = "w-4 h-4 inline-block ml-1", tooltip = "Agente Élite Verificado" }: VerifiedBadgeProps) {
  return (
    <span className="relative group inline-flex items-center" title={tooltip}>
      <svg
        className={`${className} hover:scale-110 transition-transform duration-300 ease-out`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ verticalAlign: 'middle', filter: 'drop-shadow(0px 1px 2px rgba(99, 102, 241, 0.2))' }}
      >
        <defs>
          <linearGradient id="holoCheckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" /> {/* Sky-400 */}
            <stop offset="40%" stopColor="#818CF8" /> {/* Indigo-400 */}
            <stop offset="75%" stopColor="#F472B6" /> {/* Pink-400 */}
            <stop offset="100%" stopColor="#FCD34D" /> {/* Amber-300 */}
          </linearGradient>
        </defs>
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          fill="url(#holoCheckGradient)"
        />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1">
        {tooltip}
      </span>
    </span>
  );
}
