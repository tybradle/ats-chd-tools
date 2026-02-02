export type VoltageType =
  | 'DC'
  | '120VAC_1PH'
  | '230VAC_3PH'
  | '480VAC_3PH'
  | '480VAC_1PH'
  | '600VAC_3PH'
  | 'LEGACY';

export type PhaseAssignment = 'L1' | 'L2' | 'L3' | 'N' | 'UNK' | null;

export interface LoadCalcProject {
  id: number;
  name: string;
  description?: string | null;
  bom_package_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoadCalcVoltageTable {
  id: number;
  project_id: number;
  location_id?: number | null;
  voltage_type: VoltageType | string;
  is_locked?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LoadCalcLineItem {
  id: number;
  voltage_table_id: number;
  part_id?: number | null;
  manual_part_number?: string | null;
  description?: string | null;
  qty: number;
  utilization_pct: number; // stored as ratio 0.0 - 1.0
  amperage_override?: number | null;
  wattage_override?: number | null;
  heat_dissipation_override?: number | null;
  power_group?: string | null;
  phase_assignment?: PhaseAssignment;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LoadCalcResult {
  id: number;
  project_id: number;
  voltage_table_id?: number | null;
  total_watts?: number | null;
  total_amperes?: number | null;
  total_btu?: number | null;
  calculated_at?: string;
}

// --- Import Types ---

export interface ImportColumn {
  name: string;
  index: number;
  sampleValue?: string;
}

export interface MappingTemplate {
  id: string;
  name: string;
  mappings: Record<string, string>; // internal field -> excel column name
  createdAt: string;
}

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'complete';

export interface ImportState {
  file: File | null;
  headers: string[];
  rows: Record<string, unknown>[];
  mappings: Record<string, string>; // targetField -> sourceColumn
  step: ImportStep;
}

export const LOAD_CALC_IMPORT_FIELDS = [
  { id: 'part_number', label: 'Part Number', required: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'qty', label: 'Quantity', required: true },
  { id: 'power_group', label: 'Power Group', required: false },
  { id: 'voltage_type', label: 'Voltage Type', required: false },
] as const;
