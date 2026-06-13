import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AcmSubjectProperty,
  AcmComparable,
  AcmFilters,
  AcmReportData,
} from '@/types/acm';
import { calcReportData } from '@/lib/acm/calculations';

interface AcmStore {
  currentStep: 1 | 2 | 3 | 4;

  subjectProperty: Partial<AcmSubjectProperty>;

  allComparables: AcmComparable[];
  selectedIds: Set<string>;
  adjustments: Record<string, number>;
  filters: AcmFilters;
  isSearching: boolean;
  isCalculating: boolean;
  searchError: string | null;

  reportData: AcmReportData | null;
  agentNotes: string;
  savedReportId: string | null;

  recipientName: string;
  pdfUrl: string | null;

  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  setSubjectProperty: (data: Partial<AcmSubjectProperty>) => void;
  setComparables: (comparables: AcmComparable[]) => void;
  updateComparable: (id: string, updates: Partial<AcmComparable>) => void;
  setAdjustment: (id: string, adjustment: number) => void;
  toggleComparable: (id: string) => void;
  setFilters: (filters: Partial<AcmFilters>) => void;
  setIsSearching: (value: boolean) => void;
  setIsCalculating: (value: boolean) => void;
  setSearchError: (error: string | null) => void;
  setReportData: (data: AcmReportData) => void;
  setAgentNotes: (notes: string) => void;
  setSavedReportId: (id: string) => void;
  setRecipientName: (name: string) => void;
  setPdfUrl: (url: string) => void;
  reset: () => void;

  getSelectedComparables: () => AcmComparable[];
  getFilteredComparables: () => AcmComparable[];
  getUniqueSources: () => string[];
}

const DEFAULT_FILTERS: AcmFilters = {
  sources: [],
  similarityMin: 0,
};

const DEFAULT_STATE = {
  currentStep: 1 as const,
  subjectProperty: {},
  allComparables: [],
  selectedIds: new Set<string>(),
  adjustments: {} as Record<string, number>,
  filters: DEFAULT_FILTERS,
  isSearching: false,
  isCalculating: false,
  searchError: null,
  reportData: null,
  agentNotes: '',
  savedReportId: null,
  recipientName: '',
  pdfUrl: null,
};

export const useAcmStore = create<AcmStore>()(
  devtools(
    (set, get) => ({
      ...DEFAULT_STATE,

      setCurrentStep: (step) => set({ currentStep: step }),

      setSubjectProperty: (data) =>
        set((state) => ({
          subjectProperty: { ...state.subjectProperty, ...data },
        })),

      setComparables: (comparables) =>
        set({ allComparables: comparables, selectedIds: new Set(), adjustments: {} }),

      updateComparable: (id, updates) =>
        set((state) => {
          const updatedComparables = state.allComparables.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          );
          
          let newReportData = state.reportData;
          if (state.reportData && ('adjustment' in updates || 'price' in updates)) {
            const selected = updatedComparables.filter((c) => state.selectedIds.has(c.id));
            newReportData = calcReportData(state.subjectProperty, selected);
          }

          const newAdjustments = 'adjustment' in updates
            ? { ...state.adjustments, [id]: updates.adjustment as number }
            : state.adjustments;

          return {
            allComparables: updatedComparables,
            reportData: newReportData,
            adjustments: newAdjustments,
          };
        }),

      setAdjustment: (id, adjustment) =>
        set((state) => {
          const newAdjustments = { ...state.adjustments, [id]: adjustment };
          const updatedComparables = state.allComparables.map((c) =>
            c.id === id ? { ...c, adjustment } : c
          );

          let newReportData = state.reportData;
          if (state.reportData) {
            const selected = updatedComparables.filter((c) => state.selectedIds.has(c.id));
            newReportData = calcReportData(state.subjectProperty, selected);
          }

          return {
            adjustments: newAdjustments,
            allComparables: updatedComparables,
            reportData: newReportData,
          };
        }),

      toggleComparable: (id) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) {
            next.delete(id);
          } else if (next.size < 10) {
            next.add(id);
          }
          
          // Recompute reportData if it exists
          let newReportData = state.reportData;
          if (state.reportData) {
            const selected = state.allComparables.filter((c) => next.has(c.id));
            newReportData = calcReportData(state.subjectProperty, selected);
          }

          return { selectedIds: next, reportData: newReportData };
        }),

      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),

      setIsSearching: (value) => set({ isSearching: value }),
      setIsCalculating: (value) => set({ isCalculating: value }),
      setSearchError: (error) => set({ searchError: error }),
      setReportData: (data) => set({ reportData: data }),
      setAgentNotes: (notes) => set({ agentNotes: notes }),
      setSavedReportId: (id) => set({ savedReportId: id }),
      setRecipientName: (name) => set({ recipientName: name }),
      setPdfUrl: (url) => set({ pdfUrl: url }),

      reset: () => set({ ...DEFAULT_STATE, selectedIds: new Set() }),

      getSelectedComparables: () => {
        const { allComparables, selectedIds } = get();
        return allComparables.filter((c) => selectedIds.has(c.id));
      },

      getFilteredComparables: () => {
        const { allComparables, filters } = get();
        return allComparables.filter((c) => {
          if (filters.sources.length > 0 && !filters.sources.includes(c.source)) return false;
          if (c.similarityScore < filters.similarityMin) return false;
          if (filters.priceMin !== undefined && c.price < filters.priceMin) return false;
          if (filters.priceMax !== undefined && c.price > filters.priceMax) return false;
          if (filters.sqmMin !== undefined && (c.sqm === undefined || c.sqm < filters.sqmMin)) return false;
          if (filters.sqmMax !== undefined && (c.sqm === undefined || c.sqm > filters.sqmMax)) return false;
          return true;
        });
      },

      getUniqueSources: () => {
        return [...new Set(get().allComparables.map((c) => c.source))];
      },
    }),
    { name: 'acm-store' }
  )
);
