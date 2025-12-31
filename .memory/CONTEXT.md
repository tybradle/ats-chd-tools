# Project Context: ATS CHD Tools

## Overview
Unified desktop application platform for ATS CHD department. Replaces multiple Excel-based workflows with a single Tauri desktop app.

## Active Focus
- **Current Phase**: BOM Translation Module - Core Implementation Complete
- **Status**: All 8 phases implemented. Module is functional for primary use cases.

## Recent Changes (as of 2025-12-30)
- BOM Translation module fully implemented:
  - Database schema with projects, locations, items, exports tables
  - Zustand store with optimistic updates for snappy UX
  - Project management UI (create, delete, switch)
  - Location tabs with CRUD and item counts
  - TanStack Table-based BOM editor
  - CSV and Excel import with auto-column-mapping
  - Export to XML (Eplan P8), CSV, JSON with ZW1 header generation
- Core app infrastructure complete (routing, layout, settings page)

## Key Decisions
- **Replication Strategy**: Replicate proven `BOM_JS` workflow while modernizing the stack (Electron → Tauri).
- **Schema Simplification**: Removed User model and authorId references (single-user desktop app).
- **Location Workflow**: Manual creation only ("+ Add Location" button). No auto-creation during import.
- **Part Matching**: Import CSV as-is; manual linking via Part Search Dialog to ensure 100% accuracy.
- **Export Strategy**: XML (Eplan P8 schema), CSV, JSON, and ZW1 header files. All functional.
- **Architecture**: Business logic (parsing, generation) in TypeScript; Rust only for system integration via plugins.

## Next Steps
1. **Polish**: Improve inline editing UX in BOM table (true cell editing vs dialogs)
2. **Parts Integration**: Wire up FTS5 search instead of LIKE queries in PartSearchDialog
3. **Export History**: Add UI to view past exports from `bom_exports` table
4. **Testing**: Manual QA pass on full import→edit→export workflow
5. **Module 2**: Begin Parts Library management UI (CRUD for master parts)
