# Pitfalls Research

**Domain:** Offline Windows desktop app with local SQLite + backup/restore/merge + update distribution via network share (NSIS)
**Researched:** 2026-01-20
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: “Backup” is a raw file copy of the `.db`

**What goes wrong:**
Developers copy only the main SQLite database file while the app is running (or copy only `app.db` and miss sidecar files). Backups end up inconsistent (missing committed transactions) or can restore into corruption.

**Why it happens:**
SQLite *looks* like a single-file DB, so it’s tempting to treat it like any other file. WAL mode adds `-wal` and `-shm` files, and copying without coordination can miss required state.

**How to avoid:**
- Prefer SQLite-supported backup mechanisms:
  - **SQLite Backup API** (`sqlite3_backup_*`) for “live” backups.
  - **`VACUUM INTO 'file'`** to create a consistent snapshot copy (also compacts).
- If you must do a raw file copy, only do it when **all DB connections are closed** and no transaction is active.
- If WAL is enabled, never assume the `.db` alone contains all committed changes.

**Warning signs:**
- Support reports like “my backup restored but the last day of data is missing.”
- Intermittent corruption after restore, especially if users back up while the app is open.
- You see backups implemented as `fs.copyFile(dbPath, backupPath)` (or similar) with no coordination.

**Phase to address:**
Data safety foundation (backup/restore design) + migration framework.

---

### Pitfall 2: Backup/restore performed while a transaction is active (or DB still open)

**What goes wrong:**
Restores or replaces the DB file while the application still has an open SQLite handle (or while a transaction is running). This can lead to OS-level sharing violations, silent partial writes, or corrupted hot journals / WAL state.

**Why it happens:**
It’s easy to wire “Restore…” UI to file operations without first putting the database subsystem into a quiescent state.

**How to avoid:**
- Implement an explicit **“DB quiesce”** step for backup/restore/merge:
  - stop background jobs
  - close all DB connections
  - verify no active transactions
- Restore to a *new file path*, validate it, then swap in.
- After restore, run integrity checks (`PRAGMA integrity_check`) and store the result in logs.

**Warning signs:**
- “The restore completed but app won’t start” / “database disk image is malformed.”
- In logs: `SQLITE_BUSY`, `SQLITE_LOCKED`, “database is locked” around backup/restore.
- Restore feature sometimes works only after reboot (because a process still has the file locked).

**Phase to address:**
Data safety foundation (transaction & connection lifecycle) + recovery flows.

---

### Pitfall 3: Migrations aren’t treated as part of the backup/restore contract

**What goes wrong:**
- Upgrade runs migrations, then users restore an “old” backup and the app immediately auto-migrates it again — sometimes incorrectly.
- Restore/merge imports data into a schema version the code no longer supports.
- Migrations are not idempotent, so retrying after a crash breaks.

**Why it happens:**
Teams treat schema migration as “dev-only evolution” rather than a user-facing data contract that interacts with backup, restore, and rollback.

**How to avoid:**
- Introduce explicit **schema versioning** and **migration journal**:
  - store `schema_version` (or `user_version`) and applied migration IDs
  - record `app_version`, migration timestamps, and failure reasons
- Make migrations:
  - **idempotent** where possible
  - designed to be crash-safe (transactional)
  - capable of being **re-run safely**
- Before applying migrations:
  - perform a **pre-migration snapshot backup**
  - ensure adequate disk space (VACUUM/rewrites can be large)
- Decide policy up front:
  - **no downgrade support** (common) → clearly block opening DBs newer than the binary
  - or provide explicit downgrade strategy (harder)

**Warning signs:**
- “Works on clean install, fails on upgraded machine.”
- Users stuck in a migration loop (“Applying migration 012…” every launch).
- Migrations contain destructive changes without a compatibility plan (drop columns/tables, re-key IDs).

**Phase to address:**
Schema migrations + backup integration phase.

---

### Pitfall 4: Restore/merge is implemented as “replace the whole DB” (no merge semantics)

