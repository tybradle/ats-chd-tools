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
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Locations within projects (kitting locations)
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
    metadata TEXT,
    
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
