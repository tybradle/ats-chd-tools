# Project Decisions

This file is a human-readable mirror of the project memory database.

### Manual Verification of Audit Log
- **ID**: `6decbfd7-8d8f-4fd6-a286-6dbf5ded4cc1`
- **Date**: 2026-01-07
- **Agent**: system
- **Rationale**: Verifying the newly implemented visibility features via direct DB access because MCP tool is currently unresponsive.
- **Tags**: manual, verification

---

### Use Tauri 2.0 as the desktop framework for Windows deployment.
- **ID**: `cf4cd0f8-d7fe-4713-bd5f-1ed5bc3ca14e`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Tauri provides a small binary footprint (~15-20MB target) and leverages native webviews, fitting the requirement for a lightweight desktop app.
- **Tags**: architecture, desktop

---

### Use SQLite via @tauri-apps/plugin-sql as the primary data store.
- **ID**: `2524c0b6-2079-4dd3-9323-b3ca1835a293`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Provides a robust, offline-first, local relational database that is easy to manage via migrations and centralized access patterns.
- **Tags**: database, offline-first

---

### Centralize all database access in src/lib/db/client.ts.
- **ID**: `b1aaa02d-ad19-4a0f-a825-3b03318e7178`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Ensures a single point of failure/maintenance for queries, prevents direct SQL leakage into components, and maintains type safety.
- **Tags**: architecture, database

---

### Use React 19 and Zustand for the frontend layer.
- **ID**: `b303d540-c970-41f0-9eb7-4d56ad9b2712`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: React 19 provides modern component patterns; Zustand offers a lightweight, performant global state management solution without the boilerplate of Redux.
- **Tags**: frontend, state-management

---

### Use TailwindCSS 4 and shadcn/ui for styling and components.
- **ID**: `228a38c9-ed05-4c8a-aa24-ec4db445aa8b`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Accelerates UI development with consistent design tokens and accessible component primitives.
- **Tags**: ui, styling

---

### Implement a multi-layered testing strategy including Unit (Vitest), Integration (SQLite), and Component (React Testing Library) tests.
- **ID**: `76ea0f03-8594-430a-9655-d2bd5ef72b6d`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Ensures reliability of complex engineering calculations and prevents regressions in core BOM translation logic.
- **Tags**: testing, quality

---

### Use single-pass Excel parsing and non-blocking state updates for BOM import.
- **ID**: `601c7194-0b26-40ea-a382-f51401212a68`
- **Date**: 2026-01-07
- **Agent**: builder
- **Rationale**: Current implementation reads the same file multiple times and blocks the main thread, causing UI lockups without feedback. Reusing the WorkBook object and using setTimeout(..., 0) allows React to render a loading state before the CPU-heavy parsing begins.
- **File**: bom-import-optimization.md
- **Tags**: performance, ux, bom-translation

---

### Register 003_glenair_tables.sql in Rust backend and join categories in parts queries.
- **ID**: `349c5d19-cbee-4102-997e-4acd0dba50db`
- **Date**: 2026-01-08
- **Agent**: builder
- **Rationale**: The Glenair tables were missing from the production migration list, causing runtime errors. Joining categories provides human-readable data in the BOM module without stringifying internal IDs.
- **File**: DATABASE.md?
- **Tags**: database, rust, consistency

---

