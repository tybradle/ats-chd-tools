# Stack Research

**Domain:** Windows-only offline engineering desktop tool platform (Tauri 2 + React) with **UNC/share-based updater handoff** and **SQLite backup/restore/merge via ZIP**
**Researched:** 2026-01-20
**Confidence:** MEDIUM

This doc focuses on add-ons/patterns required for:

1. **Update distribution via a fixed UNC path** (no HTTPS update server)
2. **SQLite backup/restore/merge packaging (ZIP)** + safe migrations for offline desktop apps

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@tauri-apps/plugin-updater` | **2.9.0** | In-app update workflow (manifest check → download → install) | Even if you can’t host HTTPS, it’s the *best-understood* and most integrated path in Tauri 2. It enforces update signing and provides a standard UX flow. However, because UNC/file endpoints are not a first-class “official” path, we recommend using it only if you can serve `latest.json` over HTTPS (preferred) or accept riskier non-HTTPS modes (see below). |
| `tauri-plugin-updater` (Rust) | **2.9.0** | Backend implementation of updater | Pairs with JS bindings; supports Windows installer handoff and Windows-specific `installMode`. |
| `@tauri-apps/plugin-process` | **2.3.1** | Relaunch after update / lifecycle utilities | Official Tauri plugin used by updater docs for relaunch after install. |
| `@tauri-apps/plugin-fs` | **2.4.5** | File ops (read/copy/temp, etc.) needed for UNC update staging + backup ZIP handling | Keeps filesystem access within Tauri’s permission model; safer than rolling your own Node sidecar. |
| `@tauri-apps/plugin-shell` | **2.3.4** | Launch external processes (NSIS installer, optional signtool) | Needed for “copy installer then run it” update handoff pattern and for optional Authenticode verification. |
| `tauri-plugin-sql` | **2.3.1** | SQL + migrations (as a plugin feature) | You already use `@tauri-apps/plugin-sql`; its official builder supports registering migrations programmatically. Use it to keep schema evolution deterministic across restores/merges. |

### Supporting Libraries (Rust-side)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zip` | **7.2.0** | Create/extract backup archives | For backup/restore packaging of: DB snapshot + metadata manifest + optional attachments. Use with Zip Slip protections (validate normalized paths before extraction). |
| `safe_unzip` | **0.1.6** | Safer ZIP extraction | If you want defense-in-depth against Zip Slip and some zip bomb patterns while extracting user-supplied ZIPs. |
| `sha2` | **0.10.8** | SHA-256 hashing | Use **0.10.8** (stable) to compute and verify SHA-256 of installers and backup archives. (`0.11.x` currently appears as `-rc` on crates.io.) |
| `tempfile` | **3.24.0** | Temp dirs/files | For staging updates/restore operations atomically (download to temp → verify → move into place). |
| `walkdir` | **2.5.0** | Recursively enumerate directory trees | Helpful if you include “attachments” folders in backup ZIPs or need to assemble restore payloads. |
| `thiserror` | **2.0.18** | Structured error handling | Keep backup/restore errors clean and user-displayable. |
| `rusqlite` | **0.38.0** | SQLite backup API + low-level SQLite features (optional) | Only if you implement backup/restore/merge in Rust directly (recommended). Provides access to SQLite backup API (feature `backup`) and serialization helpers. |

---

## Patterns & Decisions (Prescriptive)

### 1) Tauri 2 Windows updates when you cannot host an HTTPS update server

#### What Tauri officially supports (baseline)

The official updater plugin expects **`endpoints` as URLs** and states **“TLS is enforced in production mode”**. It also documents a config flag **`dangerousInsecureTransportProtocol`** to accept non-HTTPS endpoints (explicitly “use with caution”).

Source: Tauri v2 updater plugin docs (last updated 2025-11-28):
- https://v2.tauri.app/plugin/updater/

#### Recommended update approach for your constraints

**Recommendation: implement a “managed installer handoff” updater as a custom Tauri command,** and treat it as a controlled enterprise distribution mechanism.

Why:

