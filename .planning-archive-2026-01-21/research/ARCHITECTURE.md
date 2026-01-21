# Architecture Research

**Domain:** Offline desktop modular tool platform (“applet platform”) with shared SQLite database
**Researched:** 2026-01-20
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

Offline modular desktop tools tend to converge on a **modular monolith / microkernel** shape:

* **Core shell** owns navigation, project selection, permissions/feature flags, common UI and shared services.
* **Modules** (BOM Translation, Parts, Glenair, etc.) plug into the shell via a registry, but do **not** own cross-cutting concerns like DB connection, backups, or updates.
* A **single local SQLite database** is the system-of-record; modules write through a shared data access layer and are isolated by schema/IDs and conventions.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         UI SHELL (React Router)                           │
│  Landing/Dashboard  Project Manager UX  Global Commands/Toasts/Dialogs     │
│                                                                           │
│  ┌─────────────────────────── Module Registry ─────────────────────────┐  │
│  │ Routes + Nav + Capabilities + Lazy loading + Feature flags          │  │
│  └───────────────┬───────────────────────┬────────────────────────────┘  │
│                  │                       │                                 │
│   ┌──────────────▼─────────────┐  ┌──────▼───────────────────┐            │
│   │ Module: BOM Translation     │  │ Module: Parts / Glenair   │   ...      │
│   │ UI + module services        │  │ UI + module services      │            │
│   └──────────────┬─────────────┘  └──────────┬───────────────┘            │
│                  │                            │                            │
├──────────────────┴────────────────────────────┴───────────────────────────┤
│                    APPLICATION SERVICE LAYER (TypeScript)                  │
│  Project context + Repositories + Domain rules + Import/Export + Search    │
│  Background jobs (queue) + Audit/logging + Validation (Zod)                │
├───────────────────────────────────────────────────────────────────────────┤
│                 DATA ACCESS LAYER (single source of truth)                 │
│  Parameterized SQL only; migrations; transaction helpers; row mapping      │
├───────────────────────────────────────────────────────────────────────────┤
│                        SQLITE (single DB file, WAL)                        │
│  project → package → module datasets + attachments + metadata + history    │
├───────────────────────────────────────────────────────────────────────────┤
│                      TAURI (Rust host, trusted boundary)                   │
│  filesystem paths, updater, OS integration, window, process, permissions   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|---|---|---|
| UI Shell (App) | App frame, left-nav, global dialogs/toasts, module routing, project selection guard | React Router + layout components |
| Module Registry | Declarative module metadata (id, name, routes, nav entry, required permissions, “owns tables”) | `modules/index.ts` exporting an array |
| Module UI | Screen-level UI and user workflows for that module | `src/modules/<module>/pages/*` |
| Application Services | Cross-cutting workflows that span UI + DB (import pipeline, validation, “create package”, “merge backup”) | `src/services/*` or module-local services |
| Domain Model | Types, invariants and domain rules (Project → Packages → module datasets) | `src/types/*` + domain helpers |
| Data Access Layer | Queries, transactions, schema versioning, mapping DB rows to types | `src/lib/db/client.ts` (per repo rules) |
| Background Job Runner | Long-running tasks with progress + cancellation | Tauri commands + async queue; UI subscribes to progress |
| Backup/Restore/Merge Service | Snapshotting DB, restore, and merge workflows with user confirmation | App service orchestrating SQLite backup APIs/VACUUM INTO + module “merge handlers” |
| Update Service | Check/download/install/relaunch updates; notify UI; enforce signed artifacts | Tauri updater plugin + minimal app service wrapper |

## Recommended Project Structure

This is a “modular monolith” layout: modules are isolated, but infrastructure is centralized.

```
src/
├── app/                       # Shell: routing, layouts, landing page, nav
│   ├── routes.tsx             # Top-level routes + module route mounting
│   ├── layout/                # App frame + project-switch UI
│   └── landing/               # Professional landing/dashboard + recents
├── modules/                   # Feature modules (applet-like)
│   ├── registry.ts            # Module metadata (id, routes, nav, datasets)
│   ├── bom-translation/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/          # module-local orchestration (no raw SQL)
│   │   ├── store/             # module-local Zustand store(s)
│   │   └── schemas/           # Zod schemas for module inputs
│   └── parts/...
├── services/                  # Cross-cutting application services
│   ├── project-service.ts     # Project switching, guards, recents
│   ├── backup-service.ts      # backup/restore/merge orchestration
│   ├── update-service.ts      # updater orchestration + UI events
│   └── job-service.ts         # background job queue/progress
├── lib/
│   ├── db/
│   │   ├── client.ts          # ALL SQL queries (per repo rule)
│   │   └── schema.ts          # typed schema metadata, helpers
│   ├── events/                # typed event bus (in-process)
│   └── fs/                    # paths, file naming, sanitize helpers
├── stores/                    # Global Zustand stores (project, nav, settings)
├── types/                     # Domain types: Project, Package, dataset types
└── components/                # Shared UI (non-shadcn) and primitives
src-tauri/
├── migrations/                # SQLite schema migrations
└── src/                       # Rust host wiring (plugins, commands)
```

