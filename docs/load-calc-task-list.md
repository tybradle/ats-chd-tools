# Load Calculator - Implementation Task List

**Status**: Sprint 1 In Progress  
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
**Status**: 🔄 IN PROGRESS  
**Branch**: `feature/load-calc-sprint-1`
**Depends On**: Sprint 0

### Migration Tasks
- [ ] **005_load_calc_tables.sql** - Create all Load Calc tables
  - [ ] Extend `part_electrical` with `voltage_type` column
  - [ ] Create `load_calc_projects` (links to `bom_packages`)
  - [ ] Create `load_calc_voltage_tables` (per location per voltage)
  - [ ] Create `load_calc_line_items` (with manual entry support)
  - [ ] Create `load_calc_results` (cached calculations)
  - [ ] Add indexes for performance
  - [ ] Add foreign key constraints

### Type Definitions
- [ ] Create `src/types/load-calc.ts`
  - [ ] `LoadCalcProject` interface
  - [ ] `VoltageTable` interface
  - [ ] `LoadCalcLineItem` interface
  - [ ] `LoadCalcResults` interface
  - [ ] `VoltageType` enum (DC, 120VAC_1PH, 230VAC_3PH, 480VAC_3PH, 480VAC_1PH, 600VAC_3PH)
  - [ ] `PhaseAssignment` enum

### Database Client
- [ ] Extend `src/lib/db/client.ts`
  - [ ] `loadCalcProjects` query object (CRUD operations)
  - [ ] `voltageTables` query object (CRUD operations)
  - [ ] `loadCalcLineItems` query object (CRUD operations)
  - [ ] `loadCalcResults` query object (calculation storage)
  - [ ] `parts` multi-voltage queries (getPartsByVoltageType, etc.)

### Seed Data
- [ ] Create `src-tauri/scripts/seed_load_calc_parts.sql`
  - [ ] Script to import CHD Parts Master CSV
  - [ ] Handle voltage type normalization
  - [ ] Insert into `parts` and `part_electrical` tables

### Testing
- [ ] Test migrations run without errors
- [ ] Verify foreign key constraints work
- [ ] Test seed script with sample data

### Deliverables
- [ ] All migrations applied successfully
- [ ] TypeScript types defined
- [ ] DB client functions working
- [ ] Can create/load projects via code

### Blockers
- None

### Notes
- Keep existing `part_electrical` columns (`voltage`, `phase`) for backward compatibility
- Add `voltage_type` as new column with composite unique index

---

## Sprint 2: Parts Foundation
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-2`
**Depends On**: Sprint 1

### UI Components
- [ ] Create `src/components/load-calc/parts-import.tsx`
  - [ ] CSV file upload component
  - [ ] Column mapping UI (if needed)
  - [ ] Import progress indicator
  - [ ] Success/error feedback

- [ ] Create `src/components/load-calc/parts-browser.tsx`
  - [ ] Search box (manufacturer, part #, description)
  - [ ] Filter by voltage type
  - [ ] Table view with sortable columns
  - [ ] Pagination (if needed for 2000 parts)

- [ ] Create `src/components/load-calc/part-detail.tsx`
  - [ ] Show all voltage variants for part
  - [ ] Display electrical specs (watts, amps, temp)
  - [ ] Add to project button

### Store
- [ ] Create `src/stores/load-calc-parts-store.ts`
  - [ ] Parts list state
  - [ ] Search/filter actions
  - [ ] Import actions

### Features
- [ ] Parts import from CSV (CHD Parts Master format)
- [ ] Parts search with FTS (full-text search)
- [ ] Parts filtering by voltage type
- [ ] Part detail view with multi-voltage display

### Testing
- [ ] Import 2000 parts successfully
- [ ] Search returns results in <500ms
- [ ] Voltage filtering works correctly

### Deliverables
- [ ] Can import parts from CSV
- [ ] Can browse and search parts
- [ ] Can view part details with voltage variants

### Blockers
- Depends on Sprint 1 (database schema)

---

## Sprint 3a: Import Foundation
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-3a`
**Depends On**: Sprint 2

### UI Components
- [ ] Create `src/components/load-calc/eplan-import.tsx`
  - [ ] .xlsx file upload
  - [ ] Sheet selector (if multiple sheets)
  - [ ] Column mapper UI (drag-drop or dropdown)
  - [ ] Mapping template save/load

