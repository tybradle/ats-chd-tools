# BOM Translation Module Implementation Plan

# BOM Translation Module - Phase 1: Database Schema & Types

**Navigation:** **[Phase 1]** | [Phase 2](./2025-12-27-bom-translation-module-phase-2-store.md) | [Phase 3](./2025-12-27-bom-translation-module-phase-3-projects-ui.md) | [Phase 4](./2025-12-27-bom-translation-module-phase-4-detail-locations.md) | [Phase 5](./2025-12-27-bom-translation-module-phase-5-bom-table.md) | [Phase 6](./2025-12-27-bom-translation-module-phase-6-import-export.md) | [Index](./2025-12-27-bom-translation-module-INDEX.md)

**Prerequisites:**
- [ ] None (foundation phase)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create database schema, TypeScript types, and client operations for BOM translation module.

**Architecture:** SQLite database with BOM projects/locations/items tables matching BOM_JS schema structure.

**Tech Stack:** SQLite migrations, TypeScript interfaces, Tauri SQL plugin.

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
-- Adapted for: Tauri single-user desktop app
-- ============================================

-- BOM Projects
CREATE TABLE IF NOT EXISTS bom_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_number TEXT NOT NULL UNIQUE,
    package_name TEXT NOT NULL,
    name TEXT,
    description TEXT,
    version TEXT DEFAULT '1.0',
    metadata TEXT,  -- JSON blob for extensibility
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations within projects (kitting locations)
CREATE TABLE IF NOT EXISTS bom_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    export_name TEXT,  -- Override name for exports
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- BOM Items (line items within locations)
CREATE TABLE IF NOT EXISTS bom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_projects(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES bom_locations(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL,
    
    -- Core fields
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
    metadata TEXT,  -- JSON blob for extensibility
    
    -- Metadata
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Export History (metadata only - no content blob)
CREATE TABLE IF NOT EXISTS bom_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_projects(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES bom_locations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('EPLAN', 'XML', 'JSON', 'CSV', 'EXCEL')),
    version TEXT NOT NULL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bom_items_project ON bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_location ON bom_items(location_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_part ON bom_items(part_id);
CREATE INDEX IF NOT EXISTS idx_bom_locations_project ON bom_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_order ON bom_items(project_id, location_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bom_projects_number ON bom_projects(project_number);
CREATE INDEX IF NOT EXISTS idx_bom_exports_project ON bom_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_exports_format ON bom_exports(format);
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
import type { BOMProject, BOMLocation, BOMItem, BOMItemWithLocation, BOMProjectWithCounts, BOMLocationWithCount, BOMExport, ExportFormat } from '@/types/bom';
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
      metadata: item.metadata,
      sort_order: item.sort_order + 1,
    });
  },
};

// BOM Exports (history tracking - metadata only, no content blob)
export const bomExports = {
  getByProject: (projectId: number) =>
    query<BOMExport>(
      'SELECT * FROM bom_exports WHERE project_id = ? ORDER BY exported_at DESC',
      [projectId]
    ),

  create: (projectId: number, filename: string, format: ExportFormat, version: string, locationId?: number) =>
    execute(
      `INSERT INTO bom_exports (project_id, location_id, filename, format, version)
       VALUES (?, ?, ?, ?, ?)`,
      [projectId, locationId ?? null, filename, format, version]
    ),

  delete: (id: number) =>
    execute('DELETE FROM bom_exports WHERE id = ?', [id]),

  deleteByProject: (projectId: number) =>
    execute('DELETE FROM bom_exports WHERE project_id = ?', [projectId]),
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

## Phase Complete Checklist

Before moving to next phase, verify:
- [ ] BOM database migration created and applied
- [ ] TypeScript types defined for all BOM entities
- [ ] Database client extended with full BOM CRUD operations
- [ ] Tests pass and app starts without errors
- [ ] All code committed and ready for Phase 2 (Store)

