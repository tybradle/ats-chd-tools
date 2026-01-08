# Active Sprint - ATS CHD Tools Phase 2

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2025-01-06
**Project**: ATS CHD Tools - Unified Desktop Application

---

## Executive Summary

Building upon the completed Phase 1 modules (BOM Translation, Parts Library, Glenair Builder), this sprint focuses on completing the remaining core business capabilities: EPLAN export format, Heat/Load calculations, and Quoting module. Additionally, this sprint establishes the testing infrastructure foundation for the entire application.

---

## Project Context

### Current State
- **Platform**: Windows desktop application (Tauri 2.0)
- **Deployment Target**: 100% offline, single-user, ~15-20MB installer
- **Tech Stack**: React 19, TypeScript, Vite 6, TailwindCSS 4, shadcn/ui, Zustand, SQLite
- **Completed Modules**:
  - BOM Translation: Full CRUD with Excel import/export
  - Parts Library: Manufacturer management, categories, FTS search
  - Glenair Series 80 Builder: Contact selection, arrangement lookup, PHM mapping

### Database Schema
- **001_initial.sql**: Core tables (users, settings, timestamps)
- **002_bom_tables.sql**: BOM Translation schema
- **003_glenair_tables.sql**: Glenair Builder schema
- **Pending**: Heat/Load tables, Quoting tables (schema exists, no migrations)

---

## Goals & Non-Goals

### Goals ✅
1. **Testing Infrastructure**: Establish unit, integration, and E2E testing foundation
2. **EPLAN Export**: Enable BOM export in EPLAN XML format for electrical CAD integration
3. **Heat/Load Module**: UI for thermal and load calculation workflows
4. **Quoting Module**: Pricing, cost estimation, and quote generation
5. **Code Quality**: 80%+ test coverage, validated type safety, zero critical lint errors

### Non-Goals ❌
1. **QR Labeling**: Deferred to future sprint (not in current schema)
2. **Multi-user Support**: Remains single-user desktop application
3. **Cloud Sync**: Offline-only requirements maintained
4. **Internationalization**: English-only in this sprint
5. **Mobile/Web Versions**: Desktop-only focus

---

## Functional Requirements

### FR1: Testing Infrastructure

#### FR1.1 Unit Testing Framework
- **Description**: Configure Vitest for component and logic testing
- **Requirements**:
  - Test all utility functions in `src/lib/`
  - Test Zustand stores (state management)
  - Test database client functions with SQLite in-memory
  - Test Zod validators
- **Acceptance Criteria**:
  - 80%+ coverage on `src/lib/db/client.ts`
  - All form validators tested
  - Store state transitions verified
- **Priority**: High

#### FR1.2 Integration Testing
- **Description**: Test database operations and Tauri commands
- **Requirements**:
  - Test SQLite migrations (up/down)
  - Test CRUD operations via database client
  - Test Tauri invoke commands
- **Acceptance Criteria**:
  - All migrations tested with rollback
  - CRUD operations verified with real SQLite
  - Tauri command mocks validated
- **Priority**: High

#### FR1.3 Component Testing
- **Description**: Test React components with Testing Library
- **Requirements**:
  - Test critical user flows (BOM creation, Part search)
  - Test form submissions and validation
  - Test error handling and toasts
- **Acceptance Criteria**:
  - All page components tested
  - User interactions verified
  - Error states covered
- **Priority**: Medium

#### FR1.4 E2E Testing
- **Description**: Setup Playwright for full workflow testing
- **Requirements**:
  - Test complete BOM Translation workflow
  - Test Parts Library search and CRUD
  - Test Glenair Builder flow
- **Acceptance Criteria**:
  - 3 critical end-to-end scenarios
  - Runs in CI/CD pipeline
  - <10s per test execution
- **Priority**: Low (time-permitting)

---

### FR2: EPLAN Export Format

#### FR2.1 EPLAN XML Schema
- **Description**: Export BOM data in EPLAN-compatible XML format
- **Requirements**:
  - Map BOM items to EPLAN part schema
  - Include manufacturer, part number, quantity, description
  - Support export per project/location
  - Validate XML schema compliance
