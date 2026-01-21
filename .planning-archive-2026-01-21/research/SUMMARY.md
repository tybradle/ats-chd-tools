# Project Research Summary

**Project:** ATS CHD Tools
**Domain:** Offline Windows desktop “engineering applet platform” (Tauri + React) with release-quality BOM Translation, local SQLite, ZIP-based backup/restore/merge, and managed updates via fixed UNC path.
**Researched:** 2026-01-20
**Confidence:** MEDIUM

## Executive Summary

This project is best treated as a **modular monolith (microkernel-style) desktop platform**: a stable shell (routing, navigation, project selection, settings, backup/update services) that hosts modules like **BOM Translation** while enforcing strict cross-cutting boundaries (single DB layer, job runner, audit trail). Experts build these tools by prioritizing **repeatability + operability** first (project/run grouping, validation, artifact baselines, backups, deterministic exports), then layering in higher-order capabilities (diff/compare, merge semantics, richer diagnostics).

Given the constraints (Windows-only, offline-first, no HTTPS update server, local SQLite), the recommended approach is to: (1) standardize the **Project → Package → Run/Artifacts** domain model and “shared DB, partitioned ownership” conventions, (2) harden the BOM workflow around **pre-flight validation + explainable outputs**, and (3) make the app production-operable with a **safe backup/restore contract** and a **custom UNC update handoff** (copy locally → verify hash and preferably Authenticode → run NSIS → exit).

The main risks are **data loss/corruption** (bad backups/restores, schema migrations not integrated with backups) and **update integrity/reliability** (tampered installers, partial reads from SMB/VPN/Wi‑Fi). Mitigation is prescriptive: use SQLite-supported snapshotting (`VACUUM INTO` or Backup API), always validate backups/restores with integrity checks, treat migrations as part of the data contract (pre-migration snapshot + crash-safe migrations), and never execute installers directly from a share (local staging + cryptographic verification).

## Key Findings

### Recommended Stack

The stack stays aligned with the existing Tauri 2 + React 19 + SQLite foundation, but v1 needs additional platform “operability” pieces for updates and backup/restore.

**Core technologies:**
- `@tauri-apps/plugin-fs@2.4.5`: filesystem access for UNC reads + local staging + backup ZIP handling.
- `@tauri-apps/plugin-shell@2.3.4`: launch the NSIS installer during update handoff; optionally invoke signature verification tooling.
- `@tauri-apps/plugin-process@2.3.1`: manage lifecycle/relaunch behavior around update/installer flows.
- `@tauri-apps/plugin-sql@2.3.1`: continue using SQLite with controlled migrations; keep JS+Rust plugin versions aligned.
- Rust libs for backup tooling: `zip@7.2.0`, `tempfile@3.24.0`, `sha2@0.10.8` (+ `rusqlite@0.38.0` w/ `backup` if implementing snapshot/merge in Rust).

**Hard recommendation on updates:** prefer a **custom UNC “installer handoff” updater** over `@tauri-apps/plugin-updater` unless internal HTTPS is available. UNC distribution is not the updater’s happy path; treat update as an enterprise distribution workflow: read feed → copy installer locally → verify hash/signature → execute installer → exit.

### Expected Features

For a “released” BOM translation tool, users expect not just translation, but the surrounding guardrails and evidence.

**Must have (table stakes):**
- **Project/job workspace** and **Package/run grouping** with stored inputs/outputs + file hashes.
- **Import from Excel (xlsx)** with robust sheet/header handling.
- **Configurable column mapping templates** (save/clone/per-project defaults).
- **Pre-flight validation** + **interactive error list** with row/column drilldown and exportable error report.
- **Preview**: structured (multi-level) and flattened BOM views, with search/filter/sort.
- **Deterministic export** to ingestion format (.zw1) plus an “ingestion readiness” report.
- **Audit trail/run history** (who/when/what inputs/settings produced which outputs).
- **Backup & restore** that is reliable (one-click export + restore wizard + verification).
- **Update experience** basics (About/version info + controlled update policy).

**Should have (competitive):**
- Deterministic + **explainable** conversion contract (“why did this output field become X?”).
- Golden templates library + per-customer profiles.
- Validation profiles (Strict/Standard/Lenient) + waivers with justification.
- Diagnostics/support bundle generation.

