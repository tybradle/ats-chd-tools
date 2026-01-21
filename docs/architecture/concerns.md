# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**tauri-plugin-sql does not support reliable multi-statement transactions from JS**
- Issue: `@tauri-apps/plugin-sql` uses a sqlx connection pool; separate `db.execute()` calls may run on different connections.
- Symptom: `BEGIN` succeeds but later `COMMIT` fails with `cannot commit - no transaction is active` even though inserts may persist.
- Impact: JS-side manual `BEGIN/COMMIT/ROLLBACK` helpers are unreliable; can cause misleading error handling.
- Guidance:
  - Prefer single-statement atomic writes (e.g., multi-row INSERT batching under SQLite 999 bind param limit).
  - If true atomic multi-statement transactions are required, implement via a Rust command using sqlx `Transaction` to guarantee same-connection execution.
- Reference: Encountered during BOM Excel import bulk insert.

**SQL outside the "single source of truth"**
- Issue: SQL access is not fully centralized; UI/components call `query()` directly instead of going through the DB module surface.
- Files: `src/components/bom/part-search-dialog.tsx`, `src/lib/db/client.ts`, `src/lib/db/real-client.ts`
- Impact: Makes query auditing/optimization harder; encourages ad-hoc SQL; increases risk of inconsistent patterns (pagination, limits, JOINs, FTS usage).
- Fix approach: Move component-level SQL into `src/lib/db/real-client.ts` (and `src/lib/db/mock-client.ts` equivalents) behind a dedicated function (e.g. `parts.searchSimpleLike()` or similar), and have `src/components/bom/part-search-dialog.tsx` call that API.

**Dynamic SQL string building in DB layer**
- Issue: Some updates/builds construct SQL using template literals and string-joined field lists.
- Files: `src/lib/db/real-client.ts` (e.g. `parts.update()` line ~190, `bomProjects.update()` ~274, `bomItems.update()` ~419, `bomItems.bulkDelete()` ~425)
- Impact: Even with parameter binding for values, dynamically assembling SQL makes it easier to accidentally introduce unsafe patterns later; also complicates static analysis.
- Fix approach: Keep all user-provided data parameterized (already mostly done); additionally constrain field lists to a fixed allowlist (explicit mapping) and validate `ids.length > 0` before creating `IN (...)` lists.

**Browser-mode Mock DB is not behaviorally equivalent to real DB**
- Issue: The mock database is partially “real” (localStorage + Maps) but the generic `query()`/`execute()` functions do not execute SQL; they log and return placeholder values.
- Files: `src/lib/db/mock-client.ts`
- Impact: Browser mode can diverge from Tauri mode: UI that uses `query()` directly will behave incorrectly in browser mode (e.g., `PartSearchDialog` uses `query()`, which returns `[]` in mock mode).
- Fix approach: Either (1) eliminate component-level SQL usage so mock mode never needs SQL interpretation, or (2) implement a minimal query router for the subset of SQL used by the UI, or (3) remove browser-mode persistence/SQL “pretend” paths and clearly gate browser mode as “UI-only demo”.

**Class component in otherwise-hook-based codebase**
- Issue: A React class component is used.
- Files: `src/components/error-boundary.tsx`
- Impact: Inconsistent with the stated “no class components” convention; makes future refactors/hook patterns less uniform.
- Fix approach: Keep it if intentional (error boundaries still commonly use classes), but document the exception in `src/components/error-boundary.tsx` and/or project conventions. If converting, use a third-party error boundary helper or accept class boundary as the only exception.

**Hard-coded dev server HMR host**
- Issue: Vite HMR is configured with a hard-coded host.
- Files: `vite.config.ts` (server.hmr.host = `"ui.tybrad.org"`)
- Impact: Dev environment coupling; other developers/machines may fail HMR or connect to the wrong host.
- Fix approach: Move host to an env var and provide a safe default (e.g. localhost).

## Known Bugs

**BOM Part Search returns incomplete/incorrect fields**
- Symptoms: The search dialog displays `manufacturer` and `unit_price`, but the query selects only from `parts`.
- Files: `src/components/bom/part-search-dialog.tsx`
- Trigger: Open “Search Master Parts” and type a query.
- Workaround: None in code; the UI will show blank `manufacturer` and default `$0.00` unless `parts` table contains those fields (it does not in migrations).

**Browser mode BOM Part Search always returns empty results**
- Symptoms: Searching in browser mode yields no results.
- Files: `src/components/bom/part-search-dialog.tsx`, `src/lib/db/mock-client.ts`
- Trigger: Running outside Tauri (where `isTauri === false`) and opening the part search dialog.
- Workaround: Use Tauri mode; or refactor PartSearchDialog to call a mock-implemented API instead of raw SQL.