- [ ] Create `src/components/load-calc/column-mapper.tsx`
  - [ ] Show Eplan columns on left
  - [ ] Show Load Calc fields on right
  - [ ] Auto-suggest mappings (exact name matches)
  - [ ] Save as template option

### Store
- [ ] Extend store with import state
  - [ ] Import file handling
  - [ ] Column mappings
  - [ ] Template management

### Features
- [ ] Eplan .xlsx file upload
- [ ] Column mapping UI
- [ ] Mapping template save/load
- [ ] Import validation (required columns check)

### Testing
- [ ] Successfully import Eplan sample file
- [ ] Column mappings persist in templates
- [ ] Validation catches missing required columns

### Deliverables
- [ ] Can upload Eplan files
- [ ] Can map columns interactively
- [ ] Can save/load mapping templates

### Blockers
- Depends on Sprint 2 (parts foundation)

---

## Sprint 4: Table Management
**Duration**: 3-4 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-4`
**Depends On**: Sprint 3a

### UI Components
- [ ] Create `src/components/load-calc/location-sidebar.tsx`
  - [ ] Tree view of locations
  - [ ] Expand/collapse voltage tables per location
  - [ ] Lock indicator per table
  - [ ] Add/Edit/Delete location buttons

- [ ] Create `src/components/load-calc/voltage-table-tabs.tsx`
  - [ ] Tab bar showing voltage types for location
  - [ ] Lock toggle button per tab
  - [ ] Visual indicator for locked tables

- [ ] Create `src/components/load-calc/line-item-table.tsx`
  - [ ] Editable table (if not locked)
  - [ ] Read-only table (if locked)
  - [ ] Row actions (delete)
  - [ ] Column headers with units

### Store
- [ ] Extend store with table management
  - [ ] Location CRUD
  - [ ] Voltage table CRUD
  - [ ] Table locking/unlocking
  - [ ] Line item management

### Features
- [ ] Create/edit/delete locations
- [ ] Create voltage tables per location
- [ ] Table locking (prevents all edits)
- [ ] Visual distinction for locked tables

### Testing
- [ ] Can create location hierarchy
- [ ] Can add voltage tables to locations
- [ ] Locking prevents all data changes
- [ ] Unlocking restores edit capability

### Deliverables
- [ ] Location management working
- [ ] Voltage tables per location
- [ ] Table locking functional

### Blockers
- Depends on Sprint 3a (import foundation)

---

## Sprint 3b: Import Matching
**Duration**: 5-6 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-3b`
**Depends On**: Sprint 4

### UI Components
- [ ] Create `src/components/load-calc/part-matcher.tsx`
  - [ ] Show Eplan rows with match status
  - [ ] Auto-matched parts (green indicator)
  - [ ] Unmatched parts (red indicator + manual entry)
  - [ ] Search for existing parts to match

- [ ] Create `src/components/load-calc/unmatched-parts-dialog.tsx`
  - [ ] List unmatched items
  - [ ] Manual part entry form
  - [ ] Skip/Ignore option
  - [ ] Add to master parts list button (future)

### Logic
- [ ] Part matching algorithm
  - [ ] Match on Manufacturer + Part # (exact)
  - [ ] Handle case normalization
  - [ ] Handle whitespace normalization
  - [ ] Score confidence levels

### Features
- [ ] Automatic part matching
- [ ] Unmatched parts review workflow
- [ ] Manual part entry for unmatched items
- [ ] Skip/ignore unmatched items

### Testing
- [ ] 90%+ match rate on typical Eplan export
- [ ] Unmatched parts clearly identified
- [ ] Manual entry works correctly

### Deliverables
- [ ] Part matching working
- [ ] Unmatched parts workflow complete
- [ ] Can handle partial matches

### Blockers
- Depends on Sprint 4 (table management)
- Can parallelize some work with Sprint 3a

---