**Defer (v2+):**
- Semantic BOM diff matching and impact analysis.
- Guided auto-fix suggestions (always with explicit user approval).
- Optional PLM API integrations (dry-run + approvals).

### Architecture Approach

Adopt a **microkernel/modular monolith**: a UI shell and central services that host independent modules through a registry, with a single shared SQLite database and a single DB access layer.

**Major components:**
1. **UI Shell (React Router)** — navigation, landing/dashboard, global dialogs/toasts, project/package guardrails.
2. **Module Registry** — declarative module metadata (routes, nav, capabilities), enabling consistent lazy-loading and “Coming soon” behavior.
3. **Application Services** — cross-cutting workflows (import/translate/validate/export pipelines, job runner/progress, backup/restore/merge orchestration, update orchestration).
4. **Data Access Layer (single source of truth)** — *all parameterized SQL* in one place; migration discipline; transaction helpers.
5. **Tauri (trusted boundary)** — OS integration, file access, update staging/execution, and (optionally) cryptographic/signature verification.

### Critical Pitfalls

1. **“Backup” implemented as a raw DB file copy** — use `VACUUM INTO` or SQLite Backup API; never assume `.db` alone is consistent in WAL mode.
2. **Restore/merge performed while DB is open / transactions active** — implement an explicit DB quiesce step; restore by validate-then-swap with rollback.
3. **Migrations not integrated with backup/restore** — treat migrations as part of the user data contract; pre-migration snapshots + crash-safe/idempotent migrations; block opening “newer-than-binary” DBs.
4. **“Merge” implemented as overwrite or naive import** — define stable IDs and per-table merge policies; merge at SQL/data level (e.g., `ATTACH`) and produce a merge report.
5. **UNC updates executed directly from share / without authenticity** — always copy locally first; verify SHA-256 and preferably Authenticode signature; publish artifacts immutably with atomic pointer switch.

## Implications for Roadmap

Based on combined research, a phase structure that minimizes rewrites and de-risks production rollout:

### Phase 1: Platform & Data Model Foundation (Project → Packages)
**Rationale:** Everything else depends on stable scoping, schema conventions, and a project-first UX.
**Delivers:** Core tables, migration baseline, Project Manager UX, package scoping, module registry conventions.
**Addresses:** Project/job workspace; package/run grouping prerequisites.
**Avoids:** Pitfall #10 (DB ownership drift) and sets up guards against #2 (unsafe restore/DB lifecycle).

### Phase 2: BOM Translation “Release Rails” (Runs, Validation, Deterministic Outputs)
**Rationale:** v1 success is trust; trust comes from validation, repeatability, and explainable artifacts.
**Delivers:** Run artifacts (input hash, mapping version, output bundle), pre-flight validation + error UX, deterministic export + readiness report, audit trail.
**Addresses:** Import/mapping, validation/error list, preview, deterministic export, audit history.
**Avoids:** “silent bad output” failures; creates baselines needed for compare/diff.

### Phase 3: Data Safety (Backup/Restore Contract + Verification + Retention)
**Rationale:** Offline desktop + local SQLite requires first-class recovery; without it, adoption stalls.
**Delivers:** ZIP-based full-app backup and restore wizard, integrity verification (`quick_check`/`integrity_check` after restore), retention policy, rollback points.
**Uses:** SQLite `VACUUM INTO` (default) and/or Backup API; temp staging; ZIP Slip safe extraction.
**Avoids:** Pitfalls #1, #2, #5, #6.

### Phase 4: Managed Updates via UNC (Installer Handoff)
**Rationale:** Your v1 distribution constraint (no HTTPS server) makes update reliability and trust the hard part.
**Delivers:** UNC feed reader, local staging cache, hash verification, installer execution flow, user messaging/backoff, release notes surfacing.
**Addresses:** Update expectations (About/version, controlled update policy).
**Avoids:** Pitfalls #7, #8, #9.

