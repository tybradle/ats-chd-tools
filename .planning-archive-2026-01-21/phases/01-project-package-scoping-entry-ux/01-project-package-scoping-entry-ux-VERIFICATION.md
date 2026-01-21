---
phase: 01-project-package-scoping-entry-ux
verified: 2026-01-20T00:00:00Z
status: gaps_found
score: 2/4 must-haves verified
gaps:
  - truth: "Entering BOM module immediately prompts a blocking Project Manager modal (cannot dismiss until a Package is selected)"
    status: failed
    reason: "BomPage renders a fallback UI when currentScope is null and passes onOpenChange={setIsProjectManagerOpen}, which allows closing the dialog even when no scope is selected. The guarded handleOpenChange logic is not used in that branch."
    artifacts:
      - path: "src/pages/bom.tsx"
        issue: "In the `if (error || !currentScope)` early-return branch, ProjectManagerDialog uses `onOpenChange={setIsProjectManagerOpen}` (unguarded) instead of the blocking `handleOpenChange`."
    missing:
      - "Use the same guarded `handleOpenChange` for all ProjectManagerDialog instances (including the early-return branch), or remove the early-return UI and always render the workspace with dialog overlay."
      - "Ensure dialog cannot be closed (ESC/outside click) while currentScopePackageId is null, regardless of error/currentScope state."
  - truth: "User can switch Package scope reliably (scope change resets view and loads selected Package data)"
    status: partial
    reason: "useBOMStore.flushPendingWrites() uses a captured `state = get()` and loops on `while (state.pendingWrites > 0)`; because `state` never updates, the loop can become infinite if pendingWrites is > 0 when scope switching occurs. This can block scope changes in real usage."
    artifacts:
      - path: "src/stores/bom-store.ts"
        issue: "flushPendingWrites() reads get() once and never re-reads; loop condition can never change, risking an infinite loop/hang."
    missing:
      - "Rewrite flushPendingWrites to re-check `get().pendingWrites` each iteration (or track actual pending write Promises) so it terminates."
      - "Add a safety timeout/escape hatch so scope switching cannot hang indefinitely."
human_verification:
  - test: "BOM entry gating"
    expected: "Navigating to /bom opens ProjectManagerDialog and it cannot be dismissed until a package is selected (ESC/outside click should not close it)."
    why_human: "Requires interactive runtime behavior validation (dialog close mechanics)."
  - test: "CRUD + uniqueness errors"
    expected: "Create/rename package to a duplicate name within the same job project shows inline field error; same name under a different job project is allowed."
    why_human: "Requires real SQLite error surfaces in UI."
  - test: "Scope switching after edits"
    expected: "After editing items (while writes are in-flight), changing scope does not hang; it eventually switches and shows the new package’s locations/items."
    why_human: "Relies on timing/race conditions and async persistence behavior."
---

# Phase 1: Project/Package Scoping + Entry UX Verification Report

