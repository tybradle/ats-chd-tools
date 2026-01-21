# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**Developer tooling (GitHub):**
- GitHub - Used for source control authentication in local dev scripts/docs (not an app runtime integration)
  - SDK/Client: Not detected (no Octokit/GitHub API client usage found)
  - Auth: `GITHUB_TOKEN`, `GITHUB_USERNAME` (template in `.env.example`, docs in `docs/DEVELOPMENT_SETUP.md`, usage in `.dev-scripts/git-push.sh`)

**Other external APIs:**
- Not detected (no Stripe/Supabase/AWS/etc. SDK imports found in `src/**/*.ts(x)` during this scan)

## Data Storage

**Databases:**
- SQLite (local, embedded)
  - Connection name/DSN: `sqlite:ats-chd-tools.db`
    - JS client uses `const DB_NAME = "sqlite:ats-chd-tools.db"` in `src/lib/db/real-client.ts`
    - Rust plugin migrations register `add_migrations("sqlite:ats-chd-tools.db", ...)` in `src-tauri/src/lib.rs`
  - Client:
    - JS: `@tauri-apps/plugin-sql` used in `src/lib/db/real-client.ts`
    - Rust: `tauri-plugin-sql` used in `src-tauri/src/lib.rs`
  - Schema management:
    - Migrations: `src-tauri/migrations/001_initial.sql`, `src-tauri/migrations/002_bom_tables.sql`, `src-tauri/migrations/003_glenair_tables.sql`
  - Seed/test data:
    - Generator: `src-tauri/scripts/seed_bom_test_data.cjs` outputs SQL to `src-tauri/scripts/seed_bom_data.sql`
    - Seed files: `src-tauri/scripts/seed_data.sql`, `src-tauri/scripts/seed_bom_data.sql`
  - DB file location:
    - Determined by Tauri app identifier `com.ats.chd-tools` (`src-tauri/tauri.conf.json`)
    - Dev reset script computes OS-specific path in `scripts/db-reset.js`

**File Storage:**
- Local filesystem only
  - Open/read import files:
    - `@tauri-apps/plugin-dialog` open dialog in `src/components/bom/import-dialog.tsx`
    - `@tauri-apps/plugin-fs` `readFile` in `src/components/bom/import-dialog.tsx`
  - Save exported files:
    - `@tauri-apps/plugin-dialog` save dialog in `src/components/bom/export-dialog.tsx`
    - `@tauri-apps/plugin-fs` `writeFile` in `src/components/bom/export-dialog.tsx`
  - Browser fallback (non-Tauri): uses DOM file input + Blob download in `src/components/bom/import-dialog.tsx` and `src/components/bom/export-dialog.tsx`

**Caching:**
- None (no Redis/memcached/service worker cache layer detected)

## Authentication & Identity

**Auth Provider:**
- None for application runtime (single-user offline desktop app; no login flow detected in `src/App.tsx` routes)

**Developer auth:**
- GitHub PAT via environment variables or git credential store (docs in `docs/DEVELOPMENT_SETUP.md`, sample `.env.example`, helper `.dev-scripts/git-push.sh`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Bugsnag/etc. detected)

**Logs:**
- Tauri logging via `tauri-plugin-log`
  - Config: `src-tauri/src/lib.rs`
  - Targets:
    - Stdout: `TargetKind::Stdout`
    - Log directory file: `TargetKind::LogDir` with `file_name: "ats-chd-tools"`

## CI/CD & Deployment

**Hosting:**
- Desktop distribution (Tauri)
  - Bundling targets: `msi` and `nsis` (`src-tauri/tauri.conf.json`)

**CI Pipeline:**
- GitHub Actions
  - Workflow: `.github/workflows/build-windows.yml`
  - Produces artifacts:
    - MSI: `src-tauri/target/release/bundle/msi/*.msi`
    - NSIS: `src-tauri/target/release/bundle/nsis/*.exe`
  - Node version: `20` and Rust stable (`.github/workflows/build-windows.yml`)
  - Also generates a test SQLite DB during CI using SQLite CLI download and runs migrations/seeds (`.github/workflows/build-windows.yml`)

## Environment Configuration

**Required env vars:**
- None required for application runtime detected.

**Optional / dev-only env vars:**
- `GITHUB_TOKEN` (GitHub Personal Access Token) (`.env.example`, `docs/DEVELOPMENT_SETUP.md`, `.dev-scripts/git-push.sh`)
- `GITHUB_USERNAME` (`.env.example`, `docs/DEVELOPMENT_SETUP.md`, `.dev-scripts/git-push.sh`)
- `NODE_ENV` (`.env.example`)

**Secrets location:**
- Dev secrets intended to be stored in `.env` (not committed) via `.env.example` template (`.env.example`, `docs/DEVELOPMENT_SETUP.md`)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-01-20*
