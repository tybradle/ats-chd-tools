# Learnings and Patterns

## Patterns

### Progressive UI-First Development
- **Pattern**: Build visible/clickable features at each step, then make them functional.
- **Rationale**: Facilitates visual debugging and allows for early workflow testing by the user.

### Reference Implementation Replication
- **Pattern**: Replicate proven workflows from `BOM_JS` (Electron) while modernizing the stack.
- **Rationale**: Leverages existing, stable UX patterns and data schemas.

### TypeScript-Heavy Business Logic
- **Pattern**: Keep Rust minimal; implement parsing, generation, and logic in TypeScript.
- **Rationale**: Simplifies development for a solo TS/React developer; avoids Rust IPC overhead where possible.

### Optimistic UI for Tables
- **Pattern**: Update Zustand state immediately during inline editing; sync with DB in background/debounce.
- **Rationale**: Provides snappy desktop-like experience for data entry.
- **Implementation**: See `updateItem` in `bom-store.ts` - state updated first, then DB call.

### Multi-Step Import Wizards
- **Pattern**: Use stepped dialogs for complex imports (file select → sheet select → column mapping → preview → import).
- **Rationale**: Reduces errors and gives user control at each stage.
- **Implementation**: `ImportDialog` uses `step` state to control wizard progression.

### Auto-Mapping with Override
- **Pattern**: Auto-detect column mappings from common header names, but always allow manual override.
- **Rationale**: Saves time on common cases while handling edge cases gracefully.

## Anti-Patterns

### Auto-Creation of Locations
- **Anti-Pattern**: Automatically creating locations during CSV import.
- **Rationale**: User preferred manual "+ Add Location" to ensure 100% control over project structure.

### Automated Part Matching
- **Anti-Pattern**: Automatically linking imported items to master parts.
- **Rationale**: Prefer manual search/link to avoid false positives and ensure data integrity.

### Next.js for Desktop
- **Anti-Pattern**: Using Next.js App Router for a Tauri desktop app.
- **Rationale**: Unnecessary complexity (SSR/Hydration issues); React Router 7 is better suited for SPAs.

### Storing Export Content in DB
- **Anti-Pattern**: Storing full export file contents in SQLite blob.
- **Rationale**: Files are written to disk via Tauri; DB only stores metadata for history tracking.

## Technical Notes

### SQLite Boolean Handling
- SQLite stores booleans as integers (0/1)
- TypeScript interfaces use `number` type for these fields (e.g., `is_spare: number`)

### Tauri File Dialogs
- Use `@tauri-apps/plugin-dialog` for native file pickers
- `open()` for import, `save()` for export with filter options

### xlsx Library Usage
- Read Excel files as ArrayBuffer
- Use `read(buffer, { type: 'array' })` for Tauri compatibility
- Sheet names available via `workbook.SheetNames`
