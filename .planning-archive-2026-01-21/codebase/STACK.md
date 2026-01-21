# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- TypeScript - Frontend app code in `src/**/*.ts` and `src/**/*.tsx`

**Secondary:**
- Rust (edition 2021; rust-version 1.77.2) - Tauri backend wrapper and native plugins in `src-tauri/src/**/*.rs` and `src-tauri/Cargo.toml`
- SQL (SQLite dialect) - Migrations in `src-tauri/migrations/*.sql` and seed scripts in `src-tauri/scripts/*.sql`
- JavaScript (Node CJS) - Dev/ops scripts in `scripts/*.js`, `scripts/*.cjs`, and `src-tauri/scripts/*.cjs`

## Runtime

**Environment:**
- Node.js - Used for dev/build tooling via Vite and project scripts (see `package.json`)
- Rust toolchain - Used for Tauri build/runtime (see `src-tauri/Cargo.toml`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React `^19.2.0` - UI framework (`src/main.tsx`, `src/App.tsx`)
- React Router DOM `^7.11.0` - Client-side routing (`src/App.tsx`)
- Tauri `2.9.x` - Desktop wrapper (`src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`)

**Testing:**
- Not detected (no `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or test file patterns found in this scan)

**Build/Dev:**
- Vite `^7.2.4` - Dev server and bundler (`vite.config.ts`, `package.json` scripts)
- TypeScript `~5.9.3` - Typechecking/build (`tsconfig.json`, `tsconfig.app.json`, `package.json`)
- ESLint `^9.39.1` - Linting (`eslint.config.js`, `npm run lint`)

## Key Dependencies

**Critical:**
- `@tauri-apps/api` `^2.9.1` - Tauri JS API bindings (general use when running in Tauri)
- `@tauri-apps/plugin-sql` `^2.3.1` - SQLite access from JS (`src/lib/db/real-client.ts`)
- `zustand` `^5.0.9` - Global state management (stores live in `src/stores/`)
- `zod` `^4.2.1` + `react-hook-form` `^7.69.0` + `@hookform/resolvers` `^5.2.2` - Form validation and forms (e.g., components in `src/components/`)

**UI / Styling:**
- TailwindCSS `^4.1.18` - Utility-first styling (`src/index.css`, Tailwind Vite plugin in `vite.config.ts`)
- Radix UI primitives (multiple `@radix-ui/*` deps) - Accessible component primitives (used via components in `src/components/ui/*`)
- `lucide-react` `^0.562.0` - Icon library (e.g., `src/components/bom/import-dialog.tsx`)
- `sonner` `^2.0.7` - Toast notifications (e.g., `src/components/bom/import-dialog.tsx`, `src/components/ui/sonner.tsx`)
- `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` - Class composition/variants/animation helpers used across `src/components/ui/*`

**Data Import/Export:**
- `xlsx` `^0.18.5` - Excel parsing (`src/lib/excel-parser.ts`)

**Desktop Plugins (Rust side):**
- `tauri-plugin-sql` `2` (sqlite feature) - Tauri SQLite plugin + migrations (`src-tauri/src/lib.rs`)
- `tauri-plugin-log` `2` - Logging to stdout and log directory (`src-tauri/src/lib.rs`)
- `tauri-plugin-fs` `2` and `tauri-plugin-dialog` `2` - File IO and open/save dialogs (`src-tauri/src/lib.rs`, JS usage in `src/components/bom/*.tsx`)

## Configuration

**Environment:**
- Development secrets for Git operations are documented via env vars (example template in `.env.example`; docs in `docs/DEVELOPMENT_SETUP.md`).
  - `GITHUB_TOKEN`
  - `GITHUB_USERNAME`
  - `NODE_ENV`
- Runtime (app) configuration is primarily Tauri config in `src-tauri/tauri.conf.json`.

**Build:**
- Vite config: `vite.config.ts`
  - Path alias: `@` → `./src` (`vite.config.ts`, `tsconfig.json`)
  - Dev server port: `1420` (Tauri dev URL in `src-tauri/tauri.conf.json`)
  - HMR tunnel config: `server.hmr.host = "ui.tybrad.org"`, protocol `wss`, port `443` (`vite.config.ts`)
- TypeScript configs: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- ESLint flat config: `eslint.config.js`
- Tauri config: `src-tauri/tauri.conf.json`

## Platform Requirements

**Development:**
- Node.js (CI uses Node 20) (`.github/workflows/build-windows.yml`)
- Rust toolchain (CI installs stable; project pins `rust-version = "1.77.2"`) (`src-tauri/Cargo.toml`, `.github/workflows/build-windows.yml`)
- Tauri CLI `@tauri-apps/cli` `^2.9.6` (`package.json`)

**Production:**
- Windows desktop distribution via Tauri bundler targets `msi` and `nsis` (`src-tauri/tauri.conf.json`)

---

*Stack analysis: 2026-01-20*
