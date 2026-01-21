# Architecture Decisions

> **Note**: This document was derived from the archived GSD planning documentation (`.planning-archive-2026-01-21/PROJECT.md`) on 2026-01-21. It captures the foundational architectural decisions that guide the ATS CHD Tools project.

## Core Value

**BOM Translation must work reliably and never crash** — engineers trust it with production data.

## Domain Model

### Project → Packages Relationship

The data model follows a hierarchical structure:

- **Project** = job number (e.g., "14403") — unique identifier
- **Package** = arbitrary name per customer/package (e.g., STN2100, Zone_2_Main, C150)
- A Project can have multiple Packages
- Package names can repeat across different Projects

This replaces the previous composite schema (project_number + package_name) with a proper parent-child relationship.

## Constraints

| Constraint | Details |
|------------|---------|
| **Tech Stack** | Tauri 2.0 + React 19 + TypeScript 5 + SQLite — established foundation; changes require strong justification |
| **Platform** | Windows desktop only — target audience uses Windows corporate environment |
| **Network** | Must work offline — UNC path check is optional; core functionality cannot depend on network availability |
| **Installation** | NSIS installer — standard for Windows enterprise deployment |
| **Update Mechanism** | Network-share (Option B) — no centralized update server for v1 |
| **Database** | Single local SQLite per user install — no multi-user or server-based access for v1 |
| **User Rights** | Assume local admin rights for installer — enterprise Windows environment |
| **Timeline** | Release-quality BOM Translation feature is v1 goal — stability and polish over additional features |

## Key Decisions

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

## Out of Scope (v1 Boundaries)

These items are explicitly excluded from v1 to maintain focus:

- Centralized server database — v1 targets offline desktop use; assume per-user local SQLite
- Running as web application with backend server — requires infrastructure beyond v1 scope
- Feature-complete parts library expansion — placeholder only; explicit future work
- Full Glenair module implementation — placeholder only; explicit future work
- Multi-user/collaborative features — single-user desktop app for v1
- Cloud sync or remote data sharing — use ZIP-based manual backup/restore/merge instead