**CSV header row selection does not work for CSV imports**
- Symptoms: “Header Row” control exists, but CSV parsing does not skip to the specified header row.
- Files: `src/components/bom/import-dialog.tsx` (comment “CSV parser currently doesn't support header row skipping”), `src/lib/csv-parser.ts`
- Trigger: Import CSV where headers aren’t the first line.
- Workaround: Pre-clean CSV so headers are first line.

## Security Considerations

**Risk of accidental SQL injection regressions via dynamic SQL assembly**
- Risk: While values are bound with placeholders, the pattern of assembling SQL with template literals could allow future changes to insert untrusted fragments.
- Files: `src/lib/db/real-client.ts`
- Current mitigation: Values use `?` placeholders; field names are currently chosen by code and not directly user input.
- Recommendations: Centralize all allowed update fields in a fixed map; add runtime assertions; add unit tests around query builders; avoid passing raw SQL strings from components.

**Devtools opened automatically in debug builds**
- Risk: Debug builds open devtools by default, which can expose internal state/DB contents to anyone with access to the machine.
- Files: `src-tauri/src/lib.rs`
- Current mitigation: Guarded by `#[cfg(debug_assertions)]`.
- Recommendations: Keep as debug-only; ensure release builds are used for production/internal distribution.

**Mock DB debug hook exposed on window**
- Risk: `resetMockDB` is attached to `window`, enabling data deletion from the console.
- Files: `src/lib/db/mock-client.ts`
- Current mitigation: Only runs when `typeof window !== 'undefined'` (still true for browser mode).
- Recommendations: Gate behind a build flag or `import.meta.env.DEV` so it isn’t present in non-dev builds.

**Vite dev server exposed to network**
- Risk: Dev server is configured with `server.host: true`, which binds on all interfaces.
- Files: `vite.config.ts`
- Current mitigation: Primarily a developer concern.
- Recommendations: Keep for tunnel workflows, but document; consider conditional host binding based on env.

## Performance Bottlenecks

**High-frequency DB writes on every keystroke**
- Problem: Inline editable table inputs call `updateItem()` on each change (per keystroke), triggering async DB writes.
- Files: `src/components/bom/bom-table.tsx`, `src/stores/bom-store.ts`, `src/lib/db/real-client.ts`
- Cause: Inputs are controlled and directly dispatch updates.
- Improvement path: Debounce updates (e.g. 250–500ms), or commit-on-blur/enter; batch updates in `transaction()`; update local state optimistically and persist less frequently.

**Bulk import uses per-row inserts inside a loop**
- Problem: `bulkCreate` performs a DB `execute` for each item, even though it runs inside a transaction.
- Files: `src/lib/db/real-client.ts` (`bomItems.bulkCreate()`)
- Cause: Straightforward loop implementation.
- Improvement path: Use a prepared statement/batched insert if supported by `@tauri-apps/plugin-sql`; or chunk multi-row inserts; or reduce per-row overhead by avoiding repeated SQL parsing.

**Excel import loads full workbook into memory**
- Problem: Excel parsing uses `xlsx` to read entire workbook and converts to JSON arrays; large files can spike memory.
- Files: `src/components/bom/import-dialog.tsx`, `src/lib/excel-parser.ts`
- Cause: Client-side parsing of arbitrary spreadsheets.
- Improvement path: Add file size warning/limit; stream parse if possible; limit preview rows; chunk mapping pipeline.

**LIKE searches without indexes**
- Problem: Part search uses `%term%` LIKE filters, which can be slow and bypass indexes.
- Files: `src/components/bom/part-search-dialog.tsx`
- Cause: Ad-hoc query instead of the existing FTS-backed search API.
- Improvement path: Route search through `parts.search()` (FTS5) in `src/lib/db/real-client.ts`.

## Fragile Areas

**Environment detection based on `__TAURI_INTERNALS__`**
- Files: `src/lib/db/client.ts`
- Why fragile: Reliance on a window property that could change across Tauri versions or be unavailable in some contexts.
- Safe modification: Wrap detection in a helper with fallback; prefer using official Tauri APIs/flags if available.
- Test coverage: No automated tests detected.

**Optimistic updates without robust conflict handling**
- Files: `src/stores/bom-store.ts`
- Why fragile: `updateItem()` updates local state, then persists; errors reload from DB, but concurrent edits / rapid updates can cause flicker or lost edits.
- Safe modification: Debounce + queue; track “dirty” fields; apply server response to reconcile.
- Test coverage: No automated tests detected.

**Rust startup uses `unwrap()`/`expect()`**
- Files: `src-tauri/src/lib.rs`
- Why fragile: `unwrap()` and `expect()` will panic on unexpected conditions.
- Safe modification: Replace with fallible handling and log errors via `tauri-plugin-log`.
- Test coverage: No tests detected.

## Scaling Limits

**Import/export operations scale linearly with row count**
- Current capacity: Not measured; code processes rows in chunks of 100 for insertion.
- Limit: Very large spreadsheets (thousands+ rows) can be slow due to per-row DB operations and UI rendering.
- Scaling path: Bulk SQL insert optimization; move heavy processing off the main thread (Web Worker) for web mode; incremental rendering.

## Dependencies at Risk

**No immediate “at risk” dependencies detected**
- Notes: Key libraries are mainstream (`react`, `tauri`, `xlsx`, `zustand`). Monitor `xlsx` for performance/security advisories due to parsing untrusted files.

## Missing Critical Features

**Automated test suite not present**
- Problem: No unit/integration/e2e test files detected.
- Blocks: Safe refactoring of DB/query code, import/export edge cases, and store behavior.

## Test Coverage Gaps

**Database query builders and import/export logic untested**
- What's not tested: SQL builders (dynamic `UPDATE ... SET ...`), FTS search, import mapping and parsing edge cases, export formatting.
- Files: `src/lib/db/real-client.ts`, `src/lib/import-utils.ts`, `src/lib/csv-parser.ts`, `src/lib/excel-parser.ts`, `src/lib/export-utils.ts`
- Risk: Regressions in data integrity and file compatibility go unnoticed.
- Priority: High

---

*Concerns audit: 2026-01-20*
