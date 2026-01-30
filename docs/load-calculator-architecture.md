# Load Calculator Tool - Architecture Summary

**Status**: Conceptual / Planning Phase  
**Last Updated**: 2026-01-30  
**Based on**: XXX_Load_Calculations_V1.12.xlsm analysis and discussions

---

## Overview

The Load Calculator is an electrical analysis tool for control systems that imports BOM data from Eplan, matches parts against a master library, and calculates:
1. **Heat Dissipation** per enclosure (cooling requirements)
2. **Circuit Loading** per phase (amperage totals)
3. **3-Phase Load Balancing** (distribution across L1/L2/L3)

---

## Core Workflow

### 1. Project Setup
- User selects or creates a Load Calc project
- Can link to existing BOM Package (optional)
- If linked to BOM: locations auto-populate from `bom_locations`

### 2. Location & Voltage Tables
- Create physical locations (EC1, EC2, Panel A, Field)
- Each location gets voltage-specific tables:
  - 480VAC 3-Phase
  - 120VAC 1-Phase
  - 24VDC
  - 600VAC 3-Phase
  - 230VAC 3-Phase
- **Each voltage table is independently lockable**

### 3. BOM Import
- Upload Eplan spreadsheet export
- Column mapper (similar to BOM Translation)
- Auto-match part numbers against master parts list
- Flag unmatched parts for manual entry
- **Paste from Excel**: Support clipboard paste of tab-delimited data

### 4. Data Enrichment
- Assign: Quantity, Utilization %, Power Group, Phase Assignment
- Override electrical specs if needed
- Manual entry for parts not in master list

### 5. Calculations
- Run calculations per locked table
- Generate 3 reports:
  - **Heat Calculation**: Sum power loss (W) → BTU/hr per enclosure
  - **Loading Report**: Sum amperage per phase per enclosure
  - **Load Balancing**: 3-phase distribution and imbalance %

### 6. Export
- Excel format (3 sheets matching current output)
- PDF summary

---

## Database Schema

### Modified Tables

#### `part_electrical` (Extended for Multi-Voltage)
```sql
part_electrical (
    part_id INTEGER REFERENCES parts(id),
    voltage_type TEXT,  -- 'DC', '120VAC_1PH', '480VAC_3PH', '480VAC_1PH', '600VAC_3PH', '230VAC_3PH'
    amperage REAL,
    wattage REAL,
    phase INTEGER,
    heat_dissipation_btu REAL,
    max_temp_c REAL,
    utilization_default REAL DEFAULT 1.0,
    PRIMARY KEY (part_id, voltage_type)  -- Composite key allows multiple voltages per part
)
```

### New Tables

