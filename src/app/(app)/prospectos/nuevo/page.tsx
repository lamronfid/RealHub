'use client';

import { createProspect } from '@/app/(app)/prospectos/actions';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  PROPERTY_TYPES, PROPERTY_TYPE_LABELS, TRANSACTION_TYPES, CURRENCIES, DEPARTMENTS, CITIES, NEIGHBORHOODS
} from '@/lib/types';
import Link from 'next/link';

export default function NuevoProspecto() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [transactionType, setTransactionType] = useState('compra');
  const [showAllNeighborhoods, setShowAllNeighborhoods] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      const next = prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept];
      // Reset cities and neighborhoods that are no longer in scope
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
      // Reset neighborhoods not in scope
      const validNeighborhoods = next.flatMap(c => NEIGHBORHOODS[c] || []);
      setSelectedNeighborhoods(sn => sn.filter(n => validNeighborhoods.includes(n)));
      return next;
    });
  };

  const toggleNeighborhood = (neighborhood: string) => {
    setSelectedNeighborhoods(prev =>
      prev.includes(neighborhood) ? prev.filter(n => n !== neighborhood) : [...prev, neighborhood]
    );
  };

  // Derived lists
  const availableCities = Array.from(new Set(
    selectedDepartments.flatMap(d => CITIES[d] || [])
  )).sort();

  const availableNeighborhoods = Array.from(new Set(
    (selectedCities.length > 0 ? selectedCities : availableCities).flatMap(c => NEIGHBORHOODS[c] || [])
  )).sort();

  const selectAllNeighborhoods = () => {
    if (selectedNeighborhoods.length === availableNeighborhoods.length) {
      setSelectedNeighborhoods([]);
    } else {
      setSelectedNeighborhoods([...availableNeighborhoods]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Merge custom neighborhood if provided
    const finalNeighborhoods = customNeighborhood.trim()
      ? [...selectedNeighborhoods, customNeighborhood.trim()]
      : selectedNeighborhoods;

    formData.set('property_types', selectedPropertyTypes.join(','));
    formData.set('departments', selectedDepartments.join(','));
    formData.set('cities', selectedCities.join(','));
    formData.set('neighborhoods', finalNeighborhoods.join(','));

    startTransition(async () => {
      try {
        const res = await createProspect(formData);
        if (res?.error) throw new Error(res.error);
        router.push('/prospectos');
      } catch (err: any) {
        setError(err.message || 'Error al crear el prospecto.');
      }
    });
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all";

  const chipActive = "bg-indigo-50 border-indigo-200 text-indigo-700";
  const chipInactive = "bg-white border-slate-200 text-slate-500 hover:bg-slate-50";

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/prospectos" className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h2 className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">Nuevo Prospecto</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-8 shadow-sm">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium">{error}</div>}

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">person</span> Datos Personales
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Nombre Completo *</label>
            <input name="full_name" required className={inputClass} placeholder="Ej: Juan Pérez" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Teléfono</label>
              <input name="phone" type="tel" className={inputClass} placeholder="Ej: +595 981 123 456" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email</label>
              <input name="email" type="email" className={inputClass} placeholder="Ej: juan@email.com" />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Interests */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">search</span> Intereses
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Busca</label>
              <select name="transaction_type" value={transactionType} onChange={e => setTransactionType(e.target.value)} className={inputClass}>
                <option value="compra">Comprar</option>
                <option value="alquiler">Alquilar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moneda</label>
              <select name="currency" className={inputClass}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Presupuesto Mínimo</label>
              <input name="price_min" type="text" className={inputClass} placeholder="Ej: 80.000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Presupuesto Máximo</label>
              <input name="price_max" type="text" className={inputClass} placeholder="Ej: 150.000" />
            </div>
          </div>

          {/* Property Types — multi select */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Tipos de Propiedad</label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(type => (
                <button type="button" key={type} onClick={() => togglePropertyType(type)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                    selectedPropertyTypes.includes(type) ? chipActive : chipInactive
                  }`}
                >
                  {PROPERTY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Location — Multi-select departments, cities, neighborhoods */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">location_on</span> Ubicación
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
                    selectedDepartments.includes(dept) ? chipActive : chipInactive
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
                      selectedCities.includes(city) ? 'bg-violet-50 border-violet-200 text-violet-700' : chipInactive
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
                      selectedNeighborhoods.includes(neighborhood) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : chipInactive
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
                  className={inputClass}
                  placeholder="✏️ Otro barrio no listado (escribir manualmente)..."
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Specific Needs */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">tune</span> Necesidades Específicas
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Habitaciones (Min)</label>
              <input name="rooms_min" type="number" min="0" className={inputClass} placeholder="Ej: 2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Baños (Min)</label>
              <input name="bathrooms_min" type="number" min="0" className={inputClass} placeholder="Ej: 1" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Cocheras (Min)</label>
              <input name="garages_min" type="number" min="0" className={inputClass} placeholder="Ej: 2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Mínimo</label>
              <input name="size_min" type="number" min="0" className={inputClass} placeholder="Ej: 80" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">m² Máximo</label>
              <input name="size_max" type="number" min="0" className={inputClass} placeholder="Ej: 200" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Preferencia de Amueblado</label>
            <select name="furnished_preference" className={inputClass}>
              <option value="">Sin preferencia</option>
              <option value="amoblado">Amoblado</option>
              <option value="semi">Semi-amoblado</option>
              <option value="sin">Sin amueblar</option>
            </select>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100"></div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Notas Adicionales</label>
          <textarea name="notes" rows={4} className={`${inputClass} resize-none`}
            placeholder="Ej: Busca algo con buena iluminación, piso alto, se muda en Diciembre..." />
        </div>

        <button type="submit" disabled={isPending}
          className="w-full bg-indigo-600 text-white font-bold text-sm px-6 py-4 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          {isPending ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Guardando Prospecto...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">save</span>
              Guardar Prospecto
            </>
          )}
        </button>
      </form>
    </div>
  );
}
