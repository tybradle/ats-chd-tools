# Project Conventions

## Code Style
- **TypeScript**: Strict mode, interfaces over types for object shapes.
- **Path Aliases**: Use `@/` for `src/` directory.
- **React**: Functional components only, no 'use client' (not Next.js).
- **Styling**: Tailwind utility classes, shadcn/ui primitives.
- **Utility**: Use `cn()` from `@/lib/utils` for conditional classes.

## State & Data
- **Global State**: Zustand stores in `src/stores/`.
- **Local State**: React `useState`/`useReducer`.
- **Forms**: React Hook Form with Zod validation.
- **Database**: 
  - Direct SQL queries from TS via `@tauri-apps/plugin-sql`.
  - Queries centralized in `src/lib/db/client.ts`.
  - Migrations in `src-tauri/migrations/`.

## Directory Structure
- `src/components/ui/`: shadcn/ui primitives (DO NOT MODIFY).
- `src/components/bom/`: BOM Translation module components.
- `src/components/layout/`: App shell (sidebar, navigation).
- `src/pages/`: Route-level components.
- `src/lib/db/`: Database logic.
- `src/lib/`: Utility functions and parsers.
- `src/stores/`: Zustand stores.
- `src/types/`: TypeScript interfaces.

## Naming
- Files: kebab-case (e.g., `bom-table.tsx`).
- Components: PascalCase (e.g., `BomTable`).
- Tables: snake_case (e.g., `bom_items`).
- Columns: snake_case (e.g., `part_number`).
- Store hooks: `use[Module]Store` (e.g., `useBOMStore`).

## shadcn/ui Components in Use
| Component | File |
|-----------|------|
| Alert | `alert.tsx` |
| AlertDialog | `alert-dialog.tsx` |
| Badge | `badge.tsx` |
| Button | `button.tsx` |
| Card | `card.tsx` |
| Checkbox | `checkbox.tsx` |
| Dialog | `dialog.tsx` |
| DropdownMenu | `dropdown-menu.tsx` |
| Input | `input.tsx` |
| Label | `label.tsx` |
| ScrollArea | `scroll-area.tsx` |
| Select | `select.tsx` |
| Separator | `separator.tsx` |
| Sonner (Toasts) | `sonner.tsx` |
| Table | `table.tsx` |
| Tabs | `tabs.tsx` |
| Tooltip | `tooltip.tsx` |

## Database Patterns
- Use parameterized queries (`?` placeholders) - never string interpolation
- Wrap multi-statement operations in transactions
- Boolean fields stored as INTEGER (0/1) in SQLite
- Foreign keys use `ON DELETE CASCADE` for cleanup
- Indexes on frequently-queried columns (project_id, location_id, sort_order)

## Store Patterns
- Optimistic updates for inline editing (update state first, then DB)
- Error state for user feedback
- Loading state for async operations
- Auto-refresh related data after mutations
