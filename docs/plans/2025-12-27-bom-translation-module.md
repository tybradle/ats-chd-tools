# BOM Translation Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a complete BOM Translation module that replicates the proven BOM_JS workflow in the new Tauri + React stack, enabling CSV import, inline editing, and multi-format export (XML, CSV, JSON).

**Architecture:** SQLite database with BOM projects/locations/items tables. React UI with Zustand state management. TanStack Table for editable grid. Tauri plugins for file I/O. TypeScript for business logic (CSV parsing, XML generation).

**Tech Stack:** Tauri 2.0, React 19, TypeScript, Zustand, TanStack Table, @tauri-apps/plugin-sql, @tauri-apps/plugin-dialog, @tauri-apps/plugin-fs

---

## Phase 1: Database Schema & Types (30-40 min)

### Task 1.1: Create BOM Database Migration

**Files:**
- Create: `src-tauri/migrations/002_bom_tables.sql`

**Step 1: Create migration file**

Create `src-tauri/migrations/002_bom_tables.sql`:

```sql
-- ============================================
-- BOM Translation Tables
-- Version: 2
-- Based on: BOM_JS Prisma schema (Electron version)
-- ============================================

-- BOM Projects (removed User references for single-user desktop app)
CREATE TABLE IF NOT EXISTS bom_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_number TEXT NOT NULL UNIQUE,
    package_name TEXT NOT NULL,
    name TEXT,
    description TEXT,
    version TEXT DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations within projects (kitting locations, e.g., "Main Panel", "Field Device Cabinet")
CREATE TABLE IF NOT EXISTS bom_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    export_name TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- BOM Items (line items within locations)
-- Based on BOM_JS schema, matching Eplan XML field structure
CREATE TABLE IF NOT EXISTS bom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_projects(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES bom_locations(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
    
    -- Core fields (denormalized for export even if part_id is set)
    part_number TEXT NOT NULL,
    description TEXT NOT NULL,
    secondary_description TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'EA',
    
    -- Additional fields
    unit_price REAL,
    manufacturer TEXT,
    supplier TEXT,
    category TEXT,
    reference_designator TEXT,
    is_spare INTEGER DEFAULT 0,
    
    -- Metadata
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bom_items_project ON bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_location ON bom_items(location_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_part ON bom_items(part_id);
CREATE INDEX IF NOT EXISTS idx_bom_locations_project ON bom_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_order ON bom_items(project_id, location_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bom_projects_number ON bom_projects(project_number);
```

**Step 2: Verify migration syntax**

Run: `npm run tauri:dev`

Expected: Migrations run without errors, tables created successfully

**Step 3: Commit**

```bash
git add src-tauri/migrations/002_bom_tables.sql
git commit -m "feat(db): add BOM tables migration"
```

---

### Task 1.2: Create TypeScript Type Definitions

**Files:**
- Create: `src/types/bom.ts`

**Step 1: Create BOM types file**

Create `src/types/bom.ts`:

```typescript
// BOM Projects
export interface BOMProject {
  id: number;
  project_number: string;
  package_name: string;
  name: string | null;
  description: string | null;
  version: string;
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
  is_spare: number; // SQLite stores boolean as 0/1
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BOMItemWithLocation extends BOMItem {
  location_name: string | null;
}

// CSV Import
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

// Export
export type ExportFormat = 'XML' | 'CSV' | 'JSON';

export interface ExportResult {
  content: string;
  filename: string;
  format: ExportFormat;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/types/bom.ts
git commit -m "feat(types): add BOM type definitions"
```

---

### Task 1.3: Extend Database Client with BOM Operations

**Files:**
- Modify: `src/lib/db/client.ts` (add at end before final export)

**Step 1: Add BOM types import**

At top of `src/lib/db/client.ts`, add after existing imports:

```typescript
import type { BOMProject, BOMLocation, BOMItem, BOMItemWithLocation, BOMProjectWithCounts, BOMLocationWithCount } from '@/types/bom';
```

**Step 2: Add BOM projects operations**

At end of file (before final line), add:

