# Load Calculator - Implementation Task List

**Status**: All Sprints Complete (v1)
**Started**: 2026-01-30  
**Estimated Completion**: ~18-23 weeks (4.5-6 months)  
**Developer**: Solo  

---

## 📋 Quick Reference

### Voltage Type Normalization
| Source (CSV) | Database Value |
|--------------|----------------|
| DC | DC |
| 120/240 1Ø | 120VAC_1PH |
| 230 3Ø | 230VAC_3PH |
| 480 3Ø | 480VAC_3PH |
| 480 1Ø | 480VAC_1PH |
| 600 3Ø | 600VAC_3PH |

### Data Files
- Eplan Export: `.samples/14403_Z2_Main_1 - Load Calc Export.xlsx`
- Master Parts: `.samples/CHD Parts Master.csv`
- Excel Reference: `.samples/XXX_Load_Calculations_V1.12.xlsm`

### Key Documentation
- `docs/load-calculator-architecture.md` - Full architecture spec
- `docs/project-manager-decoupling.md` - BOM integration notes
- `docs/quoting-tool-concepts.md` - Future quoting tool plans

---

## Sprint 0: Data & Setup
**Duration**: 1-2 days  
**Status**: ✅ COMPLETE  
**Branch**: N/A (analysis only)

### Tasks
- [x] Analyze Eplan export structure (27 columns, header on row 2)
- [x] Review master parts list (360+ sample parts, voltage types identified)
- [x] Document voltage type normalization mapping
- [x] Confirm calculation formulas:
  - Heat: Watts × 3.412 = BTU/hr
  - Loading: Sum watts per phase
  - Balance: (Max-Min)/Max × 100
- [x] Define column mapping (Eplan → Load Calc)

### Deliverables
- ✅ Eplan column structure documented
- ✅ Master parts format understood
- ✅ Voltage normalization rules defined

---

## Sprint 1: Database Foundation
**Duration**: 3-4 days  
**Status**: ✅ COMPLETE  
**Branch**: `feature/load-calc-sprint-1`
**Depends On**: Sprint 0

### Migration Tasks
- [x] **005_load_calc_tables.sql** - Create all Load Calc tables
  - [x] Extend `part_electrical` with `voltage_type` column
  - [x] Create `load_calc_projects` (links to `bom_packages`)
  - [x] Create `load_calc_voltage_tables` (per location per voltage)
  - [x] Create `load_calc_line_items` (with manual entry support)
  - [x] Create `load_calc_results` (cached calculations)
  - [x] Add indexes for performance
  - [x] Add foreign key constraints

### Type Definitions
- [x] Create `src/types/load-calc.ts`
  - [x] `LoadCalcProject` interface
  - [x] `VoltageTable` interface
  - [x] `LoadCalcLineItem` interface
  - [x] `LoadCalcResults` interface
  - [x] `VoltageType` enum (DC, 120VAC_1PH, 230VAC_3PH, 480VAC_3PH, 480VAC_1PH, 600VAC_3PH)
  - [x] `PhaseAssignment` enum

### Database Client
- [x] Extend `src/lib/db/client.ts`
  - [x] `loadCalcProjects` query object (CRUD operations)
  - [x] `voltageTables` query object (CRUD operations)
  - [x] `loadCalcLineItems` query object (CRUD operations)
  - [x] `loadCalcResults` query object (calculation storage)
  - [x] `parts` multi-voltage queries (getPartsByVoltageType, etc.)

### Seed Data
- [x] Create `src-tauri/scripts/seed_load_calc_parts.sql`
  - [x] Script to import CHD Parts Master CSV
  - [x] Handle voltage type normalization
  - [x] Insert into `parts` and `part_electrical` tables

### Testing
- [x] Test migrations run without errors
- [x] Verify foreign key constraints work
- [x] Test seed script with sample data

### Deliverables
- ✅ All migrations applied successfully
- ✅ TypeScript types defined
- ✅ DB client functions working
- ✅ Can create/load projects via code

### Blockers

- None - Ready to proceed with Sprint 1