- **Acceptance Criteria**:
  - Export button in BOM Translation UI
  - XML file download with `.xml` extension
  - Schema validation passes EPLAN requirements
  - User selects export format (Excel/EPLAN)
- **Priority**: High

#### FR2.2 Field Mapping Configuration
- **Description**: Configure which BOM fields map to EPLAN fields
- **Requirements**:
  - Admin settings for field mappings
  - Default mappings pre-configured
  - Support for custom attribute mappings
- **Acceptance Criteria**:
  - Settings UI for field mappings
  - Mappings stored in database
  - Validation for required EPLAN fields
- **Priority**: Medium

---

### FR3: Heat/Load Calculation Module

#### FR3.1 Calculation UI
- **Description**: Web interface for thermal and load calculations
- **Requirements**:
  - Input form for calculation parameters (voltage, current, environment)
  - Display calculation results with formulas shown
  - Save/load calculation scenarios
  - Export calculation reports (PDF)
- **Acceptance Criteria**:
  - Route `/heat-load` accessible from navigation
  - Form validates inputs (Zod)
  - Results display with 3 decimal precision
  - Scenarios saved to database
- **Priority**: High

#### FR3.2 Calculation Engine
- **Description**: TypeScript implementation of heat/load formulas
- **Requirements**:
  - Pure functions in `src/lib/calculations/`
  - Unit tests for all formulas
  - Support for standard formulas (I²R, ambient temp derating)
  - Error handling for invalid inputs
- **Acceptance Criteria**:
  - 100% test coverage for calculation functions
  - Results match manual calculations (verified)
  - Error cases handled gracefully
- **Priority**: High

#### FR3.3 Database Integration
- **Description**: Persist calculations and scenarios
- **Requirements**:
  - Migration `004_heat_load.sql` for tables
  - CRUD operations in `src/lib/db/client.ts`
  - Link calculations to BOM projects
- **Acceptance Criteria**:
  - Migration tested with rollback
  - CRUD functions tested
  - Foreign key constraints enforced
- **Priority**: Medium

---

### FR4: Quoting Module

#### FR4.1 Pricing Management
- **Description**: Manage part pricing and cost structures
- **Requirements**:
  - Admin UI for setting part prices
  - Bulk price import from CSV
  - Price history tracking
  - Currency configuration (USD default)
- **Acceptance Criteria**:
  - Route `/pricing` in navigation
  - Price table with edit/delete
  - CSV import validated
  - Price history viewable
- **Priority**: High

#### FR4.2 Quote Generation
- **Description**: Create quotes from BOM projects
- **Requirements**:
  - Select BOM project to quote
  - Apply markup/discount percentages
  - Generate quote document (PDF)
  - Save quotes to database
  - Email quote (opens mail client)
- **Acceptance Criteria**:
  - Quote creation flow from BOM
  - PDF template with company branding
  - Quotes stored and searchable
  - Markup/discount calculations verified
- **Priority**: High

#### FR4.3 Database Schema
- **Description**: Migration for pricing and quotes
- **Requirements**:
  - `005_quoting.sql` migration
  - Tables: `part_prices`, `quotes`, `quote_items`
  - Foreign keys to BOM and Parts Library
  - Indexes for search performance
- **Acceptance Criteria**:
  - Migration tested
  - Schema normalized
  - Constraints validated
- **Priority**: Medium

---

## Non-Functional Requirements

### NFR1: Performance
- Export operations <5s for 1000-item BOM
- Calculation results <500ms
- Quote PDF generation <3s
- Database queries <100ms (indexed)

### NFR2: Reliability
- All calculations verified with unit tests
- Database transactions for data integrity
- Graceful error handling with user feedback
- Zero data loss scenarios

### NFR3: Usability
- Consistent with existing UI patterns (shadcn/ui)
- Loading states for all async operations
- Undo/confirm for destructive actions
- Keyboard shortcuts for power users

