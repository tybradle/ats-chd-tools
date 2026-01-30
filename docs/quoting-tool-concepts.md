# Quoting Tool - Concept Summary

**Status**: Conceptual / Brainstorming Phase  
**Last Updated**: 2026-01-30  
**Scope**: Capex and Service quoting workflows

---

## Overview

The Quoting Tool generates project quotes for controls hardware design based on deliverables. It supports two distinct quote types with different workflows:

1. **Capex (Capital Expenditure)**: Pre-built "bucket" system with complex hierarchy
2. **Service**: Simple ad-hoc parts + labor tables

---

## Capex Quoting Workflow

### Core Concept: Buckets

A "bucket" is a pre-defined collection of parts with labor hours. Buckets are templated recipes that expand into detailed line items.

### Data Sources

1. **Master Parts List** (SharePoint)
   - 2000+ parts with pricing
   - Sequential ID system (1, 2, 3, 4... gaps allowed)
   - Columns: ID, Manufacturer, Part #, Description, Pricing, etc.

2. **Master Recipe List** (SharePoint - Centralized spreadsheet)
   - Templated bucket definitions
   - Bucket encoding format: `551;622;627;630;637*0.5;639`
   - Syntax: `partID` or `partID*qty` (default qty=1)
   - Example breakdown:
     - 551: Part ID 551 (qty 1)
     - 622: Part ID 622 (qty 1)
     - 627: Part ID 627 (qty 1)
     - 630: Part ID 630 (qty 1)
     - 637*0.5: Part ID 637 (qty 0.5)
     - 639: Part ID 639 (qty 1)

### Hierarchy Structure

```
Zone
└── Cell
    └── Station
        └── Deliverables (Buckets)
            └── Each bucket = one line item
```

- Each zone/cell/station can have multiple buckets
- Each bucket line item references one recipe
- Recipes are locked once templated

### Workflow Steps

1. **Create Quote**
   - Project info (name, date, customer)
   - Define zone/cell/station hierarchy

2. **Add Deliverables**
   - Select station
   - Add bucket line item
   - Select recipe from master list
   - Recipe expands into parts + labor

3. **Labor Calculation**
   - Each bucket has pre-populated labor hours
   - Task register applies overhead multipliers:
     - 5% for project management
     - 5% for requisitioning
     - Other adders as defined
   - Final total = base hours + overhead

4. **Review & Summarize**
   - View part totals by category
   - View labor totals with multipliers
   - Check pricing

5. **Export**
   - Single document output
   - Share with applications engineers

---

## Service Quoting Workflow

### Simplified Structure

Two-table layout for ad-hoc quoting:

**Table 1: Parts**
- Source from parts library or manual entry
- Columns: Part #, Description, QTY, Unit Price, Extended Price

**Table 2: Labor**
- Line items with hours and rates
- Columns: Task, Hours, Rate, Total

**Totals Section**
- Parts subtotal
- Labor subtotal
- Overhead/adders
- Grand total

---

## Key Challenges & Solutions

### Challenge 1: Bucket Encoding

**Current**: Cryptic string `551;622;627;630;637*0.5;639`  
**Solution in App**: 
- Visual bucket builder (add parts, set qtys)
- Store as proper relational data in SQLite
- Backend handles encoding if SharePoint sync needed

### Challenge 2: SharePoint Integration

**Current**: Live connection to SharePoint lists  
**Constraint**: IT policy = 100% M365 or 0% (no hybrid)  
**Proposed Solution**:
- **Phase 1**: Offline-first with periodic Excel/CSV import
- **Phase 2**: Optional SharePoint Graph API sync (if approved)
- Local SQLite = source of truth

### Challenge 3: Recipe Management

**Current**: Centralized spreadsheet on SharePoint  
**In App**:
- Import recipes as template records
- Version control for recipe changes
- Lock recipes once approved
- Local override capability for project-specific tweaks

### Challenge 4: Labor Multipliers

**Current**: Task register with % adders  
**In App**:
- Configurable multiplier rules
- Apply to base hours per bucket
- Show breakdown: base + PM% + req% = total

---

## Data Model Concepts

### Parts (Shared with Load Calculator)
```
parts (
  id,
  manufacturer,
  part_number,
  description,
  unit_cost,
  -- electrical specs for Load Calc integration
)
```

