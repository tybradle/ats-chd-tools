# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Tauri desktop wrapper + Vite/React SPA, feature-by-feature modules, with a thin “data access” layer (SQLite via Tauri plugin) and Zustand stores as the main state/async orchestration boundary.

**Key Characteristics:**
- React Router routes map directly to module pages in `src/pages/` (BOM, Parts, Glenair).
- Zustand stores in `src/stores/` own async loading/mutations and module UI state.
- All database operations are centralized behind a single module `src/lib/db/client.ts`, which selects between a real SQLite-backed client (`src/lib/db/real-client.ts`) and a browser/mock implementation (`src/lib/db/mock-client.ts`).

## Layers

**UI Shell / Layout:**
- Purpose: Global layout (nav + main outlet), app chrome, status footer.
- Location: `src/components/layout/root-layout.tsx`
- Contains: Sidebar nav, `Outlet` for routed pages.
- Depends on: `react-router-dom` and UI primitives in `src/components/ui/*`.
- Used by: `src/App.tsx` via nested route layout.

**Routing / Composition Layer:**
- Purpose: Define routes and compose module pages into the app.
- Location: `src/App.tsx`
- Contains: `BrowserRouter`, `Routes`, nested `Route` using `RootLayout`.
- Depends on: Pages (`src/pages/*.tsx`).
- Used by: `src/main.tsx`.

**Page Layer (Module Screens):**
- Purpose: Page-level orchestration (route params, navigation, calling store actions, composing module components).
- Location: `src/pages/*`
- Contains:
  - BOM: `src/pages/bom.tsx`, `src/pages/bom-project.tsx`
  - Parts: `src/pages/parts.tsx`
  - Glenair: `src/pages/glenair.tsx`
  - Shell pages: `src/pages/home.tsx`, `src/pages/settings.tsx`
- Depends on: Module components in `src/components/<module>/` and stores in `src/stores/`.

**Component Layer (Feature Components):**
- Purpose: Reusable feature components and dialogs used by pages.
- Location: `src/components/`
- Contains:
  - BOM: `src/components/bom/*` (tables, dialogs, tabs)
  - Parts: `src/components/parts/*` (tables, dialogs)
  - Glenair: `src/components/glenair/*` (builder UI)
  - Shared: `src/components/error-boundary.tsx`, UI primitives `src/components/ui/*`
- Depends on: Zustand stores, lib helpers, and UI primitives.

**State / Domain Orchestration Layer (Zustand Stores):**
- Purpose: Single module-level boundary for async operations + derived UI state.
- Location: `src/stores/*`
- Contains:
  - BOM store: `src/stores/bom-store.ts`
  - Parts store: `src/stores/parts-store.ts`
  - Glenair store: `src/stores/glenair-store.ts`
- Depends on: DB access exported from `src/lib/db/client.ts` (e.g., `bomProjects`, `parts`, `glenair`) and types in `src/types/*`.

**Data Access Layer (DB Client + Query Modules):**
- Purpose: Centralized DB access and query definitions.
- Location: `src/lib/db/client.ts` (switch), `src/lib/db/real-client.ts` (SQLite), `src/lib/db/mock-client.ts` (browser/localStorage mock)
- Contains:
  - Low-level primitives: `query`, `execute`, `transaction`
  - “Table modules”: `manufacturers`, `categories`, `parts`, `settings`, `bomProjects`, `bomLocations`, `bomItems`, `bomExports`, `glenair`
- Depends on:
  - Real client uses `@tauri-apps/plugin-sql` (`src/lib/db/real-client.ts`).
  - Switch detects Tauri via `window.__TAURI_INTERNALS__` (`src/lib/db/client.ts`).
- Used by: Stores and select components.

**Lib / Utilities Layer:**
- Purpose: Pure helpers (parsing, mapping, generating export content, shared UI utilities).
- Location: `src/lib/*`
- Examples:
  - Import mapping & parsing: `src/lib/import-utils.ts`, `src/lib/csv-parser.ts`, `src/lib/excel-parser.ts`
  - Export generation: `src/lib/export-utils.ts`
  - Classname merging: `src/lib/utils.ts`
  - Glenair helper constants: `src/lib/glenair/utils.ts`

**Type Layer:**
- Purpose: Data shapes used across stores/components/db.
- Location: `src/types/*` (`src/types/bom.ts`, `src/types/parts.ts`, `src/types/glenair.ts`)

**Desktop Host Layer (Tauri / Rust):**
- Purpose: Host web UI in a desktop shell, provide plugins, manage SQLite migrations.
- Location: `src-tauri/`
- Entry: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- Migrations: `src-tauri/migrations/*.sql` (included and registered in Rust)

## Data Flow

**BOM project selection → load project → load locations/items (typical):**