### Phase 5: Compare & Baselines (Evidence, Diffs, Release Controls)
**Rationale:** Engineering change is constant; compare is a core workflow once runs/baselines exist.
**Delivers:** Released baselines, BOM compare between packages/runs, exportable diff report.
**Addresses:** BOM compare, revision/baseline capture.
**Avoids:** “compare editable state” confusion by relying on immutable artifacts.

### Phase 6: Merge Semantics (Domain-Level Merge + Conflict UX)
**Rationale:** Merge is high-risk and should only be built once schema + invariants stabilize.
**Delivers:** Merge sessions, per-module merge handlers, conflict reporting, deterministic per-table merge policies.
**Addresses:** Backup/restore/merge portability requirement.
**Avoids:** Pitfall #4 (overwrite masquerading as merge) and reduces duplicate/data-loss support burden.

### Phase Ordering Rationale

- **Foundation first:** Project/Package scoping and DB conventions are prerequisites for reliable artifacts, backups, and merge.
- **Trust rails next:** validation + deterministic outputs are the product’s credibility.
- **Operability before power features:** backup/restore and updates prevent “production-only” failures.
- **Diff before merge:** compare/baselines creates the vocabulary users need to understand merge consequences.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (UNC updater hardening):** Authenticode verification approach (WinVerifyTrust via Rust `windows` crate vs `signtool` dependency), atomic publishing on SMB, and UAC/install-rights edge cases.
- **Phase 6 (Merge semantics):** stable ID strategy, per-table conflict policy, deletion/tombstone strategy, and whether SQLite Session Extension changesets are feasible/needed.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Project/Package model + module registry):** well-trodden modular monolith patterns; internal conventions matter more than external research.
- **Phase 3 (Backup/restore snapshot + verification):** SQLite official docs provide clear guidance; main work is careful implementation and testing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Updater on UNC is a non-happy-path; backup guidance is strong (SQLite docs), but Windows signature verification details need validation in repo context. |
| Features | MEDIUM | Feature set aligns with established BOM tools (OpenBOM) but competitor coverage is partial; needs user validation for ATS workflows. |
| Architecture | MEDIUM | Patterns are standard and align with existing codebase constraints, but exact module boundaries and job runner details depend on current implementation. |
| Pitfalls | HIGH | SQLite corruption/backup hazards and update-from-share risks are well-known and backed by official SQLite/Tauri documentation. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Authenticode verification implementation choice:** validate feasibility (Rust `windows` crate WinVerifyTrust) and UX/error messaging for unsigned/invalid installers.
- **Definition of “merge” for ATS users:** confirm whether v1 needs true two-way merge or only “import another machine’s work”; this decision changes schema (IDs/tombstones) and UI complexity.
- **Excel import edge cases/performance:** ensure large BOMs and messy spreadsheets don’t cause crashes; may require streaming/limits and robust header detection.
- **Distribution constraints:** confirm installer privilege assumptions (per-user vs per-machine installs) and decide canonical data directory policy to prevent “lost projects after update”.

## Sources

### Primary (HIGH confidence)
- SQLite: safe backup approaches + corruption pitfalls — https://www.sqlite.org/howtocorrupt.html
- SQLite: Online Backup API — https://www.sqlite.org/backup.html
- SQLite: VACUUM / VACUUM INTO tradeoffs — https://sqlite.org/lang_vacuum.html
- SQLite: ATTACH semantics + atomicity caveats — https://sqlite.org/lang_attach.html
- SQLite: Session extension overview (changesets/patchsets) — https://www.sqlite.org/sessionintro.html

### Secondary (MEDIUM confidence)
- Tauri v2 updater plugin docs (TLS enforcement, insecure transport flag, signed artifacts, Windows installer behavior) — https://v2.tauri.app/plugin/updater/
- OpenBOM: data import/export + compare/change management pages used to triangulate expectations —
  - https://www.openbom.com/data-import
  - https://www.openbom.com/data-export
  - https://help.openbom.com/my-openbom/bom-compare/
  - https://help.openbom.com/my-openbom/change-management-and-revision-control/

### Tertiary (LOW confidence)
- Authenticode verification via Rust crates other than WinVerifyTrust (needs validation against Windows trust chain behavior).

---
*Research completed: 2026-01-20*
*Ready for roadmap: yes*
