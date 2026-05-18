'use client';

import { useState, useMemo } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, DEPARTMENTS, type PropertyType } from '@/lib/types';

interface PropertyFilterBarProps {
  properties: any[];
  children: (filtered: any[]) => React.ReactNode;
}

export default function PropertyFilterBar({ properties, children }: PropertyFilterBarProps) {
  const [filterType, setFilterType] = useState('all');
  const [filterTransaction, setFilterTransaction] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    return properties.filter(p => {
      if (filterType !== 'all' && p.property_type !== filterType) return false;
      if (filterTransaction !== 'all' && p.transaction_type !== filterTransaction) return false;
      if (filterDepartment !== 'all' && p.department !== filterDepartment) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const haystack = [p.title, p.neighborhood, p.city, p.department].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [properties, filterType, filterTransaction, filterDepartment, searchText]);

  // Only show departments that exist in properties
  const usedDepartments = useMemo(() =>
    Array.from(new Set(properties.map(p => p.department).filter(Boolean))).sort()
  , [properties]);

  const selectClass = "bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all";

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Buscar por título, barrio, ciudad..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>

        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
          <option value="all">Todos los tipos</option>
          {PROPERTY_TYPES.map(t => (
            <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select value={filterTransaction} onChange={e => setFilterTransaction(e.target.value)} className={selectClass}>
          <option value="all">Operación</option>
          <option value="compra">Venta</option>
          <option value="alquiler">Alquiler</option>
          <option value="ambos">Venta y Alquiler</option>
        </select>

        {usedDepartments.length > 1 && (
          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className={selectClass}>
            <option value="all">Departamento</option>
            {usedDepartments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}

        <span className="text-xs font-bold text-slate-400 ml-auto">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {children(filtered)}
    </div>
  );
}
