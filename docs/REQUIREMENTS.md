# Requirements: ATS CHD Tools

**Defined:** 2026-01-20
**Core Value:** BOM Translation must work reliably and never crash — engineers trust it with production data.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Project & Package Model

- [x] **PROJ-01**: User can create/select/rename/delete a Project identified by a job number (e.g., "14403").
- [x] **PROJ-02**: A Project can contain multiple Packages.
- [x] **PROJ-03**: Package names can repeat across different Projects.
- [x] **PROJ-04**: Package names are unique within a Project (enforce/validate on create/rename).
- [x] **PROJ-05**: When user enters BOM module, a Project Manager modal opens immediately and supports create/select/rename/delete for Projects and Packages.

### BOM Workflow

- [ ] **BOM-01**: User can import BOM data from `.xlsx` (including selecting sheet).
- [ ] **BOM-02**: User can save/load/clone column mapping templates and set a per-project default mapping.
- [ ] **BOM-03**: System performs pre-flight validation using existing rules and shows an actionable error list with row/column references.
- [ ] **BOM-04**: BOM workspace supports structured + flattened preview, plus search/filter/sort and item editing.
- [ ] **BOM-05**: System exports to existing ingestion format (.zw1) deterministically (same input+settings => same output) with no format changes.
- [ ] **BOM-06**: System records run history / audit trail for each package run (input hash, mapping version, outputs produced, timestamp).

### Data Safety (Backup/Restore/Merge)

- [ ] **DATA-01**: User can create a shareable ZIP backup containing DB snapshot + settings + metadata manifest.
- [ ] **DATA-02**: User can restore from a ZIP backup via wizard; restore is atomic and verified (integrity check).
- [ ] **DATA-03**: User can merge-from-ZIP into an existing database; merge policy is "merge into existing" (not overwrite) and produces a merge report.
- [ ] **DATA-04**: If merge encounters conflicts/collisions, user can resolve via a conflict policy UI (manual resolution) and see what won.

### Updates (Option B UNC installer handoff)

- [ ] **UPD-01**: On every launch, app checks a configured UNC path for `latest.json` and surfaces availability to the user (no hard failure if offline).
- [ ] **UPD-02**: When update is accepted, app stages installer locally, verifies SHA-256, launches NSIS installer, then exits.
- [ ] **UPD-03**: App verifies Authenticode signature for the installer before running (recommended security hardening).

### App Shell / Settings / Release Quality

- [x] **APP-01**: Landing page shows module tiles; non-ready modules are visible but disabled and labeled "Coming soon".
- [ ] **APP-02**: Settings page is implemented as advanced app settings (at minimum: update UNC path + auto-check toggle + backup/restore/merge entry points + About/version).
- [ ] **REL-01**: BOM Translation workflow is crash-free for expected BOM sizes; failures surface actionable errors (no silent data loss).

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Architecture Expansion

- **ARCH-01**: Centralized server database support for multi-user scenarios
- **ARCH-02**: Web app deployment mode with backend server (alternative to desktop-only)
- **DATA-05**: Deeper Parts/Glenair catalog integration and expansion

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Centralized server database (v1) | Desktop-first architecture; local SQLite targets single-user offline use case |
| Web backend server (v1) | Desktop app eliminates server complexity; defer to v2 for multi-user scenarios |
| Multi-user collaboration | Outside v1 scope; local desktop app targets individual engineers |
| Cloud sync / backup | UNC-based updates and local ZIP backups provide sufficient portability without cloud dependency |
| Real-time collaboration features | Desktop-first, single-user focus; real-time sync adds significant complexity |
| Mobile app / tablet support | Windows desktop target only; form factor requires different UX architecture |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | 1 | Complete |
| PROJ-02 | 1 | Complete |
| PROJ-03 | 1 | Complete |
| PROJ-04 | 1 | Complete |
| PROJ-05 | 1 | Complete |
| BOM-01 | 2 | Pending |
| BOM-02 | 2 | Pending |
| BOM-03 | 2 | Pending |
| BOM-04 | 2 | Pending |
| BOM-05 | 2 | Pending |
| BOM-06 | 2 | Pending |
| DATA-01 | 3 | Pending |
| DATA-02 | 3 | Pending |
| DATA-03 | 3 | Pending |
| DATA-04 | 3 | Pending |
| UPD-01 | 4 | Pending |
| UPD-02 | 4 | Pending |
| UPD-03 | 4 | Pending |
| APP-01 | 1 | Complete |
| APP-02 | 4 | Pending |
| REL-01 | 2 | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-20 after initial definition*
