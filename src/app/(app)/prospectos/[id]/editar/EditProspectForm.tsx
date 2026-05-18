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
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(prospect.departments || []);
  const [selectedCities, setSelectedCities] = useState<string[]>(prospect.cities || []);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(prospect.neighborhoods || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(prospect.property_types || []);
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);

  const formatPrice = (val: number | null) => {
    if (!val) return '';
    return new Intl.NumberFormat('es-PY').format(val);
  };

  const [priceMin, setPriceMin] = useState(formatPrice(prospect.price_min));
  const [priceMax, setPriceMax] = useState(formatPrice(prospect.price_max));

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const sanitized = e.target.value.replace(/[^0-9]/g, '');
    if (sanitized) {
      setter(new Intl.NumberFormat('es-PY').format(Number(sanitized)));
    } else {
      setter('');
    }
  };


  const availableCities = Array.from(new Set(
    selectedDepartments.flatMap(d => CITIES[d] || [])
  )).sort();

  const availableNeighborhoods = Array.from(new Set(
    (selectedCities.length > 0 ? selectedCities : availableCities).flatMap(c => NEIGHBORHOODS[c] || [])
  )).sort();

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      const next = prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept];
      const validCities = next.flatMap(d => CITIES[d] || []);
      setSelectedCities(sc => sc.filter(c => validCities.includes(c)));
      const validNeighborhoods = validCities.flatMap(c => NEIGHBORHOODS[c] || []);
      setSelectedNeighborhoods(sn => sn.filter(n => validNeighborhoods.includes(n)));
      return next;
    });
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => {
      const next = prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city];
      const validNeighborhoods = next.flatMap(c => NEIGHBORHOODS[c] || []);
      setSelectedNeighborhoods(sn => sn.filter(n => validNeighborhoods.includes(n)));
      return next;
    });
  };

  const toggleNeighborhood = (n: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const selectAllNeighborhoods = () => {
    if (selectedNeighborhoods.length === availableNeighborhoods.length) {
      setSelectedNeighborhoods([]);
    } else {
      setSelectedNeighborhoods([...availableNeighborhoods]);
    }
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const finalNeighborhoods = customNeighborhood.trim()
      ? [...selectedNeighborhoods, customNeighborhood.trim()]
      : selectedNeighborhoods;

    const formData = new FormData(e.currentTarget);
    formData.set('property_types', selectedTypes.join(','));
    formData.set('departments', selectedDepartments.join(','));
    formData.set('cities', selectedCities.join(','));
    formData.set('neighborhoods', finalNeighborhoods.join(','));

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
            <input name="price_min" value={priceMin} onChange={(e) => handlePriceChange(e, setPriceMin)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Máximo</label>
            <input name="price_max" value={priceMax} onChange={(e) => handlePriceChange(e, setPriceMax)}
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
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          Ubicación
        </h3>

        {/* Departments — chip toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Departamentos ({selectedDepartments.length} seleccionados)
          </label>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map(dept => (
              <button type="button" key={dept} onClick={() => toggleDepartment(dept)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                  selectedDepartments.includes(dept) 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Cities — show if departments selected */}
        {availableCities.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Ciudades ({selectedCities.length} seleccionadas)
            </label>
            <div className="flex flex-wrap gap-2">
              {(showAllCities ? availableCities : availableCities.slice(0, 12)).map(city => (
                <button type="button" key={city} onClick={() => toggleCity(city)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                    selectedCities.includes(city) 
                      ? 'bg-violet-50 border-violet-200 text-violet-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {city}
                </button>
              ))}
              {!showAllCities && availableCities.length > 12 && (
                <button type="button" onClick={() => setShowAllCities(true)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  Ver +{availableCities.length - 12} ciudades
                </button>
              )}
            </div>
          </div>
        )}

        {/* Neighborhoods */}
        {availableNeighborhoods.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Barrios ({selectedNeighborhoods.length} seleccionados)
              </label>
              <button type="button" onClick={selectAllNeighborhoods}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                {selectedNeighborhoods.length === availableNeighborhoods.length ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(showAllNeighborhoods ? availableNeighborhoods : availableNeighborhoods.slice(0, 15)).map(neighborhood => (
                <button type="button" key={neighborhood} onClick={() => toggleNeighborhood(neighborhood)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                    selectedNeighborhoods.includes(neighborhood) 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {neighborhood}
                </button>
              ))}
              {!showAllNeighborhoods && availableNeighborhoods.length > 15 && (
                <button type="button" onClick={() => setShowAllNeighborhoods(true)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  Ver +{availableNeighborhoods.length - 15} barrios
                </button>
              )}
            </div>

            {/* Custom neighborhood input */}
            <div className="mt-3">
              <input
                value={customNeighborhood}
                onChange={e => setCustomNeighborhood(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all max-w-sm"
                placeholder="✏️ Otro barrio no listado..."
              />
            </div>
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