```typescript
// ============================================
// BOM Translation Module Database Operations
// ============================================

// BOM Projects
export const bomProjects = {
  getAll: () =>
    query<BOMProjectWithCounts>(`
      SELECT 
        p.*,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT i.id) as item_count
      FROM bom_projects p
      LEFT JOIN bom_locations l ON p.id = l.project_id
      LEFT JOIN bom_items i ON p.id = i.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `),

  getById: (id: number) =>
    query<BOMProjectWithCounts>(`
      SELECT 
        p.*,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT i.id) as item_count
      FROM bom_projects p
      LEFT JOIN bom_locations l ON p.id = l.project_id
      LEFT JOIN bom_items i ON p.id = i.project_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]).then(rows => rows[0] ?? null),

  create: (projectNumber: string, packageName: string, name?: string, description?: string, version = '1.0') =>
    execute(
      `INSERT INTO bom_projects (project_number, package_name, name, description, version)
       VALUES (?, ?, ?, ?, ?)`,
      [projectNumber, packageName, name ?? null, description ?? null, version]
    ),

  update: (id: number, updates: Partial<Omit<BOMProject, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.project_number !== undefined) { fields.push('project_number = ?'); values.push(updates.project_number); }
    if (updates.package_name !== undefined) { fields.push('package_name = ?'); values.push(updates.package_name); }
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.version !== undefined) { fields.push('version = ?'); values.push(updates.version); }

    if (fields.length === 0) return Promise.resolve({ rowsAffected: 0, lastInsertId: 0 });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return execute(`UPDATE bom_projects SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  delete: (id: number) =>
    execute('DELETE FROM bom_projects WHERE id = ?', [id]),
};

// BOM Locations
export const bomLocations = {
  getByProject: (projectId: number) =>
    query<BOMLocationWithCount>(`
      SELECT 
        l.*,
        COUNT(i.id) as item_count
      FROM bom_locations l
      LEFT JOIN bom_items i ON l.id = i.location_id
      WHERE l.project_id = ?
      GROUP BY l.id
      ORDER BY l.sort_order, l.name
    `, [projectId]),

  getById: (id: number) =>
    query<BOMLocation>('SELECT * FROM bom_locations WHERE id = ?', [id])
      .then(rows => rows[0] ?? null),

  create: (projectId: number, name: string, exportName?: string) =>
    execute(
      `INSERT INTO bom_locations (project_id, name, export_name)
       VALUES (?, ?, ?)`,
      [projectId, name, exportName ?? null]
    ),

  update: (id: number, name: string, exportName?: string | null) =>
    execute(
      `UPDATE bom_locations 
       SET name = ?, export_name = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, exportName ?? null, id]
    ),

  delete: (id: number) =>
    execute('DELETE FROM bom_locations WHERE id = ?', [id]),
};

