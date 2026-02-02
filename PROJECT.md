# ATS CHD Tools

ATS CHD Tools is a unified desktop application platform for the ATS CHD department that replaces multiple Excel-based workflows with a single Tauri desktop app.

## Project Summary
- **Purpose**: Unified desktop platform to replace Excel workflows for the ATS CHD department.
- **Milestone**: BOM Translation and Parts Library (Active)
- **Stack**: React 19, TypeScript 5.9, Tauri 2.0, SQLite, TailwindCSS 4, Zustand 5, shadcn/ui.

## Key Facts
- **Memory: Project**: ATS CHD Tools - Unified desktop platform for ATS CHD department to replace Excel workflows.
- **Memory: Stack**: React 19, TypeScript, Tauri 2.0, SQLite (@tauri-apps/plugin-sql), Zustand, TailwindCSS 4, shadcn/ui.
- **Memory: Deployment**: Windows desktop, 100% offline, single-user, ~15-20MB installer.
- **Memory: Modules**: BOM Translation (primary), Parts Library (shared), Load Calculator (active), QR Labeling (future).

- **Memory: Patterns**: All DB queries in `src/lib/db/client.ts`, Zustand for global state, functional components.

## Current State
- [x] Initial project scaffold with Tauri 2.0
- [x] Database schema and migrations (001-005)
- [x] BOM Translation module (Table, Import, Export, Project Management)
- [x] Parts Library module (FTS search, Management)
- [ ] Load Calculator (Sprint 4 Pending)
- [ ] QR Label Generator (Pending)


## Recent Activity
- 2026-02-02: Completed Sprint 3a of Load Calculator (Import Foundation).
- 2025-12-31: Project anchored and initial PROJECT.md created.