1. Route navigation to `/bom/:projectId` happens in `src/pages/bom.tsx` via `useNavigate()`.
2. `src/pages/bom-project.tsx` reads `projectId` from `useParams()` and calls `useBOMStore().loadProject(Number(projectId))` in a `useEffect`.
3. Store action `loadProject` in `src/stores/bom-store.ts` calls `bomProjects.getById(id)` from `src/lib/db/client.ts`.
4. After project is loaded, `loadProject` triggers `loadLocations(id)` within the store (`src/stores/bom-store.ts`).
5. `loadLocations` calls `bomLocations.getByProject(projectId)` and auto-selects the first location, then triggers `loadItems(projectId, locationId)`.
6. UI components `src/components/bom/location-tabs.tsx` and `src/components/bom/bom-table.tsx` render store state and trigger store mutations (create/update/delete) which call DB functions (`bomItems.*`) and then refresh via `loadItems`.

**State Management:**
- Module state lives in Zustand stores (examples: `src/stores/bom-store.ts`, `src/stores/parts-store.ts`, `src/stores/glenair-store.ts`).
- Pages/components call store actions; stores update state via `set()` and can chain additional store actions via `get()`.
- Some components call DB directly in specific cases (e.g., search dialog uses `query()` directly).

## Key Abstractions

**DB Client Switch (`isTauri`):**
- Purpose: Allow running as “web-only” in browser with a mock DB, or in Tauri with SQLite.
- Implementation: `src/lib/db/client.ts` exports `isTauri` and selects `RealClient.*` vs `MockClient.*`.
- Examples: `src/lib/db/client.ts`, `src/lib/db/real-client.ts`, `src/lib/db/mock-client.ts`.

**Table Modules (DB query groups):**
- Purpose: Provide grouped CRUD-ish APIs per domain/table (e.g. `parts.getAll()`, `bomItems.bulkCreate()`), with SQL centralized in one file.
- Implementation: In `src/lib/db/real-client.ts` (and mirrored in `src/lib/db/mock-client.ts`).
- Examples: `src/lib/db/real-client.ts` exports `parts`, `bomProjects`, `bomItems`, `glenair`, etc.

**Module Store = Module Boundary:**
- Purpose: Store is the API surface for UI to interact with the domain.
- Examples:
  - `src/stores/bom-store.ts` owns project/location/item state and operations.
  - `src/stores/parts-store.ts` owns parts/manufacturers/categories data and search.
  - `src/stores/glenair-store.ts` owns multi-step builder state.

**Import/Export Pipelines:**
- Import: UI in `src/components/bom/import-dialog.tsx` → parsing helpers (`src/lib/csv-parser.ts`, `src/lib/excel-parser.ts`) → mapping (`src/lib/import-utils.ts`) → DB bulk insert via `bomItems.bulkCreate()`.
- Export: UI in `src/components/bom/export-dialog.tsx` → content generation (`src/lib/export-utils.ts`) → file save via Tauri plugins (or browser download fallback).

## Entry Points

**Web UI Entry:**
- Location: `src/main.tsx`
- Triggers: Vite/React DOM boot.
- Responsibilities: Render `<App />` inside `<ErrorBoundary>`.

**App Router Entry:**
- Location: `src/App.tsx`
- Triggers: Rendered from `src/main.tsx`.
- Responsibilities: Define routes and the layout wrapper (`RootLayout`).

**Tauri Entry (Desktop):**
- Location: `src-tauri/src/main.rs`
- Triggers: Native app start.
- Responsibilities: Calls `app_lib::run()`.

**Tauri Setup & Plugins/Migrations:**
- Location: `src-tauri/src/lib.rs`
- Responsibilities:
  - Register SQL plugin + migrations from `src-tauri/migrations/*.sql`.
  - Register dialog/fs/log plugins.
  - Open devtools in debug mode.

## Error Handling

**Strategy:** Component-level errors handled by a global React Error Boundary, async failures handled mostly inside stores (error strings in store state) or via toast notifications in dialogs.

**Patterns:**
- Global boundary: `src/components/error-boundary.tsx` wraps app in `src/main.tsx`.
- Store-level error state: `error: string | null` in stores like `src/stores/bom-store.ts`, `src/stores/glenair-store.ts`, `src/stores/parts-store.ts`.
- Toast-driven user feedback: e.g. `src/components/bom/import-dialog.tsx`, `src/components/bom/export-dialog.tsx` use `sonner`.

## Cross-Cutting Concerns

**Logging:**
- Frontend: `console.*` in stores and mock DB (e.g., `src/stores/parts-store.ts`, `src/lib/db/mock-client.ts`).
- Desktop: Tauri log plugin configured in `src-tauri/src/lib.rs`.

**Validation:**
- Not detected as a formal layer; some input parsing is implemented in helper functions (e.g., `parseQuantity` / `parseCurrency` in `src/lib/import-utils.ts`).

**Authentication:**
- Not applicable (offline single-user desktop app; no auth layer detected in this codebase).

---

*Architecture analysis: 2026-01-20*