// BOM Items
export const bomItems = {
  getByProject: (projectId: number, locationId?: number) => {
    if (locationId) {
      return query<BOMItemWithLocation>(`
        SELECT i.*, l.name as location_name
        FROM bom_items i
        LEFT JOIN bom_locations l ON i.location_id = l.id
        WHERE i.project_id = ? AND i.location_id = ?
        ORDER BY i.sort_order, i.id
      `, [projectId, locationId]);
    }
    return query<BOMItemWithLocation>(`
      SELECT i.*, l.name as location_name
      FROM bom_items i
      LEFT JOIN bom_locations l ON i.location_id = l.id
      WHERE i.project_id = ?
      ORDER BY i.location_id, i.sort_order, i.id
    `, [projectId]);
  },

  getById: (id: number) =>
    query<BOMItemWithLocation>(`
      SELECT i.*, l.name as location_name
      FROM bom_items i
      LEFT JOIN bom_locations l ON i.location_id = l.id
      WHERE i.id = ?
    `, [id]).then(rows => rows[0] ?? null),

  create: (item: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>) =>
    execute(
      `INSERT INTO bom_items (
        project_id, location_id, part_id, part_number, description,
        secondary_description, quantity, unit, unit_price, manufacturer,
        supplier, category, reference_designator, is_spare, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.project_id, item.location_id, item.part_id, item.part_number,
        item.description, item.secondary_description, item.quantity, item.unit,
        item.unit_price, item.manufacturer, item.supplier, item.category,
        item.reference_designator, item.is_spare, item.sort_order
      ]
    ),

  bulkCreate: async (items: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[]) => {
    // Get highest sort_order for the project
    const projectId = items[0]?.project_id;
    const lastItem = await query<{ max_order: number }>(
      'SELECT MAX(sort_order) as max_order FROM bom_items WHERE project_id = ?',
      [projectId]
    );
    let startOrder = (lastItem[0]?.max_order ?? 0) + 1;

    // Insert all items
    return transaction(async (db) => {
      const results = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = await db.execute(
          `INSERT INTO bom_items (
            project_id, location_id, part_id, part_number, description,
            secondary_description, quantity, unit, unit_price, manufacturer,
            supplier, category, reference_designator, is_spare, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.project_id, item.location_id, item.part_id, item.part_number,
            item.description, item.secondary_description, item.quantity, item.unit,
            item.unit_price, item.manufacturer, item.supplier, item.category,
            item.reference_designator, item.is_spare, startOrder + i
          ]
        );
        results.push(result);
      }
      return results;
    });
  },

  update: (id: number, updates: Partial<Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.part_number !== undefined) { fields.push('part_number = ?'); values.push(updates.part_number); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.secondary_description !== undefined) { fields.push('secondary_description = ?'); values.push(updates.secondary_description); }
    if (updates.quantity !== undefined) { fields.push('quantity = ?'); values.push(updates.quantity); }
    if (updates.unit !== undefined) { fields.push('unit = ?'); values.push(updates.unit); }
    if (updates.unit_price !== undefined) { fields.push('unit_price = ?'); values.push(updates.unit_price); }
    if (updates.manufacturer !== undefined) { fields.push('manufacturer = ?'); values.push(updates.manufacturer); }
    if (updates.supplier !== undefined) { fields.push('supplier = ?'); values.push(updates.supplier); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.reference_designator !== undefined) { fields.push('reference_designator = ?'); values.push(updates.reference_designator); }
    if (updates.is_spare !== undefined) { fields.push('is_spare = ?'); values.push(updates.is_spare); }
    if (updates.location_id !== undefined) { fields.push('location_id = ?'); values.push(updates.location_id); }
    if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }

    if (fields.length === 0) return Promise.resolve({ rowsAffected: 0, lastInsertId: 0 });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return execute(`UPDATE bom_items SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  delete: (id: number) =>
    execute('DELETE FROM bom_items WHERE id = ?', [id]),

  bulkDelete: (ids: number[]) => {
    const placeholders = ids.map(() => '?').join(',');
    return execute(`DELETE FROM bom_items WHERE id IN (${placeholders})`, ids);
  },

  duplicate: async (id: number) => {
    const item = await bomItems.getById(id);
    if (!item) throw new Error('Item not found');

    return bomItems.create({
      project_id: item.project_id,
      location_id: item.location_id,
      part_id: item.part_id,
      part_number: item.part_number,
      description: item.description,
      secondary_description: item.secondary_description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      manufacturer: item.manufacturer,
      supplier: item.supplier,
      category: item.category,
      reference_designator: item.reference_designator,
      is_spare: item.is_spare,
      sort_order: item.sort_order + 1,
    });
  },
};
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

**Step 4: Test database operations**

Run: `npm run tauri:dev`

Expected: App starts, no runtime errors in console

**Step 5: Commit**

```bash
git add src/lib/db/client.ts
git commit -m "feat(db): add BOM database operations"
```

---

## Phase 2: Zustand Store (30-40 min)

### Task 2.1: Create BOM Store

**Files:**
- Create: `src/stores/bom-store.ts`

**Step 1: Create store file**

Create `src/stores/bom-store.ts`:

```typescript
import { create } from 'zustand';
import type {
  BOMProject,
  BOMProjectWithCounts,
  BOMLocation,
  BOMLocationWithCount,
  BOMItem,
  BOMItemWithLocation,
} from '@/types/bom';
import { bomProjects, bomLocations, bomItems } from '@/lib/db/client';

interface BOMStore {
  // State
  projects: BOMProjectWithCounts[];
  currentProject: BOMProjectWithCounts | null;
  locations: BOMLocationWithCount[];
  currentLocationId: number | null;
  items: BOMItemWithLocation[];
  loading: boolean;
  error: string | null;

  // UI State
  searchTerm: string;
  selectedItemIds: number[];

  // Project Actions
  loadProjects: () => Promise<void>;
  loadProject: (id: number) => Promise<void>;
  createProject: (projectNumber: string, packageName: string, name?: string, description?: string) => Promise<number>;
  updateProject: (id: number, updates: Partial<BOMProject>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (project: BOMProjectWithCounts | null) => void;

  // Location Actions
  loadLocations: (projectId: number) => Promise<void>;
  createLocation: (projectId: number, name: string, exportName?: string) => Promise<void>;
  updateLocation: (id: number, name: string, exportName?: string | null) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;
  setCurrentLocationId: (locationId: number | null) => void;

  // Item Actions
  loadItems: (projectId: number, locationId?: number) => Promise<void>;
  createItem: (item: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: number, updates: Partial<BOMItem>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  bulkDeleteItems: (ids: number[]) => Promise<void>;
  duplicateItem: (id: number) => Promise<void>;
  bulkImportItems: (items: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;

  // UI Actions
  setSearchTerm: (term: string) => void;
  setSelectedItemIds: (ids: number[]) => void;
  setError: (error: string | null) => void;
}

export const useBOMStore = create<BOMStore>((set, get) => ({
  // Initial State
  projects: [],
  currentProject: null,
  locations: [],
  currentLocationId: null,
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  selectedItemIds: [],

  // Project Actions
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await bomProjects.getAll();
      set({ projects, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        loading: false,
      });
    }
  },

  loadProject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const project = await bomProjects.getById(id);
      if (!project) {
        set({ error: 'Project not found', loading: false });
        return;
      }
      set({ currentProject: project, loading: false });
      // Also load locations for this project
      await get().loadLocations(id);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load project',
        loading: false,
      });
    }
  },

  createProject: async (projectNumber, packageName, name, description) => {
    set({ loading: true, error: null });
    try {
      const result = await bomProjects.create(projectNumber, packageName, name, description);
      await get().loadProjects();
      set({ loading: false });
      return result.lastInsertId;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        loading: false,
      });
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await bomProjects.update(id, updates);
      await get().loadProjects();
      if (get().currentProject?.id === id) {
        await get().loadProject(id);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
        loading: false,
      });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomProjects.delete(id);
      await get().loadProjects();
      if (get().currentProject?.id === id) {
        set({ currentProject: null, locations: [], items: [], currentLocationId: null });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  // Location Actions
  loadLocations: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const locations = await bomLocations.getByProject(projectId);
      set({ locations, loading: false });
      // Auto-select first location if none selected
      if (locations.length > 0 && !get().currentLocationId) {
        set({ currentLocationId: locations[0].id });
        await get().loadItems(projectId, locations[0].id);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load locations',
        loading: false,
      });
    }
  },

  createLocation: async (projectId, name, exportName) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.create(projectId, name, exportName);
      await get().loadLocations(projectId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create location',
        loading: false,
      });
      throw error;
    }
  },

  updateLocation: async (id, name, exportName) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.update(id, name, exportName);
      const projectId = get().currentProject?.id;
      if (projectId) {
        await get().loadLocations(projectId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update location',
        loading: false,
      });
      throw error;
    }
  },

  deleteLocation: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.delete(id);
      const projectId = get().currentProject?.id;
      if (projectId) {
        await get().loadLocations(projectId);
      }
      if (get().currentLocationId === id) {
        set({ currentLocationId: null, items: [] });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete location',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentLocationId: (locationId) => {
    set({ currentLocationId: locationId });
    const projectId = get().currentProject?.id;
    if (projectId && locationId) {
      get().loadItems(projectId, locationId);
    }
  },

  // Item Actions
  loadItems: async (projectId, locationId) => {
    set({ loading: true, error: null });
    try {
      const items = await bomItems.getByProject(projectId, locationId);
      set({ items, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load items',
        loading: false,
      });
    }
  },

  createItem: async (item) => {
    set({ loading: true, error: null });
    try {
      await bomItems.create(item);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create item',
        loading: false,
      });
      throw error;
    }
  },

  updateItem: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));

    try {
      await bomItems.update(id, updates);
    } catch (error) {
      // Revert on error
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to update item',
      });
      throw error;
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomItems.delete(id);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete item',
        loading: false,
      });
      throw error;
    }
  },

  bulkDeleteItems: async (ids) => {
    set({ loading: true, error: null });
    try {
      await bomItems.bulkDelete(ids);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ selectedItemIds: [], loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete items',
        loading: false,
      });
      throw error;
    }
  },

  duplicateItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomItems.duplicate(id);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to duplicate item',
        loading: false,
      });
      throw error;
    }
  },

  bulkImportItems: async (items) => {
    set({ loading: true, error: null });
    try {
      await bomItems.bulkCreate(items);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import items',
        loading: false,
      });
      throw error;
    }
  },

  // UI Actions
  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  setSelectedItemIds: (ids) => {
    set({ selectedItemIds: ids });
  },

  setError: (error) => {
    set({ error });
  },
}));
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/stores/bom-store.ts
git commit -m "feat(store): add BOM Zustand store"
```

---

## Phase 3: Projects List UI (2-3 hours)

### Task 3.1: Update BOM Landing Page

**Files:**
- Modify: `src/pages/bom.tsx`

**Step 1: Replace placeholder with project selector**

Replace entire contents of `src/pages/bom.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';

