# Architecture Documentation

## Overview

**ATS CHD Tools** is a unified desktop application platform for the ATS CHD department that replaces multiple Excel-based workflows with a single Tauri desktop app. The application runs 100% offline, is single-user, and targets Windows desktop deployment with a ~15-20MB installer.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Framework | Tauri | 2.0 |
| Frontend Framework | React | 19 |
| Language | TypeScript | 5.9 |
| Build Tool | Vite | 7.2 |
| Styling | TailwindCSS | 4.1 |
| UI Components | shadcn/ui | (Radix UI primitives) |
| State Management | Zustand | 5.0 |
| Routing | React Router | 7 |
| Forms | React Hook Form + Zod | 7.69 + 4.2 |
| Tables | TanStack Table | 8.21 |
| Database | SQLite | (via @tauri-apps/plugin-sql) |
| Icons | Lucide React | 0.562 |
| Notifications | Sonner | 2.0 |
| Backend | Rust | 2021 edition |

### Key Dependencies

**Frontend:**
- `@tauri-apps/api`, `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`
- `@radix-ui/*` - Headless UI primitives (via shadcn/ui)
- `class-variance-authority`, `clsx`, `tailwind-merge` - Styling utilities
- `xlsx` - Excel file parsing/generation

**Backend:**
- `tauri` - Desktop framework
- `tauri-plugin-sql` - SQLite integration with migrations
- `tauri-plugin-dialog`, `tauri-plugin-fs` - Native file system access
- `tauri-plugin-log` - Logging (dev only)
- `serde`, `serde_json` - Serialization

## Directory Structure

```
ats-chd-tools/
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (DO NOT MODIFY)
│   │   ├── layout/               # App shell and navigation
│   │   └── bom/                  # BOM module components
│   ├── pages/                    # Route/page components
│   │   ├── home.tsx
│   │   ├── bom.tsx              # BOM projects list
│   │   ├── bom-project.tsx      # BOM project detail
│   │   ├── parts.tsx
│   │   └── settings.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   └── client.ts        # Database client, all queries
│   │   ├── csv-parser.ts        # CSV import utilities
│   │   ├── excel-parser.ts      # Excel import utilities
│   │   ├── export-utils.ts      # Export format generators
│   │   └── utils.ts             # cn() utility
│   ├── stores/                   # Zustand state stores
│   │   └── bom-store.ts         # BOM module state
│   ├── types/                    # TypeScript interfaces
│   │   └── bom.ts
│   ├── App.tsx                   # Route configuration
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind imports
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              # Binary entry point
│   │   └── lib.rs               # Tauri app setup + migrations
│   ├── migrations/               # SQLite migration files
│   │   ├── 001_initial.sql      # Core schema (parts, manufacturers, etc.)
│   │   └── 002_bom_tables.sql   # BOM module tables
│   ├── capabilities/
│   │   └── default.json         # Tauri permissions
│   ├── icons/                    # App icons (Windows, macOS, etc.)
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri config (window, bundle, etc.)
│   └── build.rs                 # Build script
│
├── public/                       # Static assets
├── docs/                         # Documentation
│   └── plans/                    # Implementation plans
├── .github/workflows/            # CI/CD
│   └── build-windows.yml
├── package.json
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── components.json              # shadcn/ui config
├── AGENTS.md                    # AI agent guidelines
└── README.md
```

## Core Components

### Frontend Architecture

#### Routing Layer (`src/App.tsx`, `src/main.tsx`)
- **Entry**: `main.tsx` renders React app with StrictMode
- **Router**: `App.tsx` configures React Router with:
  - `<RootLayout>` wraps all routes (provides sidebar nav)
  - Routes: `/` (home), `/bom`, `/bom/:projectId`, `/parts`, `/settings`
  - `<Toaster>` for notifications (bottom-right)

#### Layout Layer (`src/components/layout/root-layout.tsx`)
- Sidebar navigation (56px width)
- Main content area with scroll
- Navigation items: Home, BOM Translation, Parts Library, Settings
- NavLink with active state styling

#### Page Layer (`src/pages/*.tsx`)
- Route components rendered by React Router
- Use Zustand stores for state
- Compose domain-specific components

#### Component Layer
- **`src/components/ui/`**: shadcn/ui components (17 components, DO NOT MODIFY directly)
- **`src/components/bom/`**: BOM module components
  - `bom-table.tsx` - TanStack Table with inline editing
  - `location-tabs.tsx` - Tab navigation for locations
  - `project-manager-dialog.tsx` - Create/edit projects
  - `import-dialog.tsx`, `export-dialog.tsx` - Data I/O
  - `part-search-dialog.tsx` - Search from parts catalog

