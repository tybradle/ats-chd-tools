# ATS CHD Tools - AI Agent Guidelines

## Project Overview

Unified desktop application platform for ATS CHD department. Replaces multiple Excel-based workflows with a single Tauri desktop app.

**Target**: Windows desktop, 100% offline, single-user, ~15-20MB installer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2.0 |
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | TailwindCSS 4, shadcn/ui |
| State | Zustand |
| Routing | React Router 7 |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Database | SQLite via @tauri-apps/plugin-sql |
| Icons | Lucide React |
| Toasts | Sonner |

## Directory Structure

```
src/
├── components/
│   ├── ui/          # shadcn/ui components (DO NOT MODIFY)
│   └── layout/      # App shell, navigation
├── pages/           # Route components
├── lib/
│   ├── db/          # Database client and queries
│   └── utils.ts     # Utility functions (cn, etc.)
├── stores/          # Zustand stores
└── types/           # TypeScript types/interfaces

src-tauri/
├── src/             # Rust backend (minimal - mostly plugins)
├── migrations/      # SQLite migrations
└── capabilities/    # Tauri permissions
```

## Modules (Priority Order)

1. **BOM Translation** - Convert BOMs between formats (CSV, Excel, XML, ZW1)
2. **Parts Library** - Shared master parts database
3. QR Label Generator (future)
4. Quoting Workbook (future)
5. Heat/Load Calculator (future)

## Code Conventions

### TypeScript
- Strict mode enabled
- Use `@/` path alias for imports
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation

### React
- Functional components only
- Use `'use client'` is NOT needed (not Next.js)
- Prefer composition over inheritance
- Keep components small and focused

### Styling
- Use Tailwind utility classes
- Use shadcn/ui components as base
- Follow shadcn/ui patterns for new components
- Use `cn()` from `@/lib/utils` for conditional classes

### Database
- All queries go through `src/lib/db/client.ts`
- Use parameterized queries (never string interpolation)
- Migrations in `src-tauri/migrations/` with numbered prefixes

### State Management
- Zustand for global state
- React state for local/component state
- No Redux, no Context for global state

### Forms
- React Hook Form for all forms
- Zod schemas for validation
- Controlled components preferred

## Commands

```bash
npm run dev           # Vite dev server only
npm run tauri:dev     # Full Tauri dev (frontend + backend)
npm run tauri:build   # Production build
npm run lint          # ESLint
```

## Database Schema

Core tables shared across modules:
- `manufacturers` - Company/brand info
- `categories` - Hierarchical part categories
- `parts` - Master parts list
- `parts_fts` - Full-text search index
- `settings` - App configuration key-value store

Module-specific:
- `part_pricing` - For quoting module
- `part_electrical` - For heat/load module

## Anti-Patterns (Avoid)

- Do NOT add new UI libraries (use shadcn/ui)
- Do NOT write Rust commands unless absolutely necessary
- Do NOT use `any` type
- Do NOT create files without clear purpose
- Do NOT add features not in scope

## Testing

(To be configured)

## Notes

- This is a solo developer project
- Optimize for maintainability over cleverness
- Prefer explicit over implicit
- When in doubt, keep it simple
