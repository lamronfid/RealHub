'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAcmStore } from '@/store/acm-store';
import LoadingOverlay from '@/components/acm/LoadingOverlay';
import {
  DEPARTMENTS,
  getCities,
  getNeighborhoods,
} from '@/data/paraguay-locations';
import { getAgentId } from '@/lib/agent';
import type {
  AcmOperationType,
  AcmPropertyType,
  AcmPropertyCondition,
  AcmConservacion,
  AcmTipo,
  AcmAmenity,
  AcmCurrency,
  AcmSubjectProperty,
} from '@/types/acm';
import {
  getCostCell,
  getTipo,
  CONSERVACION_LABELS,
  TIPO_LABELS,
} from '@/lib/acm/cost-matrix';
import type { AgentProperty } from '@/types/property';

const AMENITIES: { value: AcmAmenity; label: string }[] = [
  { value: 'piscina',      label: 'Piscina' },
  { value: 'quincho',      label: 'Quincho' },
  { value: 'gimnasio',     label: 'Gimnasio' },
  { value: 'seguridad_24h',label: 'Seguridad 24h' },
  { value: 'ascensor',     label: 'Ascensor' },
  { value: 'jardin',       label: 'Jardín' },
  { value: 'terraza',      label: 'Terraza' },
  { value: 'balcon',       label: 'Balcón' },
];

const USES_COST_MATRIX: AcmPropertyType[] = ['casa', 'duplex', 'local_comercial'];

