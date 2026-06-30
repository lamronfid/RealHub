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
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
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
        className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-white/70 backdrop-blur-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50/50 disabled:text-slate-400 transition-all shadow-xs ${
          error ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-550' : 'border-slate-200/80 hover:border-slate-300'
        } [&>option:disabled]:text-slate-500`}
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
        className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-805 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white/70 backdrop-blur-xs transition-all shadow-xs ${
          error ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-550' : 'border-slate-200/80 hover:border-slate-300'
        }`}
      />
      <FieldError message={error} />
    </>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 font-sans">
      <span className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-wider font-heading">
        Paso {number}
      </span>
      <span className="text-slate-300 font-light">|</span>
      <h2 className="font-extrabold text-slate-900 text-sm md:text-base tracking-tight font-heading">{title}</h2>
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
    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-5 space-y-4">
      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">
        Costo estimado de construcción
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Conservación</Label>
          <select
            value={conservacion ?? ''}
            onChange={(e) => onConservacionChange(e.target.value as AcmConservacion)}
            className="w-full bg-white/80 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition-all shadow-xs"
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
            className="w-full bg-white/80 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition-all shadow-xs"
          >
            <option value="" disabled>Seleccioná</option>
            {(Object.keys(TIPO_LABELS) as AcmTipo[]).map((k) => (
              <option key={k} value={k}>{TIPO_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {cell && effectiveCost !== undefined ? (
        <div className="space-y-3.5 pt-1.5">
          <div className="flex items-baseline justify-between font-sans">
            <span className="text-xl font-black text-slate-900">
              USD {fmtDots(effectiveCost)}<span className="text-xs font-bold text-slate-400">/m²</span>
            </span>
            {sqmBuilt && (
              <span className="text-xs text-slate-500 font-medium">
                {sqmBuilt} m² → <span className="font-bold text-slate-800">USD {fmtDots(effectiveCost * sqmBuilt)}</span>
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
            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer transition-all"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Mín. USD {cell.min}</span>
            <span>Máx. USD {cell.max}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 font-semibold leading-relaxed">
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
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/85 hover:border-indigo-400 hover:text-indigo-655 transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <span className="text-base leading-none">🏠</span>
              Mis propiedades
              <span className="text-slate-405">{pickerOpen ? '▲' : '▼'}</span>
            </button>

            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-premium z-20 max-h-80 overflow-y-auto animate-fade-in">
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
        <div className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
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
        <div className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
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
        <div className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
          <SectionHeader number={3} title="Características" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Price */}
            <div className="md:col-span-2 lg:col-span-1">
              <Label required>Precio objetivo</Label>
              <div className="flex gap-2">
                <select
                  value={form.currency ?? 'USD'}
                  onChange={(e) => set('currency', e.target.value as AcmCurrency)}
                  className="border border-slate-200/80 hover:border-slate-350 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white/70 backdrop-blur-xs rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none transition-all shadow-xs w-24"
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? 'border-indigo-550 bg-indigo-500/10 text-indigo-750 shadow-xs border-indigo-500/20'
                        : 'border-slate-200 bg-white/70 backdrop-blur-xs text-slate-600 hover:border-slate-300 hover:bg-white'
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
              className="w-full border border-slate-200/80 bg-white/70 backdrop-blur-xs rounded-xl px-4 py-3 text-xs font-semibold text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-xs"
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
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[0.99] active:scale-[0.97]"
          >
            Generar ACM →
          </button>
        </div>
      </form>
    </>
  );
}
