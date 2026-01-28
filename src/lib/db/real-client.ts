import Database from "@tauri-apps/plugin-sql";

// Database connection singleton
let db: Database | null = null;

const DB_NAME = "sqlite:ats-chd-tools.db";

/**
 * Get or create database connection
 */
export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_NAME);
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

/**
 * Execute a query that returns rows
 */
export async function query<T>(sql: string, bindValues: unknown[] = []): Promise<T[]> {
  const database = await getDb();
  return database.select<T[]>(sql, bindValues);
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 * Returns the number of affected rows and last insert id
 */
export async function execute(
  sql: string,
  bindValues: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId: number | undefined }> {
  const database = await getDb();
  const result = await database.execute(sql, bindValues);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId,
  };
}

/**
 * Run multiple queries in a transaction
 *
 * NOTE: With @tauri-apps/plugin-sql (sqlx pool), manual BEGIN/COMMIT statements
 * are not guaranteed to run on the same connection. Prefer single-statement writes
 * or implement true transactions in Rust if atomic multi-statement behavior is required.
 */
export async function transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const database = await getDb();
  await database.execute("BEGIN TRANSACTION");
  try {
    const result = await fn(database);
    await database.execute("COMMIT");
    return result;
  } catch (error) {
    try {
      await database.execute("ROLLBACK");
    } catch (rollbackError) {
      console.warn("Rollback failed:", rollbackError);
    }
    throw error;
  }
}

// Type-safe query helpers for common operations

import type { Manufacturer, Category, Part, PartWithManufacturer } from '@/types/parts';

export type { Manufacturer, Category, Part, PartWithManufacturer };

export interface Setting {
  key: string;
  value: string | null;
  updated_at: string;
}

// Manufacturers
export const manufacturers = {
  getAll: () => query<Manufacturer>("SELECT * FROM manufacturers ORDER BY name"),
  
  getById: (id: number) => 
    query<Manufacturer>("SELECT * FROM manufacturers WHERE id = ?", [id])
      .then(rows => rows[0] ?? null),
  
  getByName: (name: string) =>
    query<Manufacturer>("SELECT * FROM manufacturers WHERE LOWER(name) = LOWER(?) LIMIT 1", [name])
      .then(rows => rows[0] ?? null),
  
  create: (name: string, code?: string) =>
    execute("INSERT INTO manufacturers (name, code) VALUES (?, ?)", [name, code ?? null]),
  
  update: (id: number, name: string, code?: string) =>
    execute("UPDATE manufacturers SET name = ?, code = ? WHERE id = ?", [name, code ?? null, id]),
  
  delete: (id: number) =>
    execute("DELETE FROM manufacturers WHERE id = ?", [id]),
};

// Categories
export const categories = {
  getAll: () => query<Category>("SELECT * FROM categories ORDER BY name"),
  
  getById: (id: number) =>
    query<Category>("SELECT * FROM categories WHERE id = ?", [id])
      .then(rows => rows[0] ?? null),
  
  getByName: (name: string) =>
    query<Category>("SELECT * FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1", [name])
      .then(rows => rows[0] ?? null),
  
  getByParent: (parentId: number | null) =>
    query<Category>(
      parentId === null 
        ? "SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name"
        : "SELECT * FROM categories WHERE parent_id = ? ORDER BY name",
      parentId === null ? [] : [parentId]
    ),
  
  create: (name: string, parentId?: number) =>
    execute("INSERT INTO categories (name, parent_id) VALUES (?, ?)", [name, parentId ?? null]),
  
  update: (id: number, name: string, parentId?: number) =>
    execute("UPDATE categories SET name = ?, parent_id = ? WHERE id = ?", [name, parentId ?? null, id]),
  
  delete: (id: number) =>
    execute("DELETE FROM categories WHERE id = ?", [id]),
};

