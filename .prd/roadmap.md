# ATS CHD Tools - Roadmap

## Overview
Unified desktop application platform for the ATS CHD department. Replaces multiple Excel-based workflows with a single Tauri desktop app.

## Problem Statement
The CHD department currently relies on fragmented, complex Excel workbooks for BOM translation, part management, and engineering calculations. These are difficult to maintain, lack version control, and are prone to data entry errors.

## Goals
- [ ] Provide a centralized, offline-first desktop application.
- [ ] Streamline BOM translation between various engineering formats (CSV, Excel, XML, EPLAN).
- [ ] Maintain a master parts library with fast search capabilities.
- [ ] Automate complex engineering mappings (e.g., Glenair connector arrangements).

## Current Status
- **Foundation**: Core architecture (Tauri, React, SQLite) established.
- **Parts Library**: Fully implemented with FTS search.
- **BOM Translation**: Basic project/location/item management and DB persistence implemented.
- **Glenair Module**: Database schema and initial query logic implemented.
- **Active Sprint**: Phase 2 is currently underway, focusing on Testing, EPLAN, and Heat/Load modules.

## Roadmap & Task Breakdown

### Phase 1: Foundation & BOM Basics (Completed)

### Phase 2: Core Engineering Capabilities (Active)
See `.prd/active-sprint.md` for detailed tasks.
- [ ] **[TEST-1]**: Testing Infrastructure (Vitest, RTL)
- [ ] **[BOM-3]**: Enhanced XLSX Mapping Implementation
- [ ] **[BOM-4]**: EPLAN (.zw1) Export refinement
- [ ] **[HEAT-1]**: Heat/Load Calculation Module
- [ ] **[GLEN-1]**: Glenair Arrangement Search UI

### Phase 3: Advanced Modules & Polish (Future)
- [ ] **[QUOTE-1]**: Quoting Workbook Module
- [ ] **[QR-1]**: QR Label Generator
- [ ] **[DOC-1]**: User Documentation & Training Material

## Technical Requirements
- [TR-1] **100% Offline**: No network calls allowed.
- [TR-2] **SQLite Storage**: All data persisted in local `ats-chd-tools.db`.
- [TR-3] **Tauri 2.0 API**: Use `@tauri-apps/api` for native interactions.

## Task Breakdown (High Level)
### High Priority (P0)
- [ ] **[BOM-3]**: Enhanced XLSX Mapping Implementation
  - Complexity: Medium
  - Dependencies: None
  - Acceptance Criteria: Import dialog supports custom column mapping.

### Medium Priority (P1)
- [ ] **[TEST-1]**: Setup Testing Infrastructure
  - Complexity: Medium
  - Acceptance Criteria: Vitest and RTL configured with 80% coverage on lib/db.

### Low Priority (P2)
- [ ] **[GLEN-1]**: Arrangement Search UI
  - Complexity: Simple
  - Acceptance Criteria: Filterable grid for Glenair arrangements.
