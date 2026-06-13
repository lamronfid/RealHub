import { create } from 'zustand';

export interface FlaskResult {
  source: string;
  title: string;
  price: string;
  location: string;
  url: string;
  photo?: string;
  bedrooms?: number | null;
  metros?: number | null;
}

interface ScraperStore {
  results: FlaskResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  hasUnreadResults: boolean;
  
  startSearch: (params: any, incrementSearch?: () => void) => Promise<void>;
  clearUnread: () => void;
  setResults: (results: FlaskResult[]) => void;
  setSearched: (searched: boolean) => void;
  reset: () => void;
}

export const useScraperStore = create<ScraperStore>((set, get) => ({
  results: [],
  loading: false,
  error: null,
  searched: false,
  hasUnreadResults: false,

  startSearch: async (params, incrementSearch) => {
    set({ loading: true, error: null, searched: true, hasUnreadResults: false, results: [] });
    try {
      const res = await fetch('/api/propsearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Error ${res.status}`);
      }

      let data = await res.json();

      if (data && data.direct) {
        const directRes = await fetch(`${data.apiUrl}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(data.apiSecret ? { Authorization: `Bearer ${data.apiSecret}` } : {}),
          },
          body: JSON.stringify(params),
        });

        if (!directRes.ok) {
          const text = await directRes.text().catch(() => '');
          throw new Error(`Scraper API ${directRes.status}: ${text.slice(0, 300)}`);
        }

        data = await directRes.json();
      }

      set({ results: data, loading: false, hasUnreadResults: true });
      if (incrementSearch) {
        incrementSearch();
      }

      fetch('/api/propsearch/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: data, operation: params.operation, propType: params.propType }),
      }).catch(() => {});
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error desconocido',
        results: [],
        loading: false,
      });
    }
  },

  clearUnread: () => set({ hasUnreadResults: false }),
  setResults: (results) => set({ results }),
  setSearched: (searched) => set({ searched }),
  reset: () => set({ results: [], loading: false, error: null, searched: false, hasUnreadResults: false }),
}));
