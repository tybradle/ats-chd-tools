# ROADMAP: ATS CHD Tools (v1)

**Depth:** standard

## Overview

ATS CHD Tools is an offline-first Windows desktop platform (Tauri + React + SQLite) with a release-quality BOM Translation module as the v1 anchor. The roadmap is organized around verifiable user capabilities: project/package scoping, a reliable BOM translation workflow, data portability via ZIP backup/restore/merge, and a managed update flow via UNC installer handoff.

---

## Phase 1 — Project/Package Scoping + Entry UX

**Goal:** Users can organize work by Project (job #) and Package, and reliably enter BOM Translation in the correct context.

**Dependencies:** —

**Requirements:** PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, APP-01

**Plans:** 8 plans (7 complete, 1 gap-closure remaining)

Plans:
- [x] 01-01-PLAN.md — Add SQLite migration for Project(job#) → Packages and preserve scope IDs
- [x] 01-02-PLAN.md — Add DB helpers + types for job projects and packages (real + mock)
- [x] 01-03-PLAN.md — Refactor BOM Zustand store to be package-scope-first
- [x] 01-04-PLAN.md — Landing tiles + BOM routing + blocking modal wiring
- [x] 01-05-PLAN.md — ProjectManagerDialog CRUD UI + inline uniqueness errors + checkpoint
- [x] 01-06-PLAN.md — Gap closure: enforce truly blocking BOM entry modal in all BomPage branches
- [x] 01-07-PLAN.md — Gap closure: fix flushPendingWrites hang so scope switching cannot deadlock
- [ ] 01-08-PLAN.md — Gap closure: human verification of BOM entry gating + scope switching stability

**Success Criteria (observable):**
1. Landing page shows module tiles; non-ready modules are disabled and labeled “Coming soon”.
2. Entering the BOM module immediately prompts a Project Manager modal that the user can use without leaving the BOM context.
3. User can create/select/rename/delete Projects (job number) and Packages; the selected Package becomes the active workspace scope.
4. Package names are enforced as unique within a Project, while the same Package name can exist under different Projects.

---

## Phase 2 — BOM Translation Release Rails (Trust + Repeatability)

**Goal:** Users can run BOM Translation end-to-end with deterministic outputs, actionable validation, and an audit trail.

**Dependencies:** Phase 1

**Requirements:** BOM-01, BOM-02, BOM-03, BOM-04, BOM-05, BOM-06, REL-01

**Success Criteria (observable):**
1. User can import BOM data from `.xlsx` and select a sheet; import failures surface actionable errors (no silent data loss).
2. User can save/load/clone mapping templates and set a per-project default mapping that is applied when starting a run.
3. Before export, the app runs pre-flight validation and shows an actionable error list with row/column references.
4. User can review BOM in structured + flattened previews, search/filter/sort, and edit items prior to export.
5. Exported `.zw1` output is deterministic (same input + same settings => same output) and each run is recorded in history (input hash, mapping version, outputs, timestamp).

---

## Phase 3 — Data Safety: Backup / Restore / Merge

**Goal:** Users can safely move and reconcile data between machines using shareable ZIP archives.

**Dependencies:** Phase 1 (scoping invariants), Phase 2 (run artifacts included in backups)

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04

**Success Criteria (observable):**
1. User can create a shareable ZIP backup that includes a DB snapshot plus settings and a readable metadata manifest.
2. User can restore from a ZIP backup via a guided wizard; restore validates integrity and completes atomically (either fully restored or not changed).
3. User can merge-from-ZIP into an existing database using “merge into existing” semantics and receive a merge report describing what was added/updated.
4. When merge encounters collisions, the user is shown a conflict resolution UI that clearly indicates what won and what was kept.

---

## Phase 4 — Operability: Settings + UNC Updater (Installer Handoff)

**Goal:** Users can configure advanced app settings and keep the app up to date via a safe UNC-based installer handoff.

**Dependencies:** Phase 1

**Requirements:** UPD-01, UPD-02, UPD-03, APP-02

**Success Criteria (observable):**
1. User can open a Settings page that shows About/version info and exposes: update UNC path + auto-check toggle + entry points to backup/restore/merge.
2. On launch, when update checking is enabled, the app checks the configured UNC path for `latest.json` and surfaces availability without hard-failing when offline.
3. When the user accepts an update, the app stages the installer locally, verifies SHA-256, and refuses to proceed on mismatch.
4. Before running the installer, the app verifies the installer’s Authenticode signature; unsigned/invalid installers are blocked with a clear error message.
5. When all checks pass, the app launches the NSIS installer and exits cleanly.

---

## Progress

| Phase | Name | Status |
|------:|------|--------|
| 1 | Project/Package Scoping + Entry UX | In Progress (7/8 plans complete) |
| 2 | BOM Translation Release Rails | Planned |
| 3 | Backup / Restore / Merge | Planned |
| 4 | Settings + UNC Updater | Planned |
