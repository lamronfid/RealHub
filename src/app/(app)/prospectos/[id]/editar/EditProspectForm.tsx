'use client';

import { useState, useTransition } from 'react';
import { updateProspect } from '@/app/(app)/prospectos/actions';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPES, CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS,
} from '@/lib/types';

interface EditProspectFormProps {
  prospect: any;
}

export default function EditProspectForm({ prospect }: EditProspectFormProps) {
  const [transactionType, setTransactionType] = useState(prospect.transaction_type || 'compra');
  const [department, setDepartment] = useState(prospect.departments?.[0] || '');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(prospect.neighborhoods || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(prospect.property_types || []);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);

  const formatPrice = (val: number | null) => {
    if (!val) return '';
    return val.toLocaleString('es-PY');
  };

  // Get all available neighborhoods for the selected department
  const availableCities = CITIES[department] || [];
  const allNeighborhoods = availableCities.flatMap(city => NEIGHBORHOODS[city] || []);
  const displayedNeighborhoods = showAllNeighborhoods ? allNeighborhoods : allNeighborhoods.slice(0, 15);

  const toggleNeighborhood = (n: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.set('property_types', selectedTypes.join(','));
    formData.set('department', department);
    formData.set('neighborhoods', selectedNeighborhoods.join(','));

    startTransition(async () => {
      const res = await updateProspect(prospect.id, formData);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-8">
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}

      {/* Personal Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Información del Prospecto</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nombre <span className="text-red-500">*</span></label>
            <input name="full_name" defaultValue={prospect.full_name} required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Teléfono</label>
            <input name="phone" defaultValue={prospect.phone || ''} type="tel"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email</label>
            <input name="email" defaultValue={prospect.email || ''} type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      </div>

      {/* Transaction */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tipo de Operación</h3>
        <select name="transaction_type" value={transactionType} onChange={e => setTransactionType(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-xs">
          <option value="compra">Compra</option>
          <option value="alquiler">Alquiler</option>
        </select>
      </div>

      {/* Budget */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Presupuesto</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
            <select name="currency" defaultValue={prospect.currency || 'USD'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Mínimo</label>
            <input name="price_min" defaultValue={formatPrice(prospect.price_min)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Máximo</label>
            <input name="price_max" defaultValue={formatPrice(prospect.price_max)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      </div>

      {/* Property Types */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tipo de Propiedad</h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTypes.includes(t)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {PROPERTY_TYPE_LABELS[t as keyof typeof PROPERTY_TYPE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ubicación</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Departamento</label>
          <select value={department} onChange={e => { setDepartment(e.target.value); setSelectedNeighborhoods([]); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-sm">
            <option value="">— Seleccionar —</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {allNeighborhoods.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Barrios ({selectedNeighborhoods.length} seleccionados)
            </label>
            <div className="flex flex-wrap gap-2">
              {displayedNeighborhoods.map(n => (
                <button key={n} type="button" onClick={() => toggleNeighborhood(n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedNeighborhoods.includes(n)
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {allNeighborhoods.length > 15 && (
              <button type="button" onClick={() => setShowAllNeighborhoods(!showAllNeighborhoods)}
                className="text-xs font-bold text-indigo-600 mt-2 hover:text-indigo-700">
                {showAllNeighborhoods ? 'Ver menos' : `Ver + (${allNeighborhoods.length - 15} más)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Requerimientos</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Dormitorios mín.</label>
            <input name="rooms_min" type="number" min="0" defaultValue={prospect.rooms_min || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños mín.</label>
            <input name="bathrooms_min" type="number" min="0" defaultValue={prospect.bathrooms_min || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cocheras mín.</label>
            <input name="garages_min" type="number" min="0" defaultValue={prospect.garages_min || ''}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Notas</label>
        <textarea name="notes" defaultValue={prospect.notes || ''} rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
          placeholder="Notas adicionales sobre el prospecto..." />
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button type="submit" disabled={isPending}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-[0.97] min-w-[200px]"
        >
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
