'use client';

import { useState, useMemo } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/types';
import MarketplaceCard from '@/components/marketplace/MarketplaceCard';
import MarketplaceProspectCard from '@/components/marketplace/MarketplaceProspectCard';

interface MarketplaceClientProps {
  properties: any[];
  prospects: any[];
  currentAgentId: string;
}

export default function MarketplaceClient({ properties, prospects, currentAgentId }: MarketplaceClientProps) {
  const [currentView, setCurrentView] = useState<'properties' | 'prospects'>('properties');
  const [filterType, setFilterType] = useState('all');
  const [filterTransaction, setFilterTransaction] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filteredProperties = useMemo(() => {
    const list = properties.filter(p => {
      if (filterType !== 'all' && p.property_type !== filterType) return false;
      if (filterTransaction !== 'all' && p.transaction_type !== filterTransaction) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const haystack = [p.title, p.neighborhood, p.city, p.department].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Sort: is_featured DESC, then created_at DESC
    return [...list].sort((a, b) => {
      const aFeatured = a.is_featured ? 1 : 0;
      const bFeatured = b.is_featured ? 1 : 0;
      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured; // Featured first
      }
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime; // Newest first
    });
  }, [properties, filterType, filterTransaction, searchText]);

  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      if (filterTransaction !== 'all' && p.transaction_type !== filterTransaction) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const haystack = [
          ...(p.neighborhoods || []),
          ...(p.cities || []),
          ...(p.departments || []),
          ...(p.property_types || []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [prospects, filterTransaction, searchText]);

  const selectClass = "bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all";

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            The Collection
          </h2>
          <p className="text-slate-500 mt-2 max-w-xl">
            Explora {currentView === 'properties' ? 'las propiedades más exclusivas' : 'los clientes interesados'} compartidos por la red de agentes de RealHub.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setCurrentView('properties')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentView === 'properties' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Propiedades ({properties.length})
          </button>
          <button onClick={() => setCurrentView('prospects')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              currentView === 'prospects' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Prospectos ({prospects.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-lg">search</span>
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder={currentView === 'properties' ? 'Buscar por título, barrio, ciudad...' : 'Buscar por ubicación, tipo...'}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>

        {currentView === 'properties' && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectClass}>
            <option value="all">Todos los tipos</option>
            {PROPERTY_TYPES.map(t => (
              <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        )}

        <select value={filterTransaction} onChange={e => setFilterTransaction(e.target.value)} className={selectClass}>
          <option value="all">Operación</option>
          <option value="compra">Compra/Venta</option>
          <option value="alquiler">Alquiler</option>
        </select>

        <span className="text-xs font-bold text-slate-400 ml-auto">
          {currentView === 'properties' ? filteredProperties.length : filteredProspects.length} resultado{(currentView === 'properties' ? filteredProperties.length : filteredProspects.length) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {currentView === 'properties' ? (
        filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 font-light">search_off</span>
            <h3 className="font-heading text-2xl font-bold text-slate-800 mb-2">No se encontraron propiedades</h3>
            <p className="text-slate-400 max-w-md">Ajusta los filtros para ver más resultados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map(property => (
              <MarketplaceCard key={property.id} property={property} currentAgentId={currentAgentId} />
            ))}
          </div>
        )
      ) : (
        filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 font-light">search_off</span>
            <h3 className="font-heading text-2xl font-bold text-slate-800 mb-2">No se encontraron prospectos</h3>
            <p className="text-slate-400 max-w-md">Ajusta los filtros para ver más resultados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProspects.map(prospect => (
              <MarketplaceProspectCard key={prospect.id} prospect={prospect} currentAgentId={currentAgentId} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
