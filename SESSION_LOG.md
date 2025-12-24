# ATS CHD Tools - Session Log

**Date**: December 24, 2025  
**Session**: Phase 1 Setup Complete

---

## Session Summary

Completed initial project setup for ATS CHD Tools - a unified desktop application platform for the ATS CHD department to replace multiple Excel-based workflows.

---

## What Was Done

### 1. Project Initialization
- ✅ Created Vite 6 + React 19 + TypeScript project at `/home/dev/projects/ats-chd-tools/`
- ✅ Initialized Tauri 2.0 desktop framework
- ✅ Installed Tauri plugins: `@tauri-apps/plugin-sql`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`

### 2. Backend Configuration (Rust/Tauri)

**Files Created/Modified**:
- `src-tauri/Cargo.toml` - Added plugin dependencies (tauri-plugin-sql with sqlite, tauri-plugin-dialog, tauri-plugin-fs)
- `src-tauri/src/lib.rs` - Configured Tauri builder with plugins and migration system
- `src-tauri/migrations/001_initial.sql` - Created initial database schema:
  - `manufacturers` table
  - `categories` table (hierarchical)
  - `parts` table (master parts with FTS5 full-text search)
  - `part_pricing` table (for future quoting module)
  - `part_electrical` table (for future heat/load module)
  - `settings` key-value store
  - FTS5 triggers for automatic search index updates
  - Performance indexes
- `src-tauri/capabilities/default.json` - Configured permissions for sql, dialog, and fs plugins
- `src-tauri/tauri.conf.json` - Updated app configuration (identifier, window size, devUrl port fix)

### 3. Frontend Setup

**Styling**:
- ✅ Installed TailwindCSS 4 with Vite plugin (`@tailwindcss/vite`)
- ✅ Configured path alias `@/` → `./src` in `vite.config.ts` and `tsconfig.json`
- ✅ Replaced `src/index.css` with Tailwind imports

**Component Library**:
- ✅ Initialized shadcn/ui with defaults
- ✅ Added 15 components:
  - button, card, input, dialog, table
  - dropdown-menu, label, separator, sonner (toasts)
  - select, tabs, scroll-area, tooltip, badge, alert

**Dependencies Installed**:
- `react-router-dom` (v7.11.0) - Routing
- `zustand` (v5.0.9) - State management
- `@tanstack/react-table` (v8.21.3) - Data grids
- `react-hook-form` (v7.69.0) - Form handling
- `zod` (v4.2.1) - Schema validation
- `@hookform/resolvers` (v5.2.2) - Zod + React Hook Form integration
- `lucide-react` (v0.562.0) - Icons (auto-installed by shadcn/ui)

### 4. Database Client

**Created**: `src/lib/db/client.ts`

Type-safe wrapper around `@tauri-apps/plugin-sql` with:
- Connection singleton management
- Query helpers (`query<T>()`, `execute()`, `transaction()`)
- TypeScript interfaces for all tables
- CRUD methods for:
  - `manufacturers` - getAll, getById, create, update, delete
  - `categories` - getAll, getById, getByParent, create, update, delete
  - `parts` - getAll, getById, search (FTS5), create, update, delete
  - `settings` - get, set, delete, getAll

### 5. Routing & Layout

**Files Created**:
- `src/App.tsx` - React Router setup with routes:
  - `/` - Home page
  - `/bom/*` - BOM Translation module
  - `/parts` - Parts Library
  - `/settings` - Settings
- `src/components/layout/root-layout.tsx` - Sidebar navigation layout with:
  - App title/logo area
  - Navigation links (Home, BOM Translation, Parts Library)
  - Settings link at bottom
  - Active route highlighting
- `src/pages/home.tsx` - Landing page with module cards:
  - BOM Translation (active)
  - Parts Library (active)
  - QR Label Generator (coming soon)
  - Quoting Workbook (coming soon)
  - Heat/Load Calculator (coming soon)
- `src/pages/bom.tsx` - BOM module placeholder
- `src/pages/parts.tsx` - Parts module placeholder
- `src/pages/settings.tsx` - Settings placeholder

### 6. Development Setup

**Configuration**:
- Updated `package.json` scripts:
  - `npm run dev` - Vite dev server only
  - `npm run tauri:dev` - Full Tauri dev (frontend + backend)
  - `npm run tauri:build` - Production build
- Fixed port mismatch: Vite runs on 1420, Tauri devUrl updated to match
- Added Tauri-specific Vite config (clearScreen: false, watch ignored)

**Verification**:
- ✅ TypeScript compiles with no errors (`npx tsc --noEmit`)
- ✅ Rust backend compiles successfully (`cargo check` - 2m 28s first build)
- ✅ Tauri dev mode starts correctly

### 7. Version Control

**Git Setup**:
- ✅ Initialized git repository
- ✅ Updated `.gitignore` for Tauri project:
  - Node modules, build outputs
  - Rust target directory, Cargo.lock
  - Database files (*.db, *.db-shm, *.db-wal)
  - Environment files
- ✅ Initial commit: "Initial setup: Tauri 2.0 + React 19 + TailwindCSS 4 + shadcn/ui"
- ✅ Renamed branch from master → main

### 8. Documentation

**Created**: `AGENTS.md` - AI agent coding guidelines:
- Project overview and target platform
- Tech stack reference table
- Directory structure conventions
- Module priority order
- Code conventions (TypeScript, React, styling, database, state, forms)
- NPM commands reference
- Database schema overview
- Anti-patterns to avoid

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop | Tauri | 2.9.5 |
| Frontend | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| Language | TypeScript | 5.9.3 |
| Styling | TailwindCSS | 4.1.18 |
| UI Components | shadcn/ui | Latest |
| Routing | React Router | 7.11.0 |
| State | Zustand | 5.0.9 |
| Forms | React Hook Form + Zod | 7.69.0 + 4.2.1 |
| Tables | TanStack Table | 8.21.3 |
| Database | SQLite via Tauri plugin | 2.3.1 |
| Icons | Lucide React | 0.562.0 |
| Toasts | Sonner | 2.0.7 |

---

## Project Context

### Background
- **User**: Solo developer at ATS CHD department
- **Previous Attempts**: 
  - `/home/dev/projects/BOM_JS` - Electron version (too "vibe coded")
  - `/home/dev/projects/BOM_Tauri` - Failed Tauri migration
- **This Project**: Methodical rebuild from scratch

### Requirements
- 100% offline, local-first
- Single-user, Windows desktop application
- Target installer size: 15-20MB (vs Electron's 500-800MB)
- Master parts database shared across modules
- Priority: BOM Translation module first

### Modules (Planned)
1. **BOM Translation** ⭐ Priority - Convert BOMs between formats
   - Import: CSV (from Eplan/AutoCAD)
   - Export: Excel, XML, ZW1
   - Project management with locations
   - Part matching with master database
2. **Parts Library** - Master parts database management
3. **QR Label Generator** - Generate QR code labels
4. **Quoting Workbook** - Project quotes with pricing
5. **Heat/Load Calculator** - Electrical calculations

---

## What Was Discussed

### 1. Tech Stack Decision
**Topic**: How to structure the project  
**Decision**: Tauri 2.0 (not Electron) for smaller bundle size, React 19 for frontend, TypeScript for business logic (avoiding excessive Rust complexity)

### 2. Database Strategy
**Topic**: Where to run queries  
**Decision**: Use `@tauri-apps/plugin-sql` to run SQLite queries directly from TypeScript. No need for Rust command handlers for basic CRUD. This keeps the codebase simpler and more maintainable for a solo developer.

### 3. Styling Approach
**Topic**: UI framework choice  
**Decision**: TailwindCSS 4 + shadcn/ui (same as previous BOM_JS project for consistency). Avoids heavyweight component libraries.

### 4. Router Choice
**Topic**: Routing solution  
**Decision**: React Router 7 (not Next.js App Router). This is a desktop app, not a web app, so Next.js would be overkill.

### 5. TypeScript Configuration
**Topic**: Strictness level  
**Result**: Vite's default `tsconfig.app.json` already has strict mode enabled. No changes needed.

### 6. Phase 1 Scope
**Topic**: What to build first  
**Decision**: Get the foundation working (routing, database, basic UI) before diving into BOM module features. This session completed Phase 1.

### 7. UI Design Workflow
**Topic**: Should we use Figma or code-first?  
**Discussion**:
- **Figma**: Good for teams/clients, but adds overhead for solo dev
- **Component-First**: Build directly with shadcn/ui, iterate with hot reload
- **Hybrid (Recommended)**: Quick wireframe sketch (Excalidraw/paper) → build with shadcn/ui → polish

**Considerations for this project**:
- Solo developer (no handoff needed)
- Component library ready (shadcn/ui)
- Domain expertise (user knows the workflow)
- Desktop app (fixed viewport)
- Goal: "Better than Excel" (not consumer-grade UX)

**Suggested Approach**:
1. Sketch BOM module workflow on paper (30 min)
2. Build screen-by-screen in React with real data
3. Use Tauri dev mode for live preview
4. Screenshot working screens for documentation

---

## Next Steps

### Immediate Decision Needed
**Question for User**: What's the preferred UI design workflow?
1. **Quick sketch → code** (fastest)
2. **Figma design → code** (more upfront planning)
3. **Hybrid**: Rough wireframe → code → polish

### Phase 2: Core UI (Optional)
If doing this before BOM module:
1. Settings page implementation (default paths, preferences)
2. Shared components:
   - PartPicker component (autocomplete with FTS5 search)
   - DataGrid wrapper around TanStack Table
3. Theme toggle (light/dark mode)
4. Sidebar polish

### Phase 3: BOM Translation Module (Priority)
Main development focus:
1. **Database Schema** - Add BOM-specific tables:
   - `bom_projects` (project metadata)
   - `bom_locations` (locations within project)
   - `bom_items` (line items with part references)
2. **Project Management**:
   - Project list view (create, edit, delete, duplicate)
   - Project detail view with locations
3. **Items Grid**:
   - TanStack Table with editable cells
   - Part autocomplete with FTS5 search
   - Location assignment
   - Quantity/unit management
4. **Import**:
   - CSV parser (Eplan/AutoCAD formats)
   - Column mapping UI
   - Part matching logic
5. **Export**:
   - Excel export (xlsx format)
   - XML export (custom schema)
   - ZW1 export (legacy format)

---

## Questions to Answer Next Session

1. **BOM Workflow**: Do you have Excel examples of current BOM workflows we should reference?
2. **UI Approach**: Sketch-first or jump straight to code?
3. **Database Tables**: Are there other BOM-specific fields needed beyond (project, location, part, quantity, unit)?
4. **Import Formats**: What do the CSV files from Eplan/AutoCAD look like?
5. **Export Requirements**: Are there specific Excel templates or XML schemas to follow?

---

## How to Resume Development

```bash
# Navigate to project
cd /home/dev/projects/ats-chd-tools

# Start dev server (with Rust compilation)
npm run tauri:dev

# Or frontend only (faster for UI work)
npm run dev
```

**First-time Tauri dev**: Rust compilation takes ~2-3 minutes. Subsequent runs are fast (~5-10 seconds).

---

## File Locations Reference

| Purpose | Path |
|---------|------|
| Database client | `src/lib/db/client.ts` |
| Database schema | `src-tauri/migrations/001_initial.sql` |
| Rust plugin config | `src-tauri/src/lib.rs` |
| App router | `src/App.tsx` |
| Landing page | `src/pages/home.tsx` |
| Layout/nav | `src/components/layout/root-layout.tsx` |
| shadcn components | `src/components/ui/` |
| Tauri config | `src-tauri/tauri.conf.json` |
| Vite config | `vite.config.ts` |
| Project conventions | `AGENTS.md` |

---

## Success Criteria Met ✅

- [x] TypeScript compiles with strict mode
- [x] Rust backend compiles successfully
- [x] Tauri dev mode runs
- [x] Database schema created with migrations
- [x] Routing works with sidebar navigation
- [x] shadcn/ui components render
- [x] Git repository initialized
- [x] Documentation created

---

**Status**: Phase 1 Complete. Ready for Phase 2 (Core UI) or Phase 3 (BOM Module).