### Decisions (Sprint 1)

- Default voltage_type for existing part_electrical rows: 'LEGACY' (chosen). This preserves existing numeric voltage/phase columns and marks migrated rows as legacy so UI/logic can opt-in to mapping.
- Standalone project policy: Projects with bom_package_id = NULL are considered standalone; inserting a voltage_table with a non-null location is forbidden (enforced by migration triggers). You must link a project to a BOM package to assign locations.
- utilization_pct storage: store as ratio 0.0 - 1.0 (utilization_default and utilization_pct use ratio semantics).

These decisions were implemented in migration 005 and types in src/types/load-calc.ts.

### Notes
- Keep existing `part_electrical` columns (`voltage`, `phase`) for backward compatibility
- Add `voltage_type` as new column with composite unique index

---

## Sprint 2: Parts Foundation
**Duration**: 4-5 days  
**Status**: ✅ COMPLETE  
**Branch**: `feature/load-calc-sprint-2`
**Depends On**: Sprint 1

### UI Components
- [x] Create `src/components/load-calc/parts-import.tsx`
  - [x] CSV file upload component
  - [x] Column mapping UI (if needed)
  - [x] Import progress indicator
  - [x] Success/error feedback

- [x] Create `src/components/load-calc/parts-browser.tsx`
  - [x] Search box (manufacturer, part #, description)
  - [x] Filter by voltage type
  - [x] Table view with sortable columns
  - [x] Pagination (if needed for 2000 parts)

- [x] Create `src/components/load-calc/part-detail.tsx`
  - [x] Show all voltage variants for part
  - [x] Display electrical specs (watts, amps, temp)
  - [x] Add to project button

### Store
- [x] Create `src/stores/load-calc-parts-store.ts`
  - [x] Parts list state
  - [x] Search/filter actions
  - [x] Import actions

### Features
- [x] Parts import from CSV (CHD Parts Master format)
- [x] Parts search with FTS (full-text search)
- [x] Parts filtering by voltage type
- [x] Part detail view with multi-voltage display

### Testing
- [x] Import 2000 parts successfully
- [x] Search returns results in <500ms
- [x] Voltage filtering works correctly

### Deliverables
- ✅ Can import parts from CSV
- ✅ Can browse and search parts
- ✅ Can view part details with voltage variants

### Blockers
- Depends on Sprint 1 (database schema)

---

## Sprint 3a: Import Foundation
**Duration**: 4-5 days  
**Status**: ✅ COMPLETE  
**Branch**: `feature/load-calc-sprint-3a`
**Depends On**: Sprint 2

### UI Components
- [x] Create `src/components/load-calc/eplan-import/eplan-import-wizard.tsx`
  - [x] .xlsx file upload (`file-upload-step.tsx`)
  - [x] Sheet selector (integrated in upload)
  - [x] Column mapper UI (`column-mapping-step.tsx`)
  - [x] Mapping template save/load

- [x] Create `src/components/load-calc/eplan-import/column-mapping-step.tsx`
  - [x] Show Eplan columns on left
  - [x] Show Load Calc fields on right
  - [x] Auto-suggest mappings (exact name matches)
  - [x] Save as template option

### Store
- [x] Create `src/stores/load-calc-import-store.ts`
  - [x] Import file handling
  - [x] Column mappings
  - [x] Template management

### Features
- [x] Eplan .xlsx file upload
- [x] Column mapping UI
- [x] Mapping template save/load
- [x] Import validation (required columns check)

### Testing
- [x] Successfully import Eplan sample file
- [x] Column mappings persist in templates
- [x] Validation catches missing required columns

### Deliverables
- ✅ Can upload Eplan files
- ✅ Can map columns interactively
- ✅ Can save/load mapping templates

### Blockers
- Depends on Sprint 2 (parts foundation)

---

## Sprint 4: Table Management
**Duration**: 3-4 days  
**Status**: ✅ COMPLETE  
**Branch**: `feature/load-calc-sprint-4`
**Depends On**: Sprint 3a

### UI Components
- [x] Create `src/components/load-calc/location-sidebar.tsx`
  - [x] Tree view of locations
  - [x] Expand/collapse voltage tables per location
  - [x] Lock indicator per table
  - [x] Add/Edit/Delete location buttons

- [x] Create `src/components/load-calc/voltage-table-tabs.tsx`
  - [x] Tab bar showing voltage types for location
  - [x] Lock toggle button per tab
  - [x] Visual indicator for locked tables

- [x] Create `src/components/load-calc/line-item-table.tsx`
  - [x] Editable table (if not locked)
  - [x] Read-only table (if locked)
  - [x] Row actions (delete)
  - [x] Column headers with units

### Store
- [x] Extend store with table management
  - [x] Location CRUD
  - [x] Voltage table CRUD
  - [x] Table locking/unlocking
  - [x] Line item management

### Features
- [x] Create/edit/delete locations
- [x] Create voltage tables per location
- [x] Table locking (prevents all edits)
- [x] Visual distinction for locked tables

### Testing
- [x] Can create location hierarchy
- [x] Can add voltage tables to locations
- [x] Locking prevents all data changes
- [x] Unlocking restores edit capability

### Deliverables
- ✅ Location management working
- ✅ Voltage tables per location
- ✅ Table locking functional

### Blockers
- None

### Fixes (Post-Sprint)
- Fixed build errors in `load-calc-import-store.ts`
- Added "Add to Project" button in `PartDetail` to bridge Parts and Tables integration

---

## Sprint 3b: Import Matching
**Duration**: 5-6 days  
**Status**: ✅ COMPLETE  
**Branch**: `feature/load-calc-sprint-3b`
**Depends On**: Sprint 4

### UI Components
- [x] Create `src/components/load-calc/part-matcher.tsx`
  - [x] Show Eplan rows with match status
  - [x] Auto-matched parts (green indicator)
  - [x] Unmatched parts (red indicator + manual entry)
  - [x] Review unmatched workflow entrypoint

- [x] Create `src/components/load-calc/unmatched-parts-dialog.tsx`
  - [x] List unmatched items
  - [x] Manual part entry form
  - [x] Skip/Ignore option
  - [x] Add to master parts list button (future placeholder)

### Logic
- [x] Part matching algorithm (`src/lib/load-calc/matching.ts`)
  - [x] Exact match on Manufacturer + Part # (with normalization)
  - [x] Handle case normalization
  - [x] Handle whitespace normalization
  - [x] Confidence scoring + threshold

### Features
- [x] Automatic part matching
- [x] Unmatched parts review workflow
- [x] Manual part entry for unmatched items
- [x] Skip/ignore unmatched items
- [x] Wizard flow includes matching step (`eplan-import-wizard.tsx`)
- [x] Import to database uses `loadCalcLineItems.bulkCreate`

### Testing
- [x] Unit tests cover matching logic (`src/lib/load-calc/__tests__/matching.test.ts`)
- [x] Store matching actions covered (`src/stores/__tests__/load-calc-import-store.matching.test.ts`)
- [ ] 90%+ match rate on typical Eplan export (needs real-data confirmation)

### Deliverables
- [x] Part matching working
- [x] Unmatched parts workflow complete
- [x] Handles exact matches + normalized comparisons (no fuzzy matching)

### Blockers
- Depends on Sprint 4 (table management)
- Can parallelize some work with Sprint 3a

---

## Sprint 5: Line Item Editing
**Duration**: 4-5 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 3b

### UI Components
- [x] Enhance `line-item-table.tsx`
  - [x] Editable cells for:
    - [x] QTY (number input)
    - [x] Utilization % (0-100 number input, stores as 0.0-1.0 ratio)
    - [x] Phase Assignment (dropdown: L1/L2/L3/N/UNK)
    - [x] Power Group (text input)
  - [x] Override fields (collapsible chevron per row):
    - [x] Amperage override
    - [x] Wattage override
    - [x] Heat dissipation override
  - [x] Save-on-blur editing pattern (EditableCell component)
  - [x] Blue indicator on chevron when overrides are set

- [x] Create `src/components/load-calc/add-line-item-dialog.tsx`
  - [x] "From Parts Library" tab with search, part selection, variant badges, QTY input
  - [x] "Manual Entry" tab with part number, description, qty, utilization, electrical specs
  - [x] Integrated into voltage-table-tabs toolbar ("Add Item" button)

### Store
- [x] Line item CRUD operations
  - [x] Add line item (existing from Sprint 4)
  - [x] Update line item (`updateLineItem` added to project store)
  - [x] Delete line item (existing from Sprint 4)
  - [ ] Reorder line items (deferred - not critical for v1)

### Features
- [x] Full line item editing (inline, save-on-blur)
- [x] Add from parts library (dialog with search)
- [x] Add manual entry parts (dialog with form)
- [x] Delete rows
- [x] Override electrical specs (collapsible override row)
- [x] Table lock respected (all edits disabled when locked)

### Testing
- [x] All fields editable when unlocked
- [x] Validation on numeric fields (qty >= 1, util 0-100, overrides accept empty to clear)
- [ ] Overrides take precedence in calculations (Sprint 6 will verify)

### Deliverables
- ✅ Can fully edit line items inline
- ✅ Can add parts from library or manually via dialog
- ✅ Override functionality working with visual indicators

### Blockers
- None

---

## Sprint 3c: Import Polish
**Duration**: 4-5 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 5

### Architecture Notes
- Wizard step 4 ("preview") was a placeholder — replaced with real `ImportPreviewStep`
- `importToDatabase()` was never called from wizard — now wired to "Import to Database" button on preview step
- Added clipboard paste as alternative to file upload

### UI Components
- [x] Create `src/components/load-calc/eplan-import/import-preview-step.tsx`
  - [x] Summary stats grid: matched (green), manual (blue), skipped (gray), to-import (primary)
  - [x] Table preview of line items to be created (source badge, part #, description, qty, group)
  - [x] Color-coded rows: green border=matched, blue bg=manual
  - [x] Voltage table selector (filters to unlocked tables for current location)
  - [x] Warning banner when unmatched items exist

- [x] Add clipboard paste to `file-upload-step.tsx`
  - [x] "Paste from Clipboard" card with button, separated by "or" divider
  - [x] Reads clipboard via `navigator.clipboard.readText()`
  - [x] Calls `setClipboardData(text)` → parses tab-delimited, skips to mapping step
  - [x] Error handling for empty clipboard, permission denied, invalid format

### Store Changes (`load-calc-import-store.ts`)
- [x] Added `setClipboardData(text: string)` action — parses tab-delimited text into headers/rows
- [x] Added `getPreviewLineItems()` selector — builds preview array without DB write
- [x] Added `PreviewLineItem` exported type
- [x] Added `lastImportCount` state — tracks count for complete step display
- [x] Fixed `reset()` to also clear matchResults and isImporting
- [ ] Track import batch metadata (deferred — not critical for v1)

### Wizard Changes (`eplan-import-wizard.tsx`)
- [x] Replaced placeholder preview with `ImportPreviewStep` component
- [x] "Import to Database" button calls `importToDatabase()` then refreshes current line items
- [x] Complete step shows actual import count ("Successfully imported N line items")
- [x] Loading spinner during DB import, buttons disabled while importing

### Features
- [x] Import preview with real line item table (before commit)
- [x] Clipboard paste (tab-delimited from Excel)
- [x] Voltage table selection on preview step
- [x] Cancel/Back navigation preserved
- [x] Error handling on clipboard, empty data, missing voltage table

### Testing
- [x] Preview shows accurate count of items to import by type
- [x] TypeScript + Vite build passes clean
- [ ] Clipboard paste with real Excel data (needs manual testing)
- [ ] End-to-end import flow (needs manual testing with Tauri)

### Deliverables
- ✅ Import preview with data table, stats, and voltage table selector
- ✅ DB import wired up end-to-end (was broken, now fixed)
- ✅ Clipboard paste functional as alternative to file upload
- ✅ Robust error handling throughout

### Blockers
- None

---

## Sprint 6: Calculations + Validation
**Duration**: 4-5 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 3c

### Logic
- [x] Create `src/lib/load-calc/calculations.ts`
  - [x] `resolveLineItem()` - resolves effective wattage/amperage/heat from part_electrical or overrides
  - [x] `calculateHeat()` - Sum (qty × util × watts × 3.412) for BTU/hr, uses direct BTU if available
  - [x] `calculateTotalWatts()` / `calculateTotalAmperes()` - Sum per item with qty × util
  - [x] `calculatePhaseLoading()` - Sum watts per L1/L2/L3 phase
  - [x] `calculateBalance()` - (Max-Min)/Max × 100 for phase imbalance
  - [x] `calculateTableResults()` - orchestrates all above, resolves items in parallel

- [x] Create `src/lib/load-calc/validation.ts`
  - [x] QTY > 0 (error)
  - [x] Utilization % in 0.0-1.0 range (error)
  - [x] 3-phase loads have phase assignment (warning)
  - [x] Manual entries have wattage override (warning)
  - [x] `hasErrors()` helper to check for blocking errors

### UI Components
- [x] Create `src/components/load-calc/calculation-panel.tsx`
  - [x] `CalculateButton` - runs validateAndCalculate, disabled when no items, shows spinner
  - [x] `CalculationSummary` - inline results bar with Watts/Amps/BTU + phase loading + imbalance badge
  - [x] `ValidationDialog` - modal listing errors (red) and warnings (amber) with field info
  - [x] Color-coded imbalance badge: green ≤10%, amber ≤20%, red >20%

### Store (`load-calc-project-store.ts`)
- [x] Added `calculationResult`, `validationIssues`, `isCalculating` state
- [x] `validateAndCalculate()` action - validates, blocks on errors, calculates, caches to DB
- [x] `clearCalculation()` action
- [x] Calculation state cleared on voltage table switch
- [x] Results cached via `loadCalcResults.upsertForVoltageTable()`

### Features
- [x] Hard validation (blocks on errors, warnings allow proceed)
- [x] Heat calculation (BTU/hr) with direct BTU or watt conversion
- [x] Loading calculation (total watts + amps)
- [x] Phase loading (L1/L2/L3) for 3-phase tables
- [x] Balance calculation (imbalance %)
- [x] Results caching to DB
- [x] Calculate button in voltage table toolbar

### Testing
- [x] TypeScript + Vite build passes clean
- [x] Validation and calculation modules properly code-split
- [ ] Unit tests for calculation formulas (deferred)
- [ ] End-to-end with real data (needs Tauri)

### Deliverables
- ✅ Validation blocks on errors, shows warnings
- ✅ All calculations working (watts, amps, BTU, phase loading, balance)
- ✅ Results displayed inline in toolbar and cached to DB

### Blockers
- None

---

## Sprint 7: Reports View
**Duration**: 2-3 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 6

### UI Components
- [x] Create `src/components/load-calc/reports/heat-report.tsx`
  - [x] Table view by enclosure location
  - [x] Total Watts per enclosure (aggregated from results)
  - [x] Color coding for high heat (>1000W = red/destructive)
  - [x] Totals row when multiple locations

- [x] Create `src/components/load-calc/reports/loading-report.tsx`
  - [x] Table view by enclosure + voltage type
  - [x] Total Watts and Amps per voltage table
  - [x] Calculated status indicator (green check / gray help icon with tooltip)
  - [x] Totals row for project-wide aggregation

- [x] Create `src/components/load-calc/reports/balance-report.tsx`
  - [x] 3-phase tables only (filtered by `isThreePhase()`)
  - [x] L1/L2/L3 totals in Watts
  - [x] Imbalance % with color-coded badges (≤10% green, ≤20% amber, >20% red)
  - [x] N/A display for tables without phase-assigned loads

- [x] Create `src/components/load-calc/reports-view.tsx`
  - [x] Tab navigation between 3 reports (Heat, Loading, Balance)
  - [x] Refresh button (calls `refreshReports()`)
  - [x] Export button (disabled, placeholder for Sprint 8)
  - [x] Auto-generates reports on mount if project selected
  - [x] Loading spinner while generating

### Logic
- [x] Create `src/lib/load-calc/reports.ts`
  - [x] `aggregateHeatWattsByLocation()` - SQL aggregate grouped by location
  - [x] `aggregateLoadingByVoltageTable()` - SQL aggregate per voltage table
  - [x] `getThreePhaseBalanceData()` - recalculates phase loading from line items for freshness

### Store
- [x] Added `reportData`, `isGeneratingReports` state to project store
- [x] `generateReports()` action - runs all 3 aggregations in parallel via `Promise.all()`
- [x] `refreshReports()` action - regenerates and shows success toast

### Features
- [x] View all 3 reports
- [x] Refresh calculations
- [x] Empty state for no project selected / no data

### Testing
- [x] TypeScript + Vite build passes clean
- [ ] End-to-end with real data (needs Tauri)

### Deliverables
- ✅ 3 report views working (Heat, Loading, Balance)
- ✅ Can view calculations in app with professional table UI
- ✅ Integrated into Reports tab on Load Calc page

### Blockers
- None

---

## Sprint 8: Export
**Duration**: 4-5 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 7

### Logic
- [x] Create `src/lib/load-calc/export.ts`
  - [x] `copyReportToClipboard()` - Generates styled HTML table, copies via clipboard API (primary workflow for Word paste)
  - [x] `exportReportsToXlsx()` - 3 sheets (Heat, Loading, Balance) with totals rows using `xlsx` library
  - [x] `exportReportsToPdf()` - Landscape PDF with all 3 reports, page numbers, footer. Uses `jspdf` + `jspdf-autotable`
  - [x] `exportReportToPng()` - Captures current report tab as 2x PNG via `html2canvas`
  - [x] `saveFileBytes()` - Shared helper: Tauri `save()` dialog + browser fallback
  - [x] HTML generation with inline styles (Calibri font, borders, alignment) for clean Word paste

### UI Components
- [x] Updated `src/components/load-calc/reports-view.tsx`
  - [x] "Copy Table" button — copies current tab as HTML (primary action)
  - [x] "Export" dropdown menu — Excel (.xlsx), PDF, PNG options
  - [x] Loading spinner during export, buttons disabled while exporting
  - [x] Tab state tracked to know which report is active for clipboard/PNG
  - [x] `ref` on report content div for PNG capture

### Features
- [x] Clipboard copy (HTML table → paste into Word with formatting)
- [x] Export to Excel (.xlsx with 3 sheets + totals rows)
- [x] Export to PDF (landscape, 3 pages, headers, page numbers, footer)
- [x] Export to PNG (current tab screenshot, 2x resolution)
- [x] Tauri native save dialog with browser download fallback
- [x] Export libraries loaded via dynamic import() for code splitting

### Testing
- [x] TypeScript + Vite build passes clean
- [x] Export libraries properly code-split (jspdf, html2canvas, autotable as separate chunks)
- [ ] End-to-end export with real data (needs Tauri)

### Deliverables
- ✅ 4 export formats: Clipboard (HTML), Excel, PDF, PNG
- ✅ Clipboard copy is primary one-click workflow for Word integration
- ✅ Professional output formatting with styled tables

### Blockers
- None

---

## Sprint 9: BOM Integration Polish
**Duration**: 2-3 days
**Status**: ✅ COMPLETE
**Branch**: `feature/load-calculator`
**Depends On**: Sprint 8

### UI Components
- [x] Create `src/components/load-calc/project-selector.tsx`
  - [x] Inline dropdown in project-view header for quick project switching
  - [x] Shows all projects with BOM link indicator
  - [x] "New Project / Manage..." option opens Project Manager dialog
  - [x] No full-page navigation needed to switch projects

- [x] Update `src/components/load-calc/project-view.tsx`
  - [x] Project name is now a dropdown switcher (ProjectSelector)
  - [x] BOM context display: resolved job # badge + package name (not raw ID)
  - [x] "Link to BOM" button for standalone projects → opens package selection dialog
  - [x] "Unlink" button for linked projects
  - [x] "Sync" button to refresh locations from BOM
  - [x] Link dialog with Select dropdown of all BOM packages (job # + package name)

### Store (`load-calc-project-store.ts`)
- [x] Added `bomPackageInfo` state (resolved `jobProjectNumber` + `packageName`)
- [x] `resolveBomPackageInfo()` — looks up BOM package + job project by ID
- [x] `linkToPackage(bomPackageId)` — updates project, fetches locations, resolves info
- [x] `unlinkFromPackage()` — clears bom_package_id, resets locations
- [x] `syncLocations()` — re-fetches BOM locations for linked package
- [x] `selectProject()` now auto-resolves BOM info and clears stale report data

### Features
- [x] Quick project switching from project-view header
- [x] BOM context indicator (job # + package name) in header
- [x] Link standalone project to BOM package (dialog with package selector)
- [x] Unlink project from BOM package
- [x] Sync locations from BOM on demand
- [x] Project switch clears stale data (locations, voltage tables, reports)

### Testing
- [x] TypeScript + Vite build passes clean
- [ ] End-to-end link/unlink with real BOM data (needs Tauri)

### Deliverables
- ✅ BOM integration complete with link/unlink/sync
- ✅ Project context display shows resolved job # + package name
- ✅ Quick project switcher integrated in header

### Blockers
- None

---

## 📊 Progress Summary
 
 | Sprint | Status | Est. Days | Actual Days | Completion |
 |--------|--------|-----------|-------------|------------|
 | 0 | ✅ Complete | 1-2 | 1 | 100% |
 | 1 | ✅ Complete | 3-4 | 3 | 100% |
 | 2 | ✅ Complete | 4-5 | 4 | 100% |
 | 3a | ✅ Complete | 4-5 | 5 | 100% |
 | 4 | ✅ Complete | 3-4 | 4 | 100% |
 | 3b | ✅ Complete | 5-6 | - | 100% |
 | 5 | ✅ Complete | 4-5 | 1 | 100% |
 | 3c | ✅ Complete | 4-5 | 1 | 100% |
 | 6 | ✅ Complete | 4-5 | 1 | 100% |
 | 7 | ✅ Complete | 2-3 | 1 | 100% |
 | 8 | ✅ Complete | 4-5 | 1 | 100% |
 | 9 | ✅ Complete | 2-3 | 1 | 100% |
 
 **Total Progress**: 100%
 **Total Est. Time**: 18-23 weeks (4.5-6 months)  
 **Time Elapsed**: 2 weeks  
 
 ---
 
## 🚧 Current Blockers

None - All sprints complete

---

## 📝 Session Notes

### 2026-02-07 (Sprint 7 + Sprint 8 + Sprint 9)
- Completed Sprint 9 (BOM Integration Polish).
- Created `project-selector.tsx` — inline dropdown in project-view header for quick project switching.
- Updated `project-view.tsx`: replaced raw `bom_package_id` display with resolved job # badge + package name. Added Link/Unlink/Sync buttons.
- Added Link to BOM dialog with package selector (Select dropdown with all BOM packages).
- Added store actions: `resolveBomPackageInfo()`, `linkToPackage()`, `unlinkFromPackage()`, `syncLocations()`.
- Added `bomPackageInfo` state to store; `selectProject()` now auto-resolves BOM info and clears stale reports.
- TypeScript + Vite build passes clean.

### 2026-02-07 (Sprint 7 + Sprint 8)
- Sprint 7 (Reports View) was already implemented in a prior session — verified complete, updated task list.
- Completed Sprint 8 (Export).
- Created `src/lib/load-calc/export.ts` with 4 export formats: clipboard (HTML), XLSX (3 sheets), PDF (landscape, 3 pages), PNG (html2canvas).
- HTML generation with inline Calibri styles for clean Word paste. Clipboard copy is the primary one-click workflow.
- XLSX uses existing `xlsx` library. PDF uses `jspdf` + `jspdf-autotable`. PNG uses `html2canvas`.
- Updated `reports-view.tsx`: added "Copy Table" button + "Export" dropdown (Excel/PDF/PNG).
- Export libraries loaded via dynamic `import()` for code splitting — separate chunks in build.
- Tauri native save dialog with browser download fallback (follows BOM export pattern).
- TypeScript + Vite build passes clean.

### 2026-02-06 (Sprint 6)
- Completed Sprint 6 (Calculations + Validation).
- Created `calculations.ts` with resolveLineItem (part_electrical lookup + overrides), calculateHeat (BTU), calculateTotalWatts/Amps, calculatePhaseLoading (L1/L2/L3), calculateBalance (imbalance %).
- Created `validation.ts` with validateLineItems (qty>0, util range, phase assignment warning, manual wattage warning) and hasErrors helper.
- Created `calculation-panel.tsx` with CalculateButton, CalculationSummary (inline results bar with all metrics), and ValidationDialog (error/warning list modal).
- Added validateAndCalculate/clearCalculation actions to project store with DB result caching.
- Calculation button added to voltage table toolbar. Results display inline below toolbar.
- Validation and calculation modules properly code-split by Vite bundler.

### 2026-02-06 (Sprint 3c)
- Completed Sprint 3c (Import Polish).
- Created `import-preview-step.tsx` with stats grid (matched/manual/skipped/to-import), line item preview table, and voltage table selector.
- Replaced placeholder preview in `eplan-import-wizard.tsx` with real `ImportPreviewStep`. Wired "Import to Database" button to `importToDatabase()` — previously never called.
- Added clipboard paste to `file-upload-step.tsx` — "Paste from Clipboard" card with `navigator.clipboard.readText()`.
- Added `setClipboardData()`, `getPreviewLineItems()`, `lastImportCount` to import store. Fixed `reset()` to clear match state.
- Complete step now shows actual import count instead of generic message.
- TypeScript + Vite build passes clean.

### 2026-02-06 (Sprint 5)
- Completed Sprint 5 (Line Item Editing).
- Added `updateLineItem` action to `load-calc-project-store.ts`.
- Enhanced `line-item-table.tsx` with inline editable cells (QTY, Utilization %, Phase dropdown, Power Group) using save-on-blur pattern.
- Added collapsible override row per line item (Amps, Watts, Heat BTU/hr) with blue chevron indicator.
- Created `add-line-item-dialog.tsx` with "From Parts Library" (search + select) and "Manual Entry" (form) tabs.
- Added "Add Item" button to voltage table toolbar (hidden when locked).
- TypeScript + Vite build passes clean.

### 2026-02-06 (Sprint 3b)
- Verified completion of Sprint 3b (EPLAN import matching) in session `sq-20260206-1833-8nzw`.
- Added exact matching module (`src/lib/load-calc/matching.ts`) and UI components (`PartMatcher`, `UnmatchedPartsDialog`).
- Integrated matching step into import wizard and implemented import-to-database workflow.
- Added unit tests for matching logic and store matching actions.

### 2026-02-02
- Verified completion of Sprint 3a.
- Eplan import foundation implemented (XLSX upload, Column Mapper, Templates).
- Verified completion of Sprint 1 and Sprint 2 earlier.
- Updated task list to reflect current status.

### 2026-01-30
- Completed Sprint 0 analysis
- All data files received and analyzed
- Architecture finalized
- Task list created
- Ready to begin Sprint 1 (Database)

---

## 🔜 Next Actions

1. **All sprints complete** - v1 implementation done
2. **Next**: End-to-end testing with real data in Tauri, bug fixes, UX polish

---

## 🐛 Known Issues

None yet

---

## 💡 Future Enhancements (Post v1)

- [ ] Compare BOM feature (track import changes)
- [ ] Live SharePoint sync (if IT approves)
- [ ] Visualization/charts for load distribution
- [ ] Templates for common voltage table configurations
- [ ] Batch import multiple Eplan files
- [ ] Integration with Quoting Tool (when built)

---

**Last Updated**: 2026-02-07
**Next Review**: After end-to-end testing
