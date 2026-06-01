'use client';
import { useAcmStore } from '@/store/acm-store';

export default function FilterBar() {
  const { filters, setFilters, getUniqueSources } = useAcmStore();
  const sources = getUniqueSources();

  const toggleSource = (src: string) => {
    const next = filters.sources.includes(src)
      ? filters.sources.filter((s) => s !== src)
      : [...filters.sources, src];
    setFilters({ sources: next });
  };

  const clearFilters = () =>
    setFilters({
      sources:       [],
      similarityMin: 0,
      priceMin:      undefined,
      priceMax:      undefined,
      sqmMin:        undefined,
      sqmMax:        undefined,
    });

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Filtros</p>
        <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Limpiar filtros
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Source chips */}
        {sources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Fuente</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((src) => {
                const active = filters.sources.includes(src);
                return (
                  <button
                    key={src}
                    onClick={() => toggleSource(src)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Similarity slider */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            Similitud mínima: <span className="text-blue-600">{filters.similarityMin}%</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">0%</span>
            <input
              type="range"
              min={0}
              max={80}
              step={10}
              value={filters.similarityMin}
              onChange={(e) => setFilters({ similarityMin: Number(e.target.value) })}
              className="w-36 accent-blue-600"
            />
            <span className="text-xs text-gray-400">80%</span>
          </div>
        </div>

        {/* Price range */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Rango de precio (USD)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              value={filters.priceMin ?? ''}
              onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value) : undefined })}
              className="w-24 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-300">—</span>
            <input
              type="number"
              placeholder="Máx"
              value={filters.priceMax ?? ''}
              onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined })}
              className="w-24 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Fix #11 — m² range filter (was in store/type but had no UI). */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Superficie (m²)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Mín"
              value={filters.sqmMin ?? ''}
              onChange={(e) => setFilters({ sqmMin: e.target.value ? Number(e.target.value) : undefined })}
              className="w-24 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-300">—</span>
            <input
              type="number"
              placeholder="Máx"
              value={filters.sqmMax ?? ''}
              onChange={(e) => setFilters({ sqmMax: e.target.value ? Number(e.target.value) : undefined })}
              className="w-24 text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