### NFR4: Maintainability
- Code follows existing patterns (centralized DB, Zustand stores)
- 80%+ test coverage
- TypeScript strict mode (no `any`)
- ESLint zero warnings

### NFR5: Security
- Input validation on all forms (Zod)
- SQL injection prevention (parameterized queries)
- No sensitive data in logs
- File upload size limits

---

## Proposed Architecture

### Testing Layer

```
tests/
├── unit/              # Vitest unit tests
│   ├── lib/           # Utility functions
│   ├── stores/        # Zustand stores
│   └── db/            # Database client
├── integration/       # Database & Tauri tests
│   ├── migrations/    # Migration tests
│   └── commands/      # Tauri invoke tests
├── component/         # React Testing Library
│   └── pages/         # Page component tests
└── e2e/               # Playwright E2E tests
    └── workflows/     # Critical user flows
```

### EPLAN Export

```typescript
// src/lib/export/eplan.ts
export async function generateEplanXML(bomId: number): Promise<string>

// src/lib/export/mappers.ts
export function mapBomToEplan(item: BOMItem): EplanPart

// src/pages/bom/ExportButton.tsx
// UI component for format selection (Excel/EPLAN)
```

### Heat/Load Module

```typescript
// src/lib/calculations/heat-load.ts
export function calculateHeatRise(params: HeatParams): number
export function calculateLoad(params: LoadParams): number

// src/lib/db/client.ts
export const heatLoadDb = {
  createScenario,
  getScenarios,
  updateScenario,
  deleteScenario
}

// src/pages/heat-load/Calculator.tsx
// Form UI for calculations
```

### Quoting Module

```typescript
// src/lib/db/client.ts
export const quotingDb = {
  setPartPrice,
  getPartPrice,
  createQuote,
  getQuotes,
  generateQuotePDF
}

// src/pages/quoting/PricingManager.tsx
// Admin UI for pricing

// src/pages/quoting/QuoteBuilder.tsx
// Quote creation from BOM
```

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
**Goal**: Establish testing infrastructure

1. **Setup Vitest** (Day 1-2)
   - Configure `vitest.config.ts`
   - Add test scripts to `package.json`
   - Setup test database utilities
   - Write first 5 unit tests

2. **Database Client Testing** (Day 3-4)
   - Test all CRUD operations
   - Test migration rollback
   - Achieve 80% coverage on `client.ts`

3. **Component Testing** (Day 5)
   - Setup Testing Library
   - Test 3 critical components
   - Validate form submissions

### Phase 2: EPLAN Export (Week 2)
**Goal**: Enable EPLAN integration

1. **Schema & Mapping** (Day 1-2)
   - Research EPLAN XML schema
   - Design field mapping config
   - Create `src/lib/export/eplan.ts`

2. **UI Implementation** (Day 3-4)
   - Add export format selector
   - Implement XML generation
   - Add validation and error handling

3. **Testing** (Day 5)
   - Unit tests for XML generation
   - Integration tests with real BOM data
   - Validate XML schema compliance

### Phase 3: Heat/Load Module (Week 3)
**Goal**: Complete thermal calculations

1. **Database Schema** (Day 1)
   - Create `004_heat_load.sql`
   - Test migration up/down
   - Add CRUD functions to `client.ts`

2. **Calculation Engine** (Day 2-3)
   - Implement calculation functions
   - Unit test all formulas
   - Verify accuracy with manual tests

3. **UI Implementation** (Day 4-5)
   - Build calculator form
   - Implement scenario save/load
   - Add PDF export for reports

### Phase 4: Quoting Module (Week 4)
**Goal**: Enable quote generation

1. **Database Schema** (Day 1)
   - Create `005_quoting.sql`
   - Test migration
   - Add CRUD operations

2. **Pricing Management** (Day 2-3)
   - Build pricing admin UI
   - Implement CSV import
   - Add price history view

3. **Quote Generation** (Day 4-5)
   - Build quote builder UI
   - Implement PDF generation
   - Add quote search and management

