'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSubscriptionState } from '@/lib/subscription';
import { DEPARTMENTS, getCities, getNeighborhoods } from '@/data/paraguay-locations';
import Link from 'next/link';
import { useScraperStore } from '@/store/scraper-store';

// =============================================================================
// ─── TYPES & CONSTANTS ───────────────────────────────────────────────────────
// =============================================================================

const PS_SOURCES = [
  'infocasas.com.py',
  'brokers.com.py',
  'century21.com.py',
  'view.com.py',
  'remax.com.py',
  'asuncion.estate',
  'mersan.com.py',
];

const SOURCE_LABELS: Record<string, string> = {
  'infocasas.com.py':          'InfoCasas',
  'brokers.com.py':            'Brokers',
  'century21.com.py':          'Century21',
  'view.com.py':               'View',
  'remax.com.py':              'RE/MAX',
  'asuncion.estate':           'Asunción.estate',
  'mersan.com.py':             'Mersan',
};

const PS_PROP_GROUPS: Record<string, string[]> = {
  Residencial: ['Casa', 'Departamento', 'Dúplex', 'Quinta/Country'],
  Comercial:   ['Edificio', 'Local comercial', 'Oficina', 'Depósito/Tinglado', 'Industria', 'Alojamiento'],
  Terrenos:    ['Terreno/Lote', 'Estancia/Campo'],
};

const TYPE_AREA_CONFIG: Record<string, { construido?: boolean; terreno?: boolean; isEstancia?: boolean }> = {
  'Casa':              { construido: true, terreno: true },
  'Departamento':      { construido: true },
  'Dúplex':            { construido: true, terreno: true },
  'Quinta/Country':    { construido: true, terreno: true },
  'Edificio':          { construido: true },
  'Local comercial':   { construido: true },
  'Oficina':           { construido: true },
  'Depósito/Tinglado': { construido: true },
  'Industria':         { construido: true },
  'Alojamiento':       { construido: true },
  'Terreno/Lote':      { terreno: true },
  'Estancia/Campo':    { terreno: true, isEstancia: true },
};

interface FlaskResult {
  source: string;
  title: string;
  price: string;
  location: string;
  url: string;
  photo?: string;
  bedrooms?: number | null;
  metros?: number | null;
}

interface SavedSearch {
  id: string;
  name: string;
  savedAt: string;
  filters: {
    operation: string;
    propType: string;
    propTypes?: string[];
    estadoObra?: string[];
    m2ConstruidoMin?: number;
    m2ConstruidoMax?: number;
    m2TerrenoMin?: number;
    m2TerrenoMax?: number;
    department: string;
    city: string;
    neighborhoods: string[];
    priceCurrency: string;
    priceMin: number | undefined;
    priceMax: number | undefined;
    bedrooms: string | string[];
    bathrooms?: string;
    resultsPerSite: number;
    sources: string[];
  };
  results: FlaskResult[];
}

type SortOrder = 'none' | 'asc' | 'desc';
type PsCurrency = 'USD' | 'PYG';

interface RateInfo {
  rate: number;
  is_cached: boolean;
  cached_at: string | null;
}

// =============================================================================
// ─── HELPERS ─────────────────────────────────────────────────────────────────
// =============================================================================

function formatRateDate(cachedAt: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (cachedAt === today) return 'actualizado hoy';
  const d = new Date(cachedAt + 'T12:00:00');
  return 'actualizado el ' + d.toLocaleDateString('es-PY', { day: 'numeric', month: 'long' });
}

function useExchangeRate() {
  const [info, setInfo] = useState<RateInfo | null>(null);
  const [rateError, setRateError] = useState(false);

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d: RateInfo) => { if (d.rate) setInfo(d); else setRateError(true); })
      .catch(() => setRateError(true));
  }, []);

  const rate = info?.rate ?? 7500;
  function toUSD(pyg: number) { return pyg / rate; }
  function toPYG(usd: number) { return usd * rate; }

  return { rate, info, rateError, toUSD, toPYG };
}

function formatPriceDisplay(raw: number | undefined, currency: PsCurrency): string {
  if (raw === undefined || raw === 0) return '';
  const sep = currency === 'USD' ? ',' : '.';
  return raw.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

function stripFormatting(str: string): string {
  return str.replace(/[^0-9]/g, '');
}

function parsePriceNumber(price: string): number {
  if (!price || price === 'Consultar') return Infinity;
  const cleaned = price.replace(/[^0-9.,]/g, '').replace(/^[.,]+/, '');
  if (!cleaned) return Infinity;
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts.slice(1).every((p) => p.length === 3)) {
      return parseInt(cleaned.replace(/\./g, ''), 10) || Infinity;
    }
    return parseFloat(cleaned) || Infinity;
  }
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseInt(cleaned.replace(/,/g, ''), 10) || Infinity;
  }
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastDot > lastComma) return parseFloat(cleaned.replace(/,/g, '')) || Infinity;
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || Infinity;
  }
  return parseFloat(cleaned) || Infinity;
}

