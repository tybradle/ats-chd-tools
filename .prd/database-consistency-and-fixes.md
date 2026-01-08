# Database Consistency and Fixes

## Goals
- Ensure all database tables are correctly initialized in production.
- Improve data quality in the BOM Translation module by using descriptive names instead of IDs.
- Provide a reliable development environment for both Windows and Linux users.

## Problem Statement
Several gaps were identified in the database migration and data handling logic:
1. Missing registration of Migration 003 (Glenair tables).
2. Denormalized `category` storage in BOM items used stringified IDs instead of names.
3. Platform-specific `db:reset` scripts failed on Windows.
4. Brittle SQLite setup in CI.

## Requirements
- Register all migrations in `src-tauri/src/lib.rs`.
- Fetch `category_name` in parts search and catalog views.
- Use `category_name` instead of `category_id` when adding parts to BOM.
- Create a cross-platform database reset script.
- Harden GitHub Actions workflow for database generation.

## Task Breakdown
### Phase 1: Core Fixes
- [x] **Migration Fix**: Register 003_glenair_tables.sql in Rust backend.
- [x] **Schema Join**: Update `client.ts` to join `parts` with `categories`.
- [x] **BOM Logic**: Update `BomTable` to use joined category names.
- [x] **Dev Tool**: Implement `scripts/db-reset.js`.
- [x] **CI/CD**: Refactor `build-windows.yml`.
