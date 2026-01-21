# Feature Research

**Domain:** Engineering BOM translation + PLM ingestion (offline Windows desktop)
**Researched:** 2026-01-20
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a “released” engineering BOM tool. Missing these = the tool is viewed as risky/unusable in production.

| Feature | Why Expected | Complexity | Notes |
|---|---|---:|---|
| **Project/job workspace** (project list, metadata, last run, owner) | Engineering work is organized by job/customer/build; users need repeatability and auditability | MEDIUM | Fits your “Project(job) → Packages” hierarchy requirement. Include status (“WIP/Released”), tags, and recent activity. |
| **Package / run grouping** (input file + mapping + outputs) | Users rerun conversions and need to know “which file produced which output” | MEDIUM | A “package” = a specific import+transform+export attempt; store inputs, mapping template version, and outputs together. |
| **Import from Excel** (xlsx) with sheet selection | Excel is the de facto interchange format for BOMs | LOW–MEDIUM | Must handle varied sheets, headers not on row 1, merged cells, blank lines. |
| **Configurable column mapping** (source → canonical fields) | Every customer/template differs | MEDIUM | Provide mapping templates; allow “save as”, clone, and per-project default mappings. |
| **Deterministic export** to target PLM ingestion format (e.g., .zw1) | Output correctness is core value | MEDIUM | Consistent ordering + stable IDs so diffs are meaningful; generate same output for same input+settings. |
| **Pre-flight validation** (before generating output) | Prevent bad ingestion into PLM/ERP | HIGH | Examples: required fields missing, invalid qty/UoM, duplicate find numbers, invalid hierarchy, illegal chars, invalid part/rev formats. Fail fast with actionable errors. |
| **Interactive error list** with row-level drilldown | Validation without a good UX wastes time | MEDIUM | Errors should reference: sheet, row, column, field, and suggested fix. Provide “export error report” (xlsx/csv). |
| **Preview views**: structured BOM tree + flattened view | Engineers work with both multi-level and flattened structures | MEDIUM | OpenBOM emphasizes multi-level and flattened BOM concepts in training library navigation; your tool can mirror this UX without becoming full PLM. (Source: OpenBOM training library index around “Multi-Level & Flattened BOMs” and “BOM Compare”.) |
| **Search / filter / sort** within a BOM | BOMs are large; users need to find parts quickly | MEDIUM | “Search and filters” are presented as core UX in BOM platforms. (Source: https://www.openbom.com/search-and-analytics)
| **Revision/baseline capture of a released output** | “What did we release?” must be recoverable later | MEDIUM | Even if you don’t implement full ECO workflows: at minimum, snapshot the exact input file hash + mapping template version + output artifacts. (Source context: OpenBOM treats revisions as immutable baselines; see revision/change docs.) |
| **BOM compare (diff)** between two packages/runs | Engineering changes are constant; teams need to see what changed | HIGH | “Compare any two BOMs or two revisions” and highlight differences is a core workflow in BOM tools. (Source: https://help.openbom.com/my-openbom/bom-compare/)
| **Audit trail / run history** (who/when/what changed) | Traceability for quality + debugging | MEDIUM | Minimum: who imported/exported, settings changes, mapping template changes, warnings, file hashes. |
| **Export options** (CSV/XLSX report + attachments bundle) | Other stakeholders need data outside tool; also needed for backup | MEDIUM | OpenBOM positions data export as needed for sharing, integrations, and backup; supports CSV/Excel/PDF and exporting a ZIP incl. attachments. (Source: https://www.openbom.com/data-export)
| **Backup & restore** | Desktop apps + local DB require user-manageable resilience | MEDIUM | See “Backup expectations” below; must be reliable and user-friendly (one-click export + restore wizard). |
| **Update experience** (in-app or managed) | “Released” software must be maintainable | MEDIUM | See “Update expectations” below; at minimum show current version + release notes + update policy. |
| **Safe defaults + settings management** | Users don’t want to learn internals to succeed | MEDIUM | Settings placeholders should become real: default mapping per project, output paths, logging verbosity, validation strictness profile (Strict vs Lenient). |
| **Performance & stability** | This domain is intolerant of crashes | HIGH | Your stated differentiator (“doesn’t crash”) is also table-stakes once the tool is adopted broadly; mitigate with streaming reads, memory caps, and clear cancellation. |

#### Table-stakes: Backup expectations (offline desktop)

| Expectation | Why it matters | Implementation notes | Complexity |
|---|---|---|---:|
| **Human-readable export** (per project/package) | Users need to hand off artifacts to others | Export a ZIP containing: input xlsx, mapping JSON, output .zw1, run log, and a summary report. Aligns with OpenBOM’s “export to ZIP incl attachments” concept. (Source: https://www.openbom.com/data-export) | MEDIUM |
| **Full app backup** (DB + settings) | Recovery from machine loss / corruption | Provide “Backup now” (choose destination) + “Restore backup” wizard; include schema/app version metadata. | MEDIUM |
| **Retention policy** (keep last N / age-based) | Prevent runaway disk usage | Make it configurable; show disk usage per project. | LOW |
| **Integrity checks** | Backups that can’t restore are worse than none | Verify backup contents; on restore, validate schema compatibility and file hashes. | MEDIUM |
| **No silent data loss** | Trust is everything | Always confirm destructive actions (overwrite/restore), keep previous DB copy, and surface failures clearly. | MEDIUM |

#### Table-stakes: Update expectations (Windows desktop)

| Expectation | Why it matters | Implementation notes | Complexity |
|---|---|---|---:|
| **Version + build info** (About screen) | Support needs reproducibility | Show app version, DB schema version, build date, and commit hash (if available). | LOW |
| **Release notes** per version | Users need to trust changes | Link to or embed release notes; show breaking changes and migration notes. | LOW–MEDIUM |
| **Signed updates** | Prevent tampering | Tauri updater requires a signature and states it cannot be disabled. (Source: https://v2.tauri.app/plugin/updater/) | MEDIUM |
| **User-controlled install** (download now / later) | Engineering avoids surprise changes | Allow “notify only” mode; schedule install windows. Note: Tauri updater notes Windows app exits during install due to installer limitation. (Source: https://v2.tauri.app/plugin/updater/) | MEDIUM |
| **Offline-friendly update flow** | Environment may be air-gapped | Support “manual update package” workflow: download on a connected machine, verify signature, apply locally. (Tauri updater supports static JSON endpoints; air-gap may still require a local mirror.) | MEDIUM–HIGH |
| **Rollback story** | Bad releases happen | Prefer side-by-side installers or keep last installer cached; Tauri updater supports custom version comparator logic in Rust for non-default version policies (including potential downgrades) but this should be used cautiously. (Source: https://v2.tauri.app/plugin/updater/) | HIGH |

### Differentiators (Competitive Advantage)

These features aren’t strictly required to be “usable”, but are what make teams prefer your tool over Excel macros, scripts, or PLM-side importers.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **“No surprises” conversion contract** (deterministic + explainable) | Builds trust: the same input always yields the same output and reasoning is visible | HIGH | Show an “explain” view: which rules produced each output field; record in run artifacts for audit. |
| **Golden-template library + per-customer profiles** | Removes repeated setup work | MEDIUM | Bundle known templates (ATS common customers/PLM configs). Provide export/import of templates. |
| **Advanced validation profiles** (Strict / Standard / Lenient + custom rules) | Different jobs have different tolerance | HIGH | Rule engine for checks + transforms. Provide “waive with justification” for specific issues, persisted in audit trail. |
| **Auto-fix suggestions** | Speeds up cleanup | MEDIUM–HIGH | Examples: trim whitespace, normalize UoM casing, coerce numeric strings, detect swapped columns, propose find-number regeneration. Must always show diffs. |
| **BOM compare with semantic matching** | More meaningful diffs than “row changed” | HIGH | OpenBOM supports advanced compare using secondary matching properties (e.g., part number + designator). Your analog: match by part number + refdes + manufacturer PN, etc. (Source: https://help.openbom.com/my-openbom/bom-compare/) |
| **Impact analysis / where-used (within tool scope)** | Helps engineering understand ripple effects between packages | MEDIUM–HIGH | Limited scope: within project/package history. Not full PLM where-used, but “where did we use this part in this job?”. |
| **Offline-first, single-user speed** | Eliminates cloud latency and access issues | MEDIUM | Lean into “100% offline” with fast local search and large BOM handling. |
| **Export “ingestion readiness report”** | Lets downstream teams trust output | MEDIUM | Summarize: validation pass/fail, warnings, counts, duplicates, revisions, generated files, plus checksums. |
| **PLM ingestion safety rails** | Prevents corrupt uploads | HIGH | E.g., lock “released” package to read-only, require explicit “Promote to Released”, generate immutable artifacts. |
| **Support tooling** (diagnostics bundle) | Faster troubleshooting with less back-and-forth | LOW–MEDIUM | One-click “Create support bundle” (logs, config, DB snapshot metadata). |
| **In-tool onboarding** (guided first conversion) | Lowers adoption friction | LOW–MEDIUM | Wizard to create a project, import xlsx, map columns, run validation, export. |

### Anti-Features (Commonly Requested, Often Problematic)

These are features that can look attractive but tend to cause scope creep, reliability regressions, or compliance issues—especially for a single-user offline desktop tool.

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **“Full PLM” inside ATS CHD Tools** (documents, ECO workflows, multi-user, supplier portals) | Stakeholders want “one system” | Huge scope; duplicates existing enterprise systems; increases failure modes | Keep the tool focused on *translation + validation + evidence* and integrate via exports/imports. |
| **Auto-sync to PLM/ERP without user review** | “One click, no thinking” | High risk of bad data ingestion; hard to audit | Require preview + explicit release + export package; later add optional API integration with dry-run + approvals. |
| **Free-form scripting in production UI** | Power users want flexibility | Support/security risk; creates untestable configs | Provide a curated rule engine (safe primitives) + template import/export reviewed by power users. |
| **Opaque “AI auto-map” that changes silently** | Sounds like productivity | Users must trust results; silent changes destroy trust | If using suggestions, always show diff, require approval, and store the final mapping as a versioned artifact. |
| **Mandatory cloud accounts** | Centralization | Conflicts with offline requirement and customer constraints | Keep offline-first; if needed, add optional internal sync later. |
| **Silent auto-update** | “Keep everyone current” | Can break validated workflows; in regulated environments updates must be controlled | Provide controlled update checks and clear release notes; support IT-managed deployment. |

## Feature Dependencies

```
[Project/job workspace]
    └──requires──> [Package/run grouping]
                     ├──requires──> [Import from Excel]
                     ├──requires──> [Configurable column mapping]
                     ├──requires──> [Pre-flight validation]
                     │                 └──enhances──> [Interactive error list]
                     └──requires──> [Deterministic export]

[BOM compare (diff)]
    ├──requires──> [Package/run grouping] (needs two comparable baselines)
    └──enhances──> [Revision/baseline capture]

[Backup & restore]
    ├──requires──> [Export options] (zip/artifact bundling)
    └──conflicts──> [Storing critical data only in transient temp folders]

[Update experience]
    └──enhances──> [Support tooling] (better reproducibility and diagnostics)
```

### Dependency Notes

- **Package/run grouping requires project workspace:** otherwise repeatability and traceability degrade quickly.
- **BOM compare requires “released” baselines:** compare works best when comparing immutable artifacts (not editable in-place objects).
- **Backup depends on having a stable artifact format:** a ZIP bundle of inputs/outputs/logs is both a handoff format and a restore building block.

## MVP Definition

Given you already have a working translation module, the MVP for a “released” tool is primarily about *repeatability, safety rails, and operability*.

### Launch With (v1)

- [ ] Project/job → Packages hierarchy + basic Project Manager modal
- [ ] Package/run grouping with stored inputs/outputs (incl. file hashes)
- [ ] Import xlsx (sheet selection) + mapping templates (save/load)
- [ ] Pre-flight validation + actionable error list (export error report)
- [ ] Preview structured + flattened BOM
- [ ] Deterministic .zw1 export + “ingestion readiness report”
- [ ] Backup now / restore backup (manual) + export bundle ZIP
- [ ] Update basics: About/version screen + “check for updates” policy (even if IT-managed)

### Add After Validation (v1.x)

- [ ] BOM compare between two packages (side-by-side + export diff report)
- [ ] Advanced search/filter UX across projects and BOM contents
- [ ] Validation profiles (Strict/Lenient) + waivers with justification
- [ ] Diagnostics/support bundle generator

### Future Consideration (v2+)

- [ ] Semantic diff matching rules (secondary keys) and impact analysis
- [ ] Guided auto-fix suggestions with approvals
- [ ] Optional PLM API integrations (dry-run + approvals) when/if constraints allow

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Project/job → Packages hierarchy | HIGH | MEDIUM | P1 |
| Pre-flight validation + error UX | HIGH | HIGH | P1 |
| Deterministic export + readiness report | HIGH | MEDIUM | P1 |
| Backup/restore + export bundle | HIGH | MEDIUM | P1 |
| Update experience (controlled) | MEDIUM | MEDIUM | P2 |
| BOM compare (diff) | HIGH | HIGH | P2 |
| Semantic diff + impact analysis | MEDIUM–HIGH | HIGH | P3 |

## Competitor Feature Analysis

| Feature | OpenBOM | Windchill | Our Approach (ATS CHD Tools) |
|---|---|---|---|
| Import from spreadsheets | Explicitly supports Excel/Sheets import (Source: https://www.openbom.com/data-import) | Yes (enterprise PLM typically supports imports; not fully verified here) | Excel-first import with robust mapping templates |
| Revision / change management | Revisions + change requests/orders with approvals (Source: https://help.openbom.com/my-openbom/change-management-and-revision-control/) | Change management emphasized; modern BOM reporting/export (Source: https://www.ptc.com/en/products/windchill/whats-new) | Lightweight baselines for released packages + audit trail (not full ECO) |
| BOM compare | Side-by-side compare and property-level diffs (Source: https://help.openbom.com/my-openbom/bom-compare/) | Likely available; not verified from official docs in this research | Compare between package runs + export diff report |
| Export for sharing/backup | CSV/XLS/PDF + ZIP including attachments (Source: https://www.openbom.com/data-export) | Excel export called out for BOM reporting (Source: https://www.ptc.com/en/products/windchill/whats-new) | ZIP export bundle of artifacts + DB backup/restore |

## Sources

- OpenBOM BOM Compare Service: https://help.openbom.com/my-openbom/bom-compare/
- OpenBOM Change Management and Revision Control: https://help.openbom.com/my-openbom/change-management-and-revision-control/
- OpenBOM Data Import: https://www.openbom.com/data-import
- OpenBOM Data Export (incl. ZIP + backup framing): https://www.openbom.com/data-export
- OpenBOM User-Defined Views: https://www.openbom.com/user-defined-views
- OpenBOM Search and Analytics: https://www.openbom.com/search-and-analytics
- PTC Windchill “What’s New” (BOM reporting + Excel export, UX, traceability): https://www.ptc.com/en/products/windchill/whats-new
- Tauri v2 Updater plugin docs (signed updates; Windows install behavior): https://v2.tauri.app/plugin/updater/

---
*Feature research for: engineering BOM translation/PLM ingestion desktop app*
*Researched: 2026-01-20*