1. **UNC paths are not HTTPS** and are a common footgun for update integrity.
2. The official updater plugin is designed around network endpoints and an update JSON schema, and while it has an escape hatch for non-HTTPS (`dangerousInsecureTransportProtocol`), using it for UNC/file distribution is not a proven/happy-path workflow.
3. Your stated workflow already includes **copy installer → verify sha256 → run NSIS**, which is *not* the updater plugin’s normal “download bundle and install” model.

Concretely:

1. **Update feed lives on share** (UNC):
   - `\\server\share\ATS-CHD-Tools\releases\latest.json`
   - `\\server\share\ATS-CHD-Tools\releases\ATS-CHD-Tools-setup-1.2.3.exe`
   - `\\server\share\ATS-CHD-Tools\releases\ATS-CHD-Tools-setup-1.2.3.exe.sha256` (or embed hash in JSON)
2. App startup:
   - Read `latest.json` from UNC (using `@tauri-apps/plugin-fs`) or a Rust command.
   - Compare version.
   - If newer: **copy installer to local temp** (e.g., `%LOCALAPPDATA%\ATS CHD Tools\updates\...`).
   - Verify SHA-256 (Rust `sha2` + constant-time compare).
   - Optional but strong recommendation: verify Authenticode signature (see below).
   - Execute installer with `@tauri-apps/plugin-shell` (likely `/S` for silent or “passive UI”; your UX requirement says “prompt”, so you can do interactive if preferred).

3. After launching installer:
   - Exit app (Windows installer limitation noted even for Tauri’s own updater).

**What to do about signing:**

- Tauri updater **requires its own update signature** for update bundles (cannot be disabled) when using the plugin flow.
- In your custom UNC workflow, your equivalent security control is:
  1) SHA-256 hash validation AND
  2) **Authenticode verification** of the installer EXE (preferred) using Windows APIs (WinVerifyTrust) or `signtool verify`.

Practical stack for Authenticode:

- **Best (MEDIUM confidence):** use Windows API verification via the Rust `windows` crate (`windows = 0.62.2`) and call WinVerifyTrust.
- **Fallback:** ship/require `signtool.exe` and call it via `tauri-plugin-shell`. (This adds toolchain dependency on machines.)

Notes:

- I found Rust crates around Authenticode parsing (`authenticode`, `cross-authenticode`), but they are not the same as “Windows trust chain verification”; treat them as **LOW confidence** unless you validate their coverage.

#### When to use `tauri-plugin-updater` anyway

Use the official updater plugin only if you can satisfy one of these:

1. **Internal HTTPS is possible** (best):
   - Host `latest.json` + artifacts on an internal HTTPS endpoint (IIS, nginx, or even a static file host) with a corporate certificate.
2. **You accept `dangerousInsecureTransportProtocol`** (risky):
   - Only inside a locked-down corporate network share scenario.
   - Still keep update signing keys secure.

If you do use the updater plugin, note:

- It supports both “dynamic update server” and “static JSON file”.
- It has a Windows `installMode` option (`passive`, `basicUi`, `quiet`).

Source: https://v2.tauri.app/plugin/updater/

---

### 2) SQLite backup/restore/merge packaging (ZIP) + schema migrations (offline)

Your environment: local SQLite DB per user, offline, Windows. The main goals are:

- **Backup** (export)
- **Restore** (import)
- **Merge** (combine two backups / incorporate changes)
- **Schema migrations** continue to work safely across backups/restores

#### Recommended “backup format”

**Use a ZIP as an application-level container**, but inside it store:

1. `db.sqlite3` (a consistent snapshot)
2. `manifest.json` (metadata)
3. Optional attachments folder (if you store files outside DB)
4. Optional `integrity.txt` / `checksums.json` containing hashes of included files

Example `manifest.json` fields:

- `app`: name
- `app_version`: semver
- `schema_version`: your migration number
- `created_at`: RFC3339 timestamp
- `db_engine`: `sqlite`
- `sqlite_version`: from `sqlite_version()`
- `user_id`/`machine_id` (if relevant)
- `merge_strategy`: (if exporting deltas; see merge options)

#### Proven backup mechanisms (SQLite official guidance)