type FormData = Partial<AcmSubjectProperty>;
type Errors = Partial<Record<keyof AcmSubjectProperty, string>>;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function Select({
  value,
  onChange,
  disabled,
  placeholder,
  children,
  error,
}: {
  value?: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 ${
          error ? 'border-red-400' : 'border-gray-300'
        } [&>option:disabled]:text-gray-500`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <FieldError message={error} />
    </>
  );
}

function fmtDots(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  error,
  noFormat,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  error?: string;
  noFormat?: boolean;
}) {
  const [display, setDisplay] = useState(() =>
    value != null ? (noFormat ? String(value) : fmtDots(value)) : ''
  );
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setDisplay(value != null ? (noFormat ? String(value) : fmtDots(value)) : '');
    }
  }, [value, noFormat]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') { setDisplay(''); onChange(undefined); return; }
    const num = parseInt(raw, 10);
    setDisplay(noFormat ? raw : fmtDots(num));
    onChange(num);
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      <FieldError message={error} />
    </>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      <h2 className="font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

// Cost matrix slider widget (Casa/Duplex/Local only)
function CostMatrixWidget({
  conservacion,
  tipo,
  onConservacionChange,
  onTipoChange,
  costPerSqm,
  onCostChange,
  sqmBuilt,
}: {
  conservacion?: AcmConservacion;
  tipo?: AcmTipo;
  onConservacionChange: (v: AcmConservacion) => void;
  onTipoChange: (v: AcmTipo) => void;
  costPerSqm?: number;
  onCostChange: (v: number) => void;
  sqmBuilt?: number;
}) {
  const cell = conservacion && tipo ? getCostCell(conservacion, tipo) : undefined;
  const effectiveCost = costPerSqm ?? cell?.mid;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
        Costo estimado de construcción
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Conservación</Label>
          <select
            value={conservacion ?? ''}
            onChange={(e) => onConservacionChange(e.target.value as AcmConservacion)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Seleccioná</option>
            {(Object.keys(CONSERVACION_LABELS) as AcmConservacion[]).map((k) => (
              <option key={k} value={k}>{CONSERVACION_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Tipo / Antigüedad</Label>
          <select
            value={tipo ?? ''}
            onChange={(e) => onTipoChange(e.target.value as AcmTipo)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Seleccioná</option>
            {(Object.keys(TIPO_LABELS) as AcmTipo[]).map((k) => (
              <option key={k} value={k}>{TIPO_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {cell && effectiveCost !== undefined ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">
              USD {fmtDots(effectiveCost)}<span className="text-sm font-normal text-gray-500">/m²</span>
            </span>
            {sqmBuilt && (
              <span className="text-sm text-gray-500">
                {sqmBuilt} m² → <span className="font-semibold text-gray-700">USD {fmtDots(effectiveCost * sqmBuilt)}</span>
              </span>
            )}
          </div>
          <input
            type="range"
            min={cell.min}
            max={cell.max}
            step={1}
            value={effectiveCost}
            onChange={(e) => onCostChange(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>USD {cell.min}</span>
            <span>USD {cell.max}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          Seleccioná conservación y tipo para ver el rango de costo.
        </p>
      )}
    </div>
  );
}

// Fix #10 — terrenos don't have bedrooms; skip that validation.
const TYPES_WITH_BEDROOMS: AcmPropertyType[] = ['casa', 'departamento', 'duplex', 'local_comercial'];

function validate(form: FormData): Errors {
  const e: Errors = {};
  if (!form.operationType)  e.operationType  = 'Requerido';
  if (!form.propertyType)   e.propertyType   = 'Requerido';
  if (!form.propertyCondition) e.propertyCondition = 'Requerido';
  if (!form.department)     e.department     = 'Requerido';
  if (!form.city)           e.city           = 'Requerido';
  if (!form.neighborhood)   e.neighborhood   = 'Requerido';
  if (!form.priceTarget || form.priceTarget <= 0) e.priceTarget = 'Debe ser mayor a 0';
  if (!form.sqmTotal || form.sqmTotal <= 0) e.sqmTotal = 'Debe ser mayor a 0';
  if (form.propertyType && TYPES_WITH_BEDROOMS.includes(form.propertyType) && form.bedrooms === undefined) {
    e.bedrooms = 'Requerido';
  }
  return e;
}

function propertyToFormData(p: AgentProperty): FormData {
  const ACM_AMENITY_KEYS = new Set<AcmAmenity>([
    'piscina', 'quincho', 'gimnasio', 'seguridad_24h',
    'ascensor', 'jardin', 'terraza', 'balcon',
  ]);
  const amenities = (p.amenities ?? []).filter((a): a is AcmAmenity =>
    ACM_AMENITY_KEYS.has(a as AcmAmenity)
  );
  const yearBuilt = p.yearBuilt;
  return {
    operationType:     p.operationType as AcmOperationType,
    propertyType:      p.propertyType as AcmPropertyType,
    propertyCondition: p.propertyCondition as AcmPropertyCondition | undefined,
    department:        p.department,
    city:              p.city,
    neighborhood:      p.neighborhood,
    priceTarget:       p.price,
    currency:          (p.currency === 'GS' ? 'GS' : 'USD') as AcmCurrency,
    sqmTotal:          p.sqmTotal,
    sqmBuilt:          p.sqmBuilt,
    bedrooms:          p.bedrooms,
    garages:           p.garages,
    yearBuilt,
    // Auto-detect tipo from yearBuilt if available
    tipo:              yearBuilt ? getTipo(yearBuilt) : undefined,
    amenities,
  };
}

export default function NuevoAcmPage() {
  const router = useRouter();
  const { subjectProperty, setSubjectProperty, setComparables, setIsSearching, setSearchError } =
    useAcmStore();

  const [form, setForm] = useState<FormData>(subjectProperty);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const [myProperties, setMyProperties] = useState<AgentProperty[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    fetch('/api/agent-properties')
      .then((r) => r.json())
      .then((d) => setMyProperties(d.properties ?? []))
      .catch(() => {});
  }, []);

  // Auto-derive tipo when yearBuilt changes, unless agent has manually set tipo
  const prevYearBuilt = useRef(form.yearBuilt);
  useEffect(() => {
    if (form.yearBuilt !== prevYearBuilt.current) {
      prevYearBuilt.current = form.yearBuilt;
      if (form.yearBuilt) {
        setForm((prev) => ({ ...prev, tipo: getTipo(form.yearBuilt!) }));
      }
    }
  }, [form.yearBuilt]);

  function selectMyProperty(p: AgentProperty) {
    setForm(propertyToFormData(p));
    setErrors({});
    setPickerOpen(false);
  }

  const set = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const cities = form.department ? getCities(form.department) : [];
  const neighborhoods = form.department && form.city
    ? getNeighborhoods(form.department, form.city)
    : [];

  const toggleAmenity = (a: AcmAmenity) => {
    const current = form.amenities ?? [];
    set('amenities', current.includes(a) ? current.filter((x) => x !== a) : [...current, a]);
  };

  const showCostMatrix = form.propertyType
    ? USES_COST_MATRIX.includes(form.propertyType)
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setIsSearching(true);
    setSubjectProperty(form);

    // Fix #13 — abort after 130 s so the spinner doesn't spin forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 130_000);

    try {
      const res = await fetch('/api/acm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Fix #1 — use getAgentId() instead of hardcoded string.
        body: JSON.stringify({ subject: form, agentId: getAgentId() }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Error al buscar comparables');

      const data = await res.json();
      setComparables(data.comparables);
      setSearchError(null);
      router.push('/acm/comparables');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSearchError('La búsqueda tardó demasiado. Intentá de nuevo.');
      } else {
        setSearchError('No se pudo completar la búsqueda. Intentá de nuevo.');
      }
      console.error(err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setIsSearching(false);
    }
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Análisis ACM</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ingresá los datos de tu propiedad para encontrar comparables
          </p>
        </div>
        {myProperties.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
            >
              <span className="text-base leading-none">🏠</span>
              Mis propiedades
              <span className="text-gray-400">{pickerOpen ? '▲' : '▼'}</span>
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
                  <p className="text-xs text-gray-400 px-3 pt-3 pb-1 font-medium uppercase tracking-wide">
                    Seleccioná una propiedad
                  </p>
                  {myProperties.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectMyProperty(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-t border-gray-100 first:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.propertyType} · {p.city}
                        {p.neighborhood ? `, ${p.neighborhood}` : ''}
                        {' · '}
                        {p.currency === 'GS'
                          ? `Gs. ${p.price.toLocaleString('es-PY')}`
                          : `USD ${p.price.toLocaleString('es-PY')}`}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección 1 — Tipo de propiedad */}
        <div className="bg-white rounded-xl border p-6">
          <SectionHeader number={1} title="Tipo de propiedad" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label required>Tipo de operación</Label>
              <Select
                value={form.operationType}
                onChange={(v) => set('operationType', v as AcmOperationType)}
                placeholder="Seleccioná"
                error={errors.operationType}
              >
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </Select>
            </div>
            <div>
              <Label required>Tipo de propiedad</Label>
              <Select
                value={form.propertyType}
                onChange={(v) => {
                  set('propertyType', v as AcmPropertyType);
                  if (!USES_COST_MATRIX.includes(v as AcmPropertyType)) {
                    set('conservacion', undefined);
                    set('tipo', undefined);
                    set('costPerSqm', undefined);
                  }
                }}
                placeholder="Seleccioná"
                error={errors.propertyType}
              >
                <option value="casa">Casa</option>
                <option value="departamento">Departamento</option>
                <option value="duplex">Dúplex</option>
                <option value="terreno">Terreno</option>
                <option value="local_comercial">Local comercial</option>
              </Select>
            </div>
            <div>
              <Label required>Estado de la propiedad</Label>
              <Select
                value={form.propertyCondition}
                onChange={(v) => set('propertyCondition', v as AcmPropertyCondition)}
                placeholder="Seleccioná"
                error={errors.propertyCondition}
              >
                <option value="en_pozo">En pozo</option>
                <option value="en_construccion">En construcción</option>
                <option value="terminado">Terminado</option>
                <option value="usado">Usado</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Sección 2 — Ubicación */}
        <div className="bg-white rounded-xl border p-6">
          <SectionHeader number={2} title="Ubicación" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label required>Departamento</Label>
              <Select
                value={form.department}
                onChange={(v) => {
                  set('department', v);
                  set('city', undefined);
                  set('neighborhood', undefined);
                }}
                placeholder="Seleccioná"
                error={errors.department}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>Ciudad</Label>
              <Select
                value={form.city}
                onChange={(v) => {
                  set('city', v);
                  set('neighborhood', undefined);
                }}
                disabled={!form.department}
                placeholder={form.department ? 'Seleccioná' : 'Primero elegí departamento'}
                error={errors.city}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>Barrio</Label>
              <Select
                value={form.neighborhood}
                onChange={(v) => set('neighborhood', v)}
                disabled={!form.city}
                placeholder={form.city ? 'Seleccioná' : 'Primero elegí ciudad'}
                error={errors.neighborhood}
              >
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Sección 3 — Características */}
        <div className="bg-white rounded-xl border p-6">
          <SectionHeader number={3} title="Características" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Price */}
            <div className="md:col-span-2 lg:col-span-1">
              <Label required>Precio objetivo</Label>
              <div className="flex gap-2">
                <select
                  value={form.currency ?? 'USD'}
                  onChange={(e) => set('currency', e.target.value as AcmCurrency)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                >
                  <option value="USD">USD</option>
                  <option value="GS">Gs.</option>
                </select>
                <div className="flex-1">
                  <NumberInput
                    value={form.priceTarget}
                    onChange={(v) => set('priceTarget', v)}
                    placeholder="120.000"
                    min={1}
                    error={errors.priceTarget}
                  />
                </div>
              </div>
            </div>

            {/* sqmTotal */}
            <div>
              <Label required>m² totales</Label>
              <NumberInput
                value={form.sqmTotal}
                onChange={(v) => set('sqmTotal', v)}
                placeholder="85"
                min={1}
                error={errors.sqmTotal}
              />
            </div>

            {/* sqmBuilt */}
            <div>
              <Label>m² construidos</Label>
              <NumberInput
                value={form.sqmBuilt}
                onChange={(v) => set('sqmBuilt', v)}
                placeholder="70"
              />
            </div>

            {/* Bedrooms — hidden for terreno (#10) */}
            {form.propertyType !== 'terreno' && (
              <div>
                <Label required={form.propertyType ? TYPES_WITH_BEDROOMS.includes(form.propertyType) : true}>
                  Dormitorios
                </Label>
                <Select
                  value={form.bedrooms}
                  onChange={(v) => set('bedrooms', Number(v))}
                  placeholder="Seleccioná"
                  error={errors.bedrooms}
                >
                  <option value={0}>0 (monoambiente)</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5+</option>
                </Select>
              </div>
            )}

            {/* Garages */}
            <div>
              <Label>Garages</Label>
              <Select
                value={form.garages}
                onChange={(v) => set('garages', Number(v))}
                placeholder="Seleccioná"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3+</option>
              </Select>
            </div>

            {/* Year built */}
            <div>
              <Label>Año de construcción</Label>
              <NumberInput
                value={form.yearBuilt}
                onChange={(v) => set('yearBuilt', v)}
                placeholder="2018"
                min={1900}
                noFormat
              />
            </div>

            {/* Antigüedad — bidirectional with yearBuilt */}
            <div>
              <Label>Antigüedad (años)</Label>
              <NumberInput
                value={form.yearBuilt ? new Date().getFullYear() - form.yearBuilt : undefined}
                onChange={(v) => {
                  if (v !== undefined) set('yearBuilt', new Date().getFullYear() - v);
                  else set('yearBuilt', undefined);
                }}
                placeholder="ej. 10"
                min={0}
                noFormat
              />
              {form.yearBuilt && (
                <p className="text-xs text-gray-400 mt-1">Construido en {form.yearBuilt}</p>
              )}
            </div>
          </div>

          {/* Cost matrix widget — only for casa/duplex/local */}
          {showCostMatrix && (
            <div className="mt-5">
              <CostMatrixWidget
                conservacion={form.conservacion}
                tipo={form.tipo}
                onConservacionChange={(v) => {
                  set('conservacion', v);
                  set('costPerSqm', undefined); // reset slider to new midpoint
                }}
                onTipoChange={(v) => {
                  set('tipo', v);
                  set('costPerSqm', undefined);
                }}
                costPerSqm={form.costPerSqm}
                onCostChange={(v) => set('costPerSqm', v)}
                sqmBuilt={form.sqmBuilt}
              />
            </div>
          )}

          {/* Amenities */}
          <div className="mt-5">
            <Label>Amenidades</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {AMENITIES.map(({ value, label }) => {
                const active = (form.amenities ?? []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleAmenity(value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-5">
            <Label>Notas adicionales</Label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Información adicional relevante para el análisis..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{(form.notes ?? '').length}/500</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setForm({})}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Limpiar formulario
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generar ACM →
          </button>
        </div>
      </form>
    </>
  );
}