### Phase 5: Validation & Hardening (Week 5)
**Goal**: Production-ready quality

1. **Test Coverage**
   - Achieve 80%+ coverage across all modules
   - Run full test suite
   - Fix failing tests

2. **Performance Testing**
   - Profile export operations
   - Optimize slow queries
   - Verify <5s exports

3. **Documentation**
   - Update README with new features
   - Document testing setup
   - Create user guide for new modules

---

## Task Breakdown

### Phase 1: Testing Infrastructure

- [ ] Task 1.1: Setup Vitest Configuration (Simple, 2h, Frontend Developer)
  - Install `@vitest/ui`, `vitest`, `@testing-library/react`
  - Create `vitest.config.ts`
  - Add test scripts to package.json
  - Write sample test to verify setup
  - Testing: Unit (verify config loads)

- [ ] Task 1.2: Test Database Client Functions (Medium, 6h, Frontend Developer)
  - Dependencies: Task 1.1
  - Setup in-memory SQLite for tests
  - Test all BOM CRUD operations
  - Test all Parts Library operations
  - Test all Glenair operations
  - Verify parameterized queries (no SQL injection)
  - Testing: Unit, Integration

- [ ] Task 1.3: Test Zustand Stores (Simple, 3h, Frontend Developer)
  - Dependencies: Task 1.1
  - Test BOM store state transitions
  - Test Parts store filters and search
  - Test Glenair builder store
  - Verify store reset functionality
  - Testing: Unit

- [ ] Task 1.4: Setup React Testing Library (Simple, 2h, Frontend Developer)
  - Dependencies: Task 1.1
  - Install `@testing-library/user-event`
  - Create test utilities (renderWithProviders)
  - Setup mock Tauri commands
  - Write sample component test
  - Testing: Unit (verify utilities work)

- [ ] Task 1.5: Test Critical User Flows (Medium, 8h, Frontend Developer)
  - Dependencies: Task 1.4
  - Test BOM creation workflow
  - Test Part search and edit
  - Test Glenair builder flow
  - Test form validation errors
  - Test toast notifications
  - Testing: Component

- [ ] Task 1.6: Setup Playwright (Optional) (Medium, 4h, Frontend Developer)
  - Dependencies: None (time-permitting)
  - Install and configure Playwright
  - Write E2E test for BOM workflow
  - Write E2E test for Part search
  - Configure CI/CD integration
  - Testing: E2E

### Phase 2: EPLAN Export Format

- [ ] Task 2.1: Research EPLAN XML Schema (Simple, 2h, Frontend Developer)
  - Download EPLAN XML schema documentation
  - Analyze required fields and structure
  - Document mapping from BOM items to EPLAN parts
  - Validate schema compliance requirements
  - Testing: N/A (research)

- [ ] Task 2.2: Implement EPLAN XML Generator (Medium, 6h, Frontend Developer)
  - Dependencies: Task 2.1
  - Create `src/lib/export/eplan.ts`
  - Create `src/lib/export/mappers.ts`
  - Implement XML generation logic
  - Add XML schema validation
  - Handle edge cases (missing data, special characters)
  - Testing: Unit

- [ ] Task 2.3: Add Export Format Selector UI (Simple, 3h, Frontend Developer)
  - Dependencies: Task 2.2
  - Update `ExportButton.tsx` with format dropdown
  - Add state for selected format
  - Call appropriate export function
  - Add loading states and error handling
  - Testing: Component

- [ ] Task 2.4: Configure Field Mappings (Medium, 4h, Frontend Developer)
  - Dependencies: Task 2.1
  - Design mapping configuration structure
  - Add settings table to database
  - Create admin UI for field mappings
  - Implement default mappings
  - Testing: Unit, Integration

- [ ] Task 2.5: Test EPLAN Export (Medium, 3h, Frontend Developer)
  - Dependencies: Task 2.2, 2.3
  - Unit test XML generation
  - Integration test with real BOM data
  - Validate XML schema compliance
  - Test error handling
  - Testing: Unit, Integration