### Buckets/Recipes
```
recipes (
  id,
  name,
  description,
  base_labor_hours,
  is_locked,
  created_at
)

recipe_items (
  recipe_id,
  part_id,
  quantity,
  sort_order
)
```

### Quotes
```
quotes (
  id,
  name,
  quote_type,  -- 'CAPEX' or 'SERVICE'
  customer,
  created_at,
  status
)

quote_zones (
  quote_id,
  zone_name,
  sort_order
)

quote_cells (
  zone_id,
  cell_name,
  sort_order
)

quote_stations (
  cell_id,
  station_name,
  sort_order
)

quote_line_items (
  station_id,
  recipe_id,
  quantity,  -- How many instances of this bucket
  labor_multiplier_override,
  sort_order
)

-- Service quote tables (simpler)
quote_service_parts (
  quote_id,
  part_id or manual_entry,
  qty,
  unit_price
)

quote_service_labor (
  quote_id,
  task_description,
  hours,
  rate
)
```

---

## UI Concepts

### Capex Builder

```
┌──────────────────────────────────────────────────────┐
│ Quote: Project Alpha                        [Save]   │
├──────────────────────────────────────────────────────┤
│ ZONES                                                │
│ ├─ Zone A                                           │
│ │  ├─ Cell 1                                        │
│ │  │  ├─ Station A                                  │
│ │  │  │  └─ Deliverables:                           │
│ │  │  │     • Control Cabinet Build (Recipe #12)    │
│ │  │  │     • HMI Installation (Recipe #45)         │
│ │  │  └─ + Add Bucket                               │
│ │  └─ + Add Station                                 │
│ └─ + Add Cell                                       │
└──────────────────────────────────────────────────────┘
```

### Bucket Builder

Instead of cryptic strings, visual builder:
```
Recipe: Control Cabinet Build
┌────────────────────────────────┐
│ Add Parts                      │
│ ┌──────────┬─────┬──────────┐  │
│ │ Part     │ Qty │ Action   │  │
│ │ Siemens  │  2  │ [Remove] │  │
│ │ PSU 24V  │     │          │  │
│ │ Allen B  │  1  │ [Remove] │  │
│ │ 1734...  │     │          │  │
│ └──────────┴─────┴──────────┘  │
│ [+ Add Part]  [Save Recipe]    │
└────────────────────────────────┘
Labor Hours: 40 (base)
```

### Service Quote

```
Parts Table                    Labor Table
┌─────────┬─────┬──────┐      ┌─────────────┬──────┬──────┐
│ Part    │ Qty │Price │      │ Task        │Hours │ Cost │
├─────────┼─────┼──────┤      ├─────────────┼──────┼──────┤
│ ABC123  │  2  │ $500 │      │ Programming │  40  │ $4000│
│ DEF456  │  1  │ $200 │      │ Testing     │  16  │ $1600│
└─────────┴─────┴──────┘      └─────────────┴──────┴──────┘
Parts Subtotal: $700          Labor Subtotal: $5600
Overhead (10%): $ 70          Overhead (10%): $ 560
──────────────────────────────────────────────────
Grand Total: $6,930
```

---

## Integration Points

### With Load Calculator
- Share master parts list
- Quote parts can feed into Load Calc for electrical validation
- Consistent pricing across both tools

### With BOM Translation
- Quote line items can generate BOM entries
- Export quote parts to BOM Package

### With Parts Library
- Centralized parts database
- Pricing updates propagate to quotes

---

## Open Questions

1. **SharePoint Sync**: Wait for IT approval or start offline-first?
2. **Recipe Ownership**: Who can create/edit recipes? Approval workflow?
3. **Pricing Updates**: Real-time or snapshot at quote creation?
4. **Labor Rate Changes**: Historical rates or current rates?
5. **Export Format**: Excel template? PDF? Both?
6. **Approval Workflow**: Do quotes need approval before export?
7. **Service vs Capex**: Separate modules or unified interface with modes?

---

## Future Enhancements

- **Quote Templates**: Save common quote structures
- **Version Control**: Track quote revisions
- **Customer Database**: Store customer info, historical quotes
- **Markup Rules**: Configurable markup by category
- **Currency Support**: Multi-currency pricing
- **Reporting**: Win/loss tracking, quote analytics

---

## Related Documents

- `load-calculator-architecture.md` - Load Calculator specs
- `project-manager-decoupling.md` - Shared project selector