#### `load_calc_projects`
```sql
load_calc_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    bom_package_id INTEGER REFERENCES bom_packages(id),  -- Optional link to BOM
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### `load_calc_voltage_tables`
```sql
load_calc_voltage_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES load_calc_projects(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES bom_locations(id),  -- Reuse BOM locations
    voltage_type TEXT NOT NULL,  -- '480VAC_3PH', '120VAC_1PH', 'DC', etc.
    is_locked INTEGER DEFAULT 0,  -- Per-table locking
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, location_id, voltage_type)
)
```

#### `load_calc_line_items`
```sql
load_calc_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voltage_table_id INTEGER NOT NULL REFERENCES load_calc_voltage_tables(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES parts(id),  -- Null if manual entry
    
    -- Manual entry fields (when part not in master list)
    manufacturer_manual TEXT,
    part_number_manual TEXT,
    description_manual TEXT,
    
    -- User inputs
    qty REAL NOT NULL DEFAULT 1,
    utilization_pct REAL DEFAULT 1.0,  -- 0.0 to 1.0
    
    -- Override fields (optional)
    amperage_override REAL,
    wattage_override REAL,
    heat_dissipation_override REAL,
    
    -- Analysis assignments
    power_group TEXT,
    phase_assignment TEXT,  -- 'L1', 'L2', 'L3', 'L1+L2', 'L1+L2+L3', 'L1-L2', etc.
    
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### `load_calc_results` (Cached Calculations)
```sql
load_calc_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES load_calc_projects(id) ON DELETE CASCADE,
    voltage_table_id INTEGER NOT NULL REFERENCES load_calc_voltage_tables(id),
    
    -- Aggregated totals
    total_amperage_l1 REAL,
    total_amperage_l2 REAL,
    total_amperage_l3 REAL,
    total_wattage REAL,
    total_heat_dissipation_btu REAL,
    max_calculated_temp_c REAL,
    imbalance_percent REAL,
    
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## UI Layout Concept

```
┌─────────────────────────────────────────────────────────────┐
│ Load Calculator - Project: 14403-ECM1                [Save] │
│                              [Run Calculations] [Export ▼]  │
├──────────────┬──────────────────────────────────────────────┤
│              │  Location: EC1                               │
│ LOCATIONS    │  ┌─────────────┐ ┌─────────────┐ ┌────────┐  │
│              │  │   480VAC    │ │   120VAC    │ │   DC   │  │
│ ◉ EC1        │  │   [Lock]    │ │             │ │        │  │
│ ○ EC2        │  └─────────────┘ └─────────────┘ └────────┘  │
│ ○ Panel A    │                                               │
│ ○ Field      │  [Paste from Clipboard]  [Add Row]            │
│              │                                               │
│ + Add Loc    │  ┌─────────────────────────────────────────┐  │
│              │  │ Manuf.    │ Part #    │ Desc.  │ QTY │U%│  │
│              │  │ Siemens   │ 6EP1333...│ PSU    │  2  │1.0│  │
│              │  │ AllenBrad │ 1734-AENT│ Adapter│  1  │0.8│  │
│              │  └─────────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Multi-Voltage Parts
- Same part number can exist at different voltages (e.g., part has both DC and 480VAC specs)
- Composite key on `part_electrical`: (part_id, voltage_type)
- UI shows only voltage-appropriate variants based on active table

### 2. Location Reuse
- Uses existing `bom_locations` table (shared with BOM Translation)
- If linked to BOM Package, locations auto-populate
- Changes sync both ways

### 3. Table Locking
- Lock at voltage table level (e.g., lock EC1-480VAC but keep EC1-120VAC editable)
- Prevents accidental recalculation of stable data

### 4. Paste Functionality
- User copies from Excel/Eplan (tab-delimited)
- Click "Paste" → parse rows → bulk insert
- Maintains workflow parity with Excel VBA

### 5. Phase Assignment
- Per-line dropdown: L1, L2, L3, L1+L2, L1+L3, L2+L3, L1+L2+L3, L1-L2, etc.
- Only applies to multi-phase voltage types

---

## Integration Points

### With BOM Translation
- Share `bom_job_projects`, `bom_packages`, `bom_locations`
- Can create Load Calc from existing BOM Package
- Locations sync between systems

### With Parts Library
- Uses `parts` table for matching
- Extends `part_electrical` for multi-voltage support
- Unmatched parts flagged for addition to master list

---

## Reports & Output

### 1. Heat Calculation Report
- Grouped by enclosure/location
- Total power loss (W) converted to BTU/hr
- Max temperature calculations
- Export: Excel sheet + PDF

### 2. Loading Report
- Grouped by enclosure + voltage type
- Total amperage per phase
- Circuit breaker sizing suggestions
- Export: Excel sheet + PDF

### 3. Load Balancing Report
- 3-phase loads only
- L1 vs L2 vs L3 totals
- Imbalance percentage
- Recommendations for redistribution
- Export: Excel sheet + PDF

---

## Future Enhancements

- **Compare BOM**: Track changes between Eplan imports (additions/removals)
- **Live SharePoint Sync**: Optional API integration for master parts updates
- **Visualization**: Charts for load distribution, heat maps
- **Templates**: Save/load voltage table templates

---

## Open Questions (To Resolve Before Implementation)

1. Duty cycle application: Applied to current draw calculation?
2. Heat calc factors: Enclosure size/ventilation derating?
3. Compare BOM priority: Critical for v1 or later?
4. Export formatting: Exact Excel template format needed

---

## Related Documents

- `quoting-tool-concepts.md` - Quoting Tool brainstorming
- `project-manager-decoupling.md` - Shared project selector architecture
- `XXX_Load_Calculations_V1.12.xlsm` - Source Excel file (in .samples/)
