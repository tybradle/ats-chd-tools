-- ============================================
-- Project/Package Scoping Migration
-- Version: 4
-- Purpose: Introduce hierarchical Project(job#) → Packages model
-- Strategy: Preserve existing scope IDs by copying bom_projects.id into bom_packages.id
-- ============================================

BEGIN TRANSACTION;

-- Disable foreign key enforcement temporarily for table rebuild
PRAGMA foreign_keys = OFF;

-- Step 1: Rename existing table
ALTER TABLE bom_projects RENAME TO bom_projects_old;

-- Step 2: Create bom_job_projects (job # projects)
CREATE TABLE IF NOT EXISTS bom_job_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_number TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create bom_packages (packages scoped to a job project)
CREATE TABLE IF NOT EXISTS bom_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_job_projects(id) ON DELETE CASCADE,
    package_name TEXT NOT NULL,
    name TEXT,
    description TEXT,
    version TEXT DEFAULT '1.0',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, package_name)
);

-- Step 4: Backfill bom_job_projects from distinct project_numbers
INSERT INTO bom_job_projects (project_number, created_at, updated_at)
SELECT DISTINCT
    project_number,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at
FROM bom_projects_old
GROUP BY project_number;

-- Step 5: Backfill bom_packages preserving IDs
INSERT INTO bom_packages (id, project_id, package_name, name, description, version, metadata, created_at, updated_at)
SELECT
    old.id,
    jp.id as project_id,
    old.package_name,
    old.name,
    old.description,
    old.version,
    old.metadata,
    old.created_at,
    old.updated_at
FROM bom_projects_old old
JOIN bom_job_projects jp ON jp.project_number = old.project_number;

-- Step 6: Rebuild dependent tables to point FKs to bom_packages(id)

-- Rebuild bom_locations
ALTER TABLE bom_locations RENAME TO bom_locations_old;

CREATE TABLE IF NOT EXISTS bom_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_packages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    export_name TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

INSERT INTO bom_locations (id, project_id, name, export_name, sort_order, created_at, updated_at)
SELECT id, project_id, name, export_name, sort_order, created_at, updated_at
FROM bom_locations_old;

DROP TABLE bom_locations_old;

-- Rebuild bom_items
ALTER TABLE bom_items RENAME TO bom_items_old;

CREATE TABLE IF NOT EXISTS bom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_packages(id) ON DELETE CASCADE,
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

INSERT INTO bom_items (id, project_id, location_id, part_id, part_number, description, secondary_description,
                      quantity, unit, unit_price, manufacturer, supplier, category, reference_designator,
                      is_spare, metadata, sort_order, created_at, updated_at)
SELECT id, project_id, location_id, part_id, part_number, description, secondary_description,
       quantity, unit, unit_price, manufacturer, supplier, category, reference_designator,
       is_spare, metadata, sort_order, created_at, updated_at
FROM bom_items_old;

DROP TABLE bom_items_old;

-- Rebuild bom_exports
ALTER TABLE bom_exports RENAME TO bom_exports_old;

CREATE TABLE IF NOT EXISTS bom_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES bom_packages(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES bom_locations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('EPLAN', 'XML', 'JSON', 'CSV', 'EXCEL')),
    version TEXT NOT NULL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bom_exports (id, project_id, location_id, filename, format, version, exported_at)
SELECT id, project_id, location_id, filename, format, version, exported_at
FROM bom_exports_old;

DROP TABLE bom_exports_old;

-- Step 7: Recreate indexes equivalent to 002_bom_tables.sql
CREATE INDEX IF NOT EXISTS idx_bom_items_project ON bom_items(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_location ON bom_items(location_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_part ON bom_items(part_id);
CREATE INDEX IF NOT EXISTS idx_bom_locations_project ON bom_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_order ON bom_items(project_id, location_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bom_packages_project ON bom_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_exports_project ON bom_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_bom_exports_format ON bom_exports(format);

-- Step 8: Drop old table
DROP TABLE bom_projects_old;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

COMMIT;
