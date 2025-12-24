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
): Promise<{ rowsAffected: number; lastInsertId: number }> {
  const database = await getDb();
  const result = await database.execute(sql, bindValues);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertId: result.lastInsertId,
  };
}

/**
 * Run multiple queries in a transaction
 */
export async function transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const database = await getDb();
  await database.execute("BEGIN TRANSACTION");
  try {
    const result = await fn(database);
    await database.execute("COMMIT");
    return result;
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  }
}

// Type-safe query helpers for common operations

export interface Manufacturer {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface Part {
  id: number;
  part_number: string;
  manufacturer_id: number;
  description: string;
  secondary_description: string | null;
  category_id: number | null;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface PartWithManufacturer extends Part {
  manufacturer_name: string;
  manufacturer_code: string | null;
}

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
    SELECT p.*, m.name as manufacturer_name, m.code as manufacturer_code
    FROM parts p
    JOIN manufacturers m ON p.manufacturer_id = m.id
    ORDER BY p.part_number
  `),
  
  getById: (id: number) =>
    query<PartWithManufacturer>(`
      SELECT p.*, m.name as manufacturer_name, m.code as manufacturer_code
      FROM parts p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.id = ?
    `, [id]).then(rows => rows[0] ?? null),
  
  search: (term: string, limit = 50) =>
    query<PartWithManufacturer>(`
      SELECT p.*, m.name as manufacturer_name, m.code as manufacturer_code
      FROM parts p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.id IN (
        SELECT rowid FROM parts_fts WHERE parts_fts MATCH ?
      )
      LIMIT ?
    `, [`${term}*`, limit]),
  
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