### Structure Rationale

- **modules/**: keeps “applet” features decoupled; teams can build modules without touching core services except via stable APIs.
- **services/**: isolates cross-cutting workflows (backup/restore/merge, updates, job execution) so modules don’t reimplement them.
- **lib/db/client.ts** as the *only* SQL location: enforces consistent parameterization, transaction patterns, and schema discipline.

## Architectural Patterns

### Pattern 1: Module Registry + Capability Gating

**What:** A single registry describes modules (routes/nav/datasets/permissions). Shell renders navigation and routes from registry.

**When to use:** Always, if “platform with applets” is a goal; it prevents hard-coded navigation from turning into spaghetti.

**Trade-offs:**
- ✅ Easy to add/remove modules; consistent nav and lazy-loading.
- ✅ Enables “project-manager-first” UX (dashboard can show module status cards).
- ❌ Requires discipline to keep module boundaries (no cross-imports).

**Example:**
```typescript
// src/modules/registry.ts
export interface ModuleDefinition {
  id: string;
  name: string;
  routeBase: string;
  navIcon: React.ComponentType;
  datasets: string[]; // e.g., ["bom_translation"]
  routes: Array<{ path: string; element: React.ReactNode }>;
}

export const modules: ModuleDefinition[] = [
  /* ... */
];
```

### Pattern 2: “Shared DB, Partitioned Ownership” (Schema + IDs)

**What:** One SQLite file, but with explicit *ownership boundaries*:

1. **Core tables**: projects, packages, settings, audit/log, attachments.
2. **Module tables**: each module has tables prefixed or namespaced, and all rows are tied back to `(project_id, package_id)`.
3. **Cross-module reads are allowed**, cross-module writes should happen only through a deliberate “integration service” (not directly from module UI code).

**When to use:** When single-user offline + shared DB is required, but you still want modularity.

**Trade-offs:**
- ✅ Backup is “copy one file” (mostly).
- ✅ Queries across modules are possible (e.g., reporting/search).
- ❌ Requires conventions: foreign keys, cascade rules, “who owns deletion”, etc.

### Pattern 3: Orchestrated Workflows with Background Jobs

**What:** Long-running tasks (import/translate/validate/export/backup/merge) run as jobs with progress events. UI triggers job start; UI subscribes to progress and displays logs.

**When to use:** Any time operations take >250ms or need cancellation.

**Trade-offs:**
- ✅ Keeps UI responsive; improves trust and professionalism.
- ✅ Central place to log runs per project/package.
- ❌ Slightly more plumbing; must define job IDs and persistence strategy.

## Data Flow

### Request Flow

```
[User Action]
    ↓
[Module Page] → [Module Store Action] → [App/Module Service] → [DB Client]
    ↓                    ↓                     ↓                 ↓
[UI Update]   ←  [Progress / Events]  ←  [Transform/Validate] ← [SQLite]
```

### State Management

```
Global Stores (project, settings)
    ↓
Module Store(s) (module UI state)
    ↓
