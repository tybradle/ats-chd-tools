# Phase 1: Project/Package Scoping + Entry UX - Research

**Researched:** 2026-01-20
**Domain:** Offline Tauri + React app workspace scoping (SQLite schema + UI/UX gating)
**Confidence:** HIGH

## Summary

Phase 1 is primarily a **schema + UX wiring** problem: evolve the BOM module from a single “project row = (job#, package)” model into a **hierarchical Project(job#) → Packages** model, while keeping BOM editing behavior stable.

The current schema stores `bom_projects(project_number UNIQUE, package_name)` which blocks having multiple packages per job. The clean and durable fix is to **introduce a real Projects table and a Packages table**, and treat **Package** as the BOM “workspace scope” that existing locations/items belong to. To minimize disruption, keep existing code-facing IDs as the scope IDs by **preserving existing `bom_projects.id` values as `bom_packages.id`** in a migration, and keep column names like `project_id` in dependent tables even if they now reference packages.

For UX gating, BOM should become a “workspace” page that can render with no scope selected, but immediately shows a **blocking Project Manager modal** and does not allow interaction until a package is selected. Persist the selected scope in the BOM Zustand store (and optionally in the `settings` table) so it survives navigation.

**Primary recommendation:** Model **Project(job#)** and **Package** as separate SQLite tables, migrate existing `bom_projects` rows into `bom_packages` (preserving IDs), and enforce uniqueness with `UNIQUE(project_number)` on projects and `UNIQUE(project_id, package_name)` on packages; use RHF+Zod plus DB constraint error mapping for inline uniqueness errors.

## Standard Stack

### Core
| Library | Version (repo) | Purpose | Why Standard |
|---|---:|---|---|
| SQLite (via Tauri) | (embedded) | Offline single-user DB | ACID + UNIQUE constraints for scoping rules |
| `@tauri-apps/plugin-sql` | ^2.3.1 | SQLite access from UI | Already used (`Database.load`, `select`, `execute`) |
| Zustand | ^5.0.9 | Global UI/workspace state | Existing async store pattern in `src/stores/` |
| React Router | ^7.11.0 | Navigation + deep links | Existing routing in `src/App.tsx` |
| shadcn/ui (Radix) | (vendored) | Dialogs, inputs, tables | Existing modal/dialog UX primitives |

### Supporting
| Library | Version (repo) | Purpose | When to Use |
|---|---:|---|---|
| React Hook Form | ^7.69.0 | Form state + error display | Project/Package create/rename forms |
| Zod | ^4.2.1 | Validation schemas | Required fields + basic constraints |
| `@hookform/resolvers` | ^5.2.2 | Zod ↔ RHF bridge | `zodResolver(schema)` in dialogs |
| Sonner | ^2.0.7 | Toasts | Success + non-field errors; **not** uniqueness errors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| DB-enforced uniqueness (UNIQUE indexes) | Pure client-side duplicate checks | Client-side checks are race-prone and fail on import/edge cases; DB constraints are the source of truth |
| Preserve old scope IDs (`bom_projects.id` → `bom_packages.id`) | Re-key everything | Re-keying forces rewriting references or complex mapping and is higher risk |

## Architecture Patterns

### Recommended Project Structure
No new top-level architecture is needed; stay consistent with existing patterns:

```
src/
├── components/
│   └── bom/
│       ├── project-manager-dialog.tsx  # becomes Project+Package manager
│       └── ...
├── lib/
│   └── db/
│       ├── client.ts                  # façade (Real vs Mock)
│       ├── real-client.ts             # SQL implementations
│       └── mock-client.ts             # browser implementations
├── pages/
│   ├── bom.tsx                        # becomes BOM workspace entry
│   └── bom-project.tsx                # likely becomes package-scoped BOM workspace
└── stores/
    └── bom-store.ts                   # stores active scope/package
```

### Pattern 1: “Scope is a first-class store state”
**What:** Store the active workspace scope (selected package) in the BOM Zustand store and make the page render conditional on it.

**When to use:** Always; BOM entry is blocked until a scope is selected.

**Implementation guidance (repo-aligned):**
- Add `currentScopePackageId` and `currentScope` (package + joined project fields) to `useBOMStore`.
- Provide actions: `ensureScopeSelected()`, `setScope(packageId)`, and `clearScope()`.
- On scope change: reset dependent state (`locations`, `items`, selection), then load locations/items for the new scope.

### Pattern 2: “Blocking modal via controlled open state”
**What:** A controlled `open` prop dialog that cannot close until valid selection.

**When to use:** On entering `/bom` (and any BOM route) when there is no active scope.

**Implementation guidance:**
- Keep `open={true}` until a package is selected.
- Reject `onOpenChange(false)` when selection is required.
- Ensure the modal prevents accidental outside-close/escape-close (Radix `Dialog` supports this via preventing default on the relevant events; implement in the dialog wrapper if needed).

### Pattern 3: “DB constraints first, map failures to field errors”
**What:** Use SQLite `UNIQUE` constraints as the authoritative validator, and translate constraint failures into inline errors.

**When to use:** Any create/rename operations for Project(job#) and Package.

**Example (RHF setError):**
```tsx
// Source: https://context7.com/react-hook-form/react-hook-form/llms.txt
setError('project_number', { type: 'manual', message: 'That job # already exists' });
setError('package_name', { type: 'manual', message: 'Package name must be unique within this project' });
```

### Anti-Patterns to Avoid
- **Treating `project_number` as a package-level unique key:** it must allow multiple packages per project; uniqueness belongs to the Project entity.
- **Client-only uniqueness enforcement:** it will drift from DB truth and break on concurrent operations (import/bulk) and edge cases.
- **Large-scale rename without transaction:** if a project rename requires updating multiple packages/rows, do it in a DB transaction.

## Recommended SQLite Model (Prescriptive)

### Target domain model
- **Project** = job # (unique across all projects)
- **Package** = name unique within its Project
- **Scope** = selected Package (everything in BOM hangs off scope)

### Target schema (new tables)

```sql
-- Projects: job #
CREATE TABLE bom_job_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_number TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Packages: unique per Project
CREATE TABLE bom_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES bom_job_projects(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  name TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0',
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, package_name)
);
```

### Key disruption-minimizer: preserve existing scope IDs

**Why:** All existing BOM data (`bom_locations`, `bom_items`, `bom_exports`) references `bom_projects.id` as `project_id`. If we preserve those IDs as `bom_packages.id`, we can migrate data with minimal re-keying.

**Migration strategy (SQLite-safe):**
1. `ALTER TABLE bom_projects RENAME TO bom_projects_old;`
2. Create `bom_job_projects` and `bom_packages`.
3. Insert unique projects from `bom_projects_old`:
   - `INSERT INTO bom_job_projects(project_number, created_at, updated_at)
      SELECT DISTINCT project_number, MIN(created_at), MAX(updated_at) FROM bom_projects_old GROUP BY project_number;`
4. Insert packages preserving IDs:
   - `INSERT INTO bom_packages(id, project_id, package_name, name, description, version, metadata, created_at, updated_at)
      SELECT old.id,
             p.id,
             old.package_name, old.name, old.description, old.version, old.metadata,
             old.created_at, old.updated_at
        FROM bom_projects_old old
        JOIN bom_job_projects p ON p.project_number = old.project_number;`
5. Recreate dependent tables to point at packages:
   - Recreate `bom_locations.project_id` FK → `bom_packages(id)`
   - Recreate `bom_items.project_id` FK → `bom_packages(id)`
   - Recreate `bom_exports.project_id` FK → `bom_packages(id)`
   (This requires table rebuilds in SQLite because FK references are part of the table definition.)
6. Copy rows into rebuilt tables as-is (IDs preserved), drop old tables, add indexes.

**Confidence:** HIGH (this is the standard/required way to change FKs/constraints in SQLite).

## Active Scope Representation

### Store-level state (recommended)
In `useBOMStore`, treat scope as the root of BOM state:
- `currentScopePackageId: number | null`
- `currentScope: { package_id, package_name, project_id, project_number, ... } | null`

When scope changes:
- clear current selection: `currentLocationId`, `selectedItemIds`
- load locations/items for the new scope

### Persistence across navigation / app restarts

**Within-app navigation:** Zustand store already survives route changes; no extra work.

**Across restarts (optional but recommended):** store `settings.set('bom.active_package_id', String(id))` and load on app start / BOM entry. Note that Phase context says landing page scope is ambiguous; you can still preselect the last scope in the modal, but **still show the modal**.

## Inline Uniqueness Validation (Zod + RHF)

### What Zod should handle
- Required: non-empty strings
- Simple constraints (trim, min length)

### What DB should handle
- Uniqueness and referential integrity

### Mapping DB uniqueness failures to fields

Use `react-hook-form`’s `setError` to show inline errors (required by phase context).

```tsx
// Source: https://context7.com/react-hook-form/react-hook-form/llms.txt
setError('root.serverError', { type: 'server', message: 'Unexpected database error' });
```

**Practical implementation detail:** SQLite uniqueness errors typically surface as messages like:
- `UNIQUE constraint failed: bom_job_projects.project_number`
- `UNIQUE constraint failed: bom_packages.project_id, bom_packages.package_name`

Plan to pattern-match these strings in the caught exception and map them to the correct field.

### Resolver setup
Use the existing repo pattern (as in `src/components/parts/part-dialog.tsx`):

```tsx
// Source: https://github.com/react-hook-form/resolvers/blob/master/README.md
const form = useForm<Values>({
  resolver: zodResolver(schema),
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Uniqueness enforcement | Manual client-only checks | SQLite `UNIQUE` constraints + inline `setError` mapping | DB is authoritative; fewer edge cases |
| Modal / confirm UX | Custom modal implementation | shadcn/ui `Dialog` + `AlertDialog` | Consistent behavior and accessibility |
| Global scope state | Prop drilling | Zustand store (`useBOMStore`) | Existing app pattern |
| SQL construction | String interpolation | Parameter binding (`?`) everywhere | Prevents injection + consistent with repo rules |

## Common Pitfalls

### Pitfall 1: Breaking referential integrity during migration
**What goes wrong:** Locations/items still reference old IDs or old table name after refactor.

**Why it happens:** SQLite requires table rebuild for FK changes; forgetting to preserve IDs breaks all relations.

**How to avoid:** Preserve `bom_projects_old.id` as `bom_packages.id` and rebuild dependent tables’ FK definitions in the migration.

**Warning signs:** BOM loads a scope but shows zero locations/items; deletes stop cascading.

### Pitfall 2: UI can close the “blocking” modal
**What goes wrong:** User dismisses modal (escape/outside click/X) and interacts with BOM without a scope.

**How to avoid:** Keep modal controlled and refuse close until `currentScopePackageId` is set; render BOM workspace disabled/empty behind it.

### Pitfall 3: Uniqueness errors shown as toasts (not inline)
**What goes wrong:** Phase requires inline field errors; toast-only feedback fails acceptance.

**How to avoid:** Use RHF errors (`setError`) for uniqueness violations; use toast only for success or non-field errors.

### Pitfall 4: Package rename uniqueness not enforced
**What goes wrong:** `UPDATE` allows duplicate package names within the same project.

**How to avoid:** Ensure the `UNIQUE(project_id, package_name)` constraint exists and update operations catch and map violations.

## Code Examples

### RHF: set field error from DB constraint
```tsx
// Source: https://context7.com/react-hook-form/react-hook-form/llms.txt
setError('package_name', {
  type: 'manual',
  message: 'Package name must be unique within this project',
});
```

### Zod: cross-field / targeted path errors (for forms with multiple fields)
```ts
// Source: https://github.com/colinhacks/zod/blob/v4.0.1/packages/docs/content/packages/v3.mdx
const schema = z
  .object({ project_number: z.string(), package_name: z.string() })
  .refine((data) => data.project_number.trim().length > 0, {
    message: 'Job # is required',
    path: ['project_number'],
  });
```

## State of the Art

| Old Approach (current repo) | Current Approach (phase target) | When Changed | Impact |
|---|---|---|---|
| `bom_projects` row = single scope, `project_number UNIQUE` | Separate Projects + Packages; scope = Package | Phase 1 | Enables multiple packages per job while keeping BOM data scoped |

**Deprecated/outdated in this repo’s context:**
- Treating `bom_projects.project_number` as globally unique AND also supporting multiple packages per job — cannot both be true in one table.

## Open Questions

1. **Should project display name/description be on Project or Package?**
   - What we know: current schema stores `name/description` on the scope row.
   - What’s unclear: whether those fields conceptually belong to the job project or the package.
   - Recommendation: keep `name/description` on `bom_packages` in Phase 1 (matches current usage, minimizes disruption). Add project-level metadata later if needed.

2. **Do we need explicit “draft” autosave tables for scope switching?**
   - What we know: current BOM edits persist per keystroke (`updateItem` writes to DB), so there is effectively no unsaved state.
   - Recommendation: implement scope switching without special draft handling in Phase 1; add drafts only when a true multi-step, unsaved workflow appears.

## Sources

### Primary (HIGH confidence)
- Repo code:
  - `src-tauri/migrations/002_bom_tables.sql` (current schema)
  - `src/lib/db/real-client.ts` (current BOM SQL and transaction helper)
  - `src/stores/bom-store.ts` (current scope state and loading)
  - `src/components/bom/project-manager-dialog.tsx` (current modal)
  - `src/pages/bom.tsx`, `src/pages/bom-project.tsx` (current BOM routes)
- React Hook Form docs (Context7): /react-hook-form/react-hook-form (setError/clearErrors)
- RHF Resolvers docs (Context7): /react-hook-form/resolvers (zodResolver usage)
- Zod docs (Context7): /colinhacks/zod/v4.0.1 (refine + error path)

### Secondary (MEDIUM confidence)
- Tauri SQL plugin docs (Context7 mirror is v1-focused; repo uses v2): /tauri-apps/tauri-plugin-sql
  - Note: project code uses `?` placeholders successfully; follow repo convention.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by `package.json` and repo usage
- Architecture: HIGH — derived from existing code patterns and SQLite constraints
- Pitfalls: HIGH — directly implied by current schema + migration realities

**Research date:** 2026-01-20
**Valid until:** 2026-02-19