**What goes wrong:**
When “merge” is required (e.g., reconcile two offline copies), the system instead:
- replaces the DB wholesale (data loss), or
- imports naïvely causing PK collisions and duplicated logical entities.

**Why it happens:**
SQLite makes copy/replace easy, while correct merge semantics require domain rules: identity, conflict resolution, and deletion handling.

**How to avoid:**
- Treat merge as a domain feature, not a DB trick:
  - define stable IDs (UUIDs) vs auto-increment ints
  - design per-table merge policies (append-only, last-write-wins, manual resolution, forbidden)
  - track tombstones for deletions (or have explicit “deleted_at”)
- Consider a **change journal** table (append-only event log) to support deterministic merges.
- Implement merge as:
  1) attach/import into staging tables
  2) validate
  3) apply merge transactionally
  4) produce a merge report

**Warning signs:**
- “Merge” UI exists but is actually “Import backup → overwrite”.
- Merge produces duplicates (same part/project appears twice).
- Users resort to “export to Excel, re-import manually.”

**Phase to address:**
Backup/restore/merge phase (domain-level merge design).

---

### Pitfall 5: No integrity verification after backup/restore/merge

**What goes wrong:**
Corrupt or incomplete backups are accepted as “successful” and only fail later (when it’s too late and users have overwritten good state).

**Why it happens:**
“Backup succeeded” is implemented as “file copied / command returned 0” rather than “backup validated.”

**How to avoid:**
- After creating a backup:
  - open it read-only
  - run `PRAGMA quick_check` (or `integrity_check` if acceptable)
  - verify expected tables and schema version
- After restore/merge:
  - run integrity check
  - run domain invariants (e.g., foreign keys, required records)
  - show a human-readable result + log details

**Warning signs:**
- Backups are just files in a folder; there’s no metadata or verification status.
- Restore failures are discovered only on next launch.

**Phase to address:**
Data safety foundation (verification & observability).

---

### Pitfall 6: Backups grow unbounded / unexpected disk usage (WAL, vacuum, large journals)

**What goes wrong:**
Users run out of disk space due to:
- keeping too many backups,
- WAL/shm growth,
- vacuum/backup operations temporarily needing 2× space,
- giant rollback journal remnants.

**Why it happens:**
SQLite file-size dynamics are non-obvious (WAL isn’t truncated by default; vacuum rewrites).

**How to avoid:**
- Define and enforce a **retention policy** (count and/or total size) for backups.
- Surface disk space checks before operations that rewrite/copy.
- If using WAL:
  - configure checkpoint behavior appropriately
  - provide a maintenance action (checkpoint/truncate / optimize) when needed

**Warning signs:**
- “App slowed down over time” + `-wal` file is huge.
- Support tickets: “backup failed” with vague I/O errors.
- Users report the app “fills the C: drive” after months.

**Phase to address:**
Backup/maintenance phase + operational UX.

---

### Pitfall 7: Update distribution from a network share is treated like “download from the internet”

**What goes wrong:**
The app runs an installer directly from `\\server\share\...` (or reads metadata from the share) and hits:
- partial reads during copy (user’s VPN drops, Wi‑Fi roams)
- file locking issues while an admin is updating the share
- permissions/UAC issues running installers from UNC paths
- path quoting issues if share folder names contain spaces

**Why it happens:**
Teams assume SMB shares are “reliable like a local disk.” They’re not: transient connectivity and concurrent modifications are normal.

**How to avoid:**
- Always **copy update artifacts locally first** (e.g., `%LOCALAPPDATA%\ATS-CHD-Tools\updates\…`) and run them from local disk.
- Use an **atomic publish** pattern on the share:
  - upload installer to a temp name
  - validate hash/signature
  - rename into place
  - only then update “latest.json/version.txt” pointer
- Add robust verification before executing:
  - verify file size + hash
  - optionally require code-signing / signature verification
- Implement backoff and clear user messaging when share is unavailable.

**Warning signs:**
- Users report “installer corrupted” / “NSIS error” intermittently.
- Updates work on Ethernet but fail on Wi‑Fi/VPN.
- “It works for some users but not others” correlating with permissions to the share.