Components subscribe → render
```

### Key Data Flows

1. **Project-first navigation:**
   - User selects/creates Project → app sets global `currentProjectId` → modules are enabled/filtered based on project state.

2. **Package-scoped work:**
   - Within a project, user selects Package → module actions always take `(projectId, packageId)` to ensure all writes are scoped.

3. **Backup/restore/merge:**
   - Backup is a *snapshot* artifact produced by core backup service; restore is core-managed; merge is core-orchestrated but **module-resolved** (see below).

## Backup / Restore / Merge Boundaries

### Recommended boundary model

Treat backup/restore as a **platform feature**, not a module feature.

**Core owns:**
- Where backups live (naming, folder structure)
- Snapshot creation and verification
- Restore workflow, confirmation UX, and safety checks
- “Merge session” orchestration and conflict reporting

**Modules own:**
- How to interpret/merge *their* tables when combining datasets

### Snapshot strategies (SQLite)

- For a consistent copy of a live SQLite DB, use SQLite’s **Online Backup API** (incremental, designed for backing up while DB is in use). (HIGH confidence: official SQLite docs)
- Alternatively, **VACUUM INTO** can produce a compact snapshot copy; it is transactional, but if interrupted mid-run the output may be corrupt. (HIGH confidence: official SQLite docs)

**Practical boundary:**
- **Backups are whole-DB snapshots** (simple, robust).
- **Merges are logical** (domain-aware) and happen by reading from a snapshot DB and writing into the active DB.

### Merge mechanics (recommended)

Define a merge interface per module, implemented in TypeScript service layer:

```text
merge(snapshotDb, targetDb, projectId, packageId, options) -> MergeReport
```

Core runs:
1) Preflight: schema version compatibility, integrity checks
2) Begin merge session + lock UI writes
3) Invoke each module’s merge handler in deterministic order
4) Commit transaction(s)
5) Produce merge report + audit log

**Key design choice:** core should own the ordering and transactional boundaries, but modules own row-level rules.

## Update Service Boundaries

Updates should be a separate “platform service” with a strict trust boundary:

- Frontend asks: “is update available?”, “start download”, “install now”, “relaunch”.
- Backend (Tauri) performs check/download/install with signed artifacts.

Tauri updater plugin supports static JSON or dynamic update server, and requires signatures; frontend access is controlled via Tauri capabilities/permissions. (HIGH confidence: official Tauri updater docs)

**Boundary rule:**
- Modules **must not** self-update or ship their own update logic. If “module versioning” matters, represent it as metadata in DB and treat it as part of the app release.

## Suggested Build Order (Roadmap Implications)

This ordering minimizes rewrites by establishing platform boundaries early.

1. **Core shell + Project Manager UX**
   - Landing page/dashboard, project selection, recents, navigation framework.

2. **Module registry + routing conventions**
   - Single place to add modules; lazy load pages; consistent “project/package required” guards.

3. **Shared DB conventions + domain hierarchy**
   - `projects` / `packages` core tables; `(project_id, package_id)` scoping; migrations discipline.

4. **Cross-cutting services**
   - Background jobs + progress events (import/translate pipelines)
   - Backup snapshot creation + restore

5. **Module expansion**
   - Add modules using the template; only module-specific tables/services.

6. **Merge** (later)
   - Implement module merge handlers only once schema stabilizes.

7. **Updater**
   - Add after the app has stable release/distribution flow; integrate into Settings/About.

## Anti-Patterns

### Anti-Pattern 1: “Each module owns its own SQLite connection and schema conventions”

**What people do:** Module developers open DB directly and invent their own table naming, foreign keys, and scoping.

**Why it’s wrong:** You lose the ability to back up/restore/merge uniformly; schema becomes inconsistent; cross-module reporting/search becomes painful.

**Do this instead:** Centralize SQL in a single DB layer and enforce `(project_id, package_id)` scoping and module ownership conventions.

### Anti-Pattern 2: Cross-module writes from UI

**What people do:** BOM Translation page directly updates Parts tables “for convenience”.

**Why it’s wrong:** Tight coupling; breaks module replaceability; introduces subtle ordering and validation bugs.

**Do this instead:** Use an integration/app service (e.g., “publish translated BOM to Parts”) that is explicitly versioned and tested.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| Update server / static JSON | Tauri updater plugin endpoints | Prefer static JSON via GitHub Releases/CDN for simplicity; dynamic server only if needed |
| Filesystem for backups | Tauri FS/path + app service | Keep backups in an app-managed folder; sanitize names |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| Shell ↔ Modules | registry + route mounting + typed props/context | No direct imports between modules |
| Modules ↔ DB | via centralized DB client/query functions | No module-level raw SQL |
| Backup/merge ↔ Modules | module “handlers” interface (called by core) | Core owns orchestration and safety checks |

## Sources

- SQLite Backup API (official docs) — describes the online backup API and notes other backup techniques (VACUUM INTO). Last updated 2025-11-13. https://www.sqlite.org/backup.html
- SQLite VACUUM / VACUUM INTO (official docs) — describes VACUUM INTO trade-offs and snapshot guarantees. Last updated 2025-07-12. https://sqlite.org/lang_vacuum.html
- Tauri v2 Updater plugin (official docs) — signing requirements, endpoints, and capability/permission gating. Last updated Nov 28, 2025. https://v2.tauri.app/plugin/updater/

---
*Architecture research for: offline desktop modular tool platform with shared SQLite*
*Researched: 2026-01-20*
