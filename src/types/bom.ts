// ============================================
// BOM Translation Module Types
// ============================================

// Export formats supported
export type ExportFormat = 'EPLAN' | 'XML' | 'JSON' | 'CSV' | 'EXCEL';

// BOM Projects
export interface BOMProject {
  id: number;
  project_number: string;
  package_name: string;
  name: string | null;
  description: string | null;
  version: string;
  metadata: string | null;  // JSON string
  created_at: string;
  updated_at: string;
}

export interface BOMProjectWithCounts extends BOMProject {
  location_count: number;
  item_count: number;
}

// Locations
export interface BOMLocation {
  id: number;
  project_id: number;
  name: string;
  export_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BOMLocationWithCount extends BOMLocation {
  item_count: number;
}

// BOM Items
export interface BOMItem {
  id: number;
  project_id: number;
  location_id: number;
  part_id: number | null;
  part_number: string;
  description: string;
  secondary_description: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  manufacturer: string | null;
  supplier: string | null;
  category: string | null;
  reference_designator: string | null;
  is_spare: number; // SQLite boolean (0/1)
  metadata: string | null;  // JSON string
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BOMItemWithLocation extends BOMItem {
  location_name: string | null;
}

// Export History (metadata only)
export interface BOMExport {
  id: number;
  project_id: number;
  location_id: number | null;
  filename: string;
  format: ExportFormat;
  version: string;
  exported_at: string;
}

// CSV Import Types
export interface CSVRow {
  [key: string]: string;
}

export interface ImportPreview {
  items: Partial<BOMItem>[];
  errors: Array<{ row: number; message: string }>;
  totalRows: number;
  validRows: number;
}

export interface ColumnMapping {
  partNumber?: number;
  description?: number;
  secondaryDescription?: number;
  manufacturer?: number;
  quantity?: number;
  unit?: number;
  unitPrice?: number;
  category?: number;
  supplier?: number;
  referenceDesignator?: number;
}

// Export Result (for UI)
export interface ExportResult {
  filename: string;
  format: ExportFormat;
  zw1Filename?: string;  // For EPLAN exports
}