## Sprint 5: Line Item Editing
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-5`
**Depends On**: Sprint 3b

### UI Components
- [ ] Enhance `line-item-table.tsx`
  - [ ] Editable cells for:
    - [ ] QTY (number input)
    - [ ] Utilization % (0-100 slider or input)
    - [ ] Phase Assignment (dropdown)
    - [ ] Power Group (text input)
  - [ ] Override fields (collapsible):
    - [ ] Amperage override
    - [ ] Wattage override
    - [ ] Heat dissipation override

- [ ] Create `src/components/load-calc/add-line-item-dialog.tsx`
  - [ ] Part search/selector
  - [ ] Manual entry form (for non-master parts)
  - [ ] QTY and utilization defaults

### Store
- [ ] Line item CRUD operations
  - [ ] Add line item
  - [ ] Update line item
  - [ ] Delete line item
  - [ ] Reorder line items

### Features
- [ ] Full line item editing
- [ ] Add from parts library
- [ ] Add manual entry parts
- [ ] Delete rows
- [ ] Override electrical specs

### Testing
- [ ] All fields editable
- [ ] Validation on numeric fields
- [ ] Overrides take precedence in calculations

### Deliverables
- [ ] Can fully edit line items
- [ ] Can add parts from library or manually
- [ ] Override functionality working

### Blockers
- Depends on Sprint 3b (import matching)

---

## Sprint 3c: Import Polish
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-3c`
**Depends On**: Sprint 5

