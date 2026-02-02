import { create } from 'zustand';
import { read, utils } from 'xlsx';
import { toast } from 'sonner';
import type { ImportStep, MappingTemplate } from '@/types/load-calc';

interface LoadCalcImportState {
  // State
  step: ImportStep;
  file: File | null;
  headers: string[];
  rows: Record<string, unknown>[];
  mappings: Record<string, string>; // targetField -> sourceColumn
  templates: MappingTemplate[];
  isLoading: boolean;

  // Actions
  setStep: (step: ImportStep) => void;
  setFile: (file: File) => Promise<void>;
  reset: () => void;
  setMapping: (field: string, column: string | null) => void;
  saveTemplate: (name: string) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
}

const STORAGE_KEY = 'load-calc-import-templates';

// Helper to load templates from local storage
const loadTemplatesFromStorage = (): MappingTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load import templates', e);
    return [];
  }
};

export const useLoadCalcImportStore = create<LoadCalcImportState>((set, get) => ({
  // Initial State
  step: 'upload',
  file: null,
  headers: [],
  rows: [],
  mappings: {},
  templates: loadTemplatesFromStorage(),
  isLoading: false,

  // Actions
  setStep: (step) => set({ step }),

  setFile: async (file) => {
    set({ isLoading: true });
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      
      // Assume first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse headers (A1:Z1)
      // We use sheet_to_json with header: 1 to get array of arrays, first row is headers
      const rawData = utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
      
      if (rawData.length === 0) {
        throw new Error('File is empty');
      }

      const headers = (rawData[0] as string[]).map(h => String(h).trim()).filter(Boolean);
      
      // Parse rows (skip header)
      // usage of raw: false ensures we get formatted strings which is safer for generic import
      const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { range: 1 });

      set({ 
        file, 
        headers, 
        rows, 
        step: 'mapping',
        mappings: {}, // Reset mappings on new file
        isLoading: false 
      });
      
      toast.success(`Loaded ${rows.length} rows from ${file.name}`);
    } catch (error) {
      console.error('File import error:', error);
      toast.error('Failed to parse file. Please check format.');
      set({ isLoading: false, file: null });
    }
  },

  reset: () => set({
    step: 'upload',
    file: null,
    headers: [],
    rows: [],
    mappings: {},
    isLoading: false
  }),

  setMapping: (field, column) => set(state => {
    const newMappings = { ...state.mappings };
    if (column === null) {
      delete newMappings[field];
    } else {
      newMappings[field] = column;
    }
    return { mappings: newMappings };
  }),

  saveTemplate: (name) => {
    const { mappings, templates } = get();
    const newTemplate: MappingTemplate = {
      id: crypto.randomUUID(),
      name,
      mappings,
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    set({ templates: updatedTemplates });
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
      toast.success('Mapping template saved');
    } catch (e) {
      toast.error('Failed to save template');
    }
  },

  loadTemplate: (templateId) => {
    const template = get().templates.find(t => t.id === templateId);
    if (template) {
      set({ mappings: { ...template.mappings } });
      toast.success(`Loaded template: ${template.name}`);
    }
  },

  deleteTemplate: (templateId) => {
    const updatedTemplates = get().templates.filter(t => t.id !== templateId);
    set({ templates: updatedTemplates });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
      toast.success('Template deleted');
    } catch (e) {
      toast.error('Failed to update templates');
    }
  }
}));
