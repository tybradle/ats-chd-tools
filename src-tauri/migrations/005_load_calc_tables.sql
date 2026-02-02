-- Migration 005: Load Calculator tables and part_electrical rebuild
-- Rebuild part_electrical to support voltage_type and composite uniqueness
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Rename existing table
ALTER TABLE part_electrical RENAME TO part_electrical_old;

-- Create new table with voltage_type and additional columns
CREATE TABLE part_electrical (
  id INTEGER PRIMARY KEY,
  part_id INTEGER NOT NULL,
  voltage REAL,
  phase TEXT,
  amperage REAL,
  wattage REAL,
  heat_dissipation_btu REAL,
  max_temp_c REAL,
  utilization_default REAL,
  voltage_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE,
  UNIQUE(part_id, voltage_type)
);

-- Copy data from old table, setting voltage_type to 'LEGACY' for existing rows
INSERT INTO part_electrical (id, part_id, voltage, phase, amperage, wattage, heat_dissipation_btu, max_temp_c, utilization_default, voltage_type, created_at, updated_at)
SELECT id, part_id, voltage, phase, amperage, wattage, heat_dissipation_btu, NULL AS max_temp_c, NULL AS utilization_default, 'LEGACY' AS voltage_type, CURRENT_TIMESTAMP AS created_at, CURRENT_TIMESTAMP AS updated_at
FROM part_electrical_old;

-- Recreate indexes if any existed previously (best-effort)
CREATE INDEX IF NOT EXISTS idx_part_electrical_part_id ON part_electrical(part_id);

-- Drop old table
DROP TABLE part_electrical_old;

-- Create load_calc_projects
CREATE TABLE load_calc_projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bom_package_id INTEGER NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(bom_package_id) REFERENCES bom_packages(id) ON DELETE SET NULL
);

-- Create load_calc_voltage_tables
CREATE TABLE load_calc_voltage_tables (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  location_id INTEGER NULL,
  voltage_type TEXT NOT NULL,
  is_locked INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES load_calc_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(location_id) REFERENCES bom_locations(id) ON DELETE SET NULL,
  UNIQUE(project_id, location_id, voltage_type)
);

-- Trigger to enforce that location belongs to same bom_package as project
CREATE TRIGGER trg_load_calc_voltage_tables_location_scope_insert
BEFORE INSERT ON load_calc_voltage_tables
BEGIN
  -- Ensure project exists
  SELECT CASE
    WHEN (SELECT id FROM load_calc_projects WHERE id = NEW.project_id) IS NULL THEN RAISE(ABORT, 'Referenced load_calc_projects row not found')
  END;

  -- Ensure location exists when provided
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (SELECT id FROM bom_locations WHERE id = NEW.location_id) IS NULL THEN RAISE(ABORT, 'Referenced bom_locations row not found')
  END;

  -- If project.bom_package_id IS NULL then forbid inserting a non-null location_id
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (
      (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id) IS NULL
    ) THEN RAISE(ABORT, 'Cannot assign location to a standalone project without bom_package_id')
  END;

  -- If both exist, ensure the bom_locations.project_id matches load_calc_projects.bom_package_id
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (
      (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id) IS NOT NULL AND
      (SELECT project_id FROM bom_locations WHERE id = NEW.location_id) != (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id)
    ) THEN RAISE(ABORT, 'Location does not belong to the project''s bom_package')
  END;
END;

CREATE TRIGGER trg_load_calc_voltage_tables_location_scope_update
BEFORE UPDATE ON load_calc_voltage_tables
BEGIN
  -- Ensure project exists
  SELECT CASE
    WHEN (SELECT id FROM load_calc_projects WHERE id = NEW.project_id) IS NULL THEN RAISE(ABORT, 'Referenced load_calc_projects row not found')
  END;

  -- Ensure location exists when provided
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (SELECT id FROM bom_locations WHERE id = NEW.location_id) IS NULL THEN RAISE(ABORT, 'Referenced bom_locations row not found')
  END;

  -- If project.bom_package_id IS NULL then forbid assigning a non-null location_id
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (
      (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id) IS NULL
    ) THEN RAISE(ABORT, 'Cannot assign location to a standalone project without bom_package_id')
  END;

  -- If both exist, ensure the bom_locations.project_id matches load_calc_projects.bom_package_id
  SELECT CASE
    WHEN NEW.location_id IS NOT NULL AND (
      (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id) IS NOT NULL AND
      (SELECT project_id FROM bom_locations WHERE id = NEW.location_id) != (SELECT bom_package_id FROM load_calc_projects WHERE id = NEW.project_id)
    ) THEN RAISE(ABORT, 'Location does not belong to the project''s bom_package')
  END;
END;

-- Create load_calc_line_items
CREATE TABLE load_calc_line_items (
  id INTEGER PRIMARY KEY,
  voltage_table_id INTEGER NOT NULL,
  part_id INTEGER NULL,
  manual_part_number TEXT NULL,
  description TEXT,
  qty INTEGER DEFAULT 1,
  utilization_pct REAL DEFAULT 1.0,
  amperage_override REAL,
  wattage_override REAL,
  heat_dissipation_override REAL,
  power_group TEXT,
  phase_assignment TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(voltage_table_id) REFERENCES load_calc_voltage_tables(id) ON DELETE CASCADE,
  FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE SET NULL
);

-- Create load_calc_results
CREATE TABLE load_calc_results (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  voltage_table_id INTEGER NULL,
  total_watts REAL,
  total_amperes REAL,
  total_btu REAL,
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES load_calc_projects(id) ON DELETE CASCADE,
  FOREIGN KEY(voltage_table_id) REFERENCES load_calc_voltage_tables(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_load_calc_projects_bom_package_id ON load_calc_projects(bom_package_id);
CREATE INDEX IF NOT EXISTS idx_load_calc_voltage_tables_project_id ON load_calc_voltage_tables(project_id);
CREATE INDEX IF NOT EXISTS idx_load_calc_voltage_tables_location_id ON load_calc_voltage_tables(location_id);
CREATE INDEX IF NOT EXISTS idx_load_calc_voltage_tables_voltage_type ON load_calc_voltage_tables(voltage_type);
CREATE INDEX IF NOT EXISTS idx_load_calc_line_items_voltage_table_id ON load_calc_line_items(voltage_table_id);
CREATE INDEX IF NOT EXISTS idx_load_calc_line_items_part_id ON load_calc_line_items(part_id);

COMMIT;
PRAGMA foreign_keys = ON;