### UI Components
- [ ] Create `src/components/load-calc/import-preview.tsx`
  - [ ] Diff view (what's new/changed/removed)
  - [ ] Row count summary
  - [ ] Confirm/Cancel buttons

- [ ] Create `src/components/load-calc/paste-from-clipboard.tsx`
  - [ ] Paste button
  - [ ] Parse tab-delimited data
  - [ ] Error handling for invalid formats

### Features
- [ ] Import preview (before commit)
- [ ] Clipboard paste (tab-delimited)
- [ ] Import cancellation/rollback
- [ ] Error handling and validation

### Testing
- [ ] Preview shows accurate diff
- [ ] Clipboard paste works with Excel data
- [ ] Invalid formats handled gracefully

### Deliverables
- [ ] Import preview working
- [ ] Clipboard paste functional
- [ ] Robust error handling

### Blockers
- Depends on Sprint 5 (line item editing)

---

## Sprint 6: Calculations + Validation
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-6`
**Depends On**: Sprint 3c

### Logic
- [ ] Create `src/lib/load-calc/calculations.ts`
  - [ ] `calculateHeat(voltageTable)` - Sum watts × 3.412
  - [ ] `calculateLoading(voltageTable)` - Sum per phase
  - [ ] `calculateBalance(voltageTable)` - (Max-Min)/Max × 100
  - [ ] `calculateAll(projectId)` - Run all calculations

- [ ] Create `src/lib/load-calc/validation.ts`
  - [ ] Voltage type matches table
  - [ ] 3-phase loads have phase assignment
  - [ ] Utilization % in 0-100 range
  - [ ] QTY > 0
  - [ ] Wattage available (from part or override)

### UI Components
- [ ] Create `src/components/load-calc/validation-errors.tsx`
  - [ ] Error list modal
  - [ ] Navigate to error location
  - [ ] Fix all errors before calculation

- [ ] Create `src/components/load-calc/calculate-button.tsx`
  - [ ] Run validation first
  - [ ] Show errors if any
  - [ ] Run calculations if valid
  - [ ] Progress indicator

### Store
- [ ] Calculation actions
  - [ ] Validate before calc
  - [ ] Run calculations
  - [ ] Cache results
  - [ ] Handle errors

### Features
- [ ] Hard validation (block on errors)
- [ ] Heat calculation (BTU/hr)
- [ ] Loading calculation (per phase)
- [ ] Balance calculation (imbalance %)
- [ ] Results caching

### Testing
- [ ] Validation catches all error cases
- [ ] Calculations produce correct results
- [ ] Cached results invalidated on data change

### Deliverables
- [ ] Validation blocks on errors
- [ ] All 3 calculations working
- [ ] Results cached and displayed

### Blockers
- Depends on Sprint 3c (import polish)

---

## Sprint 7: Reports View
**Duration**: 2-3 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-7`
**Depends On**: Sprint 6

### UI Components
- [ ] Create `src/components/load-calc/reports/heat-report.tsx`
  - [ ] Table view by enclosure
  - [ ] Total BTU/hr per enclosure
  - [ ] Color coding for high heat

- [ ] Create `src/components/load-calc/reports/loading-report.tsx`
  - [ ] Table view by enclosure + voltage
  - [ ] Per-phase totals
  - [ ] Circuit loading indicators

- [ ] Create `src/components/load-calc/reports/balance-report.tsx`
  - [ ] 3-phase loads only
  - [ ] L1/L2/L3 totals
  - [ ] Imbalance %
  - [ ] Visual indicators

- [ ] Create `src/components/load-calc/reports-view.tsx`
  - [ ] Tab navigation between reports
  - [ ] Refresh button
  - [ ] Export button

### Features
- [ ] View all 3 reports
- [ ] Refresh calculations
- [ ] Navigate to source data from reports

### Testing
- [ ] Reports display correct data
- [ ] Refresh updates calculations
- [ ] Visual indicators work

### Deliverables
- [ ] 3 report views working
- [ ] Can view calculations in app

### Blockers
- Depends on Sprint 6 (calculations)

---

## Sprint 8: Export
**Duration**: 4-5 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-8`
**Depends On**: Sprint 7

### Logic
- [ ] Create `src/lib/load-calc/export.ts`
  - [ ] `exportToExcel(projectId, format)`
  - [ ] Generate 3 sheets (Heat, Loading, Balance)
  - [ ] Format cells (headers, numbers)
  - [ ] `exportToPDF(projectId)`
  - [ ] Generate summary PDF

### UI Components
- [ ] Create `src/components/load-calc/export-dialog.tsx`
  - [ ] Format selection (Excel/PDF)
  - [ ] Include options (all tables/selected only)
  - [ ] Progress indicator
  - [ ] Download link

### Features
- [ ] Export to Excel (.xlsx with 3 sheets)
- [ ] Export to PDF (summary)
- [ ] Format matching Excel tool output
- [ ] Handle large exports gracefully

### Testing
- [ ] Excel exports with correct format
- [ ] PDF generates successfully
- [ ] Large projects export without timeout

### Deliverables
- [ ] Excel export working
- [ ] PDF export working
- [ ] Professional output formatting

### Blockers
- Depends on Sprint 7 (reports view)

### Notes
- Need to get exact Excel template format from user for Sprint 8

---

## Sprint 9: BOM Integration Polish
**Duration**: 2-3 days  
**Status**: ⏳ PENDING  
**Branch**: `feature/load-calc-sprint-9`
**Depends On**: Sprint 8

### UI Components
- [ ] Create `src/components/load-calc/project-selector.tsx`
  - [ ] Shared project selector modal
  - [ ] List BOM packages
  - [ ] Create new Load Calc from existing BOM
  - [ ] Link/Unlink from BOM

### Integration
- [ ] Location sync with BOM
  - [ ] Auto-populate from BOM Package
  - [ ] Sync changes both ways
  - [ ] Handle conflicts

### Features
- [ ] Select BOM Package on Load Calc creation
- [ ] Locations auto-sync with BOM
- [ ] Project context indicator in header
- [ ] Switch projects without losing work

### Testing
- [ ] Locations sync correctly
- [ ] Changes reflect in both systems
- [ ] No data loss on project switch

### Deliverables
- [ ] BOM integration complete
- [ ] Location sync working
- [ ] Project selector integrated

### Blockers
- Depends on Sprint 8 (export)
- May need coordination with BOM Translation module

---

## 📊 Progress Summary

| Sprint | Status | Est. Days | Actual Days | Completion |
|--------|--------|-----------|-------------|------------|
| 0 | ✅ Complete | 1-2 | TBD | 100% |
| 1 | 🔄 In Progress | 3-4 | TBD | 0% |
| 2 | ⏳ Pending | 4-5 | - | 0% |
| 3a | ⏳ Pending | 4-5 | - | 0% |
| 4 | ⏳ Pending | 3-4 | - | 0% |
| 3b | ⏳ Pending | 5-6 | - | 0% |
| 5 | ⏳ Pending | 4-5 | - | 0% |
| 3c | ⏳ Pending | 4-5 | - | 0% |
| 6 | ⏳ Pending | 4-5 | - | 0% |
| 7 | ⏳ Pending | 2-3 | - | 0% |
| 8 | ⏳ Pending | 4-5 | - | 0% |
| 9 | ⏳ Pending | 2-3 | - | 0% |

**Total Progress**: ~4%  
**Total Est. Time**: 18-23 weeks (4.5-6 months)  
**Time Elapsed**: TBD  

---

## 🚧 Current Blockers

None - Ready to proceed with Sprint 1

---

## 📝 Session Notes

### 2026-01-30
- Completed Sprint 0 analysis
- All data files received and analyzed
- Architecture finalized
- Task list created
- Ready to begin Sprint 1 (Database)

---

## 🔜 Next Actions

1. **Immediate**: Create migration file `005_load_calc_tables.sql`
2. **This Week**: Complete Sprint 1 (database foundation)
3. **Next**: Begin Sprint 2 (parts foundation)

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

**Last Updated**: 2026-01-30  
**Next Review**: After Sprint 1 completion
