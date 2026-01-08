import { create } from 'zustand';
import { parts, manufacturers, categories } from '@/lib/db/client';
import type { PartWithManufacturer, Manufacturer, Category, Part } from '@/types/parts';

interface PartsState {
  parts: PartWithManufacturer[];
  manufacturers: Manufacturer[];
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  searchParts: (query: string) => Promise<void>;
  addPart: (part: Omit<Part, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePart: (id: number, part: Partial<Omit<Part, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deletePart: (id: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const usePartsStore = create<PartsState>((set, get) => ({
  parts: [],
  manufacturers: [],
  categories: [],
  isLoading: false,
  searchQuery: '',
  error: null,

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
    }
  },

  searchParts: async (query: string) => {
    set({ searchQuery: query, isLoading: true });
    try {
      if (!query.trim()) {
        const allParts = await parts.getAll();
        set({ parts: allParts, isLoading: false });
      } else {
        const results = await parts.search(query);
        set({ parts: results, isLoading: false });
      }
    } catch (error) {
      console.error('Search failed:', error);
      set({ error: 'Search failed', isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    // Debounce could be added here or in the component
    // For now we'll trigger search immediately if needed, or let component call searchParts
  },

  addPart: async (part) => {
    set({ isLoading: true });
    try {
      await parts.create(part);
      // Reload to get fresh data including joins
      const query = get().searchQuery;
      if (query) {
        await get().searchParts(query);
      } else {
        const allParts = await parts.getAll();
        set({ parts: allParts, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to add part:', error);
      set({ error: 'Failed to add part', isLoading: false });
      throw error;
    }
  },

  updatePart: async (id, updates) => {
    set({ isLoading: true });
    try {
      await parts.update(id, updates);
      // Reload to get fresh data
      const query = get().searchQuery;
      if (query) {
        await get().searchParts(query);
      } else {
        const allParts = await parts.getAll();
        set({ parts: allParts, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to update part:', error);
      set({ error: 'Failed to update part', isLoading: false });
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
    } catch (error) {
      console.error('Failed to delete part:', error);
      set({ error: 'Failed to delete part', isLoading: false });
      throw error;
    }
  },
}));
