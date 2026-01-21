# STATE: ATS CHD Tools

## Project Reference

**Core value:** BOM Translation must work reliably and never crash — engineers trust it with production data.

**Constraints (non-negotiable):** Windows desktop only; offline-first; local SQLite per user; NSIS installer; update mechanism is UNC installer handoff (Option B).

## Current Position

**Current milestone:** v1

**Phase:** 1 — Project/Package Scoping + Entry UX

**Plan:** 7 of 8 plans complete

**Status:** Phase 1 in progress

**Progress:** [███░] 1/4 phases started (Phase 1: 7/8 plans complete)

## Performance Metrics (v1)

- Crash-free BOM translation for expected BOM sizes (REL-01)
- Deterministic `.zw1` export contract (BOM-05)
- Data portability with verified restore/merge (DATA-01..04)
- Update integrity: local staging + SHA-256 + Authenticode verification (UPD-02..03)

## Accumulated Context

### Decisions

- Update approach = network-share installer handoff (Option B): check `latest.json` on UNC, stage locally, verify, run NSIS, exit.
- Project/Package domain model is hierarchical: Project(job #) → Packages(customer/package names).
- Settings are “advanced app settings” (no role-based admin).

### Known Risks / Watchouts

- Backup/restore must not be a naive DB file copy; requires snapshot + integrity verification.
- Merge semantics are high-risk; must produce a merge report and support conflict resolution.
- UNC update reliability/integrity must handle offline/partial reads and block unsigned or tampered installers.

### Open Questions

- Define “expected BOM sizes” for REL-01 (row counts, typical column complexity, worst-case files).

## Session Continuity

- Last session: 2026-01-21T15:17:51Z
- Stopped at: Completed 01-06-PLAN.md (BOM entry gating enforcement)
- Resume file: None
- Next action: Execute 01-07-PLAN.md (scope switching reliability fix) or continue with remaining Phase 1 plans
