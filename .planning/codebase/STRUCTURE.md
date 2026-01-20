# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
[project-root]/
├── src/                      # React/TypeScript SPA source
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router + route table
│   ├── index.css             # Global styles
│   ├── assets/               # Static assets bundled by Vite
│   ├── components/           # Feature components + UI primitives
│   │   ├── layout/           # App shell layout
│   │   ├── bom/              # BOM feature components
│   │   ├── parts/            # Parts feature components
│   │   ├── glenair/          # Glenair feature components
│   │   ├── ui/               # shadcn/ui-like primitives
│   │   └── error-boundary.tsx
│   ├── pages/                # Route-level pages (screens)
│   ├── stores/               # Zustand stores (async + module state)
│   ├── lib/                  # Utilities + db access + parsing/export helpers
│   │   ├── db/               # DB client switch + real/mock implementations
│   │   └── glenair/          # Glenair helper utilities
│   └── types/                # Shared TypeScript domain types
├── src-tauri/                # Tauri (Rust) desktop wrapper
│   ├── src/                  # Rust entry + setup
│   ├── migrations/           # SQLite migrations (numbered .sql)
│   ├── capabilities/         # Tauri capability declarations
│   ├── scripts/              # Seed/generation scripts
│   └── tauri.conf.json        # Tauri config
├── public/                   # Vite public assets
├── scripts/                  # Node scripts (dev helpers)
├── package.json              # JS dependencies + scripts
├── vite.config.ts            # Vite config + @ alias
├── tsconfig*.json            # TypeScript project configs
└── .planning/                # Planning artifacts (docs, plans)
```

## Directory Purposes

**`src/`:**
- Purpose: Web UI (React) source.
- Contains: Routes/pages, feature components, Zustand stores, DB client, utilities, types.
- Key files: `src/main.tsx`, `src/App.tsx`.

**`src/components/`:**
- Purpose: UI building blocks.
- Contains:
  - Feature components: `src/components/bom/*`, `src/components/parts/*`, `src/components/glenair/*`
  - Shared layout: `src/components/layout/root-layout.tsx`
  - Shared boundary: `src/components/error-boundary.tsx`
  - UI primitives: `src/components/ui/*`

**`src/pages/`:**
- Purpose: Route-level screens.
- Contains: `src/pages/home.tsx`, `src/pages/settings.tsx`, `src/pages/parts.tsx`, `src/pages/bom.tsx`, `src/pages/bom-project.tsx`, `src/pages/glenair.tsx`.

**`src/stores/`:**
- Purpose: Zustand stores for module state and async orchestration.
- Contains: `src/stores/bom-store.ts`, `src/stores/parts-store.ts`, `src/stores/glenair-store.ts`.

**`src/lib/`:**
- Purpose: Shared libraries/utilities.
- Contains:
  - DB: `src/lib/db/client.ts`, `src/lib/db/real-client.ts`, `src/lib/db/mock-client.ts`
  - Import/Export: `src/lib/import-utils.ts`, `src/lib/export-utils.ts`
  - Parsing: `src/lib/csv-parser.ts`, `src/lib/excel-parser.ts`
  - Misc: `src/lib/utils.ts`

**`src/types/`:**
- Purpose: Domain types and DTO-ish interfaces.
- Contains: `src/types/bom.ts`, `src/types/parts.ts`, `src/types/glenair.ts`.

**`src-tauri/`:**
- Purpose: Desktop host runtime.
- Contains:
  - Rust entry/setup: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
  - Migrations: `src-tauri/migrations/001_initial.sql`, `src-tauri/migrations/002_bom_tables.sql`, `src-tauri/migrations/003_glenair_tables.sql`
  - Capabilities: `src-tauri/capabilities/default.json`
  - Scripts: `src-tauri/scripts/*`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React bootstrap; wraps `<App />` with `ErrorBoundary`.
- `src/App.tsx`: Router definition (React Router).
- `src-tauri/src/main.rs`: Tauri native entry.
- `src-tauri/src/lib.rs`: Tauri builder/plugins/migrations.

**Configuration:**
- `vite.config.ts`: Vite config + `@` alias → `./src`.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TS project refs + paths.
- `src-tauri/tauri.conf.json`: Tauri config.
- `components.json`: shadcn/ui configuration.

**Core Logic:**
- Data access: `src/lib/db/client.ts` (client switch), `src/lib/db/real-client.ts` (SQL modules), `src/lib/db/mock-client.ts` (browser mock).
- State management: `src/stores/*`.
- Import/export helpers: `src/lib/import-utils.ts`, `src/lib/export-utils.ts`.

**Testing:**
- Not detected (no `tests/`, no `*.test.*`/`*.spec.*` identified in the explored file list).

## Naming Conventions

**Files:**
- React components/pages are PascalCase in many places (e.g., `src/App.tsx`, `src/components/layout/root-layout.tsx`).
- Many feature component files are kebab-case (e.g., `src/components/bom/import-dialog.tsx`, `src/components/bom/bom-table.tsx`, `src/stores/bom-store.ts`).
- Prescriptive guidance for new files: follow the local folder’s existing pattern.
  - Under `src/components/<module>/`: prefer kebab-case for component filenames to match existing files.
  - Under `src/pages/`: files are lower-case module names (e.g., `bom.tsx`, `parts.tsx`).
  - Under `src/stores/`: kebab-case `*-store.ts`.

**Directories:**
- Feature-based grouping by module: `bom`, `parts`, `glenair` used under both `src/components/` and as store/type names.

## Where to Add New Code

**New Feature (new module/screen):**
- Primary page (route screen): add under `src/pages/<module>.tsx`.
- Feature components: add under `src/components/<module>/`.
- Store: add under `src/stores/<module>-store.ts`.
- Types: add under `src/types/<module>.ts`.
- DB operations: add to `src/lib/db/real-client.ts` (and mirror/decide behavior in `src/lib/db/mock-client.ts`), then export via `src/lib/db/client.ts`.
- Desktop DB schema: add a new migration under `src-tauri/migrations/NNN_description.sql` and register in `src-tauri/src/lib.rs` if needed.

**New Component/Module (within an existing module):**
- Implementation: `src/components/<module>/<new-component>.tsx`
- Store extensions: `src/stores/<module>-store.ts`

**Utilities:**
- Shared helpers: `src/lib/<new-util>.ts`.

## Special Directories

**`src/components/ui/`:**
- Purpose: UI primitives (shadcn/ui-style wrappers).
- Generated: Likely via shadcn tooling (`components.json` present).
- Committed: Yes.

**`src-tauri/migrations/`:**
- Purpose: SQLite schema evolution.
- Generated: No (hand-authored SQL migrations).
- Committed: Yes.

---

*Structure analysis: 2026-01-20*