SQLite explicitly warns that copying the DB file while a transaction is active can corrupt backups, and lists safe methods:

1. `VACUUM INTO` (creates a compact consistent snapshot)
2. SQLite Backup API (consistent copy; can be incremental)

Source: https://www.sqlite.org/howtocorrupt.html

And `VACUUM INTO` tradeoffs vs Backup API are described in VACUUM docs:

- `VACUUM INTO`: minimal size, purges deleted content; but if interrupted you can get incomplete output.
- Backup API: fewer CPU cycles; can be incremental.

Source: https://sqlite.org/lang_vacuum.html

#### Backup recommendation (for ATS CHD Tools)

**Default backup method: `VACUUM INTO` to a temp file, then ZIP it.**

Why:

- Produces a compact snapshot (smaller ZIP, faster share/email)
- Purges deleted content (good for privacy / “don’t resurrect removed BOM rows”)

Operational pattern:

1. Ensure no write transaction is active (pause app writes / show “Backup in progress”).
2. Run `VACUUM INTO 'C:\...\temp\db.sqlite3'` using your single DB connection.
3. Run `PRAGMA integrity_check` on the produced snapshot file (optional but recommended).
4. Create ZIP with `db.sqlite3` + `manifest.json`.

Fallback backup method (for very large DBs or need progress): use the **Backup API**.

- With Rust: `rusqlite` feature `backup` provides a wrapper around SQLite backup API and supports incremental stepping.
  - Docs: https://docs.rs/rusqlite/0.38.0/rusqlite/backup/index.html

#### Restore recommendation

**Restore is “replace-with-validation”** (not in-place overwrite):

1. Extract ZIP to a temp dir.
2. Validate manifest, schema version, file hashes.
3. Verify `PRAGMA integrity_check` on extracted `db.sqlite3`.
4. Close app DB connections.
5. Move current DB to `db.sqlite3.bak-<timestamp>`.
6. Move extracted DB into place.
7. Run migrations forward (if backup schema is behind current app).

Key point: treat restore as a transactional operation with rollback (if anything fails, put the original DB back).

#### Merge recommendation (be explicit about what “merge” means)

SQLite “merge” is not a single concept. You have three plausible choices:

**Option A (recommended for v1 merge): table-level import with conflict rules**

- Extract other DB to temp.
- Open a single connection to the user’s DB.
- `ATTACH DATABASE 'other.sqlite3' AS other;`
- For each table:
  - Insert missing rows by primary key.
  - For collisions: apply a per-table strategy (e.g., last-write-wins using `updated_at`, or “keep both” by generating new IDs).

Source for `ATTACH` semantics and atomicity caveats across multiple DBs: https://sqlite.org/lang_attach.html

Why this is best for your domain:

- Engineers typically want deterministic rules.
- You can start with a small set of mergeable tables (e.g., user settings, BOM projects) and block others.
- You can surface conflicts as a list to the user.

**Option B (advanced / future): SQLite Session Extension changesets**

- SQLite provides a “session extension” that can record changes into a changeset/patchset and apply them elsewhere with conflict handling.
- This is conceptually closer to VCS “merge”, but requires enabling the extension in your SQLite build.

Source: https://www.sqlite.org/sessionintro.html

This is powerful, but higher complexity and requires you to confirm whether the SQLite library you ship/enables supports it.

**Option C (not recommended): file-level merge / WAL hacking**

- Don’t attempt to merge SQLite files at the filesystem block level.
- Don’t copy `-wal`/`-shm` files around unless you deeply understand the state.

SQLite corruption pitfalls strongly suggest staying within supported mechanisms.

---

## Installation

```bash
# JS (Tauri plugins)
npm install @tauri-apps/plugin-updater@2.9.0 @tauri-apps/plugin-process@2.3.1 \
  @tauri-apps/plugin-fs@2.4.5 @tauri-apps/plugin-shell@2.3.4 @tauri-apps/plugin-sql@2.3.1

# Rust (if implementing backup/merge in backend)
cargo add zip@7.2.0 tempfile@3.24.0 walkdir@2.5.0 thiserror@2.0.18 sha2@0.10.8
cargo add rusqlite@0.38.0 --features bundled,backup
```