### Phase 3: Heat/Load Calculation Module

- [ ] Task 3.1: Create Heat/Load Database Schema (Simple, 2h, Backend Developer)
  - Design tables: `calculation_scenarios`, `calculation_inputs`, `calculation_results`
  - Create `004_heat_load.sql` migration
  - Add foreign keys to BOM projects
  - Add indexes for search performance
  - Testing: Integration (migration test)

- [ ] Task 3.2: Implement Heat/Load Calculation Functions (Medium, 8h, Frontend Developer)
  - Dependencies: None (parallel with 3.1)
  - Research heat rise and load formulas
  - Implement `calculateHeatRise()`
  - Implement `calculateLoad()`
  - Add helper functions for unit conversions
  - Document formulas and assumptions
  - Testing: Unit (100% coverage required)

- [ ] Task 3.3: Add Heat/Load CRUD to Database Client (Simple, 3h, Backend Developer)
  - Dependencies: Task 3.1
  - Add `heatLoadDb` object to `client.ts`
  - Implement createScenario, getScenarios, updateScenario, deleteScenario
  - Add functions for saving/loading inputs
  - Test with real SQLite database
  - Testing: Integration

- [ ] Task 3.4: Build Heat/Load Calculator UI (Medium, 10h, Frontend Developer)
  - Dependencies: Task 3.2, 3.3
  - Create `/heat-load` route
  - Build calculator form with Zod validation
  - Display results with formula breakdown
  - Implement save/load scenarios
  - Add print/export functionality
  - Testing: Component

- [ ] Task 3.5: Test Heat/Load Module (Simple, 3h, Frontend Developer)
  - Dependencies: Task 3.2, 3.3, 3.4
  - Unit test calculation functions (already done in 3.2)
  - Integration test database operations
  - Component test calculator UI
  - Verify calculation accuracy with manual tests
  - Testing: Unit, Integration, Component

### Phase 4: Quoting Module

- [ ] Task 4.1: Create Quoting Database Schema (Simple, 2h, Backend Developer)
  - Design tables: `part_prices`, `quotes`, `quote_items`, `price_history`
  - Create `005_quoting.sql` migration
  - Add foreign keys to Parts Library and BOM
  - Add indexes for price lookup
  - Testing: Integration (migration test)

- [ ] Task 4.2: Add Quoting CRUD to Database Client (Medium, 4h, Backend Developer)
  - Dependencies: Task 4.1
  - Add `quotingDb` object to `client.ts`
  - Implement pricing CRUD operations
  - Implement quote CRUD operations
  - Add price history tracking
  - Add bulk price import function
  - Testing: Integration

- [ ] Task 4.3: Build Pricing Management UI (Medium, 8h, Frontend Developer)
  - Dependencies: Task 4.2
  - Create `/pricing` route
  - Build pricing table with search/filter
  - Implement CSV import for bulk pricing
  - Add price history view
  - Implement price validation
  - Testing: Component

- [ ] Task 4.4: Implement Quote PDF Generation (Complex, 10h, Frontend Developer)
  - Dependencies: Task 4.2
  - Design PDF quote template
  - Install PDF generation library (jsPDF or similar)
  - Implement PDF generation function
  - Add company branding (logo, colors)
  - Handle multi-page quotes
  - Testing: Unit

- [ ] Task 4.5: Build Quote Builder UI (Medium, 10h, Frontend Developer)
  - Dependencies: Task 4.2, 4.4
  - Create `/quotes` route
  - Build quote creation flow from BOM selection
  - Implement markup/discount calculations
  - Add quote preview and edit
  - Implement quote search and management
  - Testing: Component

- [ ] Task 4.6: Test Quoting Module (Medium, 4h, Frontend Developer)
  - Dependencies: Task 4.2, 4.3, 4.5
  - Integration test pricing CRUD
  - Unit test PDF generation
  - Component test pricing UI
  - Component test quote builder
  - Verify pricing calculations
  - Testing: Integration, Unit, Component