**Phase to address:**
Update distribution phase (artifact publishing + client updater).

---

### Pitfall 8: No authenticity guarantees for updates (trusting a writable share)

**What goes wrong:**
If the update share is writable by too many people (or compromised), an attacker (or accident) can replace the installer and the app will happily execute it.

**Why it happens:**
Offline/internal distribution often relaxes security assumptions.

**How to avoid:**
- Require **signed update artifacts** and verify signatures before launch.
- Restrict share write permissions to the release pipeline/admins only.
- Consider using Tauri’s updater signing model even if you don’t use its HTTP flow (the key idea: *verify before install*).

**Warning signs:**
- “Anyone in Engineering can drop a new installer on the share.”
- Update execution is triggered solely by “file exists at path.”

**Phase to address:**
Update distribution phase (signing, permissions, verification).

---

### Pitfall 9: App updates can clobber or orphan user data paths

**What goes wrong:**
Installer upgrades:
- change the app data directory conventions
- change DB location
- reset config accidentally
- create “two apps” (per-user vs per-machine installs) with different DBs

**Why it happens:**
NSIS/MSI install location and Windows user profiles are full of edge cases; “just put the DB next to the exe” works until it doesn’t.

**How to avoid:**
- Define a single canonical **data directory policy** (per-user vs per-machine) and never move silently.
- If a move is required, implement explicit migration with backups.
- Keep DB outside install directory (installer should be replaceable without touching data).

**Warning signs:**
- After update: “My projects are gone.”
- Multiple `app.db` files discovered in different folders.
- Users needing admin rights for routine DB writes (data stored under Program Files).

**Phase to address:**
Update distribution + installer hardening phase.

---

### Pitfall 10: Multi-package refactor breaks migrations/DB access contract (hidden coupling)

**What goes wrong:**
During a “multi-package-per-project” / monorepo refactor:
- more than one package starts issuing SQL migrations or ad-hoc queries
- DB schema ownership becomes unclear
- duplicated “db client” implementations drift
- bundling/import paths change and runtime can’t find migrations

**Why it happens:**
Repo structure refactors are treated as mechanical (moving folders) rather than redesigning boundaries and ownership.

**How to avoid:**
- Enforce a single “DB package” (or module) as the *only* SQL entrypoint.
- Make migrations location explicit and versioned; treat it as a public contract.
- Add build-time checks/tests:
  - only one module exports migration runner
  - no raw SQL outside the DB layer
- Avoid circular dependencies by designing “types-only” packages vs “runtime” packages.

**Warning signs:**
- Two teams add migrations in different folders.
- New code bypasses the DB client “just for this one query.”
- CI/build starts failing with path alias issues or duplicate bundling.

**Phase to address:**
Repo architecture refactor phase (package boundaries + enforcement).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Backups as plain file copy | Fast to implement | Corrupt/incomplete backups (esp. WAL), hard-to-debug data loss | Never (unless DB is guaranteed closed) |
| “Merge” implemented as “overwrite with newer file” | Very simple UX | Data loss; no auditability | Only if product explicitly forbids multi-source merges |
| Migrations run automatically with no pre-backup | Smooth upgrades | Irrecoverable user data loss if migration bug | Never (for production user data) |
| Update check trusts a single `latest.txt` on share | Simple | Race/partial reads → bricked updates | MVP only, if paired with robust local verification |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SMB/network share | Run installer directly from `\\server\share\...` | Copy locally, verify hash/signature, run local installer |
| SMB/network share | Overwrite “latest” in-place | Publish immutably + atomic pointer switch |
| Windows Installer/UAC | Assume elevated install always possible | Detect permissions, give clear instructions, support per-user install if allowed |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Never checkpoint/truncate WAL | Disk usage climbs; startup slows | Configure checkpointing; provide maintenance action | After weeks/months of steady use |
| Full `integrity_check` on every launch | Launch time becomes long | Use `quick_check` routinely; full check only after restore/merge | Larger DBs / older PCs |
| VACUUM as a routine “cleanup” | Huge I/O spikes; needs lots of free space | Use `PRAGMA optimize`; vacuum only when justified | As DB grows; on HDDs |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing installers from a writable share without verifying signatures | RCE via replaced installer | Signed artifacts + verification + tight share ACLs |
| Backups stored in world-readable locations | Sensitive info disclosure | Store under user profile; optional encryption; document handling |
| Logging raw SQL / data during failures | Data leakage in logs | Redact, log metadata only |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| “Backup succeeded” without verification | False confidence, data loss | Show verified status + date/schema version + restore test option |
| Restore is irreversible | Fear of trying; risk of overwriting good DB | Always create a restore-point before restore; allow undo |
| Update prompt on every launch with flaky share | Alert fatigue, users ignore updates | Backoff, suppress prompts when share unreachable, show last check |

