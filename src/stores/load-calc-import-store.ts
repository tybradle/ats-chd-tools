import { create } from 'zustand';
import { read, utils } from 'xlsx';
import { toast } from 'sonner';
import type { ImportStep, MappingTemplate, MatchResult, ImportMatchingConfig, LoadCalcLineItem } from '@/types/load-calc';
import { loadCalcLineItems } from '@/lib/db/client';

export interface PreviewLineItem {
  source: 'matched' | 'manual';
  partNumber: string;
  description: string;
  qty: number;
  powerGroup: string | null;
  matchedPartId: number | null;
}

interface LoadCalcImportState {
  // State
  step: ImportStep;
  file: File | null;
  headers: string[];
  rows: Record<string, unknown>[];
  mappings: Record<string, string>; // targetField -> sourceColumn
  templates: MappingTemplate[];
  isLoading: boolean;
  lastImportCount: number;

  // Matching state
  matchResults: MatchResult[];
  matchingConfig: ImportMatchingConfig;
  selectedVoltageTableId: number | null;
  isMatchingInProgress: boolean;
  isImporting: boolean;

  // Actions
  setStep: (step: ImportStep) => void;
  setFile: (file: File) => Promise<void>;
  setClipboardData: (text: string) => void;
  reset: () => void;
  setMapping: (field: string, column: string | null) => void;
  saveTemplate: (name: string) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;

  // Matching actions
  setSelectedVoltageTableId: (id: number | null) => void;
  updateMatchingConfig: (config: Partial<ImportMatchingConfig>) => void;
  runMatching: () => Promise<void>;
  saveManualEntry: (rowIndex: number, entry: MatchResult['manualEntry']) => Promise<void>;
  skipUnmatched: (rowIndex: number | number[]) => void;
  getPreviewLineItems: () => PreviewLineItem[];
  importToDatabase: (voltageTableId: number) => Promise<void>;
}

const STORAGE_KEY = 'load-calc-import-templates';

// Helper to load templates from local storage
const loadTemplatesFromStorage = (): MappingTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load import templates', error);
    return [];
  }
};

import { DEFAULT_MATCHING_CONFIG } from '@/types/load-calc';