### State Management (`src/stores/`)

**BOM Store** (`bom-store.ts`) - Zustand store with:
- **State**: projects, currentProject, locations, currentLocationId, items, loading, error, searchTerm, selectedItemIds
- **Project Actions**: loadProjects, loadProject, createProject, updateProject, deleteProject
- **Location Actions**: loadLocations, createLocation, updateLocation, deleteLocation
- **Item Actions**: loadItems, createItem, updateItem, deleteItem, bulkDeleteItems, duplicateItem, bulkImportItems
- **UI Actions**: setSearchTerm, setSelectedItemIds, setError
- **Pattern**: Actions async, call database, update state, handle errors

### Database Layer (`src/lib/db/client.ts`)

**Connection Management**:
- Singleton pattern: `getDb()` returns cached connection
- Database name: `sqlite:ats-chd-tools.db`

**Core Functions**:
- `query<T>()` - SELECT queries
- `execute()` - INSERT/UPDATE/DELETE (returns rowsAffected, lastInsertId)
- `transaction()` - Multi-query transactions with rollback

**Domain Objects** (exported as namespaced functions):
- `manufacturers` - getAll, getById, create, update, delete
- `categories` - getAll, getById, getByParent, create, update, delete
- `parts` - getAll, getById, search (FTS), create, update, delete
- `settings` - get, set, delete, getAll (key-value store)
- `bomProjects` - getAll, getById, create, update, delete
- `bomLocations` - getByProject, getById, create, update, delete
- `bomItems` - getByProject, getById, create, update, delete, bulkCreate, bulkDelete, duplicate
- `bomExports` - getByProject, create, delete, deleteByProject

**Pattern**: All queries use parameterized bind values (never string interpolation)

### Data Flow

#### BOM Module Data Flow

**Loading a Project**:
1. User navigates to `/bom/:projectId`
2. `BomProjectPage` calls `useBOMStore().loadProject(id)`
3. Store calls `bomProjects.getById()` → updates `currentProject`
4. Store auto-calls `loadLocations()` → loads locations
5. Store auto-selects first location → calls `loadItems()`
6. UI renders with project/locations/items

**Editing an Item**:
1. User edits inline in `BomTable` (TanStack Table)
2. onChange → `updateItem(id, updates)` (optimistic update)
3. Store updates local state immediately
4. Store calls `bomItems.update()` → SQLite
5. On error: revert by reloading items

**Importing Items**:
1. User clicks Import → `ImportDialog` opens
2. User selects CSV/Excel file (via Tauri dialog)
3. Parser reads file → preview with validation
4. User confirms → `bulkImportItems()` called
5. Store calls `bomItems.bulkCreate()` in transaction
6. Items reload, UI updates

### Backend Architecture (`src-tauri/`)

**Rust Layer** (minimal - mostly plugin orchestration):
- `main.rs` - Calls `app_lib::run()`
- `lib.rs` - Tauri builder with plugins:
  - SQL plugin with migrations
  - Dialog plugin (file pickers)
  - FS plugin (file read/write)
  - Log plugin (dev only)

**Migration System**:
- Migrations defined in `lib.rs`
- SQL files in `migrations/` embedded at compile time
- Automatic migration on app start
- Version tracking in SQLite

**No Custom Commands**: All data access via SQL plugin from frontend

## Database Schema

### Core Tables (001_initial.sql)

**`manufacturers`** - Company/brand information
- id, name (UNIQUE), code, created_at

**`categories`** - Hierarchical part categories
- id, name (UNIQUE), parent_id (self-reference), created_at

**`parts`** - Master parts catalog
- id, part_number, manufacturer_id, description, secondary_description, category_id, unit, created_at, updated_at
- UNIQUE(part_number, manufacturer_id)
- Full-text search via `parts_fts` (FTS5 virtual table with triggers)

**`part_pricing`** - Pricing info (for future Quoting module)
- id, part_id, supplier, unit_cost, currency, lead_time_days, last_updated

**`part_electrical`** - Electrical specs (for future Heat/Load module)
- id, part_id, voltage, amperage, wattage, phase, heat_dissipation_btu

**`settings`** - App configuration (key-value store)
- key (PRIMARY KEY), value, updated_at

### BOM Module Tables (002_bom_tables.sql)

