# Phase 1 Plan 01-01 Summary

**Completed:** 2026-01-20
**Status:** ✅ Complete

## Objective
Introduce a durable Project(job #) → Package schema in SQLite while preserving existing BOM scope IDs.

## Changes Made

### Migration v4 (`src-tauri/migrations/004_project_package_scoping.sql`)
- Created `bom_job_projects` table (job # with UNIQUE constraint on `project_number`)
- Created `bom_packages` table (packages with UNIQUE constraint on `(project_id, package_name)`)
- Preserved existing scope IDs by copying `bom_projects_old.id` into `bom_packages.id`
- Rebuilt `bom_locations`, `bom_items`, `bom_exports` to reference `bom_packages(id)` instead of `bom_projects(id)`
- Maintained all indexes for performance

### Tauri Integration (`src-tauri/src/lib.rs`)
- Registered migration v4: "Project/Package scoping (job projects + packages)"
- Migration runs automatically on app startup

## Key Implementation Details

### ID Preservation Strategy
```sql
-- Step 5: Backfill bom_packages preserving IDs
INSERT INTO bom_packages(id, project_id, package_name, ...)
SELECT old.id, p.id, old.package_name, ...
FROM bom_projects_old old
JOIN bom_job_projects p ON p.project_number = old.project_number;
```

This ensures all existing BOM data (locations, items, exports) maintains referential integrity without requiring data migration.

### Foreign Key Cascade Behavior
- Deleting a `bom_job_projects` row cascades to delete its packages
- Deleting a `bom_packages` row cascades to delete its locations/items/exports

## Verification
- ✅ Build succeeds
- ✅ Migration file registered in Tauri
- ✅ Fresh install: migration creates new schema
- ✅ Upgrade path: preserves IDs and referential integrity

## Next Steps
- Plan 01-02: Types + DB helpers for job projects/packages
- Plan 01-03: BOM store scope-first refactoring
- Plan 01-04: Entry UX with blocking modal
- Plan 01-05: Full Project Manager UI with CRUD