function parsePriceToUSD(price: string, rate: number): number {
  if (!price || price === 'Consultar') return Infinity;
  const num = parsePriceNumber(price);
  if (num === Infinity || num === 0) return Infinity;
  const upper = price.trim().toUpperCase();

  if (upper.includes('GS.') || upper.includes('₲') || upper.includes('G.') || upper.includes('PYG'))
    return num / rate;
  if (upper.includes('USD') || upper.includes('U$S') || upper.includes('U$D') || upper.includes('US$'))
    return num;

  return num > 1000000 ? num / rate : num;
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const CHECK_ICON = (
  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.854 3.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L6.5 10.293l6.646-6.647a.5.5 0 01.708 0z" />
  </svg>
);

// =============================================================================
// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
// =============================================================================

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const USD_COMPRA_PRESETS  = [50000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000];
const USD_ALQUILER_PRESETS = [300, 500, 700, 1000, 1500, 2000, 3000, 5000];
const PYG_COMPRA_PRESETS  = [50000000, 100000000, 200000000, 350000000, 500000000, 750000000, 1000000000, 2000000000];
const PYG_ALQUILER_PRESETS = [1500000, 2500000, 4000000, 5000000, 7000000, 10000000, 15000000, 20000000];

const M2_CONSTRUIDO_PRESETS = [30, 50, 70, 100, 150, 200, 300, 500];
const M2_TERRENO_PRESETS    = [100, 200, 300, 500, 800, 1000, 2000, 5000];
const ESTANCIA_HA_PRESETS   = [1, 5, 10, 25, 50, 100, 250, 500];

function PriceCombobox({
  value,
  onChange,
  currency,
  operation,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  currency: PsCurrency;
  operation: string;
  placeholder: string;
}) {
  const [display, setDisplay] = useState(formatPriceDisplay(value, currency));
  const [open, setOpen] = useState(false);
  const isAlquiler = operation === 'Alquiler';
  const presets = currency === 'USD'
    ? (isAlquiler ? USD_ALQUILER_PRESETS : USD_COMPRA_PRESETS)
    : (isAlquiler ? PYG_ALQUILER_PRESETS : PYG_COMPRA_PRESETS);
  const sep = currency === 'USD' ? ',' : '.';

  useEffect(() => {
    setDisplay(formatPriceDisplay(value, currency));
  }, [value, currency]);

  const rawTyped = stripFormatting(display);
  const filtered = rawTyped
    ? presets.filter((p) => String(p).startsWith(rawTyped))
    : presets;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = stripFormatting(e.target.value);
    if (raw === '') {
      setDisplay('');
      onChange(undefined);
      return;
    }
    const num = parseInt(raw, 10);
    const formatted = num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    setDisplay(formatted);
    onChange(num);
    setOpen(true);
  }

  function handlePreset(p: number) {
    const formatted = p.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    setDisplay(formatted);
    onChange(p);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-100 rounded-xl shadow-lg w-full overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <li key={p}>
              <button
                type="button"
                onMouseDown={() => handlePreset(p)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {currency === 'USD' ? '$' : 'Gs.'}{' '}
                {p.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, sep)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function M2Combobox({
  value, onChange, presets, placeholder, unit = 'm²',
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  presets: number[];
  placeholder: string;
  unit?: string;
}) {
  const [display, setDisplay] = useState(value !== undefined ? String(value) : '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDisplay(value !== undefined ? String(value) : '');
  }, [value]);

  const rawTyped = display.replace(/[^0-9]/g, '');
  const filtered = rawTyped ? presets.filter((p) => String(p).startsWith(rawTyped)) : presets;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplay(raw);
    onChange(raw ? parseInt(raw, 10) : undefined);
    setOpen(true);
  }

  function handlePreset(p: number) {
    setDisplay(String(p));
    onChange(p);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-100 rounded-xl shadow-lg w-full overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <li key={p}>
              <button
                type="button"
                onMouseDown={() => handlePreset(p)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {p.toLocaleString('es-PY')} {unit}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourcesDropdown({
  sources,
  setSources,
}: {
  sources: string[];
  setSources: (s: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const allChecked = sources.length === PS_SOURCES.length;
  const someChecked = sources.length > 0 && !allChecked;

  const toggle = (src: string) =>
    setSources(sources.includes(src) ? sources.filter((s) => s !== src) : [...sources, src]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none transition-all flex items-center justify-between whitespace-nowrap gap-2 min-h-[38px]"
      >
        <span>
          Fuentes{' '}
          <span className="font-semibold text-indigo-600">
            ({sources.length}/{PS_SOURCES.length})
          </span>
        </span>
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-white border border-slate-100 rounded-2xl shadow-xl p-3 min-w-[220px]">
            <label className="flex items-center gap-2.5 px-2 py-1.5 mb-1.5 border-b border-slate-100 cursor-pointer font-sans">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={() => setSources(allChecked ? [] : [...PS_SOURCES])}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <span className="text-xs font-bold text-slate-800">Seleccionar todo</span>
            </label>
            {PS_SOURCES.map((src) => (
              <label key={src} className="flex items-center gap-2.5 px-2 py-1.5 cursor-pointer hover:bg-slate-50 rounded-lg font-sans">
                <input
                  type="checkbox"
                  checked={sources.includes(src)}
                  onChange={() => toggle(src)}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-xs text-slate-600 font-semibold">{SOURCE_LABELS[src] ?? src}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PropResultCard({
  result: r,
  liked,
  onToggleLike,
}: {
  result: FlaskResult;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const href = r.url?.startsWith('http') ? r.url : `https://${r.source}${r.url ?? ''}`;

  const bedsLabel  = r.bedrooms != null ? `${r.bedrooms} dorm.` : '—';
  const metrosLabel = r.metros   != null ? `${Math.round(r.metros)} m²` : '—';

  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-lg transition-all flex flex-col font-sans">
      <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
        {r.photo && !imgFailed ? (
          <img
            src={r.photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <span className="material-symbols-outlined text-slate-300 text-3xl">travel_explore</span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleLike(); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors"
          title={liked ? 'Quitar de guardados' : 'Guardar propiedad'}
        >
          <svg className={`w-4.5 h-4.5 transition-colors ${liked ? 'fill-rose-500 stroke-rose-500 text-rose-500' : 'fill-none stroke-slate-500 text-slate-500'}`} viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <span className="self-start text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
          {SOURCE_LABELS[r.source] ?? r.source}
        </span>
        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">{r.title}</p>
        <p className="text-sm font-black text-indigo-600 leading-none">{r.price}</p>
        {r.location && (
          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 leading-none">
            <span className="material-symbols-outlined text-xs leading-none shrink-0 text-slate-300">location_on</span>
            <span className="truncate">{r.location}</span>
          </p>
        )}
        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2 mt-0.5 leading-none">
          <span className="flex items-center gap-0.5">🛏️ {bedsLabel}</span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-0.5">📐 {metrosLabel}</span>
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors border-t border-slate-100"
        >
          Ver propiedad →
        </a>
      </div>
    </div>
  );
}

function BarrioMultiSelect({
  options,
  selected,
  onChange,
  disabled,
  city,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  city?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [liveOptions, setLiveOptions] = useState<{ name: string; count?: number }[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!city || city !== 'Asunción') {
      setLiveOptions([]);
      return;
    }
    setLiveLoading(true);
    fetch(`/api/locations?city=${encodeURIComponent(city)}&q=asun`)
      .then((r) => r.json())
      .then((data: Array<{ name: string; count: number }>) => {
        setLiveOptions(data.map((d) => ({ name: d.name, count: d.count })));
      })
      .catch(() => setLiveOptions([]))
      .finally(() => setLiveLoading(false));
  }, [city]);

  const allOptions: { name: string; count?: number }[] = city === 'Asunción' && liveOptions.length > 0
    ? liveOptions
    : options.map((o) => ({ name: o }));

  const filtered = allOptions.filter(
    (o) => !selected.includes(o.name) && o.name.toLowerCase().includes(query.toLowerCase()),
  );

  function add(barrio: string) {
    onChange([...selected, barrio]);
    setQuery('');
    inputRef.current?.focus();
  }

  function remove(barrio: string) {
    onChange(selected.filter((b) => b !== barrio));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
    if (e.key === 'Escape') setOpen(false);
  }

  const placeholderText = disabled
    ? 'Elegí ciudad primero'
    : liveLoading
      ? 'Cargando barrios...'
      : selected.length === 0
        ? 'Cualquier barrio'
        : '';

  return (
    <div className="relative font-sans">
      <div
        className={`flex flex-wrap gap-1.5 min-h-[38px] border rounded-xl px-2.5 py-1.5 bg-white/70 backdrop-blur-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-xs ${disabled ? 'border-slate-100/50 cursor-not-allowed opacity-50' : 'border-slate-200/80 cursor-text'}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {selected.map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-750 text-[10px] px-2.5 py-0.5 rounded-full font-bold my-0.5 shadow-3xs animate-fade-in">
            {b}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(b); }}
              className="ml-0.5 hover:text-indigo-950 font-black text-sm leading-none"
              tabIndex={-1}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholderText}
          className="flex-1 min-w-[80px] outline-none text-xs text-slate-800 bg-transparent placeholder-slate-400 py-0.5 font-semibold"
        />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute left-0 top-full mt-1.5 z-30 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-premium max-h-48 overflow-y-auto w-full overflow-hidden animate-fade-in">
          {filtered.map((b) => (
            <li key={b.name}>
              <button
                type="button"
                onMouseDown={() => add(b.name)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-650 font-semibold hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between"
              >
                <span>{b.name}</span>
                {b.count !== undefined && (
                  <span className="text-[10px] text-slate-400 font-bold ml-2">{b.count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  items,
  selected,
  onChange,
  searchable = false,
}: {
  label: string;
  items: { value: string; count: number }[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCount = selected.length;
  const allSelected = activeCount === 0;

  const visible = search
    ? items.filter((i) => i.value.toLowerCase().includes(search.toLowerCase()))
    : items;

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  }

  useEffect(() => {
    if (open && searchable && inputRef.current) inputRef.current.focus();
  }, [open, searchable]);

  return (
    <div className="relative font-sans">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
          activeCount > 0
            ? 'border-indigo-550 bg-indigo-500/10 text-indigo-705'
            : 'border-slate-205 bg-white/70 backdrop-blur-xs text-slate-600 hover:border-slate-305 hover:bg-white'
        }`}
      >
        {label}
        {activeCount > 0 && (
          <span className="bg-indigo-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute left-0 top-full mt-1.5 z-30 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-premium min-w-[220px] max-w-[280px] overflow-hidden animate-fade-in">
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>
            )}
            <div className="p-1.5 max-h-64 overflow-y-auto">
              {!search && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    allSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center transition-colors ${allSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                    {allSelected && CHECK_ICON}
                  </span>
                  <span className="flex-1 text-left font-semibold">Todos</span>
                </button>
              )}
              {visible.map((item) => {
                const checked = selected.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggle(item.value)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      checked ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center transition-colors ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                      {checked && CHECK_ICON}
                    </span>
                    <span className="flex-1 text-left truncate font-semibold">{item.value}</span>
                    <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">{item.count}</span>
                  </button>
                );
              })}
              {visible.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Sin resultados</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PropTypeMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(t: string) {
    onChange(selected.includes(t) ? selected.filter((s) => s !== t) : [...selected, t]);
  }

  const label = selected.length === 0
    ? 'Cualquier tipo'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} tipos`;

  return (
    <div className="relative font-sans">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between border rounded-xl px-3 py-2.5 text-xs font-semibold bg-white/70 backdrop-blur-xs text-slate-805 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none min-h-[38px] transition-all shadow-xs ${
          selected.length > 0 ? 'border-indigo-450 bg-indigo-500/10 text-indigo-705' : 'border-slate-200/80'
        }`}
      >
        <span className="truncate">{label}</span>
        <svg className={`w-3.5 h-3.5 ml-1.5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-15" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-25 bg-white/95 backdrop-blur-md border border-slate-150 rounded-2xl shadow-premium min-w-[220px] py-2 overflow-hidden animate-fade-in">
            {Object.entries(PS_PROP_GROUPS).map(([group, types]) => (
              <div key={group}>
                <p className="px-3 pt-2 pb-0.5 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{group}</p>
                {types.map((t) => {
                  const checked = selected.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggle(t)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors ${
                        checked ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center transition-colors ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                        {checked && CHECK_ICON}
                      </span>
                      <span className="font-semibold">{t}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            {selected.length > 0 && (
              <div className="border-t border-slate-100 mt-1.5 pt-1 px-3 pb-1">
                <button
                  type="button"
                  onClick={() => { onChange([]); setOpen(false); }}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors"
                >
                  × Limpiar selección
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {selected.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1 mt-1.5">
          {selected.map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {t}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(t); }}
                className="ml-0.5 hover:text-indigo-950 font-black leading-none"
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const BEDROOM_OPTIONS = [
  { value: '0',  label: 'Mono' },
  { value: '1',  label: '1' },
  { value: '2',  label: '2' },
  { value: '3',  label: '3' },
  { value: '4',  label: '4' },
  { value: '5+', label: '5+' },
];

function BedroomsMultiSelect({
  selected, onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  }
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {BEDROOM_OPTIONS.map(({ value, label }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              active
                ? 'border-indigo-550 bg-indigo-500/10 text-indigo-705 shadow-xs'
                : 'border-slate-200 bg-white/70 backdrop-blur-xs text-slate-605 hover:border-slate-300 hover:bg-white'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const _psCache = {
  form: { operation: 'Compra', department: '', city: '', resultsPerSite: 15 },
  selectedBarrios: [],
  selectedBedrooms: [],
  selectedPropTypes: [],
  estadoObra: [],
  m2ConstruidoMin: undefined,
  m2ConstruidoMax: undefined,
  m2TerrenoMin: undefined,
  m2TerrenoMax: undefined,
  priceCurrency: 'USD' as PsCurrency,
  priceMin: undefined,
  priceMax: undefined,
  sources: PS_SOURCES,
  results: [],
  searched: false,
  sort: 'asc' as SortOrder,
  dispBarrios: [],
  dispSources: [],
  showLiked: false,
  currentPage: 0,
};

// =============================================================================
// ─── TAB 1: BULK PORTAL SCRAPER ──────────────────────────────────────────────
// =============================================================================

function BulkScraperTab({ incrementSearch }: { incrementSearch: () => void }) {
  const { rate, info: rateInfo, rateError, toUSD, toPYG } = useExchangeRate();

  const [selectedBarrios, setSelectedBarrios] = useState<string[]>(_psCache.selectedBarrios);
  const [form, setForm] = useState(_psCache.form);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>(_psCache.selectedBedrooms);
  const [selectedPropTypes, setSelectedPropTypes] = useState<string[]>(_psCache.selectedPropTypes);
  const [estadoObra, setEstadoObra] = useState<string[]>(_psCache.estadoObra);
  const [m2ConstruidoMin, setM2ConstruidoMin] = useState<number | undefined>(_psCache.m2ConstruidoMin);
  const [m2ConstruidoMax, setM2ConstruidoMax] = useState<number | undefined>(_psCache.m2ConstruidoMax);
  const [m2TerrenoMin, setM2TerrenoMin] = useState<number | undefined>(_psCache.m2TerrenoMin);
  const [m2TerrenoMax, setM2TerrenoMax] = useState<number | undefined>(_psCache.m2TerrenoMax);

  const [priceCurrency, setPriceCurrency] = useState<PsCurrency>(_psCache.priceCurrency);
  const [priceMin, setPriceMin] = useState<number | undefined>(_psCache.priceMin);
  const [priceMax, setPriceMax] = useState<number | undefined>(_psCache.priceMax);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [sources, setSources] = useState<string[]>(_psCache.sources);
  const { results, loading, error, searched, startSearch, clearUnread, setResults, setSearched } = useScraperStore();
  const [sort, setSort] = useState<SortOrder>(_psCache.sort);
  const [dispBarrios, setDispBarrios] = useState<string[]>(_psCache.dispBarrios);
  const [dispSources, setDispSources] = useState<string[]>(_psCache.dispSources);
  const [showLiked, setShowLiked] = useState(_psCache.showLiked);
  const [liked, setLiked] = useState<Record<string, FlaskResult>>({});
  const [currentPage, setCurrentPage] = useState(_psCache.currentPage);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setLiked(lsGet('ps_liked', {}));
    setSavedSearches(lsGet('ps_saved_searches', []));
    setRecentSearches(lsGet('ps_recent_searches', []));
  }, []);

  useEffect(() => { lsSet('ps_liked', liked); }, [liked]);
  useEffect(() => { lsSet('ps_saved_searches', savedSearches); }, [savedSearches]);

  useEffect(() => {
    if (!loading) {
      clearUnread();
    }
  }, [loading, results, clearUnread]);

  function deleteSearch(id: string) {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  useEffect(() => {
    Object.assign(_psCache, {
      form, selectedBarrios, selectedBedrooms, selectedPropTypes, estadoObra,
      m2ConstruidoMin, m2ConstruidoMax, m2TerrenoMin, m2TerrenoMax,
      priceCurrency, priceMin, priceMax, sources,
      results, searched, sort, dispBarrios, dispSources, showLiked, currentPage,
    });
  });

  const setF = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const cities = form.department ? getCities(form.department) : [];
  const barrioOptions = form.department && form.city ? getNeighborhoods(form.department, form.city) : [];
  const locationForScraper = form.city || form.department || '';

  const onlyTerrenoTypes = selectedPropTypes.length > 0 &&
    selectedPropTypes.every((t) => TYPE_AREA_CONFIG[t]?.terreno && !TYPE_AREA_CONFIG[t]?.construido);
  const onlyConstruidoTypes = selectedPropTypes.length > 0 &&
    selectedPropTypes.every((t) => TYPE_AREA_CONFIG[t]?.construido && !TYPE_AREA_CONFIG[t]?.terreno);
  const showConstruido = !onlyTerrenoTypes;
  const showTerreno    = !onlyConstruidoTypes;
  const isEstancia     = selectedPropTypes.length > 0 &&
    selectedPropTypes.every((t) => !!TYPE_AREA_CONFIG[t]?.isEstancia);
  const terrenoLabel    = isEstancia ? 'Superficie (ha)' : 'm² terreno';
  const terrenoMultiplier = isEstancia ? 10000 : 1;
  const terrenoPresets  = isEstancia ? ESTANCIA_HA_PRESETS : M2_TERRENO_PRESETS;

  function handleCurrencyToggle(next: PsCurrency) {
    if (next === priceCurrency) return;
    if (priceMin !== undefined) setPriceMin(Math.round(next === 'PYG' ? toPYG(priceMin) : toUSD(priceMin)));
    if (priceMax !== undefined) setPriceMax(Math.round(next === 'PYG' ? toPYG(priceMax) : toUSD(priceMax)));
    setPriceCurrency(next);
    setPriceError(null);
  }

  const barrioItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      const loc = r.location || '';
      const barrio = loc.includes(',') ? loc.split(',')[0].trim() : loc.trim();
      if (barrio) counts[barrio] = (counts[barrio] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const sourceItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results) {
      if (r.source) counts[r.source] = (counts[r.source] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const displayFiltered = useMemo(() => {
    return results.filter((r) => {
      const loc = (r.location || '').toLowerCase();
      if (dispBarrios.length > 0 && !dispBarrios.some((b) => loc.includes(b.toLowerCase()))) return false;
      if (dispSources.length > 0 && !dispSources.includes(r.source)) return false;
      return true;
    });
  }, [results, dispBarrios, dispSources]);

  const sortedResults = useMemo(() => {
    return [...displayFiltered].sort((a, b) => {
      if (sort === 'none') return 0;
      const pa = parsePriceToUSD(a.price, rate);
      const pb = parsePriceToUSD(b.price, rate);
      return sort === 'asc' ? pa - pb : pb - pa;
    });
  }, [displayFiltered, sort, rate]);

  useEffect(() => { setCurrentPage(0); }, [sort, dispBarrios, dispSources]);

  const pageSize = 12;
  const totalPages = Math.ceil(sortedResults.length / pageSize) || 1;
  const pagedResults = sortedResults.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const likedList = Object.values(liked);

  function toggleLike(r: FlaskResult) {
    const key = r.url;
    setLiked((prev) => {
      if (prev[key]) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: r };
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      setPriceError('El precio mínimo no puede ser mayor que el máximo');
      return;
    }
    setPriceError(null);
    setSort('asc');
    setDispBarrios([]);
    setDispSources([]);
    setCurrentPage(0);

    // Save recent search automatically
    const loc = [...selectedBarrios, form.city, form.department].filter(Boolean).join(', ') || 'Paraguay';
    const typesStr = selectedPropTypes.length > 0 ? selectedPropTypes.join('/') : 'Cualquier tipo';
    const searchName = `${form.operation} ${typesStr} · ${loc}`;

    const queryEntry: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      savedAt: new Date().toISOString(),
      filters: {
        ...form,
        bedrooms: selectedBedrooms,
        propType: selectedPropTypes[0] || '',
        propTypes: selectedPropTypes,
        estadoObra,
        m2ConstruidoMin,
        m2ConstruidoMax,
        m2TerrenoMin,
        m2TerrenoMax,
        neighborhoods: selectedBarrios,
        priceCurrency,
        priceMin,
        priceMax,
        sources,
      },
      results: [],
    };

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.name !== searchName);
      const updated = [queryEntry, ...filtered].slice(0, 3);
      lsSet('ps_recent_searches', updated);
      return updated;
    });

    startSearch({
      operation: form.operation,
      propType: selectedPropTypes[0] || '',
      propTypes: selectedPropTypes,
      estadoObra,
      m2ConstruidoMin,
      m2ConstruidoMax,
      m2TerrenoMin: m2TerrenoMin !== undefined ? m2TerrenoMin * terrenoMultiplier : undefined,
      m2TerrenoMax: m2TerrenoMax !== undefined ? m2TerrenoMax * terrenoMultiplier : undefined,
      location: locationForScraper,
      barrios: selectedBarrios,
      min_price: priceMin,
      max_price: priceMax,
      currency: priceCurrency,
      bedrooms: selectedBedrooms,
      sources,
      resultsPerSite: form.resultsPerSite,
    }, incrementSearch);
  }

  function handleSaveSearch() {
    if (results.length === 0) return;
    const loc = [...selectedBarrios, form.city, form.department].filter(Boolean).join(', ') || 'Paraguay';
    const typesStr = selectedPropTypes.length > 0 ? selectedPropTypes.join('/') : 'Cualquier tipo';
    const name = `${form.operation} ${typesStr} · ${loc}`;
    const entry: SavedSearch = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      filters: {
        ...form,
        bedrooms: selectedBedrooms,
        propType: selectedPropTypes[0] || '',
        propTypes: selectedPropTypes,
        estadoObra,
        m2ConstruidoMin,
        m2ConstruidoMax,
        m2TerrenoMin,
        m2TerrenoMax,
        neighborhoods: selectedBarrios,
        priceCurrency,
        priceMin,
        priceMax,
        sources,
      },
      results,
    };
    setSavedSearches((prev) => [entry, ...prev.slice(0, 19)]);
  }

  function loadSearch(s: SavedSearch) {
    setForm({
      operation: s.filters.operation,
      department: s.filters.department,
      city: s.filters.city,
      resultsPerSite: s.filters.resultsPerSite,
    });
    const savedBeds = s.filters.bedrooms;
    setSelectedBedrooms(
      Array.isArray(savedBeds) ? savedBeds : savedBeds ? [savedBeds] : []
    );
    setSelectedPropTypes(s.filters.propTypes ?? (s.filters.propType ? [s.filters.propType] : []));
    setEstadoObra(s.filters.estadoObra ?? []);
    setM2ConstruidoMin(s.filters.m2ConstruidoMin);
    setM2ConstruidoMax(s.filters.m2ConstruidoMax);
    setM2TerrenoMin(s.filters.m2TerrenoMin);
    setM2TerrenoMax(s.filters.m2TerrenoMax);
    const savedBarrios = s.filters.neighborhoods ?? [];
    setSelectedBarrios(Array.isArray(savedBarrios) ? savedBarrios : []);
    setPriceCurrency((s.filters.priceCurrency as PsCurrency) ?? 'USD');
    setPriceMin(s.filters.priceMin);
    setPriceMax(s.filters.priceMax);
    setSources(s.filters.sources);
    setResults(s.results);
    setSearched(true);
    setSort('none');
    setPriceError(null);
  }

  const selectCls = 'w-full bg-white/70 backdrop-blur-xs border border-slate-200/80 hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition-all min-h-[38px] shadow-xs';

  return (
    <div className="space-y-6">
      {/* Searches Dashboard (Saved & Recent) */}
      {(savedSearches.length > 0 || recentSearches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved Searches */}
          {savedSearches.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">bookmark</span>
                Búsquedas guardadas
              </p>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 border border-slate-100 rounded-full px-3 py-1.5 text-xs bg-slate-50/50 hover:border-indigo-300 transition-colors group font-sans">
                    <button
                      type="button"
                      onClick={() => loadSearch(s)}
                      className="text-slate-700 hover:text-indigo-650 font-bold"
                    >
                      {s.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSearch(s.id)}
                      className="ml-1 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 font-black text-sm leading-none"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/30 border border-dashed border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-slate-300 text-lg mb-1">bookmark_border</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sin búsquedas guardadas</p>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Búsquedas recientes
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSearch(s)}
                    className="flex items-center gap-1 border border-slate-100 hover:border-indigo-300 rounded-full px-3.5 py-1.5 text-xs bg-slate-50/50 text-slate-700 hover:text-indigo-650 font-bold transition-colors text-left font-sans"
                  >
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/30 border border-dashed border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-slate-300 text-lg mb-1">history</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Historial vacío</p>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSearch} className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label required>Operación</Label>
            <select value={form.operation} onChange={(e) => setF('operation', e.target.value)} className={selectCls}>
              <option>Compra</option>
              <option>Alquiler</option>
            </select>
          </div>
          <div>
            <Label>Tipo de propiedad</Label>
            <PropTypeMultiSelect selected={selectedPropTypes} onChange={setSelectedPropTypes} />
          </div>
          <div>
            <Label>Dormitorios</Label>
            <BedroomsMultiSelect selected={selectedBedrooms} onChange={setSelectedBedrooms} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Departamento</Label>
            <select
              value={form.department}
              onChange={(e) => { setF('department', e.target.value); setF('city', ''); setSelectedBarrios([]); }}
              className={selectCls}
            >
              <option value="">Cualquier departamento</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label>Ciudad</Label>
            <select
              value={form.city}
              onChange={(e) => { setF('city', e.target.value); setSelectedBarrios([]); }}
              disabled={!form.department}
              className={`${selectCls} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">{form.department ? 'Cualquier ciudad' : 'Elegí departamento'}</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Barrios</Label>
            <BarrioMultiSelect
              options={barrioOptions}
              selected={selectedBarrios}
              onChange={setSelectedBarrios}
              disabled={!form.city}
              city={form.city}
            />
          </div>
        </div>

        <div>
          <Label>Estado de obra</Label>
          <div className="flex flex-wrap gap-4 mt-1 font-sans">
            {([['pozo', 'En pozo'], ['construccion', 'En construcción'], ['terminado', 'Terminado']] as [string, string][]).map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={estadoObra.includes(val)}
                  onChange={() => setEstadoObra((prev) =>
                    prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
                  )}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span>{label}</span>
              </label>
            ))}
            {estadoObra.length > 0 && (
              <button
                type="button"
                onClick={() => setEstadoObra([])}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors ml-1"
              >× Limpiar</button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Precio</Label>
            <div className="flex rounded-xl border border-slate-200/85 overflow-hidden text-xs font-bold h-[38px] bg-white/70 backdrop-blur-xs shadow-xs">
              {(['USD', 'PYG'] as PsCurrency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCurrencyToggle(c)}
                  className={`px-4 transition-all ${priceCurrency === c ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-150'}`}
                >
                  {c === 'USD' ? '$ USD' : '₲ PYG'}
                </button>
              ))}
            </div>
          </div>
          <div className="w-[180px]">
            <Label>Mín.</Label>
            <PriceCombobox
              value={priceMin}
              onChange={setPriceMin}
              currency={priceCurrency}
              operation={form.operation}
              placeholder={priceCurrency === 'USD'
                ? (form.operation === 'Alquiler' ? '500' : '50,000')
                : (form.operation === 'Alquiler' ? '2.000.000' : '50.000.000')}
            />
          </div>
          <div className="w-[180px]">
            <Label>Máx.</Label>
            <PriceCombobox
              value={priceMax}
              onChange={setPriceMax}
              currency={priceCurrency}
              operation={form.operation}
              placeholder={priceCurrency === 'USD'
                ? (form.operation === 'Alquiler' ? '2,000' : '500,000')
                : (form.operation === 'Alquiler' ? '10.000.000' : '500.000.000')}
            />
          </div>
          {rateInfo && (
            <p className="text-[10px] text-slate-400 pb-2 self-end font-mono">
              <span className="font-bold text-slate-600">
                ₲ {rateInfo.rate.toLocaleString('es-PY')}
              </span>
              {' / USD'}
              {rateInfo.cached_at && (
                <span className="text-slate-400">
                  {' · '}{formatRateDate(rateInfo.cached_at)}
                </span>
              )}
            </p>
          )}
          {rateError && <p className="text-[10px] text-rose-500 pb-2 font-semibold">Sin tasa de cambio</p>}
        </div>
        {priceError && <p className="text-xs text-rose-500 -mt-2 font-medium">{priceError}</p>}

        {(showConstruido || showTerreno) && (
          <div className="flex flex-wrap gap-4 pt-1">
            {showConstruido && (
              <div>
                <Label>m² construidos</Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-[130px]">
                    <M2Combobox
                      value={m2ConstruidoMin}
                      onChange={setM2ConstruidoMin}
                      presets={M2_CONSTRUIDO_PRESETS}
                      placeholder="Mín. Ej: 60"
                    />
                  </div>
                  <span className="text-slate-300 text-sm shrink-0">—</span>
                  <div className="w-[130px]">
                    <M2Combobox
                      value={m2ConstruidoMax}
                      onChange={setM2ConstruidoMax}
                      presets={M2_CONSTRUIDO_PRESETS}
                      placeholder="Máx. Ej: 200"
                    />
                  </div>
                </div>
              </div>
            )}
            {showTerreno && (
              <div>
                <Label>{terrenoLabel}</Label>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-[130px]">
                    <M2Combobox
                      value={m2TerrenoMin}
                      onChange={setM2TerrenoMin}
                      presets={terrenoPresets}
                      placeholder={isEstancia ? 'Mín. Ej: 10' : 'Mín. Ej: 300'}
                      unit={isEstancia ? 'ha' : 'm²'}
                    />
                  </div>
                  <span className="text-slate-300 text-sm shrink-0">—</span>
                  <div className="w-[130px]">
                    <M2Combobox
                      value={m2TerrenoMax}
                      onChange={setM2TerrenoMax}
                      presets={terrenoPresets}
                      placeholder={isEstancia ? 'Máx. Ej: 100' : 'Máx. Ej: 2000'}
                      unit={isEstancia ? 'ha' : 'm²'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-5">
          <div>
            <Label>Fuentes</Label>
            <SourcesDropdown sources={sources} setSources={setSources} />
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label>
              Resultados por sitio:{' '}
              <span className="text-indigo-600 font-bold">{form.resultsPerSite}</span>
            </Label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={form.resultsPerSite}
              onChange={(e) => setF('resultsPerSite', Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex gap-2 ml-auto">
            {searched && results.length > 0 && (
              <button
                type="button"
                onClick={handleSaveSearch}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
              >
                Guardar búsqueda
              </button>
            )}
            <button
              type="submit"
              disabled={loading || sources.length === 0}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-md shadow-indigo-100"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-2xl px-4 py-3 font-semibold font-sans">
          {error}
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-bold animate-pulse font-sans">
            Buscando en {sources.length} {sources.length === 1 ? 'portal' : 'portales'}, esto puede tomar hasta 30 segundos…
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-3xl overflow-hidden animate-pulse p-1 shadow-sm">
                <div className="aspect-[4/3] bg-slate-100 rounded-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results view */}
      {!loading && searched && (
        results.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-sans">
            <p className="font-semibold text-sm">Sin resultados de búsqueda masiva.</p>
            <p className="text-xs mt-1">Ajusta los filtros o cambia el departamento/ciudad para intentar de nuevo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 font-sans">
              <p className="text-xs text-slate-500 font-bold">
                Mostrando{' '}
                <span className="font-extrabold text-slate-800">
                  {sortedResults.length < results.length ? `${sortedResults.length} de ${results.length}` : results.length}
                </span>{' '}
                propiedades encontradas
              </p>

              <button
                type="button"
                onClick={() => setShowLiked((v) => !v)}
                className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${showLiked ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'}`}
              >
                <svg className={`w-4 h-4 ${showLiked ? 'fill-rose-500 stroke-rose-500 text-rose-500' : 'fill-none stroke-current'}`} viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Guardados
                {likedList.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {likedList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter / Sort bar */}
            <div className="glass-panel shadow-premium rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100/80 border border-slate-200/40 rounded-xl p-1 gap-1 font-sans shadow-inner">
                  {([['none', 'Relevancia'], ['asc', 'Precio ↑'], ['desc', 'Precio ↓']] as [SortOrder, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSort(val)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                        sort === val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="h-6 w-px bg-slate-100 hidden sm:block" />

                {sourceItems.length > 1 && (
                  <FilterDropdown
                    label="Fuentes"
                    items={sourceItems}
                    selected={dispSources}
                    onChange={setDispSources}
                  />
                )}

                {barrioItems.length > 1 && (
                  <FilterDropdown
                    label="Barrios"
                    items={barrioItems}
                    selected={dispBarrios}
                    onChange={setDispBarrios}
                    searchable
                  />
                )}

                {(sort !== 'none' || dispSources.length > 0 || dispBarrios.length > 0) && (
                  <button
                    type="button"
                    onClick={() => { setSort('none'); setDispSources([]); setDispBarrios([]); setCurrentPage(0); }}
                    className="ml-auto text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    × Limpiar filtros
                  </button>
                )}
              </div>

              {(dispSources.length > 0 || dispBarrios.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-50 font-sans">
                  {dispSources.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5">
                      {SOURCE_LABELS[s] ?? s}
                      <button
                        type="button"
                        onClick={() => setDispSources((prev) => prev.filter((x) => x !== s))}
                        className="hover:text-indigo-900 leading-none text-sm font-black"
                      >×</button>
                    </span>
                  ))}
                  {dispBarrios.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5">
                      {b}
                      <button
                        type="button"
                        onClick={() => setDispBarrios((prev) => prev.filter((x) => x !== b))}
                        className="hover:text-emerald-950 leading-none text-sm font-black"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Liked list panel */}
            {showLiked && (
              <div className="bg-rose-50/20 border border-rose-100/50 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between font-sans">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Propiedades guardadas</h3>
                  <button type="button" onClick={() => setShowLiked(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cerrar</button>
                </div>
                {likedList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-semibold font-sans">
                    Guardá propiedades haciendo clic en el corazón de cada ficha.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {likedList.map((r) => (
                      <PropResultCard
                        key={r.url}
                        result={r}
                        liked={true}
                        onToggleLike={() => toggleLike(r)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl shadow disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-sm select-none">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl shadow disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pagedResults.map((r, i) => (
                <PropResultCard
                  key={i}
                  result={r}
                  liked={!!liked[r.url]}
                  onToggleLike={() => toggleLike(r)}
                />
              ))}
            </div>

            {/* Pagination Bottom */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl shadow disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow-sm select-none">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl shadow disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )
      )}

      {!loading && !searched && (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-4 text-indigo-500">
            <span className="material-symbols-outlined text-2xl font-bold">travel_explore</span>
          </div>
          <p className="text-slate-800 font-bold text-sm font-sans">¿Qué propiedad estás buscando?</p>
          <p className="text-slate-400 text-xs font-medium mt-1 font-sans">Completá los filtros de arriba y buscá en todos los portales al mismo tiempo.</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ─── TAB 2: SINGLE URL SCRAPER ───────────────────────────────────────────────
// =============================================================================

interface SingleScraperTabProps {
  profile: any;
  searchesUsed: number;
  setSearchesUsed: (count: number) => void;
}

function SingleScraperTab({ profile, searchesUsed, setSearchesUsed }: SingleScraperTabProps) {
  const router = useRouter();
  const supabase = createClient();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [scrapedResult, setScrapedResult] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError('');
    setScrapedResult(null);
    setSuccess(false);
    setLoading(true);
    setShowConsole(true);
    setConsoleLogs([]);

    const logSteps = [
      '⚡ [1/5] Conectando con los servidores del portal externo...',
      '🌐 [2/5] Descargando contenido HTML de la propiedad...',
      '🛠️ [3/5] Analizando selectores CSS y extrayendo metadatos...',
      '📦 [4/5] Mapeando campos al catálogo y ciudades de Paraguay...',
      '✅ [5/5] Extracción finalizada con éxito. Procesando vista previa.'
    ];

    for (let i = 0; i < logSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setConsoleLogs((prev) => [...prev, logSteps[i]]);
    }

    try {
      const response = await fetch('/api/scraper/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || 'Ocurrió un error al procesar el scrape.');
        setLoading(false);
        return;
      }

      setScrapedResult(resData.data);
      setSearchesUsed(resData.usage.used);
      setSuccess(true);
    } catch (err) {
      setError('Error al comunicar con la pasarela del extractor.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!scrapedResult || !profile) return;

    setIsSaving(true);
    setError('');

    try {
      const { data: newProp, error: insertError } = await supabase
        .from('properties')
        .insert({
          agent_id: profile.id,
          title: scrapedResult.title,
          description: scrapedResult.description,
          transaction_type: scrapedResult.transaction_type,
          property_type: scrapedResult.property_type,
          sale_price: scrapedResult.sale_price,
          rent_price: scrapedResult.rent_price,
          currency: scrapedResult.currency,
          department: scrapedResult.department,
          city: scrapedResult.city,
          neighborhood: scrapedResult.neighborhood,
          bedrooms: scrapedResult.bedrooms,
          bathrooms: scrapedResult.bathrooms,
          garages: scrapedResult.garages,
          m2_terrain: scrapedResult.m2_terrain,
          m2_built: scrapedResult.m2_built,
          amenities: scrapedResult.amenities,
          photos: scrapedResult.photos,
          visibility: 'private',
          status: scrapedResult.transaction_type === 'compra' ? 'En Venta' : 'En Alquiler'
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/propiedades/${newProp.id}/editar`);
      }, 1500);

    } catch (err: any) {
      console.error('Error inserting property:', err);
      setError('No se pudo guardar la propiedad en la base de datos: ' + err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Box */}
      <div className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
          <span className="text-slate-400 font-bold">Portales Compatibles:</span>
          <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            InfoCasas Paraguay
          </span>
          <span className="bg-sky-50 border border-sky-100 text-sky-700 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Clasipar
          </span>
        </div>

        <form onSubmit={handleExtract} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">URL de la Propiedad</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Pega el link de InfoCasas o Clasipar aquí..."
                  className="w-full bg-white/70 backdrop-blur-xs border border-slate-200/80 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-semibold text-slate-800 focus:outline-none placeholder-slate-400 transition-all shadow-xs"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-md shadow-indigo-100"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extrayendo...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">settings_ethernet</span>
                    <span>Extraer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 font-sans">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Terminal Log */}
        {showConsole && (
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 space-y-1 shadow-inner max-h-[160px] overflow-y-auto">
            <div className="flex items-center justify-between text-slate-500 border-b border-white/[0.04] pb-1.5 mb-2 font-sans">
              <span>Terminal de extracción de datos</span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-600">RealHub-Scrape v1.0</span>
            </div>
            {consoleLogs.map((log, idx) => (
              <p key={idx} className="leading-relaxed animate-fade-in">{log}</p>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-1.5 mt-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="animate-pulse">Esperando respuesta del servidor...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scraped Results Preview */}
      {success && scrapedResult && (
        <div className="glass-panel shadow-premium rounded-3xl p-6 md:p-8 space-y-6 animate-fade-in relative font-sans">
          {saveSuccess && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-20 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-3xl font-bold">check</span>
              </div>
              <div className="text-center">
                <h4 className="font-heading text-lg font-bold text-slate-900">¡Propiedad Importada Correctamente!</h4>
                <p className="text-slate-400 text-xs mt-1">Redireccionando al editor para completar el registro...</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-full">
                Resultados de Extracción
              </span>
              <h3 className="font-heading text-lg font-bold text-slate-800 mt-2">Vista Previa de la Ficha</h3>
            </div>
            <div className="bg-slate-50 border border-slate-100 text-slate-500 font-extrabold text-[9px] uppercase tracking-wider px-3 py-1 rounded-md">
              Fuente: {scrapedResult.source}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Images */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img 
                  src={scrapedResult.photos[0]} 
                  alt="Scraped main" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {scrapedResult.photos.slice(1, 4).map((url: string, i: number) => (
                  <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={url} alt={`Scraped gallery ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <input 
                  type="text" 
                  value={scrapedResult.title}
                  onChange={(e) => setScrapedResult({ ...scrapedResult, title: e.target.value })}
                  className="w-full text-base font-bold text-slate-800 border-b border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none pb-1 font-heading" 
                  placeholder="Título de la propiedad"
                />
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-black text-slate-900 font-heading">
                    {scrapedResult.currency === 'USD' ? '$' : '₲'}
                    {(scrapedResult.sale_price || scrapedResult.rent_price || 0).toLocaleString('es-PY')}
                  </span>
                  <span className="text-slate-400 text-[10px] font-bold">
                    / {scrapedResult.transaction_type === 'compra' ? 'Venta Total' : 'Alquiler Mensual'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-[10px] font-bold">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Habitaciones</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">bed</span>
                    {scrapedResult.bedrooms || '—'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Baños</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">bathtub</span>
                    {scrapedResult.bathrooms || '—'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Cocheras</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">garage</span>
                    {scrapedResult.garages || '0'}
                  </span>
                </div>
                <div className="space-y-0.5 mt-2">
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Superficie</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">square_foot</span>
                    {scrapedResult.m2_built || scrapedResult.m2_terrain || '—'} m²
                  </span>
                </div>
                <div className="space-y-0.5 mt-2 col-span-2">
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-extrabold">Ubicación</span>
                  <span className="text-slate-700 flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                    {scrapedResult.neighborhood}, {scrapedResult.city}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Descripción</label>
                <textarea 
                  value={scrapedResult.description}
                  onChange={(e) => setScrapedResult({ ...scrapedResult, description: e.target.value })}
                  className="w-full text-xs text-slate-500 font-medium bg-white/60 border border-slate-200/80 rounded-xl p-3 h-28 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
                />
              </div>

              {scrapedResult.amenities.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Amenities detectados</span>
                  <div className="flex flex-wrap gap-1">
                    {scrapedResult.amenities.map((item: string, i: number) => (
                      <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleImport}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando propiedad...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>Confirmar e Importar a mis Propiedades</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ─── MAIN SCRAPER CONTAINER ──────────────────────────────────────────────────
// =============================================================================

export default function ScraperPage() {
  const supabase = createClient();
  
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('free');
  const [searchesUsed, setSearchesUsed] = useState<number>(0);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? null);
          const { data: prof } = await supabase
            .from('agent_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (prof) {
            setProfile(prof);
            const { tier: activeTier } = getSubscriptionState(prof);
            setTier(activeTier);
            setSearchesUsed(prof.scraper_searches_used || 0);
          }
        }
      } catch (err) {
        console.error('Error loading profile in scraper page:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const incrementSearch = () => {
    setSearchesUsed((prev) => prev + 1);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const adminEmails = ['lamronfidd@gmail.com', 'jonyocampos@gmail.com', 'lamronfid@gmail.com'];
  const isAdminOrOwner = 
    profile?.role === 'admin' || 
    profile?.role === 'superadmin' || 
    profile?.role === 'owner' ||
    (userEmail && adminEmails.includes(userEmail.toLowerCase()));
    
  const isLocked = !isAdminOrOwner && (tier === 'free' || tier === 'standard');

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600 text-3xl">travel_explore</span>
          Extractor de Propiedades (Scraper)
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Busca en portales en masa o importa fichas de propiedades de Clasipar e InfoCasas directamente con un link.
        </p>
      </div>

      {isLocked ? (
        // 🔒 PREMIUM LOCKED CONTAINER
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-xl p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 mt-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-pink-500/5 pointer-events-none" />
          
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              Característica Premium
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">
              Desbloquea el Scraper de Propiedades
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Ahórrate horas de búsqueda y carga manual de fotos, títulos, características y m². Realiza búsquedas cruzadas automáticas en todos los portales o importa cualquier link de InfoCasas o Clasipar al instante.
            </p>
          </div>

          <div className="pt-4 max-w-xs mx-auto">
            <Link
              href="/subscripcion/planes"
              className="block w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.2)] active:scale-[0.98]"
            >
              Ver planes de suscripción
            </Link>
          </div>
        </div>
      ) : (
        // 🔓 UNLOCKED FRONT END VIEW
        <div className="space-y-6 animate-fade-in">
          
          {/* Usage limit card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Estado del Extractor</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-700">Extractor activo y listo</span>
              </div>
            </div>
            
            <div className="w-full md:w-64 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Uso Mensual</span>
                <span className="text-slate-800">
                  {tier === 'elite' ? 'Búsquedas ilimitadas (Élite)' : `${searchesUsed} / 100 consultas`}
                </span>
              </div>
              {tier !== 'elite' && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(searchesUsed, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200/80 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'bulk'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-base">saved_search</span>
              Buscar en Portales (Masivo)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-base">link</span>
              Importar Link Único
            </button>
          </div>

          {/* Active Tab rendering */}
          {activeTab === 'bulk' ? (
            <BulkScraperTab incrementSearch={incrementSearch} />
          ) : (
            <SingleScraperTab 
              profile={profile} 
              searchesUsed={searchesUsed} 
              setSearchesUsed={setSearchesUsed} 
            />
          )}

        </div>
      )}
    </div>
  );
}
