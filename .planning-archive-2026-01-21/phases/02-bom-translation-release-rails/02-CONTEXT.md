# Phase 02: BOM Translation Release Rails - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run BOM Translation end-to-end with deterministic outputs, actionable validation, and an audit trail. Focus is on trust, repeatability, and error prevention.
</domain>

<decisions>
## Implementation Decisions

### Validation Workflow
- **Real-time validation:** Flags issues immediately as data is entered or mapped.
- **Strict blocking:** Export is blocked if ANY errors exist. Warnings must be acknowledged but don't strictly block if errors are gone.
- **Visual feedback:** Bad rows/cells are highlighted directly in the grid.
- **Strict Input:** Prevent users from typing invalid data types (e.g., non-numbers in number fields).

### Mapping Intelligence
- **Fuzzy Auto-mapping:** Automatically detects synonyms (e.g., "P/N" → "Part Number") when loading files.
- **Fail Fast on Templates:** If a saved template doesn't match the source file structure, show an error immediately.
- **Unmapped Warning:** Warn the user if columns remain unmapped, but allow proceeding.
- **Data Peek:** Show headers and the first 3-5 rows of data during the mapping process.

### Editing Interface
- **Excel-grid style:** Users click and edit cells directly.
- **Structure modification:** Users ARE allowed to add or delete rows within the app.
- **Power features:** Support multi-cell selection, copy/paste, and fill operations.
- **Global Search:** Single search bar to filter/find items across the entire BOM.

### History & Re-runs
- **Full Audit:** Store a COPY of the input Excel file + snapshot of output + settings for every run.
- **Replay Capability:** Users can re-run a past job using the *stored* input file and exact settings.
- **Retention:** Cap by count (e.g., keep last N runs per project).
- **Global Log:** History is accessed via a global "History" page/view for the application.

### OpenCode's Discretion
- Specific UI library for the data grid (though shadcn/tanstack-table is implied by stack).
- exact algorithm for fuzzy matching.
- Exact number of runs to keep for retention cap.
</decisions>

<specifics>
## Specific Ideas

- "Excel-grid" feel is important — users are coming from Excel.
- "Fail fast" on templates implies we value correctness over partial data loading.
- Full audit (storing input files) means database size management is critical (SQLite blob storage or file system ref needed).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-bom-translation-release-rails*
*Context gathered: 2026-01-21*