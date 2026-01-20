# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- `kebab-case` for most files.
  - Examples: `src/stores/bom-store.ts`, `src/lib/excel-parser.ts`, `src/components/bom/import-dialog.tsx`
- React pages are also `kebab-case` and live under `src/pages/`.
  - Examples: `src/pages/bom-project.tsx`, `src/pages/parts.tsx`
- `src/components/ui/` follows shadcn/ui defaults and uses `kebab-case`.
  - Examples: `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`

**Functions:**
- `camelCase` for functions/handlers.
  - UI handlers: `handleFilePick`, `handleImport` in `src/components/bom/import-dialog.tsx`
  - Store actions: `loadProjects`, `createItem`, `bulkDeleteItems` in `src/stores/bom-store.ts`

**Variables:**
- `camelCase` for local state and variables.
  - Examples: `isDialogOpen`, `partToEdit` in `src/pages/parts.tsx`
- Snake_case appears when representing DB column names / form fields.
  - Examples: `part_number`, `manufacturer_id` in `src/components/parts/part-dialog.tsx`

**Types:**
- `PascalCase` for interfaces and React components.
  - Types: `BOMProject`, `PartWithManufacturer` in `src/types/bom.ts`, `src/types/parts.ts`
  - Components: `PartsPage`, `ImportDialog` in `src/pages/parts.tsx`, `src/components/bom/import-dialog.tsx`

## Code Style

**Formatting:**
- No automated formatter config detected (no `.prettierrc`, `prettier.config.*`, or `biome.json`).
- Indentation is typically 2 spaces across TS/TSX.
  - Example: `src/pages/parts.tsx`
- Semicolons and quote style are mixed across the codebase:
  - shadcn/ui component files tend to be semicolon-less and use double quotes (example: `src/components/ui/button.tsx`).
  - app pages/components often use semicolons and mixed quotes (example: `src/App.tsx`, `src/pages/parts.tsx`).

**Linting:**
- ESLint flat config via `eslint.config.js`.
  - Extends: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
  - Config file: `eslint.config.js`

## Import Organization

**Order:**
Use the import ordering guidance documented in `AGENTS.md` (project rules):
1. React
2. 3rd party
3. `@/components/*`
4. `@/stores/*`
5. `@/types/*`
6. `@/lib/*`

**Examples (representative patterns):**
- Page-level imports: `src/pages/parts.tsx`
  - React → stores → components → types
- Larger feature component imports: `src/components/bom/import-dialog.tsx`
  - React → UI components → Tauri plugins → `@/lib/*` → stores/db/types → toast/icons

**Path Aliases:**
- `@/*` → `./src/*`
  - TypeScript: `tsconfig.json`, `tsconfig.app.json`
  - Vite: `vite.config.ts`

## Error Handling

**Patterns:**
- Async store actions typically:
  - set loading/error state at start
  - `try/catch`
  - set an `error: string | null`
  - sometimes `throw error` so UI callers can show feedback
  - Example: `src/stores/parts-store.ts` (`addPart`, `updatePart`, `deletePart`)
- Some stores use optimistic updates and revert on error.
  - Example: `updateItem` in `src/stores/bom-store.ts`

**Error message extraction:**
- Common pattern: `error instanceof Error ? error.message : "<fallback>"`
  - Example: `src/components/bom/location-tabs.tsx`

**Transactions:**
- `try/catch` with rollback and rethrow.
  - Example: `transaction` in `src/lib/db/real-client.ts`

## Logging

**Framework:**
- `console.*` for developer diagnostics.
  - Examples: `src/components/error-boundary.tsx`, `src/stores/parts-store.ts`

**Patterns:**
- `console.error(...)` inside `catch` blocks for unexpected failures.
  - Example: `src/components/bom/import-dialog.tsx`
- `console.warn(...)` for environment warnings.
  - Example: `src/lib/db/client.ts` warns when running in browser mode.
- `src/lib/db/mock-client.ts` contains verbose `console.log(...)` statements for mock DB tracing.

## Comments

**When to Comment:**
- Use short section comments for non-obvious flow or multi-step logic.
  - Example: `// Browser Fallback` and step comments in `src/components/bom/import-dialog.tsx`

**JSDoc/TSDoc:**
- Used sparingly, mainly around exported infrastructure functions.
  - Example: `getDb`, `closeDb`, `query`, `execute`, `transaction` in `src/lib/db/real-client.ts`

## Function Design

**Size:**
- UI components may contain large multi-step handlers for complex flows.
  - Example: `src/components/bom/import-dialog.tsx` (multi-step import wizard)

**Parameters:**
- Prefer typed parameters and narrow types (`unknown`/`Error` checks when needed).
  - Example: `src/stores/bom-store.ts` uses typed signatures for actions.

**Return Values:**
- Async store actions return `Promise<void>` (or `Promise<number>` when returning IDs).
  - Example: `createProject` returns insert id in `src/stores/bom-store.ts`

## Module Design

**Exports:**
- React pages/components are usually named exports (`export function X()`), occasionally default exports.
  - Named export example: `src/pages/parts.tsx`
  - Default export example: `src/pages/glenair.tsx`, `src/App.tsx`
- Data-layer modules export grouped operation objects.
  - Example: `export const parts = { getAll, getById, search, create, update, delete }` in `src/lib/db/real-client.ts`

**Barrel Files:**
- Not used (no `index.ts` re-export pattern detected in `src/`).

---

*Convention analysis: 2026-01-20*
