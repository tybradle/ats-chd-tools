# PHASE 1: Project/Package Scoping + Entry UX

**Phase:** 1 of 4
**Depth:** standard
**Status:** Planned

## Goal

Users can organize work by Project (job #) and Package, and reliably enter BOM Translation in the correct context.

## Requirements Coverage

| Code | Title | Status |
|------|-------|--------|
| PROJ-01 | Project CRUD operations (create/select/rename/delete) | Pending |
| PROJ-02 | Projects contain multiple Packages | Pending |
| PROJ-03 | Package names can repeat across Projects | Pending |
| PROJ-04 | Package names are unique within a Project | Pending |
| PROJ-05 | BOM module entry opens Project Manager modal | Pending |
| APP-01 | Landing page with module tiles (disabled for non-ready) | Pending |

## Success Criteria (Observable)

1. **Landing Page**: Displays module tiles with non-ready modules disabled and labeled "Coming soon"
2. **BOM Entry**: Immediately prompts Project Manager modal (user can manage without leaving BOM context)
3. **Project Management**: User can create/select/rename/delete Projects (job #) and Packages
4. **Scope Enforcement**: Selected Package becomes active workspace scope
5. **Validation**: Package names are unique within a Project (same name can exist under different Projects)

## Current Gaps Analysis

### Missing Database Schema
- **Gap**: No tables for `projects` or `packages`
- **Impact**: Cannot store or query project/package hierarchy
- **Required**: Migration to add schema with proper constraints

### Missing Data Access Layer
- **Gap**: No query helpers in `src/lib/db/client.ts` for projects/packages
- **Impact**: No type-safe database operations
- **Required**: CRUD functions with proper error handling

### Missing State Management
- **Gap**: No Zustand stores for project/package state
- **Impact**: No reactive data management across components
- **Required**: Stores for Projects, Packages, and active scope tracking

### Missing UI Components
- **Gap**: No landing page with module tiles
- **Impact**: No entry point to application modules
- **Required**: Tile-based layout with routing

### Missing Project Management UI
- **Gap**: No ProjectManagerDialog component
- **Impact**: Cannot manage projects/packages from BOM entry
- **Required**: Modal with CRUD operations + validation

### BOM Store Refactoring Needed
- **Gap**: BOM store is not package-scope-first
- **Impact**: Cannot enforce proper scoping for BOM operations
- **Required**: Refactor to require active package scope

### Missing Routing Structure
- **Gap**: No routes for BOM module or other planned modules
- **Impact**: Cannot navigate between application sections
- **Required**: React Router 7 setup

## Technical Approach

### Database Design
```sql
-- Projects table (job numbers)
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Packages table (scoped to projects)
CREATE TABLE packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, name) -- Enforce uniqueness within project
);
```

### Component Architecture
- **Landing Page**: Tile grid with badges for "Coming Soon"
- **ProjectManagerDialog**: Modal with tabbed interface (Projects | Packages)
- **BOM Module**: Checks for active package scope on mount

### State Management Pattern
```typescript
// Project store with CRUD operations
interface ProjectStore {
  projects: Project[];
  activeProjectId: number | null;
  // actions...
}

// Package store scoped to active project
interface PackageStore {
  packages: Package[];
  activePackageId: number | null;
  // actions...
}

// Active scope store (single source of truth)
interface ActiveScopeStore {
  projectId: number | null;
  packageId: number | null;
  requiresScope: boolean; // true when BOM module active
}
```

## Execution Plan

### Step 1: Database Foundation
1. Create migration `006_add_projects_packages.sql`
2. Add TypeScript interfaces in `src/types/`
3. Implement query helpers in `src/lib/db/client.ts`

### Step 2: State Management
1. Create `src/stores/project-store.ts`
2. Create `src/stores/package-store.ts`
3. Create `src/stores/active-scope-store.ts`

### Step 3: Core Components
1. Build `src/components/LandingPage.tsx` with module tiles
2. Build `src/components/ProjectManagerDialog.tsx`
3. Set up React Router 7 in `src/App.tsx`

### Step 4: BOM Integration
1. Refactor `src/stores/bom-store.ts` to require package scope
2. Add scope check on BOM module mount
3. Wire ProjectManagerDialog to BOM entry point

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Package uniqueness validation failures | Enforce at DB level with UNIQUE constraint + UI validation |
| State drift between stores | Use single active-scope store as source of truth |
| BOM data orphaned during refactoring | Add migration to associate existing data with default project/package |

## Dependencies

- **External**: None (uses existing tech stack)
- **Internal**: None (first phase)
- **Blocks**: Phase 2 (BOM Translation workflow)

## Definition of Done

- [ ] All PROJ-01 through PROJ-05 requirements met
- [ ] APP-01 requirement met (landing page)
- [ ] Database migration tested with rollback
- [ ] All CRUD operations verified with manual testing
- [ ] BOM module opens ProjectManagerDialog on entry
- [ ] Package uniqueness enforced at DB + UI levels
- [ ] Active scope tracking working correctly
- [ ] No TypeScript errors
- [ ] No ESLint warnings

---
**Created**: 2026-01-20
**Next Action**: Execute Step 1 (Database Foundation)
