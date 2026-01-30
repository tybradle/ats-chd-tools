import { create } from 'zustand';
import { parts, manufacturers, categories } from '@/lib/db/client';
import type { PartWithManufacturer, Manufacturer, Category, Part } from '@/types/parts';
import { toast } from 'sonner';

interface PartsState {
  parts: PartWithManufacturer[];
  manufacturers: Manufacturer[];
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;
  selectedManufacturerIds: number[];
  error: string | null;
  lastRequestId: number;

  // Actions
  loadInitialData: () => Promise<void>;
  searchParts: (options?: { query?: string; manufacturerIds?: number[] }) => Promise<void>;
  addPart: (part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePart: (id: number, part: Partial<Omit<Part, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deletePart: (id: number) => Promise<void>;
  deleteAllParts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setManufacturerFilter: (ids: number[]) => void;
  clearFilters: () => void;
}

export const usePartsStore = create<PartsState>((set, get) => ({
  parts: [],
  manufacturers: [],
  categories: [],
  isLoading: false,
  searchQuery: '',
  selectedManufacturerIds: [],
  error: null,
  lastRequestId: 0,



  loadInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [allParts, allManufacturers, allCategories] = await Promise.all([
        parts.getAll(),
        manufacturers.getAll(),
        categories.getAll(),
      ]);
      set({ 
        parts: allParts, 
        manufacturers: allManufacturers, 
        categories: allCategories, 
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load parts data:', error);
      set({ error: 'Failed to load parts data', isLoading: false });
      toast.error("Failed to load parts data");
    }
  },


  searchParts: async (options) => {
    const queryTerm = options?.query ?? get().searchQuery;
    const mfrIds = options?.manufacturerIds ?? get().selectedManufacturerIds;
    const requestId = get().lastRequestId + 1;
    
    set({ 
      searchQuery: queryTerm, 
      selectedManufacturerIds: mfrIds, 
      isLoading: true,
      lastRequestId: requestId,
      error: null
    });
    
    try {
      let results: PartWithManufacturer[];
      if (!queryTerm.trim() && mfrIds.length === 0) {
        results = await parts.getAll();
      } else {
        results = await parts.search(queryTerm, mfrIds);
      }
      
      if (get().lastRequestId === requestId) {
        set({ parts: results, isLoading: false });
      }
    } catch (error) {
      console.error('Search failed:', error);
      if (get().lastRequestId === requestId) {
        set({ error: 'Search failed', isLoading: false });
        toast.error("Search failed");
      }
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setManufacturerFilter: (ids: number[]) => {
    set({ selectedManufacturerIds: ids });
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedManufacturerIds: [] });
  },


  addPart: async (part) => {
    set({ isLoading: true });
    try {
      await parts.create(part);
      // Reload to get fresh data including joins
      const query = get().searchQuery;
      const mfrIds = get().selectedManufacturerIds;
      if (query || mfrIds.length > 0) {
        await get().searchParts({ query, manufacturerIds: mfrIds });
      } else {

        const allParts = await parts.getAll();
        set({ parts: allParts, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to add part:', error);
      set({ error: 'Failed to add part', isLoading: false });
      toast.error("Failed to add part");
      throw error;
    }
  },

  updatePart: async (id, updates) => {
    set({ isLoading: true });
    try {
      await parts.update(id, updates);
      // Reload to get fresh data
      const query = get().searchQuery;
      const mfrIds = get().selectedManufacturerIds;
      if (query || mfrIds.length > 0) {
        await get().searchParts({ query, manufacturerIds: mfrIds });
      } else {
        const allParts = await parts.getAll();
        set({ parts: allParts, isLoading: false });
      }
      toast.success("Part updated successfully");
    } catch (error) {
      console.error('Failed to update part:', error);
      set({ error: 'Failed to update part', isLoading: false });
      toast.error("Failed to update part");
      throw error;
    }
  },

  deletePart: async (id) => {
    set({ isLoading: true });
    try {
      await parts.delete(id);
      set((state) => ({
        parts: state.parts.filter((p) => p.id !== id),
        isLoading: false,
      }));
      toast.success("Part deleted successfully");
    } catch (error) {
      console.error('Failed to delete part:', error);
      set({ error: 'Failed to delete part', isLoading: false });
      toast.error("Failed to delete part");
      throw error;
    }
  },

  deleteAllParts: async () => {
    set({ isLoading: true });
    try {
      await parts.deleteAll();
      set({ parts: [], isLoading: false });
      toast.success("All parts deleted successfully");
    } catch (error) {
      console.error('Failed to delete all parts:', error);
      set({ error: 'Failed to delete all parts', isLoading: false });
      toast.error("Failed to delete all parts");
      throw error;
    }
  },
}));