**`bom_projects`** - BOM projects
- id, project_number (UNIQUE), package_name, name, description, version, metadata (JSON), created_at, updated_at

**`bom_locations`** - Kitting locations within projects
- id, project_id, name, export_name, sort_order, created_at, updated_at
- UNIQUE(project_id, name)

**`bom_items`** - Line items in locations
- id, project_id, location_id, part_id (nullable - can link to parts catalog)
- part_number, description, secondary_description, quantity, unit
- unit_price, manufacturer, supplier, category, reference_designator
- is_spare (0/1), metadata (JSON), sort_order
- created_at, updated_at

**`bom_exports`** - Export history (metadata only, no content blob)
- id, project_id, location_id, filename, format (EPLAN/XML/JSON/CSV/EXCEL), version, exported_at

**Indexes**: Comprehensive indexes on foreign keys and sort fields for performance

## External Integrations

**None** - This is a fully offline desktop application with no external APIs or services.

**File System**:
- Uses Tauri FS plugin for file read/write
- Uses Tauri Dialog plugin for native file pickers
- Imports: CSV, Excel
- Exports: CSV, Excel, XML, EPLAN (.zw1), JSON

## Configuration

### Application Config (`src-tauri/tauri.conf.json`)
- Product name: "ATS CHD Tools"
- Identifier: "com.ats.chd-tools"
- Window: 1280x800, min 900x600
- Bundle targets: `msi`, `nsis` (Windows installers)

### Build Config
- **Development**: `npm run tauri:dev` - Vite dev server on port 1420 + Tauri
- **Production**: `npm run tauri:build` - Vite build → dist/ → Tauri bundle

### TypeScript Config
- Strict mode enabled
- Path alias: `@/` → `./src/`
- Target: ES2022
- JSX: react-jsx

### ESLint Config
- TypeScript ESLint (recommended)
- React Hooks plugin
- React Refresh plugin
- Ignores: `dist/`

### Tailwind Config (TailwindCSS 4, Vite plugin)
- Base color: neutral
- CSS variables enabled
- shadcn/ui style: "new-york"

## Modules

### Current Modules

**1. BOM Translation** (Active - primary module)
- Convert BOMs between formats: CSV, Excel, XML, EPLAN (.zw1)
- Project-based organization (project → locations → items)
- Inline editing with TanStack Table
- Import/export with format translation
- Link to parts catalog or manual entry

**2. Parts Library** (Active - shared across modules)
- Master parts catalog
- Full-text search (SQLite FTS5)
- Manufacturer and category organization
- Used by BOM module (optional linkage)

### Future Modules

3. **QR Label Generator** - Generate QR code labels for parts
4. **Quoting Workbook** - Cost estimation and quotes
5. **Heat/Load Calculator** - Electrical heat/load calculations

## Build & Deploy

### Development Workflow

```bash
# Frontend only (for UI work)
npm run dev

# Full app (frontend + backend)
npm run tauri:dev

# Linting
npm run lint
```

### Production Build

```bash
npm run tauri:build
```

**Output**: `src-tauri/target/release/bundle/`
- Windows: `.msi` and `.exe` (NSIS installer)
- Installer size target: ~15-20MB

### CI/CD

**GitHub Actions** (`.github/workflows/build-windows.yml`):
- Builds Windows installers on push
- Runs on Windows runner

## Design Patterns & Conventions

### State Management Pattern
- **Global state**: Zustand stores (domain-scoped, e.g., `bom-store`)
- **Local state**: React useState for UI-only state
- **Async actions**: Store methods handle loading/error states

### Database Access Pattern
- All queries in `src/lib/db/client.ts`
- Namespaced by domain (manufacturers, parts, bomProjects, etc.)
- Parameterized queries only (security)
- Type-safe with TypeScript interfaces

### Component Pattern
- Functional components only
- Composition over inheritance
- Small, focused components
- shadcn/ui for base primitives

### Error Handling
- Store actions catch errors, set error state
- Toast notifications for user feedback
- Optimistic updates with revert on error (e.g., item edits)

### Type Safety
- TypeScript strict mode
- Interfaces for all data models
- Zod for runtime validation (forms)
- Generic query helpers

## Notes

- **Single-user**: No authentication, no multi-user support
- **Offline-first**: No network required, all data local
- **Windows-focused**: Primary target, but Tauri supports multi-platform
- **Solo developer**: Optimize for maintainability over cleverness
- **Maintainability**: Explicit over implicit, simple over complex
