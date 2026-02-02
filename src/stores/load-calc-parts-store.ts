import { create } from 'zustand';
import { parts } from '@/lib/db/client';
import type { PartWithManufacturer } from '@/types/parts';
import type { VoltageType } from '@/types/load-calc';
import { toast } from 'sonner';

export interface PartElectricalVariant {
  id: number;
  part_id: number;
  voltage: number | null;
  phase: string | null;
  amperage: number | null;
  wattage: number | null;
  heat_dissipation_btu: number | null;
  voltage_type: VoltageType | string;
}

interface LoadCalcPartsState {
  parts: PartWithManufacturer[];
  isLoading: boolean;
  searchQuery: string;
  selectedVoltageTypes: VoltageType[];
  error: string | null;

  // Actions
  fetchParts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setVoltageFilter: (types: VoltageType[]) => void;
  importParts: (_file: File) => Promise<void>;
  getElectricalVariants: (partId: number) => Promise<PartElectricalVariant[]>;
}

export const useLoadCalcPartsStore = create<LoadCalcPartsState>((set, get) => ({
  parts: [],
  isLoading: false,
  searchQuery: '',
  selectedVoltageTypes: [],
  error: null,

  fetchParts: async () => {
    set({ isLoading: true, error: null });
    try {
      const queryTerm = get().searchQuery;
      
      let results: PartWithManufacturer[];
      if (!queryTerm.trim()) {
        results = await parts.getAll();
      } else {
        results = await parts.search(queryTerm);
      }
      
      set({ parts: results, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch parts:', error);
      set({ error: 'Failed to fetch parts', isLoading: false });
      toast.error("Failed to fetch parts");
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchParts();
  },

  setVoltageFilter: (types: VoltageType[]) => {
    set({ selectedVoltageTypes: types });
  },

  importParts: async (_file: File) => {
    void _file;
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Parts imported successfully (Simulation)");
      await get().fetchParts();
    } catch (error) {
      console.error('Import failed:', error);
      set({ error: 'Import failed', isLoading: false });
      toast.error("Import failed");
    } finally {
      set({ isLoading: false });
    }
  },

  getElectricalVariants: async (partId: number) => {
    try {
      // The client doesn't have an 'getAllForPart' but it has 'getVoltageTypesForPart' 
      // and 'getByPartAndVoltageType'. We should probably add a helper or use query directly.
      const queryStr = 'SELECT * FROM part_electrical WHERE part_id = ? ORDER BY voltage_type';
      const { query } = await import('@/lib/db/client');
      return await query<PartElectricalVariant>(queryStr, [partId]);
    } catch (error) {
      console.error('Failed to fetch electrical variants:', error);
      return [];
    }
  }
}));