## "Looks Done But Isn't" Checklist

- [ ] **Backups:** Not just “file exists” — verify by opening backup and running `PRAGMA quick_check`.
- [ ] **WAL mode:** Not just “copy app.db” — ensure backup mechanism captures a consistent snapshot.
- [ ] **Restore:** Not just “replace file” — must quiesce DB connections and validate restored DB.
- [ ] **Migrations:** Not just “runs on dev” — must be crash-safe, logged, and preceded by a snapshot.
- [ ] **Update from share:** Not just “installer path” — must copy locally + verify integrity/authenticity.
- [ ] **Multi-package refactor:** Not just “build passes” — enforce single DB access/migrations owner.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corrupt backup accepted as success | HIGH | Stop writes, locate last known good backup, restore to new path, run integrity check, re-import any exports/logs |
| Migration bug corrupts user DB | HIGH | Restore pre-migration snapshot, ship hotfix migration, provide guided recovery playbook |
| Update installer partially copied | MEDIUM | Clear local update cache, re-copy with hash verification, retry; add publish atomicity on share |
| Merge created duplicates | MEDIUM | Provide merge report, implement dedupe tooling, add unique constraints and id policy |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Backups as raw file copy | Phase: Data safety foundation | Unit/integration test: take backup during writes and restore successfully; verify `quick_check` passes |
| Backup/restore while DB open | Phase: Data safety foundation | E2E test: restore while app running is blocked; restore workflow quiesces DB |
| Migrations not integrated with backup | Phase: Migrations + recovery | Test upgrade from N-2 versions with automatic pre-backup; forced crash mid-migration recovers |
| No true merge semantics | Phase: Backup/restore/merge | Merge test fixtures with conflicts; verify deterministic resolution + audit report |
| No integrity verification | Phase: Data safety foundation | Backups stored with verification metadata; restore refuses invalid backups |
| Disk usage traps | Phase: Maintenance & ops UX | Monitor backup retention; WAL size alerts; disk-space preflight checks |
| Network share update unreliability | Phase: Update distribution | Simulate partial copy / network drop; updater retries and verifies hash before execute |
| Update authenticity gaps | Phase: Update distribution | Installer/signature verification test; share ACL review checklist |
| Data path clobbered by updates | Phase: Installer hardening | Upgrade test preserves DB/config; no new DB created; path invariants asserted |
| Multi-package refactor breaks DB ownership | Phase: Repo refactor | Static check: no SQL outside DB layer; single migration runner; dependency graph no cycles |

## Sources

HIGH confidence (official SQLite docs):
- SQLite Backup API: https://www.sqlite.org/backup.html
- VACUUM / VACUUM INTO (snapshot copy notes, crash interruption warning): https://sqlite.org/lang_vacuum.html
- File locking / network filesystem warnings: https://sqlite.org/lockingv3.html
- How SQLite DB files get corrupted (backup/restore + locking pitfalls): https://www.sqlite.org/howtocorrupt.html

MEDIUM confidence (official framework docs relevant to signed updater artifacts):
- Tauri v2 updater plugin (signed artifacts + update metadata validation): https://v2.tauri.app/plugin/updater/

---
*Pitfalls research for: ATS CHD Tools (offline Windows + SQLite + network share updates)*
*Researched: 2026-01-20*