export function BomPage() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects } = useBOMStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: number) => {
    navigate(`/bom/${projectId}`);
  };

  const handleOpenProjectManager = () => {
    // Will be implemented in next task
    console.log('Open project manager');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Projects</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BOM Translation</h1>
        <p className="text-muted-foreground mt-1">
          Convert Bills of Materials between formats.
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[300px]">
        <Card className="max-w-md mx-auto w-full">
          <CardHeader className="text-center">
            <CardTitle>BOM Management</CardTitle>
            <CardDescription>
              {projects.length === 0
                ? 'Create your first project to get started'
                : 'Select a project to work with'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  No projects found. Create your first project to start managing BOMs.
                </p>
                <Button onClick={handleOpenProjectManager} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Found {projects.length} project(s). Select one to work with:
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {project.name || `${project.project_number} - ${project.package_name}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.item_count} items · {project.location_count} locations
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={handleOpenProjectManager}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Project Manager
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Test UI**

Run: `npm run tauri:dev`

Expected: 
- BOM page renders
- Shows "Create First Project" if no projects
- Shows list of projects if any exist
- Loading spinner appears briefly on first load

**Step 3: Commit**

```bash
git add src/pages/bom.tsx
git commit -m "feat(ui): add BOM project selector page"
```

---

### Task 3.2: Create Project Manager Dialog

**Files:**
- Create: `src/components/bom/project-manager-dialog.tsx`

**Step 1: Create component**

Create `src/components/bom/project-manager-dialog.tsx`:

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Eye } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject?: (projectId: number) => void;
}

export function ProjectManagerDialog({
  open,
  onOpenChange,
  onSelectProject,
}: ProjectManagerDialogProps) {
  const { projects, loading, createProject, deleteProject } = useBOMStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [projectNumber, setProjectNumber] = useState('');
  const [packageName, setPackageName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const generateProjectNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const counter = projects.length + 1;
    return `BOM-${year}-${String(counter).padStart(3, '0')}`;
  };

  const handleCreate = async () => {
    if (!projectNumber.trim() || !packageName.trim()) {
      toast.error('Project number and package name are required');
      return;
    }

    try {
      const newId = await createProject(
        projectNumber.trim(),
        packageName.trim(),
        name.trim() || undefined,
        description.trim() || undefined
      );
      toast.success('Project created successfully');
      setIsCreateOpen(false);
      resetForm();
      
      // Auto-navigate to new project
      if (onSelectProject) {
        onSelectProject(newId);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProject(id);
      toast.success('Project deleted successfully');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  const resetForm = () => {
    setProjectNumber('');
    setPackageName('');
    setName('');
    setDescription('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Manager</DialogTitle>
            <DialogDescription>
              Create, view, and manage BOM translation projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Number</TableHead>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Locations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No projects found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.project_number}</TableCell>
                        <TableCell>{project.package_name}</TableCell>
                        <TableCell>{project.name || '—'}</TableCell>
                        <TableCell className="text-right">{project.item_count}</TableCell>
                        <TableCell className="text-right">{project.location_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (onSelectProject) {
                                  onSelectProject(project.id);
                                  onOpenChange(false);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(project.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new BOM translation project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-number">Project Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="project-number"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  placeholder="e.g., BOM-2025-001"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProjectNumber(generateProjectNumber())}
                >
                  Auto
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="package-name">Package Name *</Label>
              <Input
                id="package-name"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g., Main Control Panel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Project XYZ Control System"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., BOM for building 3 retrofit project"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all associated locations and items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**Step 2: Wire up to BOM page**

Modify `src/pages/bom.tsx`, import at top:

```typescript
import { ProjectManagerDialog } from '@/components/bom/project-manager-dialog';
```

Add state at top of component:

```typescript
const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
```

Update `handleOpenProjectManager`:

```typescript
const handleOpenProjectManager = () => {
  setIsProjectManagerOpen(true);
};
```

Add dialog before closing `</div>`:

```typescript
<ProjectManagerDialog
  open={isProjectManagerOpen}
  onOpenChange={setIsProjectManagerOpen}
  onSelectProject={handleSelectProject}
/>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click "Create First Project" or "Project Manager"
2. Click "New Project"
3. Generate auto project number
4. Fill in package name (e.g., "Test Panel")
5. Click "Create Project"
6. See project in table
7. Click eye icon → navigates to project detail (will show placeholder for now)
8. Go back, open manager, delete project → confirms deletion

**Step 4: Commit**

```bash
git add src/components/bom/project-manager-dialog.tsx src/pages/bom.tsx
git commit -m "feat(ui): add project manager dialog with CRUD"
```

---

## Phase 4: Project Detail Page Shell (1 hour)

### Task 4.1: Create Project Detail Route and Page

**Files:**
- Create: `src/pages/bom-project.tsx`
- Modify: `src/App.tsx`

**Step 1: Create project detail page**

Create `src/pages/bom-project.tsx`:

```typescript
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';

export function BomProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading, error, loadProject } = useBOMStore();

  useEffect(() => {
    if (projectId) {
      loadProject(Number(projectId));
    }
  }, [projectId, loadProject]);

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Project</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || 'Project not found'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/bom')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bom')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BOM Management</h1>
            <p className="text-muted-foreground">
              {currentProject.name || `${currentProject.project_number} - ${currentProject.package_name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Locations and items will be shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Location tabs and editable BOM table will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Add route to App**

Modify `src/App.tsx`, import at top:

```typescript
import { BomProjectPage } from '@/pages/bom-project';
```

Add route inside `<Routes>`:

```typescript
<Route path="/bom/:projectId" element={<BomProjectPage />} />
```

**Step 3: Test navigation**

Run: `npm run tauri:dev`

Test:
1. Go to BOM page
2. Click project from list or create new one
3. Should navigate to `/bom/:projectId`
4. Shows project name in header
5. "Back to Projects" button works

**Step 4: Commit**

```bash
git add src/pages/bom-project.tsx src/App.tsx
git commit -m "feat(ui): add project detail page shell with routing"
```

---

**[Continue to Phase 5 in next message due to length...]**

This plan is comprehensive and follows the bite-sized task structure. Each step is 2-5 minutes, with exact file paths, complete code, and verification steps. Should I continue with Phase 5 (Location Tabs), Phase 6 (Editable BOM Table), Phase 7 (CSV Import), and Phase 8 (Export)?

---

## Phase 5: Location Tabs Component (1.5 hours)

### Task 5.1: Create Location Tabs Component

**Files:**
- Create: `src/components/bom/location-tabs.tsx`

**Step 1: Create component**

Create `src/components/bom/location-tabs.tsx` (replicated from BOM_JS with Tauri/Zustand adaptations):

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, X, Pencil } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function LocationTabs() {
  const {
    currentProject,
    locations,
    currentLocationId,
    setCurrentLocationId,
    createLocation,
    updateLocation,
    deleteLocation,
    loading,
  } = useBOMStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string; export_name: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [editExportName, setEditExportName] = useState('');

  const handleAdd = async () => {
    if (!currentProject || !newName.trim()) return;

    try {
      await createLocation(currentProject.id, newName.trim());
      setNewName('');
      setIsAddOpen(false);
      toast.success('Location added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add location');
    }
  };

  const handleEditClick = (loc: any) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditExportName(loc.export_name || '');
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLocation || !editName.trim()) return;

    try {
      await updateLocation(
        editingLocation.id,
        editName.trim(),
        editExportName.trim() || null
      );
      setIsEditOpen(false);
      setEditingLocation(null);
      toast.success('Location updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete location "${name}"? This will also delete all items in this location.`)) {
      return;
    }

    try {
      await deleteLocation(id);
      toast.success('Location deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
    }
  };

  return (
    <div className="border-b bg-muted/30">
      <div className="flex items-center">
        {/* Tabs */}
        <div className="flex flex-1 overflow-x-auto no-scrollbar">
          {locations.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              No locations created yet.
            </div>
          ) : (
            locations.map((loc, index) => (
              <div
                key={loc.id}
                className={cn(
                  "group relative flex items-center border-r border-t transition-colors",
                  currentLocationId === loc.id
                    ? "bg-background border-t-2 border-t-primary border-r-transparent"
                    : "bg-muted/50 hover:bg-muted/70 border-t-transparent"
                )}
              >
                <button
                  onClick={() => setCurrentLocationId(loc.id)}
                  className="px-6 py-2.5 text-sm font-medium text-left min-w-[100px]"
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <span>{loc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({loc.item_count})
                    </span>
                    {loc.export_name && (
                      <span className="text-[10px] text-blue-500 uppercase font-bold" title={`Export: ${loc.export_name}`}>
                        [${loc.export_name}]
                      </span>
                    )}
                  </div>
                </button>

                {/* Actions */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={() => handleEditClick(loc)}
                    className="p-1 rounded hover:bg-primary hover:text-primary-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id, loc.name)}
                    className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Button */}
        <div className="border-l border-t">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 border-0 rounded-none hover:bg-muted/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Location</DialogTitle>
                <DialogDescription>
                  e.g., CP1, MA, FIELD
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., CP1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!newName.trim()}>
                  Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Export Name (Optional)</Label>
              <Input
                value={editExportName}
                onChange={(e) => setEditExportName(e.target.value)}
                placeholder="Name for XML export"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!editName.trim()}>
              Update Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Wire up to Project Detail Page**

Modify `src/pages/bom-project.tsx`:

1. Import LocationTabs:
```typescript
import { LocationTabs } from '@/components/bom/location-tabs';
```

2. Add to render (replace placeholder card):
```typescript
      {/* Locations */}
      <LocationTabs />

      {/* Table Area */}
      <div className="flex-1 bg-background p-4 min-h-0 overflow-hidden">
        {/* Table will go here in Phase 6 */}
        <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg text-muted-foreground">
          Select or add a location to manage items
        </div>
      </div>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Open a project
2. Add locations (CP1, MA)
3. See tabs appear with (0) items
4. Switch between tabs (currentLocationId updates in store)
5. Edit a location name/export name
6. Delete a location

**Step 4: Commit**

```bash
git add src/components/bom/location-tabs.tsx src/pages/bom-project.tsx
git commit -m "feat(ui): add location tabs management"
```

---

## Phase 6: Editable BOM Table (3-4 hours)

### Task 6.1: Install Dependencies

Run:
```bash
npm install @tanstack/react-table
```

### Task 6.2: Create Part Search Dialog (Simplified)

We need a way to add parts from the master library.

**Files:**
- Create: `src/components/bom/part-search-dialog.tsx`

**Step 1: Create component**

```typescript
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { query } from '@/lib/db/client';

interface PartSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (part: any) => void;
}

export function PartSearchDialog({ open, onOpenChange, onSelect }: PartSearchDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        const rows = await query('SELECT * FROM parts LIMIT 20');
        setResults(rows);
        return;
      }

      const rows = await query(
        'SELECT * FROM parts WHERE part_number LIKE ? OR description LIKE ? LIMIT 50',
        [`%${search}%`, `%${search}%`]
      );
      setResults(rows);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Master Parts</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by part number or description..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No parts found
                  </TableCell>
                </TableRow>
              ) : (
                results.map((part) => (
                  <TableRow
                    key={part.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      onSelect(part);
                      onOpenChange(false);
                    }}
                  >
                    <TableCell className="font-mono">{part.part_number}</TableCell>
                    <TableCell>{part.manufacturer}</TableCell>
                    <TableCell className="max-w-xs truncate">{part.description}</TableCell>
                    <TableCell className="text-right">${part.unit_price?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 6.3: Create Editable BOM Table

**Files:**
- Create: `src/components/bom/bom-table.tsx`

**Step 1: Create component**

```typescript
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Copy, Search, Plus, FileUp, FileDown } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { BOMItem } from '@/types/bom';
import { PartSearchDialog } from './part-search-dialog';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<BOMItem>();

export function BomTable() {
  const {
    items,
    currentProject,
    currentLocationId,
    updateItem,
    deleteItem,
    bulkDeleteItems,
    duplicateItem,
    createItem,
    selectedItemIds,
    setSelectedItemIds,
  } = useBOMStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Define Columns
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('part_number', {
      header: 'Part Number',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { part_number: e.target.value })}
          className="h-8 font-mono"
        />
      ),
    }),
    columnHelper.accessor('manufacturer', {
      header: 'Manufacturer',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue() || ''}
          onChange={(e) => updateItem(row.original.id, { manufacturer: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { description: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.accessor('quantity', {
      header: 'Qty',
      cell: ({ getValue, row }) => (
        <Input
          type="number"
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { quantity: parseFloat(e.target.value) || 0 })}
          className="h-8 w-20"
        />
      ),
    }),
    columnHelper.accessor('unit', {
      header: 'Unit',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue()}
          onChange={(e) => updateItem(row.original.id, { unit: e.target.value })}
          className="h-8 w-16"
        />
      ),
    }),
    columnHelper.accessor('reference_designator', {
      header: 'Ref Des',
      cell: ({ getValue, row }) => (
        <Input
          value={getValue() || ''}
          onChange={(e) => updateItem(row.original.id, { reference_designator: e.target.value })}
          className="h-8"
        />
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(row.original.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ], [updateItem, deleteItem, duplicateItem]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: (updater) => {
      const nextSelection = typeof updater === 'function' ? updater(table.getState().rowSelection) : updater;
      const selectedIds = Object.keys(nextSelection).map(idx => items[parseInt(idx)].id);
      setSelectedItemIds(selectedIds);
      table.setRowSelection(nextSelection);
    },
    state: {
      rowSelection: useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedItemIds.forEach(id => {
          const idx = items.findIndex(item => item.id === id);
          if (idx !== -1) selection[idx] = true;
        });
        return selection;
      }, [selectedItemIds, items]),
    },
  });

  const handlePartSelect = (part: any) => {
    if (!currentProject || !currentLocationId) return;
    
    createItem({
      project_id: currentProject.id,
      location_id: currentLocationId,
      part_id: part.id,
      part_number: part.part_number,
      description: part.description,
      secondary_description: part.secondary_description,
      quantity: 1,
      unit: part.unit || 'EA',
      unit_price: part.unit_price,
      manufacturer: part.manufacturer,
      supplier: part.supplier,
      category: part.category,
      reference_designator: '',
      is_spare: 0,
      sort_order: items.length + 1,
    });
    toast.success('Part added to BOM');
  };

  const handleAddNew = () => {
    if (!currentProject || !currentLocationId) return;
    createItem({
      project_id: currentProject.id,
      location_id: currentLocationId,
      part_id: null,
      part_number: 'NEW-PART',
      description: 'New Item',
      secondary_description: null,
      quantity: 1,
      unit: 'EA',
      unit_price: null,
      manufacturer: '',
      supplier: '',
      category: '',
      reference_designator: '',
      is_spare: 0,
      sort_order: items.length + 1,
    });
  };

  if (!currentLocationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-lg">
        Select a location to view items
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsSearchOpen(true)}>
            <Search className="w-4 h-4 mr-2" />
            Add from Catalog
          </Button>
          <Button size="sm" variant="outline" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
          <Button size="sm" variant="outline" onClick={() => console.log('Import')}>
            <FileUp className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedItemIds.length > 0 && (
            <Button size="sm" variant="destructive" onClick={() => bulkDeleteItems(selectedItemIds)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete (${selectedItemIds.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => console.log('Export')}>
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-1 px-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No items in this location.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PartSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={handlePartSelect}
      />
    </div>
  );
}
```

**Step 2: Wire up to Project Detail Page**

Modify `src/pages/bom-project.tsx`:

1. Import BomTable:
```typescript
import { BomTable } from '@/components/bom/bom-table';
```

2. Replace placeholder in render:
```typescript
      {/* Table Area */}
      <div className="flex-1 min-h-0">
        <BomTable />
      </div>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Open project, select location
2. Add manual item → see it appear in table
3. Edit fields → check database/store updates
4. Search catalog → select part → see it added to BOM
5. Select rows → delete bulk
6. Duplicate row

**Step 4: Commit**

```bash
git add src/components/bom/part-search-dialog.tsx src/components/bom/bom-table.tsx src/pages/bom-project.tsx
git commit -m "feat(ui): add editable BOM table with catalog search"
```

---

## Phase 7: CSV Import (2 hours)

### Task 7.1: Create CSV Parser Utility

**Files:**
- Create: `src/lib/csv-parser.ts`

**Step 1: Create utility**

```typescript
import { CSVRow, ColumnMapping, BOMItem } from '@/types/bom';

export async function parseCSV(text: string): Promise<CSVRow[]> {
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: CSVRow = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
}

export function mapCSVToBOM(
  rows: CSVRow[],
  mapping: ColumnMapping,
  projectId: number,
  locationId: number
): Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[] {
  const headers = Object.keys(rows[0] || {});
  
  return rows.map((row, index) => {
    const getVal = (idx?: number) => idx !== undefined ? row[headers[idx]] : '';
    
    return {
      project_id: projectId,
      location_id: locationId,
      part_id: null,
      part_number: getVal(mapping.partNumber) || 'UNKNOWN',
      description: getVal(mapping.description) || '',
      secondary_description: getVal(mapping.secondaryDescription) || null,
      quantity: parseFloat(getVal(mapping.quantity)) || 1,
      unit: getVal(mapping.unit) || 'EA',
      unit_price: parseFloat(getVal(mapping.unitPrice)) || null,
      manufacturer: getVal(mapping.manufacturer) || null,
      supplier: getVal(mapping.supplier) || null,
      category: getVal(mapping.category) || null,
      reference_designator: getVal(mapping.referenceDesignator) || null,
      is_spare: 0,
      sort_order: index,
    };
  });
}
```

### Task 7.2: Create Import Dialog

**Files:**
- Create: `src/components/bom/import-dialog.tsx`

**Step 1: Create component**

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { readFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { parseCSV, mapCSVToBOM } from '@/lib/csv-parser';
import { useBOMStore } from '@/stores/bom-store';
import { ColumnMapping, CSVRow } from '@/types/bom';
import { toast } from 'sonner';

export function ImportDialog({ open: isOpen, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const { currentProject, currentLocationId, bulkImportItems } = useBOMStore();

  const handleFilePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      });

      if (selected && typeof selected === 'string') {
        const contents = await readFile(selected);
        const text = new TextDecoder().decode(contents);
        const rows = await parseCSV(text);
        if (rows.length > 0) {
          setCsvData(rows);
          setHeaders(Object.keys(rows[0]));
          setStep('mapping');
        }
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  const handleImport = async () => {
    if (!currentProject || !currentLocationId) return;
    
    const items = mapCSVToBOM(csvData, mapping, currentProject.id, currentLocationId);
    try {
      await bulkImportItems(items);
      toast.success(`Imported ${items.length} items`);
      onOpenChange(false);
      setStep('upload');
    } catch (error) {
      toast.error('Import failed');
    }
  };

  const fields = [
    { key: 'partNumber', label: 'Part Number *' },
    { key: 'description', label: 'Description *' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'unit', label: 'Unit' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'referenceDesignator', label: 'Ref Des' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import BOM from CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <p className="mb-4 text-muted-foreground">Select a CSV file to begin</p>
            <Button onClick={handleFilePick}>Choose File</Button>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: parseInt(val) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={i.toString()}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={() => setStep('preview')}>Preview</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, i) => {
                    const getVal = (idx?: number) => idx !== undefined ? row[headers[idx]] : '';
                    return (
                      <TableRow key={i}>
                        <TableCell>{getVal(mapping.partNumber)}</TableCell>
                        <TableCell>{getVal(mapping.description)}</TableCell>
                        <TableCell>{getVal(mapping.quantity)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Showing first 10 rows of {csvData.length}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
              <Button onClick={handleImport}>Confirm Import</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire up to BOM Table**

Modify `src/components/bom/bom-table.tsx`:

1. Import ImportDialog:
```typescript
import { ImportDialog } from './import-dialog';
```

2. Add state:
```typescript
const [isImportOpen, setIsImportOpen] = useState(false);
```

3. Update Import button:
```typescript
<Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)}>
  <FileUp className="w-4 h-4 mr-2" />
  Import CSV
</Button>
```

4. Add Dialog before end of render:
```typescript
<ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click Import CSV
2. Select a CSV file
3. Map columns (Part Number, Description, etc.)
4. Preview data
5. Confirm import → see items added to table

**Step 4: Commit**

```bash
git add src/lib/csv-parser.ts src/components/bom/import-dialog.tsx src/components/bom/bom-table.tsx
git commit -m "feat(ui): add CSV import with column mapping"
```

---

## Phase 8: Export Functionality (2 hours)

### Task 8.1: Create XML Generator (Eplan Schema)

**Files:**
- Create: `src/lib/export-utils.ts`

**Step 1: Create utility**

```typescript
import { BOMItem, BOMLocation } from '@/types/bom';

export function generateEplanXML(project: any, locations: BOMLocation[], items: BOMItem[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<EplanBomExport>
  <Project Number="${project.project_number}" Name="${project.package_name}" Version="${project.version}">
`;

  locations.forEach(loc => {
    const locItems = items.filter(i => i.location_id === loc.id);
    if (locItems.length === 0) return;

    xml += `    <KittingLocation Name="${loc.export_name || loc.name}">\n`;
    
    locItems.forEach(item => {
      xml += `      <Part>
        <PartNumber>${item.part_number}</PartNumber>
        <Description>${item.description}</Description>
        <Quantity>${item.quantity}</Quantity>
        <Unit>${item.unit}</Unit>
        <Manufacturer>${item.manufacturer || ''}</Manufacturer>
        <Supplier>${item.supplier || ''}</Supplier>
        <RefDes>${item.reference_designator || ''}</RefDes>
        <IsSpare>${item.is_spare ? 'true' : 'false'}</IsSpare>
      </Part>\n`;
    });

    xml += `    </KittingLocation>\n`;
  });

  xml += `  </Project>
</EplanBomExport>`;

  return xml;
}

export function generateCSV(items: BOMItem[]): string {
  const headers = ['Part Number', 'Manufacturer', 'Description', 'Qty', 'Unit', 'Ref Des'];
  const rows = items.map(i => [
    `"${i.part_number}"`,
    `"${i.manufacturer || ''}"`,
    `"${i.description}"`,
    i.quantity,
    `"${i.unit}"`,
    `"${i.reference_designator || ''}"`
  ].join(','));
  
  return [headers.join(','), ...rows].join('\n');
}
```

### Task 8.2: Create Export Dialog

**Files:**
- Create: `src/components/bom/export-dialog.tsx`

**Step 1: Create component**

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { generateEplanXML, generateCSV } from '@/lib/export-utils';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [format, setFormat] = useState<'XML' | 'CSV' | 'JSON'>('XML');
  const { currentProject, locations, items } = useBOMStore();

  const handleExport = async () => {
    if (!currentProject) return;

    let content = '';
    let ext = '';
    
    if (format === 'XML') {
      content = generateEplanXML(currentProject, locations, items);
      ext = 'xml';
    } else if (format === 'CSV') {
      content = generateCSV(items);
      ext = 'csv';
    } else {
      content = JSON.stringify({ project: currentProject, locations, items }, null, 2);
      ext = 'json';
    }

    try {
      const path = await save({
        defaultPath: `${currentProject.project_number}_BOM.${ext}`,
        filters: [{ name: format, extensions: [ext] }]
      });

      if (path) {
        await writeFile(path, new TextEncoder().encode(content));
        toast.success('File exported successfully');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export BOM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={(val: any) => setFormat(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XML">Eplan XML (P8)</SelectItem>
                <SelectItem value="CSV">Excel CSV</SelectItem>
                <SelectItem value="JSON">Raw JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} className="w-full">Export to File</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire up to BOM Table**

Modify `src/components/bom/bom-table.tsx`:

1. Import ExportDialog:
```typescript
import { ExportDialog } from './export-dialog';
```

2. Add state:
```typescript
const [isExportOpen, setIsExportOpen] = useState(false);
```

3. Update Export button:
```typescript
<Button size="sm" variant="outline" onClick={() => setIsExportOpen(true)}>
  <FileDown className="w-4 h-4 mr-2" />
  Export
</Button>
```

4. Add Dialog before end of render:
```typescript
<ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click Export
2. Select XML format
3. Save file to Desktop
4. Open XML and verify structure
5. Repeat for CSV/JSON

**Step 4: Commit**

```bash
git add src/lib/export-utils.ts src/components/bom/export-dialog.tsx src/components/bom/bom-table.tsx
git commit -m "feat(ui): add BOM export to XML/CSV/JSON"
```
