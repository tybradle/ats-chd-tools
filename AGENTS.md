<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# ATS CHD Tools - AI Agent Guidelines

## Project Overview
Unified desktop application platform for the ATS CHD department. Replaces multiple Excel-based workflows with a single Tauri desktop app.
**Target**: Windows desktop, 100% offline, single-user, ~15-20MB installer.

## Tech Stack
- **Desktop**: Tauri 2.0 (Rust backend, minimal logic)
- **Frontend**: React 19, TypeScript, Vite 6
- **Styling**: TailwindCSS 4, shadcn/ui
- **State**: Zustand (global), React State (local)
- **Routing**: React Router 7
- **Forms**: React Hook Form + Zod
- **Database**: SQLite via `@tauri-apps/plugin-sql`

## Commands
```bash
npm run dev           # Vite dev server only
npm run tauri:dev     # Full Tauri dev (frontend + backend)
npm run tauri:build   # Production build
npm run lint          # ESLint check
npm run lint -- --fix # Fix lint errors
tsc -b                # Type check
npm run db:seed:bom   # Seed BOM test data
npm run db:reset      # Delete local DB (requires app restart)
```
*(Testing to be configured - currently no test suite)*

## Directory Structure
- `src/components/ui/`: shadcn/ui components (**DO NOT MODIFY** existing ones, add new ones via CLI)
- `src/components/layout/`: App shell, navigation, global layouts
- `src/pages/`: Route-level components
- `src/lib/db/client.ts`: **CENTRALIZED** database access layer. All queries go here.
- `src/stores/`: Zustand global state stores
- `src/types/`: Centralized TypeScript interfaces and types
- `src-tauri/migrations/`: SQLite schema migrations (numbered prefixes)

## Code Style & Conventions

> **Note**: For comprehensive guidelines, see `CODE_STYLE.md`. The following is a summary of key patterns.

### 1. Imports & Path Aliases
- Use `@/` alias for all internal imports (e.g., `@/components/ui/button`)
- Order: React/Third-party -> Internal components -> Stores/Hooks -> Types -> Utils/Styles
- Use **type-only imports** for types and interfaces: `import type { ... } from '...'`

### 2. TypeScript
- **Strict Mode**: Mandatory. No `any`. Use `unknown` if necessary.
- **Interfaces vs Types**: Prefer `interface` for object shapes, `type` for unions/aliases.
- **Zod**: Use for all runtime validation, especially database results and form data.

### 3. React Components
- **Functional only**: No class components.
- **Small & Focused**: Extract logic into hooks or smaller sub-components.
- **Fast Refresh**: Files should only export components. Constants/helpers go in `lib/` or at the bottom of the file (private).
- **No 'use client'**: Not using Next.js. Standard React 19 patterns.

### 4. Database (SQLite)
- **Single Source of Truth**: All queries MUST be in `src/lib/db/client.ts`.
- **Parameterized**: Use `?` placeholders. **NEVER** use string interpolation/template literals for queries.
- **Migrations**: New tables/changes must go in `src-tauri/migrations/NNN_description.sql`.

### 5. State Management
- **Zustand**: For global, cross-page, or complex module state (e.g., BOM builder).
- **URL Params**: Use for shareable state/navigation (React Router).
- **Local State**: Use `useState`/`useReducer` for ephemeral UI state (modals, form inputs).

### 6. Styling (Tailwind 4)
- Use utility classes exclusively. Avoid CSS files.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Follow shadcn/ui design tokens and color variables.

### 7. Error Handling
- Use `try/catch` for all database and async operations.
- Display user-friendly errors via `sonner` toasts or inline alerts.
- Log technical errors to the console for debugging in dev.

## Anti-Patterns
- **No Direct SQL**: Components should not call `db.execute` directly; use `src/lib/db/client.ts`.
- **No New UI Libs**: Stick to shadcn/ui.
- **No Implicit Any**: Ensure all function parameters and returns are typed.
- **No Manual DOM**: Use React refs only when absolutely necessary.

## Development Workflow
1. Check `src/lib/db/client.ts` for existing data access logic.
2. Define types in `src/types/` before implementation.
3. Use `Zustand` for complex workflows (like Glenair or BOM translation).
4. Run `npm run lint` and `tsc -b` before considering a task complete.
