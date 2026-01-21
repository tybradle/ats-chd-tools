# ATS CHD Tools

## What This Is

Standalone Windows desktop application (Tauri + React) for the ATS Controls Hardware Design team. A platform to host multiple engineering applets/toolsets, with a release-quality "BOM Translation" feature as the initial focus, replacing Excel-based tools.

## Core Value

BOM Translation must work reliably and never crash — engineers trust it with production data.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ BOM translation module with xlsx import and export to upstream format (.zw1) — existing implementation
- ✓ Local SQLite database storage via Tauri plugin-sql — proven data persistence
- ✓ Landing page with module tiles — established UI pattern
- ✓ Parts and Glenair modules exist as placeholders — foundation for future expansion

### Active

<!-- Current scope. Building toward these. -->

- [ ] Implement proper Project → Packages data model (Project = job number, Package = customer-specific name, one Project can have multiple Packages)
- [ ] Build Project Manager modal UI (create/rename/delete/select) that opens immediately when BOM module is accessed
- [ ] Refactor schema from current (project_number + package_name composite) to proper parent-child relationship
- [ ] Polish BOM module UI to professional release quality
- [ ] Implement Settings page as "advanced app settings" (update path, backup/restore options)
- [ ] Add auto-update mechanism checking fixed UNC path for `latest.json` on app launch
- [ ] Build installer handoff flow (download, verify sha256, run NSIS installer, exit app)
- [ ] Implement backup/restore/merge functionality using shareable ZIP archives
- [ ] Achieve crash-free stability for v1 release readiness
- [ ] Show non-ready modules as "Coming soon" tiles on landing page

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Centralized server database — v1 targets offline desktop use; assume per-user local SQLite
- Running as web application with backend server — requires infrastructure beyond v1 scope
- Feature-complete parts library expansion — placeholder only; explicit future work
- Full Glenair module implementation — placeholder only; explicit future work
- Multi-user/collaborative features — single-user desktop app for v1
- Cloud sync or remote data sharing — use ZIP-based manual backup/restore/merge instead

## Context

**Brownfield Project**: Existing codebase has working BOM translation with xlsx import/export and SQLite storage. Landing page and module structure exist. Parts and Glenair modules are placeholders.

**Domain Model Change Required**: Current schema treats BOMProject as a composite of (project_number + package_name). Real-world model is hierarchical:
- Project = job number (e.g., "14403") — unique identifier
- Package = arbitrary name per customer/package (e.g., STN2100, Zone_2_Main, C150)
- A Project can have multiple Packages
- Package names can repeat across different Projects

**User Workflow**: User opens app → selects module from landing page → for BOM module, Project Manager modal appears immediately (no standalone project selection page). User can create, rename, delete, or select projects/packages from this modal.

**Data Management**: Engineers need to transfer and merge BOM data between machines. Solution: backup/restore/merge using ZIP archives that can be shared via email, network drives, or other file transfer methods.

**Update Strategy (v1)**: Option B — network-share installer handoff. App checks fixed UNC path on every launch for `latest.json`. If newer version exists, prompt user → copy installer locally → verify SHA256 → run NSIS installer → exit app. Assumes users have install rights.

## Constraints

- **Tech Stack**: Tauri 2.0 + React 19 + TypeScript 5 + SQLite — established foundation; changes require strong justification
- **Platform**: Windows desktop only — target audience uses Windows corporate environment
- **Network**: Must work offline — UNC path check is optional; core functionality cannot depend on network availability
- **Installation**: NSIS installer — standard for Windows enterprise deployment
- **Update Mechanism**: Network-share (Option B) — no centralized update server for v1
- **Database**: Single local SQLite per user install — no multi-user or server-based access for v1
- **User Rights**: Assume local admin rights for installer — enterprise Windows environment
- **Timeline**: Release-quality BOM Translation feature is v1 goal — stability and polish over additional features

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Update approach = network-share installer handoff (Option B) | No centralized update infrastructure; leverages existing network shares; enterprise-friendly | — Pending |
| Modules shown as tiles with "Coming soon" status | Clear communication about feature availability; manages expectations; allows modular development | — Pending |
| Local SQLite per user for v1 | Simplicity; offline-first; proven technology; avoids server complexity | — Pending |
| Backup format = ZIP with backup/restore/merge support | Portable; shareable via any file transfer; supports data portability between engineers | — Pending |
| Project Manager modal instead of standalone page | Focused UX; keeps user in context; modal pattern established in desktop apps | — Pending |
| NSIS installer | Standard Windows installer technology; corporate deployment familiarity | — Pending |
| Project = job number, Package = customer name | Reflects real-world domain model; enables proper hierarchical data organization | — Pending |
| Settings = "advanced app settings" not role-based admin | Single-user desktop app; no role system needed; avoids permission complexity | — Pending |

---
*Last updated: 2026-01-20 after initialization*