export const useLoadCalcImportStore = create<LoadCalcImportState>((set, get) => ({
  // Initial State
  step: 'upload',
  file: null,
  headers: [],
  rows: [],
  mappings: {},
  templates: loadTemplatesFromStorage(),
  isLoading: false,
  lastImportCount: 0,

  // Matching state
  matchResults: [],
  matchingConfig: DEFAULT_MATCHING_CONFIG,
  selectedVoltageTableId: null,
  isMatchingInProgress: false,
  isImporting: false,

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

  setClipboardData: (text: string) => {
    try {
      const lines = text.split('\n').map(line => line.replace(/\r$/, '')).filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('Clipboard data must have a header row and at least one data row.');
        return;
      }

      const headers = lines[0].split('\t').map(h => h.trim()).filter(Boolean);
      if (headers.length === 0) {
        toast.error('Could not detect column headers. Make sure data is tab-delimited.');
        return;
      }

      const rows: Record<string, unknown>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('\t');
        const row: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          row[h] = cells[idx]?.trim() ?? '';
        });
        rows.push(row);
      }

      set({
        file: null,
        headers,
        rows,
        step: 'mapping',
        mappings: {},
        matchResults: [],
      });

      toast.success(`Loaded ${rows.length} rows from clipboard`);
    } catch (error) {
      console.error('Clipboard parse error:', error);
      toast.error('Failed to parse clipboard data. Ensure it is tab-delimited.');
    }
  },

  reset: () => set({
    step: 'upload',
    file: null,
    headers: [],
    rows: [],
    mappings: {},
    matchResults: [],
    isLoading: false,
    isImporting: false,
    lastImportCount: 0,
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
    } catch {
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
    } catch {
      toast.error('Failed to update templates');
    }
  },
  
  // Matching actions
  setSelectedVoltageTableId: (id) => set({ selectedVoltageTableId: id }),
  
  updateMatchingConfig: (config) => set(state => ({
    matchingConfig: { ...state.matchingConfig, ...config }
  })),
  
  runMatching: async () => {
    set({ isMatchingInProgress: true });
    try {
      const { rows, mappings, matchingConfig } = get();
      
      // Get the mapped column names
      const partNumberField = mappings['part_number'];
      const manufacturerField = mappings['manufacturer']; // Optional field
      
      if (!partNumberField) {
        throw new Error('Part number column must be mapped to run matching');
      }
      
      // Import the matching algorithm
      const { matchAllRows } = await import('@/lib/load-calc/matching');
      
      // Run matching with progress updates
      const matchResults = await matchAllRows(
        rows,
        partNumberField,
        manufacturerField,
        matchingConfig,
        (processed, total) => {
          // Update progress if needed
          console.log(`Matching progress: ${processed}/${total}`);
        }
      );
      
      set({ matchResults, isMatchingInProgress: false });
      
      // Calculate match statistics
      const matchedCount = matchResults.filter(r => r.state === 'matched').length;
      const unmatchedCount = matchResults.filter(r => r.state === 'unmatched').length;
      
      toast.success(`Matching complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);
    } catch (error) {
      console.error('Matching failed:', error);
      toast.error('Failed to run matching');
      set({ isMatchingInProgress: false });
    }
  },
  
  saveManualEntry: async (rowIndex, entry) => {
    if (!entry) return;
    set(state => {
      const updatedResults = [...state.matchResults];
      if (updatedResults[rowIndex]) {
        updatedResults[rowIndex] = {
          ...updatedResults[rowIndex],
          state: 'manual' as const,
          manualEntry: entry,
          confidence: 0.5 // Manual entry confidence
        };
      }
      return { matchResults: updatedResults };
    });
    toast.success('Manual entry saved');
  },
  
  skipUnmatched: (rowIndex) => {
    set(state => {
      const updatedResults = [...state.matchResults];
      const indices = Array.isArray(rowIndex) ? rowIndex : [rowIndex];
      indices.forEach(index => {
        if (updatedResults[index]) {
          updatedResults[index] = {
            ...updatedResults[index],
            state: 'skipped' as const,
            confidence: 0
          };
        }
      });
      return { matchResults: updatedResults };
    });
    toast.success('Items skipped');
  },
  
  getPreviewLineItems: () => {
    const { rows, matchResults, mappings } = get();
    const preview: PreviewLineItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = matchResults[i];
      if (!result || result.state === 'pending' || result.state === 'skipped' || result.state === 'unmatched') {
        continue;
      }

      const qty = parseFloat(String(row[mappings['qty']] || '1')) || 1;
      const description = result.state === 'manual' && result.manualEntry?.description
        ? result.manualEntry.description
        : String(row[mappings['description']] || '');
      const powerGroup = mappings['power_group'] ? String(row[mappings['power_group']] || '') || null : null;
      const partNumber = result.state === 'manual'
        ? (result.manualEntry?.partNumber || '')
        : (result.matchedPartNumber || String(row[mappings['part_number']] || ''));

      preview.push({
        source: result.state as 'matched' | 'manual',
        partNumber,
        description,
        qty,
        powerGroup,
        matchedPartId: result.partId,
      });
    }

    return preview;
  },

  importToDatabase: async (voltageTableId) => {
    set({ isImporting: true });
    try {
      const { rows, matchResults, mappings } = get();
      
      if (rows.length === 0) {
        throw new Error('No data to import');
      }
      
      if (!voltageTableId) {
        throw new Error('No voltage table selected');
      }
      
      // Prepare line items for import
      const lineItems: Omit<LoadCalcLineItem, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const matchResult = matchResults[i];
        
        // Skip items that are pending or skipped
        if (!matchResult || matchResult.state === 'pending' || matchResult.state === 'skipped') {
          continue;
        }
        
        // Extract data from row
        const qty = parseFloat(String(row[mappings['qty']] || '1')) || 1;
        const description = matchResult.state === 'manual' && matchResult.manualEntry?.description
          ? matchResult.manualEntry.description
          : String(row[mappings['description']] || '');
        
        const powerGroup = mappings['power_group'] ? String(row[mappings['power_group']] || '') : null;
        
        // Create line item
        const lineItem: Omit<LoadCalcLineItem, 'id' | 'created_at' | 'updated_at'> = {
          voltage_table_id: voltageTableId,
          part_id: matchResult.state === 'matched' ? matchResult.partId : null,
          manual_part_number: matchResult.state === 'manual' ? matchResult.manualEntry?.partNumber : null,
          description: description || null,
          qty,
          utilization_pct: 1.0, // Default to 100% utilization
          amperage_override: matchResult.state === 'manual' ? matchResult.manualEntry?.amperage : null,
          wattage_override: matchResult.state === 'manual' ? matchResult.manualEntry?.wattage : null,
          heat_dissipation_override: matchResult.state === 'manual' ? matchResult.manualEntry?.heatDissipation : null,
          power_group: powerGroup,
          phase_assignment: null, // Default phase assignment
          sort_order: i
        };
        
        lineItems.push(lineItem);
      }
      
      if (lineItems.length === 0) {
        throw new Error('No valid items to import (all items are pending or skipped)');
      }
      
      // Import to database
      const results = await loadCalcLineItems.bulkCreate(lineItems);
      const totalImported = results.reduce((sum, r) => sum + r.rowsAffected, 0);
      
      toast.success(`Successfully imported ${totalImported} items`);
      set({ isImporting: false, step: 'complete', lastImportCount: totalImported });
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
      set({ isImporting: false });
    }
  }
}));