### Phase 5: Validation & Hardening

- [ ] Task 5.1: Achieve 80% Test Coverage (Simple, 6h, All Developers)
  - Dependencies: All implementation tasks
  - Run coverage report
  - Identify untested code
  - Write tests for uncovered paths
  - Verify 80%+ coverage
  - Testing: N/A (meta-task)

- [ ] Task 5.2: Performance Optimization (Medium, 4h, Backend Developer)
  - Dependencies: All implementation tasks
  - Profile export operations
  - Optimize slow database queries
  - Add missing indexes
  - Verify <5s export performance
  - Testing: Performance (manual)

- [ ] Task 5.3: Lint and Type Check Fixes (Simple, 2h, All Developers)
  - Dependencies: All implementation tasks
  - Run `npm run lint` and fix all errors
  - Run `tsc -b` and fix all type errors
  - Verify zero critical errors
  - Testing: Lint, Type Check

- [ ] Task 5.4: Update Documentation (Simple, 4h, Technical Writer)
  - Dependencies: All implementation tasks
  - Update README with new features
  - Document testing setup
  - Create user guide for new modules
  - Document API changes
  - Testing: N/A (documentation)

---

## Risk Assessment

### High Risk Items
1. **EPLAN Schema Complexity**: Unknown schema requirements may delay implementation
   - **Mitigation**: Research early, have fallback to CSV export

2. **PDF Generation**: Library limitations or file size issues
   - **Mitigation**: Evaluate multiple libraries, prototype early

3. **Test Coverage Target**: 80% may be difficult with UI code
   - **Mitigation**: Focus on critical paths, accept 70% for UI components

### Medium Risk Items
1. **Performance with Large BOMs**: Export/queries may slow down
   - **Mitigation**: Add pagination, optimize queries

2. **Calculation Accuracy**: Formula errors could have business impact
   - **Mitigation**: 100% unit test coverage, manual verification

### Low Risk Items
1. **Tauri Compatibility**: New Tauri versions may break things
   - **Mitigation**: Pin Tauri version, test upgrades

---

## Success Criteria

### Must Have (P0)
- ✅ All database migrations tested and verified
- ✅ EPLAN export functional with valid XML
- ✅ Heat/Load calculator accurate (verified with manual tests)
- ✅ Quote generation working with PDF output
- ✅ 70%+ test coverage on critical paths

### Should Have (P1)
- ✅ 80%+ overall test coverage
- ✅ Performance targets met (<5s exports)
- ✅ Zero critical lint/type errors
- ✅ User documentation complete

### Could Have (P2)
- ○ E2E tests configured
- ○ Advanced reporting features
- ○ Batch operations for pricing

---

## Definition of Done

A feature is **done** when:
1. Code is merged to main branch
2. Unit tests pass (80%+ coverage)
3. Integration tests pass
4. Manual testing completes successfully
5. Lint and type check pass with zero errors
6. Documentation is updated
7. PR is reviewed and approved

---

## Appendix

### A. Technology Choices
- **Testing**: Vitest (fast, native ESM), Testing Library (standard)
- **PDF**: jsPDF or pdf-lib (evaluate in prototype)
- **XML**: Fast XML Parser or custom template
- **E2E**: Playwright (cross-browser support)

### B. Database Migration Naming
- Follow existing pattern: `NNN_description.sql`
- Next migrations: `004_heat_load.sql`, `005_quoting.sql`

### C. File Structure Additions
```
src/
├── lib/
│   ├── calculations/    # Heat/Load formulas
│   └── export/          # EPLAN export logic
├── pages/
│   ├── heat-load/       # Calculator UI
│   └── quoting/         # Pricing and quotes
tests/
├── unit/
├── integration/
├── component/
└── e2e/
```

---

## Sign-off

**Product Owner**: ________________  **Date**: ________

**Tech Lead**: ________________  **Date**: ________

**QA Lead**: ________________  **Date**: ________