// Parts
export const parts = {
  getAll: () => query<PartWithManufacturer>(`
    SELECT 
      p.*, 
      m.name as manufacturer_name, 
      m.code as manufacturer_code,
      c.name as category_name
    FROM parts p
    JOIN manufacturers m ON p.manufacturer_id = m.id
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.part_number
  `),
  
  getById: (id: number) =>
    query<PartWithManufacturer>(`
      SELECT 
        p.*, 
        m.name as manufacturer_name, 
        m.code as manufacturer_code,
        c.name as category_name
      FROM parts p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]).then(rows => rows[0] ?? null),
  
  getByKey: (partNumber: string, manufacturerId: number) =>
    query<Part>(`
      SELECT * FROM parts 
      WHERE part_number = ? AND manufacturer_id = ? 
      LIMIT 1
    `, [partNumber, manufacturerId]).then(rows => rows[0] ?? null),
  
  search: (term: string, manufacturerIds: number[] = [], limit = 50) => {
    const hasTerm = term.trim().length > 0;
    const hasMfrFilter = manufacturerIds.length > 0;

    let sql = `
      SELECT 
        p.*, 
        m.name as manufacturer_name, 
        m.code as manufacturer_code,
        c.name as category_name
      FROM parts p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (hasTerm) {
      sql += ` AND (
        p.id IN (SELECT rowid FROM parts_fts WHERE parts_fts MATCH ?)
        OR 
        m.name LIKE ?
      )`;
      params.push(`${term}*`, `%${term}%`);
    }

    if (hasMfrFilter) {
      const placeholders = manufacturerIds.map(() => '?').join(', ');
      sql += ` AND p.manufacturer_id IN (${placeholders})`;
      params.push(...manufacturerIds);
    }

    sql += ` ORDER BY p.part_number LIMIT ?`;
    params.push(limit);

    return query<PartWithManufacturer>(sql, params);
  },
  
  create: (part: Omit<Part, "id" | "created_at" | "updated_at">) =>
    execute(
      `INSERT INTO parts (part_number, manufacturer_id, description, secondary_description, category_id, unit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [part.part_number, part.manufacturer_id, part.description, part.secondary_description, part.category_id, part.unit]
    ),
  
  update: (id: number, part: Partial<Omit<Part, "id" | "created_at" | "updated_at">>) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    if (part.part_number !== undefined) { fields.push("part_number = ?"); values.push(part.part_number); }
    if (part.manufacturer_id !== undefined) { fields.push("manufacturer_id = ?"); values.push(part.manufacturer_id); }
    if (part.description !== undefined) { fields.push("description = ?"); values.push(part.description); }
    if (part.secondary_description !== undefined) { fields.push("secondary_description = ?"); values.push(part.secondary_description); }
    if (part.category_id !== undefined) { fields.push("category_id = ?"); values.push(part.category_id); }
    if (part.unit !== undefined) { fields.push("unit = ?"); values.push(part.unit); }
    
    if (fields.length === 0) return Promise.resolve({ rowsAffected: 0, lastInsertId: 0 });
    
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    
    return execute(`UPDATE parts SET ${fields.join(", ")} WHERE id = ?`, values);
  },
  
  delete: (id: number) =>
    execute("DELETE FROM parts WHERE id = ?", [id]),
};

// Settings
export const settings = {
  get: (key: string) =>
    query<Setting>("SELECT * FROM settings WHERE key = ?", [key])
      .then(rows => rows[0]?.value ?? null),
  
  set: (key: string, value: string) =>
    execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    ),
  
  delete: (key: string) =>
    execute("DELETE FROM settings WHERE key = ?", [key]),
  
  getAll: () => query<Setting>("SELECT * FROM settings ORDER BY key"),
};

// ============================================
// BOM Translation Module Database Operations
// ============================================

import type { GlenairContact, GlenairArrangement, GlenairPHM } from '@/types/glenair';
import type { BOMProject, BOMLocation, BOMItem, BOMItemWithLocation, BOMProjectWithCounts, BOMLocationWithCount, BOMExport, ExportFormat, BOMJobProject, BOMPackage, BOMPackageWithCounts } from '@/types/bom';

// BOM Job Projects (job #)
export const bomJobProjects = {
  getAll: () =>
    query<BOMJobProject>(`
      SELECT * FROM bom_job_projects
      ORDER BY updated_at DESC
    `),

  getById: (id: number) =>
    query<BOMJobProject>('SELECT * FROM bom_job_projects WHERE id = ?', [id])
      .then(rows => rows[0] ?? null),

  create: (projectNumber: string) =>
    execute(
      `INSERT INTO bom_job_projects (project_number)
       VALUES (?)`,
      [projectNumber]
    ),

  update: (id: number, updates: { project_number?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.project_number !== undefined) {
      fields.push('project_number = ?');
      values.push(updates.project_number);
    }

    if (fields.length === 0) return Promise.resolve({ rowsAffected: 0, lastInsertId: 0 });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return execute(`UPDATE bom_job_projects SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  delete: (id: number) =>
    execute('DELETE FROM bom_job_projects WHERE id = ?', [id]),
};

// BOM Packages (scoped to Job Projects)
export const bomPackages = {
  getByProject: (projectId: number) =>
    query<BOMPackageWithCounts>(`
      SELECT
        p.*,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT i.id) as item_count
      FROM bom_packages p
      LEFT JOIN bom_locations l ON p.id = l.project_id
      LEFT JOIN bom_items i ON p.id = i.project_id
      WHERE p.project_id = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `, [projectId]),

  getById: (id: number) =>
    query<BOMPackageWithCounts>(`
      SELECT
        p.*,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT i.id) as item_count
      FROM bom_packages p
      LEFT JOIN bom_locations l ON p.id = l.project_id
      LEFT JOIN bom_items i ON p.id = i.project_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]).then(rows => rows[0] ?? null),

  getAllWithCounts: () =>
    query<BOMPackageWithCounts>(`
      SELECT
        p.*,
        jp.project_number,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT i.id) as item_count
      FROM bom_packages p
      JOIN bom_job_projects jp ON jp.id = p.project_id
      LEFT JOIN bom_locations l ON p.id = l.project_id
      LEFT JOIN bom_items i ON p.id = i.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `),

  create: (
    projectId: number,
    packageName: string,
    name?: string,
    description?: string,
    version = '1.0',
    metadata?: string | null
  ) =>
    execute(
      `INSERT INTO bom_packages (project_id, package_name, name, description, version, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [projectId, packageName, name ?? null, description ?? null, version, metadata ?? null]
    ),

  update: (id: number, updates: Partial<Omit<BOMPackage, 'id' | 'created_at' | 'updated_at'>>) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.package_name !== undefined) { fields.push('package_name = ?'); values.push(updates.package_name); }
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.version !== undefined) { fields.push('version = ?'); values.push(updates.version); }
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(updates.metadata); }

    if (fields.length === 0) return Promise.resolve({ rowsAffected: 0, lastInsertId: 0 });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return execute(`UPDATE bom_packages SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  delete: (id: number) =>
    execute('DELETE FROM bom_packages WHERE id = ?', [id]),

  bulkCreate: async (packages: Array<{ project_id: number; package_name: string; name: string | null; description: string | null; version: string; metadata: string | null }>) => {
    if (packages.length === 0) return [];

    const COLUMNS_PER_ROW = 6;
    const SQLITE_MAX_PARAMS = 999;
    const MAX_ROWS_PER_BATCH = Math.floor(SQLITE_MAX_PARAMS / COLUMNS_PER_ROW); // 166
    const db = await getDb();
    const results: Array<{ rowsAffected: number; lastInsertId: number | undefined }> = [];

    for (let i = 0; i < packages.length; i += MAX_ROWS_PER_BATCH) {
      const batch = packages.slice(i, Math.min(i + MAX_ROWS_PER_BATCH, packages.length));
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values: unknown[] = [];
      for (const pkg of batch) {
        values.push(pkg.project_id, pkg.package_name, pkg.name, pkg.description, pkg.version, pkg.metadata);
      }
      await db.execute(
        `INSERT INTO bom_packages (project_id, package_name, name, description, version, metadata) VALUES ${placeholders}`,
        values
      );
      results.push({ rowsAffected: batch.length, lastInsertId: undefined });
    }

    return results;
  },
};

// BOM Projects (legacy - deprecated, use bomPackages)
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
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(updates.metadata); }

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

  create: (projectId: number, name: string, exportName?: string, sortOrder?: number) =>
    execute(
      `INSERT INTO bom_locations (project_id, name, export_name, sort_order)
       VALUES (?, ?, ?, ?)`,
      [projectId, name, exportName ?? null, sortOrder ?? null]
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

  bulkCreate: async (locations: Array<{ project_id: number; name: string; export_name: string | null; sort_order: number }>) => {
    if (locations.length === 0) return [];

    const COLUMNS_PER_ROW = 4;
    const SQLITE_MAX_PARAMS = 999;
    const MAX_ROWS_PER_BATCH = Math.floor(SQLITE_MAX_PARAMS / COLUMNS_PER_ROW); // 249
    const db = await getDb();
    const results: Array<{ rowsAffected: number; lastInsertId: number | undefined }> = [];

    for (let i = 0; i < locations.length; i += MAX_ROWS_PER_BATCH) {
      const batch = locations.slice(i, Math.min(i + MAX_ROWS_PER_BATCH, locations.length));
      const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
      const values: unknown[] = [];
      for (const loc of batch) {
        values.push(loc.project_id, loc.name, loc.export_name, loc.sort_order);
      }
      await db.execute(
        `INSERT INTO bom_locations (project_id, name, export_name, sort_order) VALUES ${placeholders}`,
        values
      );
      results.push({ rowsAffected: batch.length, lastInsertId: undefined });
    }

    return results;
  },
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
        supplier, category, reference_designator, is_spare, metadata, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.project_id, item.location_id, item.part_id, item.part_number,
        item.description, item.secondary_description, item.quantity, item.unit,
        item.unit_price, item.manufacturer, item.supplier, item.category,
        item.reference_designator, item.is_spare, item.metadata, item.sort_order
      ]
    ),

  bulkCreate: async (items: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[]) => {
    if (items.length === 0) return [];

    // Get highest sort_order for the project
    const projectId = items[0]?.project_id;
    const lastItem = await query<{ max_order: number }>(
      'SELECT MAX(sort_order) as max_order FROM bom_items WHERE project_id = ?',
      [projectId]
    );
    let startOrder = (lastItem[0]?.max_order ?? 0) + 1;

    // Insert items in batches (each batch is atomic as a single multi-row INSERT)
    // SQLite has a limit of 999 bind parameters per statement
    const COLUMNS_PER_ROW = 16;
    const SQLITE_MAX_PARAMS = 999;
    const MAX_ROWS_PER_BATCH = Math.floor(SQLITE_MAX_PARAMS / COLUMNS_PER_ROW); // 62
    const db = await getDb();
    const results: Array<{ rowsAffected: number; lastInsertId: number | undefined }> = [];

    for (let i = 0; i < items.length; i += MAX_ROWS_PER_BATCH) {
      const batch = items.slice(i, Math.min(i + MAX_ROWS_PER_BATCH, items.length));
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values: unknown[] = [];
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        values.push(
          item.project_id, item.location_id, item.part_id, item.part_number,
          item.description, item.secondary_description, item.quantity, item.unit,
          item.unit_price, item.manufacturer, item.supplier, item.category,
          item.reference_designator, item.is_spare, item.metadata, startOrder + j
        );
      }
      await db.execute(
        `INSERT INTO bom_items (
          project_id, location_id, part_id, part_number, description,
          secondary_description, quantity, unit, unit_price, manufacturer,
          supplier, category, reference_designator, is_spare, metadata, sort_order
        ) VALUES ${placeholders}`,
        values
      );
      results.push({ rowsAffected: batch.length, lastInsertId: undefined });
      startOrder += batch.length;
    }

    return results;
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
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(updates.metadata); }

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

// ============================================
// Glenair Module Database Operations
// ============================================

export const glenair = {
  // Contacts
  getContactsBySize: (size: string) =>
    query<GlenairContact>("SELECT * FROM glenair_contacts WHERE contact_size = ?", [size]),
  
  getContactsByPartNumber: (partNumber: string) =>
    query<GlenairContact>("SELECT * FROM glenair_contacts WHERE part_number = ?", [partNumber])
      .then(rows => rows[0] ?? null),

  // Arrangements
  getArrangementsByContactCount: (count: number, size: string) =>
    query<GlenairArrangement>(
      "SELECT * FROM glenair_arrangements WHERE total_contacts >= ? AND contact_size = ? ORDER BY total_contacts ASC",
      [count, size]
    ),

  getArrangementDetails: (arrangement: string) =>
    query<GlenairArrangement>("SELECT * FROM glenair_arrangements WHERE arrangement = ?", [arrangement]),

  // Wire Mappings
  getCompatibleContactSizes: (wireSize: string, system: string) =>
    query<{ contact_size: string }>(
      "SELECT contact_size FROM glenair_wire_contacts WHERE wire_size = ? AND system = ?",
      [wireSize, system]
    ),

  // PHM (Shell Size mapping)
  getPHMByArrangement: (arrangement: string) =>
    query<GlenairPHM>("SELECT * FROM glenair_phm WHERE arrangement = ?", [arrangement])
      .then(rows => rows[0] ?? null),
};
