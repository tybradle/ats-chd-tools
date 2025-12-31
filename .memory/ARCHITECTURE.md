# Project Architecture

## High-Level Architecture
- **Desktop**: Tauri 2.0 (Rust host + WebView)
- **Frontend**: React 19 SPA (Single Page Application)
- **State**: Zustand (global) + React State (local)
- **Database**: SQLite via `@tauri-apps/plugin-sql` (direct access from TS)

## Routing Structure
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `HomePage` | Dashboard/landing |
| `/settings` | `SettingsPage` | App configuration |
| `/parts` | `PartsPage` | Parts library (placeholder) |
| `/bom` | `BomPage` | BOM project selection |
| `/bom/:projectId` | `BomProjectPage` | BOM workspace |

## Module: BOM Translation
Module for converting Bill of Materials between different formats (CSV, Excel, XML, JSON).

### Data Model
- **BOMProject**: Metadata (project_number, package_name, name, version)
- **BOMLocation**: Logical groupings (CP1, MA, etc.) with export_name override
- **BOMItem**: Line items with part references and export-specific fields
- **BOMExport**: Export history metadata (no content blob)

### Database Layer
- **Client**: `src/lib/db/client.ts` (Singleton connection, query helpers)
- **Migrations**: `src-tauri/migrations/` (Numbered SQL files)
- **Tables**: `parts`, `manufacturers`, `categories`, `bom_projects`, `bom_locations`, `bom_items`, `bom_exports`

### Business Logic
- **CSV Parsing**: Flexible column mapping in TypeScript (`src/lib/csv-parser.ts`)
- **Excel Parsing**: Sheet selection via xlsx library (`src/lib/excel-parser.ts`)
- **XML Generation**: Eplan P8 schema generation (`src/lib/export-utils.ts`)
- **ZW1 Headers**: Auto-generated for Eplan compatibility
- **Part Search**: FTS5 full-text search on master parts library (partially wired)

### State Management
- **Store**: `src/stores/bom-store.ts` (Zustand)
- **Pattern**: Optimistic updates for inline editing, background DB sync

### UI Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `BomTable` | `src/components/bom/bom-table.tsx` | TanStack Table with editing |
| `LocationTabs` | `src/components/bom/location-tabs.tsx` | Kitting location tabs |
| `ImportDialog` | `src/components/bom/import-dialog.tsx` | CSV/Excel import wizard |
| `ExportDialog` | `src/components/bom/export-dialog.tsx` | Format selection + export |
| `ProjectManagerDialog` | `src/components/bom/project-manager-dialog.tsx` | Project CRUD |
| `PartSearchDialog` | `src/components/bom/part-search-dialog.tsx` | Master parts lookup |

## Reference Implementation
- **Source**: `/home/dev/projects/BOM_JS` (Electron/Prisma version)
- **Role**: Source of truth for workflow and XML schemas
- **Adaptation**: Translated Prisma patterns to raw SQL and Zustand stores.

## UI Pattern
- **Layout**: Sidebar navigation (`src/components/layout/root-layout.tsx`)
- **Components**: shadcn/ui primitives + module-specific components
- **Grid**: TanStack Table with inline editing and auto-save
