-- ============================================
-- ATS CHD Tools - Initial Database Schema
-- Version: 1
-- ============================================

-- Manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER REFERENCES categories(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Master Parts
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL,
    manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id),
    description TEXT NOT NULL,
    secondary_description TEXT,
    category_id INTEGER REFERENCES categories(id),
    unit TEXT DEFAULT 'EA',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(part_number, manufacturer_id)
);

-- Part Pricing (for Quoting module)
CREATE TABLE IF NOT EXISTS part_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    supplier TEXT,
    unit_cost REAL,
    currency TEXT DEFAULT 'USD',
    lead_time_days INTEGER,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(part_id, supplier)
);

-- Part Electrical Specs (for Heat/Load module)
CREATE TABLE IF NOT EXISTS part_electrical (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    voltage REAL,
    amperage REAL,
    wattage REAL,
    phase INTEGER,
    heat_dissipation_btu REAL,
    UNIQUE(part_id)
);

-- Full-text search index for parts
CREATE VIRTUAL TABLE IF NOT EXISTS parts_fts USING fts5(
    part_number,
    description,
    secondary_description,
    content='parts',
    content_rowid='id'
);

-- Triggers to keep FTS in sync with parts table
CREATE TRIGGER IF NOT EXISTS parts_ai AFTER INSERT ON parts BEGIN
    INSERT INTO parts_fts(rowid, part_number, description, secondary_description)
    VALUES (new.id, new.part_number, new.description, new.secondary_description);
END;

CREATE TRIGGER IF NOT EXISTS parts_ad AFTER DELETE ON parts BEGIN
    INSERT INTO parts_fts(parts_fts, rowid, part_number, description, secondary_description)
    VALUES('delete', old.id, old.part_number, old.description, old.secondary_description);
END;

CREATE TRIGGER IF NOT EXISTS parts_au AFTER UPDATE ON parts BEGIN
    INSERT INTO parts_fts(parts_fts, rowid, part_number, description, secondary_description)
    VALUES('delete', old.id, old.part_number, old.description, old.secondary_description);
    INSERT INTO parts_fts(rowid, part_number, description, secondary_description)
    VALUES (new.id, new.part_number, new.description, new.secondary_description);
END;

-- App settings key-value store
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON parts(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category_id);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_part_pricing_part ON part_pricing(part_id);
CREATE INDEX IF NOT EXISTS idx_part_electrical_part ON part_electrical(part_id);
