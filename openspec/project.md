# Project Context

## Purpose

ATS CHD Tools is a unified desktop application platform for the ATS CHD department that replaces multiple Excel-based workflows with a single Tauri desktop app. The application runs 100% offline, is single-user, and targets Windows desktop deployment with a ~15-20MB installer.

**Primary Goals:**
- Replace Excel-based BOM Translation workflows with a modern desktop app
- Provide a centralized Parts Library with full-text search
- Enable format translation between CSV, Excel, XML, EPLAN (.zw1), and JSON
- Support offline operation for secure/air-gapped environments

**Target Users:**
- ATS CHD department engineers and technicians
- Single-user desktop deployment (Windows-focused)

## Tech Stack

### Core Technologies
- **Desktop Framework**: Tauri 2.0 (Rust backend, minimal business logic)
- **Frontend Framework**: React 19
- **Language**: TypeScript 5.9
- **Build Tool**: Vite 7.2
- **Styling**: TailwindCSS 4.1
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand 5.0
- **Routing**: React Router 7
- **Forms**: React Hook Form 7.69 + Zod 4.2
- **Tables**: TanStack Table 8.21
- **Database**: SQLite (via @tauri-apps/plugin-sql)
- **Backend**: Rust (2021 edition)

### Key Dependencies
- **Frontend**: @tauri-apps/api, @tauri-apps/plugin-sql, @radix-ui/*, xlsx, lucide-react, sonner
- **Backend**: tauri-plugin-sql, tauri-plugin-dialog, tauri-plugin-fs, serde, serde_json

## Project Conventions

### Code Style

#### Import Organization
- Use `@/` alias for all internal imports (e.g., `@/components/ui/button`)
- **Import Order**: React/Third-party → Internal components → Stores/Hooks → Types → Utils/Styles
- **Type-only imports** for types/interfaces: `import type { ... } from '...'`

#### TypeScript Rules
- **Strict Mode**: Mandatory. No `any`. Use `unknown` if necessary
- **Interfaces vs Types**: Prefer `interface` for object shapes, `type` for unions/aliases
- **Zod**: Use for all runtime validation (database results, form data)

#### React Component Rules
- **Functional only**: No class components
- **Small & Focused**: Extract logic into hooks or smaller sub-components
- **Fast Refresh**: Files should only export components. Constants/helpers go in `lib/` or at the bottom
- **No 'use client'**: Not using Next.js. Standard React 19 patterns

#### Naming Conventions
- **Files**: kebab-case (e.g., `bom-table.tsx`, `root-layout.tsx`)
- **Components**: PascalCase (e.g., `BomTable`, `RootLayout`)
- **Functions/Variables**: camelCase (e.g., `loadItems`, `currentProject`)
- **Constants/Enums**: UPPER_SNAKE_CASE or PascalCase for types
- **Database Tables**: snake_case (e.g., `bom_projects`, `part_pricing`)

### Architecture Patterns

#### Database Access Layer
- **Single Source of Truth**: All queries MUST be in `src/lib/db/client.ts`
- **Parameterized Queries**: Use `?` placeholders. NEVER use string interpolation for SQL
- **Namespace Pattern**: Domain objects exported as functions (e.g., `parts.getAll()`, `bomItems.create()`)
- **Transaction Support**: Use `transaction()` for multi-step operations with rollback

#### State Management
- **Zustand**: For global, cross-page, or complex module state (e.g., BOM builder, Parts catalog)
- **URL Params**: Use for shareable state/navigation (React Router)
- **Local State**: Use `useState`/`useReducer` for ephemeral UI state (modals, form inputs)

#### Component Architecture
- **Page Layer** (`src/pages/`): Route-level components, use Zustand stores
- **Component Layer** (`src/components/`): Reusable UI, domain-specific modules
- **UI Layer** (`src/components/ui/`): shadcn/ui primitives (DO NOT MODIFY)
- **Layout Layer** (`src/components/layout/`): App shell, navigation, global layouts

#### Error Handling
- **Try/Catch**: Wrap all database and async operations
- **User Feedback**: Display errors via `sonner` toasts or inline alerts
- **Logging**: Console log technical errors for debugging in dev
- **Optimistic Updates**: Rollback on failure (e.g., inline edits in BOM table)

### Testing Strategy

**Current Status**: No test suite configured yet.

**Planned Approach**:
- Unit tests for database layer (`src/lib/db/client.ts`)
- Component tests with React Testing Library
- Integration tests for critical workflows (BOM import/export)
- E2E tests for Tauri commands (future)

### Git Workflow

#### Branching Strategy
- `main`: Stable, production-ready code
- Feature branches: `feature/short-description` or `fix/short-description`
- No long-lived branches

#### Commit Conventions
- Conventional Commits recommended: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Examples:
  - `feat(bom): add inline editing to BOM table`
  - `fix(db): resolve migration conflict on bom_items`
  - `refactor(parts): extract FTS search to separate function`

#### Pre-commit Hooks
- ESLint with `--fix` (configured in package.json)
- TypeScript check: `tsc -b` (manual for now)

## Domain Context

### Modules

**1. BOM Translation** (Active - Primary Module)
- Convert BOMs between formats: CSV, Excel, XML, EPLAN (.zw1), JSON
- Project-based organization: project → locations → items
- Inline editing with TanStack Table
- Link to parts catalog (optional) or manual entry
- Import/export with format translation

**2. Parts Library** (Active - Shared Infrastructure)
- Master parts catalog with full-text search (SQLite FTS5)
- Manufacturer and category organization
- Used by BOM module for optional part linkage
- Future: shared by Quoting and Heat/Load modules

**3. QR Label Generator** (Future)
- Generate QR code labels for parts
- Print integration

**4. Quoting Workbook** (Future)
- Cost estimation and quote generation
- Part pricing from `part_pricing` table

**5. Heat/Load Calculator** (Future)
- Electrical heat/load calculations
- Use `part_electrical` table for specs

### Data Models

**Core Entities**:
- `parts`: Master catalog with FTS search, manufacturer/category linkage
- `manufacturers`: Brand/company information
- `categories`: Hierarchical part categories
- `bom_projects`: BOM projects with versioning
- `bom_locations`: Kitting locations within projects
- `bom_items`: Line items with quantity, pricing, metadata
- `settings`: Key-value configuration store

## Important Constraints

### Technical Constraints
- **Single-User**: No authentication, no multi-user support, no row-level security
- **Offline-First**: No network connectivity required, no external APIs
- **Windows-Focused**: Primary deployment target, though Tauri supports cross-platform
- **Installer Size**: Target ~15-20MB for Windows installer (NSIS/MSI)
- **Database**: SQLite with FTS5 (no PostgreSQL/MySQL)

### Business Constraints
- **Department-Specific**: Built for ATS CHD department workflows only
- **Excel Replacement**: Must match or exceed Excel workflow capabilities
- **Data Security**: All data local, no cloud storage, no telemetry

### Regulatory Constraints
- None identified (internal tool, no customer data)

## External Dependencies

### None (Fully Offline)

This is a fully offline desktop application with no external APIs or services.

### File System Integration
- **Tauri Dialog Plugin**: Native file pickers for import/export
- **Tauri FS Plugin**: File read/write for CSV, Excel, XML, JSON
- **No Cloud Services**: All data stored locally in SQLite database

### Third-Party Libraries
- **xlsx**: Excel file parsing/generation (local only)
- **Radix UI**: Headless UI primitives (bundled)
- **Lucide Icons**: Icon set (bundled)
- **Sonner**: Toast notifications (bundled)

### No External Services
- ❌ No authentication providers
- ❌ No cloud storage (AWS S3, Azure Blob, etc.)
- ❌ No analytics/telemetry
- ❌ No API integrations