Notes:

- `rusqlite` with `bundled` is often preferred for desktop apps to avoid depending on system SQLite versions.
- If you’re already using `@tauri-apps/plugin-sql` and want all SQL centralized per your project rules, keep `VACUUM INTO` and merge SQL in the same central “db client” abstraction.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom UNC updater (copy → sha256 → run NSIS) | `tauri-plugin-updater` with `dangerousInsecureTransportProtocol` | If you accept the risk of non-HTTPS endpoints but want Tauri’s signing + standardized UX. Validate that your endpoint scheme works in production for your exact URL types. |
| `VACUUM INTO` snapshot backups | SQLite Backup API (incremental) | If DBs become large and you need progress reporting, less CPU, or incremental copy behavior. |
| Table-level merge via `ATTACH` + conflict rules | SQLite Session Extension changesets | If you need multi-day “patch exchange” workflows between engineers and can invest in conflict UI + confirming session extension availability. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Copying the `.sqlite3` file directly while the app may be writing | Can produce corrupt backups (mix of old/new pages, missing WAL/journal) | `VACUUM INTO` or SQLite Backup API (officially recommended safe methods) |
| Relying on UNC share integrity without cryptographic verification | Shares can be tampered with; users can be tricked into running replaced installer | Verify SHA-256 + Authenticode signature (and ideally also code-sign the installer) |
| “Merging databases” by mixing WAL/SHM/journal files or diffing binary DB pages | High corruption risk, undefined behavior | Merge at SQL/data level (`ATTACH` + upsert rules) or use Session extension changesets |
| `sha2` **0.11.0-rc.3** in production without review | It’s a release candidate at time of research | Use `sha2 0.10.8` stable unless you specifically need 0.11 features |

---

## Stack Patterns by Variant

**If you can add an internal HTTPS endpoint (even a small IIS static host):**

- Use `tauri-plugin-updater` + static `latest.json`.
- Keep Tauri signing keys secure.
- Prefer this because it matches the intended security model (TLS enforced in production).

**If you must stay UNC-only:**

- Use a custom updater workflow.
- Stage locally, verify hashes and Authenticode, then spawn installer.
- Consider restricting updates to signed, versioned installers only.

**If “merge” means “combine two engineers’ work offline then reconcile”:**

- Phase 1: table-level merge + conflict list.
- Phase 2: consider Session Extension (changesets) if you need true “patch exchange”.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@tauri-apps/plugin-updater@2.9.0` | `tauri-plugin-updater@2.9.0` | Keep JS + Rust plugin versions aligned. |
| `tauri-plugin-sql@2.3.1` | `@tauri-apps/plugin-sql@2.3.1` | Keep versions aligned. Confirm migrations integration approach in your repo’s DB rule set. |
| `rusqlite@0.38.0` | SQLite >= **3.34.1** | rusqlite states base support for SQLite 3.34.1+; use `bundled` for consistent runtime SQLite. |

---

## Sources

- Tauri v2 Updater plugin documentation (TLS enforcement, insecure transport flag, Windows installMode): https://v2.tauri.app/plugin/updater/
- Tauri plugins workspace docs (updater usage snippets, plugin install): https://github.com/tauri-apps/plugins-workspace
- SQLite: safe backup approaches and corruption pitfalls: https://www.sqlite.org/howtocorrupt.html
- SQLite: VACUUM / VACUUM INTO tradeoffs: https://sqlite.org/lang_vacuum.html
- SQLite: Online Backup API: https://www.sqlite.org/backup.html
- SQLite: ATTACH DATABASE semantics + atomicity caveats: https://sqlite.org/lang_attach.html
- SQLite: Session extension overview (changesets/patchsets + conflict handling): https://www.sqlite.org/sessionintro.html
- rusqlite backup module docs (feature `backup`): https://docs.rs/rusqlite/0.38.0/rusqlite/backup/index.html

---
*Stack research for: Windows offline Tauri engineering tool platform (updater + backup/merge)*
*Researched: 2026-01-20*
