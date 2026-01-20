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
Unified desktop application platform for the ATS CHD department.
**Target**: Windows desktop, 100% offline, single-user, local SQLite database.

## Tech Stack
- **Core**: React 19, TypeScript 5, Vite 6
- **Desktop Wrapper**: Tauri 2.0 (Rust backend, minimal logic)
- **Styling**: TailwindCSS 4, shadcn/ui, Lucide React
- **State Management**: 
  - Global: Zustand (stores in `src/stores/`)
  - Server State/Data: Custom async patterns (see Code Patterns)
  - Local: `useState`/`useReducer`
- **Routing**: React Router 7
- **Validation**: Zod + React Hook Form
- **Database**: SQLite (`@tauri-apps/plugin-sql`)

## Critical Implementation Rules

### 1. Database & Data Access (STRICT)
- **Single Source of Truth**: All SQL queries MUST reside in `src/lib/db/client.ts`.
- **Parameterized Queries**: ALWAYS use `?` placeholders. NEVER use string interpolation.
  - ✅ `query("SELECT * FROM parts WHERE id = ?", [id])`
  - ❌ `query("SELECT * FROM parts WHERE id = " + id)`
- **Migrations**: Schema changes MUST be added as numbered SQL files in `src-tauri/migrations/`.
  - Format: `NNN_description.sql` (e.g., `005_add_inventory.sql`).

### 2. Components & UI
- **shadcn/ui**: Use existing components in `src/components/ui/`. DO NOT modify them manually; use CLI if needed.
- **Styling**: Use Tailwind utility classes. Use `cn()` from `@/lib/utils` for conditional merging.
- **Icons**: Use `lucide-react`.
- **No Class Components**: Use functional components with hooks.
- **No 'use client'**: This is a Vite SPA, not Next.js.

### 3. File Structure & Naming
- **Components**: `PascalCase` (e.g., `BomTable.tsx`) inside `src/components/` or `src/pages/`.
- **Files**: `kebab-case` for all other files (e.g., `bom-store.ts`, `data-utils.ts`).
- **Imports**: Use `@/` alias for `src/`.
  - Order: React -> 3rd Party -> `@/components` -> `@/stores` -> `@/types` -> `@/lib`.

### 4. TypeScript & Safety
- **Strict Mode**: No `any`. Use `unknown` or specific types.
- **Types**: Define interfaces in `src/types/`. Prefer `interface` over `type` for objects.
- **Error Handling**: Wrap async operations in `try/catch`. Display user errors via `sonner` toast.

## Development Workflow

### Adding a New Feature
1.  **Database**: Add migration in `src-tauri/migrations/` if schema changes are needed.
2.  **Types**: Define data shapes in `src/types/`.
3.  **Data Layer**: Add query functions to `src/lib/db/client.ts`.
4.  **State**: Create/Update Zustand store in `src/stores/` to handle data fetching/caching.
5.  **UI**: Build components in `src/components/` using shadcn/ui primitives.

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run tauri:dev` | Start full desktop app in dev mode (Recommended) |
| `npm run dev` | Start web-only dev server (No native APIs) |
| `npm run lint` | Run ESLint |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npm run tauri:build` | Build for production |
| `npm run db:reset` | **Destructive**: Delete and reset local database |
| `npm run db:seed:bom` | Seed BOM test data |

## Code Patterns

### Zustand Store Pattern
Follow this pattern for async data stores:

```typescript
interface MyStore {
  data: MyType[];
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
}

export const useMyStore = create<MyStore>((set) => ({
  data: [],
  loading: false,
  error: null,
  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const result = await db.query("...");
      set({ data: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
      toast.error("Failed to fetch data");
    }
  }
}));
```

### Database Query Pattern
```typescript
// src/lib/db/client.ts
export const projects = {
  getAll: () => query<Project>("SELECT * FROM projects ORDER BY name"),
  create: (name: string) => execute("INSERT INTO projects (name) VALUES (?)", [name])
};
```