**Phase Goal:** Users can organize work by Project (job #) and Package, and reliably enter BOM Translation in the correct context.

**Verified:** 2026-01-20
**Status:** gaps_found

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---:|------|--------|----------|
| 1 | Landing page shows module tiles; non-ready modules are disabled and labeled “Coming soon”. | ✓ VERIFIED | `src/pages/home.tsx` renders modules with `status === "coming"` using `pointer-events-none`, reduced opacity, and `Badge` “Coming Soon”. |
| 2 | Entering BOM module immediately prompts a **blocking** Project Manager modal. | ✗ FAILED | `src/pages/bom.tsx` early-return branch uses `onOpenChange={setIsProjectManagerOpen}`, allowing close without scope selection. |
| 3 | User can create/select/rename/delete Projects (job #) and Packages; package names are unique within a Project. | ✓ VERIFIED | DB constraint `UNIQUE(project_id, package_name)` in migration; UI maps `UNIQUE constraint failed: bom_packages.project_id, bom_packages.package_name` to RHF inline error; CRUD actions exist in `useBOMStore` and are used by `ProjectManagerDialog`. |
| 4 | Selecting a Package becomes the active BOM workspace scope; switching scope resets view and loads new scope data. | ⚠️ PARTIAL | `useBOMStore.setScope` sets `currentScopePackageId/currentScope`, persists `bom.active_package_id`, and loads locations/items; however `flushPendingWrites` can hang if pendingWrites > 0 during scope switch. |

**Score:** 2/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src-tauri/migrations/004_project_package_scoping.sql` | Job-project + package schema + uniqueness constraints; rewires FK to package scope | ✓ VERIFIED | Creates `bom_job_projects` (`project_number` UNIQUE) and `bom_packages` (`UNIQUE(project_id, package_name)`); rebuilds `bom_locations/bom_items/bom_exports` to reference `bom_packages(id)`; preserves IDs by inserting `old.id` into `bom_packages(id)`. |
| `src-tauri/src/lib.rs` | Migration v4 registered and executed | ✓ VERIFIED | Contains `Migration { version: 4, sql: include_str!("../migrations/004_project_package_scoping.sql"), ... }` and `.add_migrations(...)`. |
| `src/lib/db/real-client.ts` | Real DB helpers for job projects + packages | ✓ VERIFIED | Exports `bomJobProjects` and `bomPackages` with parameterized `?` placeholders; package queries include `FROM bom_packages` and use joins for counts. |
| `src/stores/bom-store.ts` | Scope-first store state/actions | ⚠️ PARTIAL | Contains `currentScopePackageId`, `setScope`, `loadJobProjects`, `loadPackages`, etc., but `flushPendingWrites` loop is unsafe and may hang. |
| `src/components/bom/project-manager-dialog.tsx` | Project/Package CRUD + selection UI wired to store; inline uniqueness errors | ✓ VERIFIED | Uses `useBOMStore()` actions and maps UNIQUE constraint failures to `form.setError(...)`; selecting package calls `setScope(packageId)` then closes dialog. |
| `src/pages/bom.tsx` | BOM entry enforces scope selection and displays active scope | ⚠️ PARTIAL | Has guarded `handleOpenChange` to block close, but only used for one dialog instance; fallback branch bypasses blocking logic. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `src-tauri/src/lib.rs` | `src-tauri/migrations/004_project_package_scoping.sql` | `include_str!` + `add_migrations` | ✓ WIRED | `include_str!("../migrations/004_project_package_scoping.sql")` present. |
| `src/pages/bom.tsx` | `src/components/bom/project-manager-dialog.tsx` | Controlled `open` + `onOpenChange` | ⚠️ PARTIAL | One instance uses guarded `handleOpenChange`; early-return branch uses unguarded setter. |
| `src/components/bom/project-manager-dialog.tsx` | `src/stores/bom-store.ts` | `useBOMStore` actions | ✓ WIRED | Calls `createJobProjectWithInitialPackage`, `createPackage`, `rename*`, `delete*`, and `setScope`. |
| `src/stores/bom-store.ts` | `src/lib/db/client.ts` | `bomJobProjects/bomPackages/bomLocations/bomItems/settings` | ✓ WIRED | Imports these symbols and uses them in loaders/actions; `setScope` reads package+job project and persists selection via `settings.set`. |
| UI forms | SQLite uniqueness rules | Error string mapping | ✓ WIRED | Checks for `UNIQUE constraint failed: bom_job_projects.project_number` and `UNIQUE constraint failed: bom_packages.project_id, bom_packages.package_name` and sets RHF field errors. |

### Requirements Coverage

`REQUIREMENTS.md` not found in repo `.planning/` at verification time, so phase requirements (PROJ-01..PROJ-05, APP-01) cannot be formally traced here. The observable truths above are validated against ROADMAP Phase 1 success criteria.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---:|---|---|---|
| `src/stores/bom-store.ts` | 92-98 | `while (state.pendingWrites > 0)` with captured state | 🛑 Blocker | Can hang scope switching (infinite loop) when pending writes exist. |
| `src/components/bom/project-manager-dialog.tsx` | 412, 660 | `(renamePackageForm as any)._packageId` | ⚠️ Warning | Type-safety escape hatch; not a goal blocker, but violates project “no any” guidance and is easy to break. |

### Gaps Summary

1) **BOM entry modal is not reliably blocking**: there is a code path where the modal can be dismissed without selecting a package.

2) **Scope switching reliability risk**: pending-write flushing can hang, undermining the “reliably work in correct context” aspect when switching packages after edits.

---

_Verified: 2026-01-20T00:00:00Z_
_Verifier: OpenCode (gsd-verifier)_
