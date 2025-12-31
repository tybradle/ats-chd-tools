# Code Style Guide

This document describes the coding conventions, patterns, and style guidelines observed in this codebase. When writing new code, follow these patterns to maintain consistency.

## File & Directory Naming

### Directories
- **lowercase with hyphens**: `src-tauri/`, `.dev-scripts/`
- **lowercase**: `src/`, `components/`, `pages/`, `lib/`, `stores/`, `types/`, `public/`, `docs/`
- **No pluralization inconsistency**: Use plural forms for collections (`pages/`, `stores/`, `types/`)

### Files
- **React components**: `kebab-case.tsx` (e.g., `bom-table.tsx`, `root-layout.tsx`, `part-search-dialog.tsx`)
- **TypeScript modules**: `kebab-case.ts` (e.g., `bom-store.ts`, `csv-parser.ts`, `export-utils.ts`)
- **Entry points**: `PascalCase.tsx` or `lowercase.tsx` (e.g., `App.tsx`, `main.tsx`)
- **Type definitions**: `lowercase.ts` (e.g., `bom.ts`)
- **SQL migrations**: `NNN_description.sql` (e.g., `001_initial.sql`, `002_bom_tables.sql`)
- **Config files**: Standard names (e.g., `package.json`, `vite.config.ts`, `eslint.config.js`)

## Naming Conventions

### TypeScript/JavaScript

**Functions & Variables**
- **camelCase** for functions, variables, parameters
  ```typescript
  const projectId = 42;
  function loadProject(id: number) { ... }
  ```

**Components**
- **PascalCase** for React components (function name matches file purpose)
  ```typescript
  export function BomTable() { ... }
  export function RootLayout() { ... }
  ```

**Interfaces & Types**
- **PascalCase** for interfaces and types
  ```typescript
  interface BOMProject { ... }
  type ExportFormat = 'CSV' | 'EXCEL';
  ```
- Prefer `interface` over `type` for object shapes

**Constants**
- **UPPER_SNAKE_CASE** for true constants
  ```typescript
  const DB_NAME = "sqlite:ats-chd-tools.db";
  ```
- **camelCase** for const objects/arrays
  ```typescript
  const navItems = [...];
  ```

**Database Tables/Columns**
- **snake_case** for SQL identifiers
  ```sql
  bom_projects, part_number, created_at, manufacturer_id
  ```

### Rust

**Functions & Variables**
- **snake_case**
  ```rust
  fn run() { ... }
  let migrations = vec![...];
  ```

**Structs & Enums**
- **PascalCase**
  ```rust
  Migration, MigrationKind
  ```

**Crate Names**
- **kebab-case** in `Cargo.toml`
  ```toml
  name = "ats-chd-tools"
  ```

## Import Style

### TypeScript/React

**Order**:
1. React & core libraries
2. Third-party libraries
3. Local modules (via `@/` alias)
4. Types (if separate import)

**Grouping**: Blank line between groups

**Example**:
```typescript
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';

import type { BOMItem } from '@/types/bom';
```

**Patterns**:
- Use `@/` path alias for all local imports
- Import types with `import type { ... }` when possible
- Destructure imports: `import { Button }` not `import * as`
- Component imports: named exports preferred

### Rust

**Order**:
1. Standard library
2. External crates
3. Internal modules

**Example**:
```rust
use tauri_plugin_sql::{Migration, MigrationKind};
```

## Code Patterns

### React Components

**Functional Components Only**
```typescript
export function BomTable() {
  // Component logic
  return <div>...</div>;
}
```
- No class components
- No default exports for components (named exports)

**Hooks at Top**
```typescript
export function BomProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading, error, loadProject } = useBOMStore();
  
  useEffect(() => { ... }, [projectId, loadProject]);
  
  // Rest of component
}
```

**Early Returns for Loading/Error States**
```typescript
if (loading && !currentProject) {
  return <LoadingCard />;
}

if (error || !currentProject) {
  return <ErrorCard />;
}

return <MainContent />;
```

**Destructuring Store State**
```typescript
const {
  items,
  currentProject,
  updateItem,
  deleteItem,
} = useBOMStore();
```

### State Management (Zustand)

**Store Structure**:
```typescript
interface BOMStore {
  // State
  projects: BOMProject[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProjects: () => Promise<void>;
  createProject: (...) => Promise<number>;
}

export const useBOMStore = create<BOMStore>((set, get) => ({
  // Initial state
  projects: [],
  loading: false,
  error: null,
  
  // Action implementations
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await bomProjects.getAll();
      set({ projects, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
```

**Patterns**:
- Actions set `loading: true` at start, `loading: false` at end
- Actions clear previous errors: `error: null`
- Actions catch errors and set error state
- Use `get()` to access current state within actions
- Async actions return Promises (can throw)

### Database Queries

**All queries in `src/lib/db/client.ts`**

**Parameterized Queries** (ALWAYS):
```typescript
// ✅ CORRECT
query<Part>("SELECT * FROM parts WHERE id = ?", [id])

// ❌ NEVER DO THIS
query<Part>(`SELECT * FROM parts WHERE id = ${id}`)
```

**Query Helpers Pattern**:
```typescript
export const parts = {
  getAll: () => query<Part>("SELECT * FROM parts"),
  
  getById: (id: number) => 
    query<Part>("SELECT * FROM parts WHERE id = ?", [id])
      .then(rows => rows[0] ?? null),
  
  create: (data: CreatePartData) =>
    execute(
      "INSERT INTO parts (name, ...) VALUES (?, ...)",
      [data.name, ...]
    ),
};
```

**Dynamic UPDATE Pattern**:
```typescript
update: (id: number, updates: Partial<Part>) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  
  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  // ... more fields
  
  if (fields.length === 0) return Promise.resolve({ rowsAffected: 0 });
  
  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);
  
  return execute(`UPDATE parts SET ${fields.join(", ")} WHERE id = ?`, values);
}
```

**Transaction Pattern**:
```typescript
await transaction(async (db) => {
  await db.execute("INSERT INTO ...", [...]);
  await db.execute("UPDATE ...", [...]);
  return result;
});
```

### Styling (Tailwind + shadcn/ui)

**Use `cn()` for Conditional Classes**:
```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-3",
  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
)} />
```

**shadcn/ui Component Usage**:
```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

<Button variant="outline" size="sm">Click Me</Button>
<Input className="h-8" value={value} onChange={...} />
```

**Common Patterns**:
- Spacing: `gap-2`, `gap-4`, `space-y-4`, `space-y-6`
- Layout: `flex`, `flex-col`, `items-center`, `justify-between`
- Sizing: `h-4`, `w-4`, `h-8`, `w-8` (for icons/inputs)
- Text: `text-sm`, `text-lg`, `font-semibold`, `text-muted-foreground`
- Interactive: `hover:bg-muted`, `transition-colors`

**Component Class Prop Merging**:
```typescript
<Button className={cn("custom-class", props.className)} />
```

### Error Handling

**Store Actions**:
```typescript
try {
  // Action logic
} catch (error) {
  set({
    error: error instanceof Error ? error.message : 'Failed to ...',
    loading: false,
  });
  throw error; // Re-throw if caller needs to handle
}
```

**Toast Notifications**:
```typescript
import { toast } from 'sonner';

toast.success('Item deleted');
toast.error('Failed to save');
```

**Optimistic Updates**:
```typescript
// Update UI immediately
set((state) => ({
  items: state.items.map(item =>
    item.id === id ? { ...item, ...updates } : item
  ),
}));

try {
  await api.update(id, updates);
} catch (error) {
  // Revert on error
  await loadItems(); // Reload from DB
  throw error;
}
```

### Forms

**React Hook Form + Zod**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
});

const onSubmit = form.handleSubmit(async (data) => {
  // Handle submission
});
```

### Tables (TanStack Table)

**Column Definition**:
```typescript
import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper<RowType>();

const columns = useMemo(() => [
  columnHelper.accessor('field', {
    header: 'Header',
    cell: ({ getValue, row }) => (
      <Input value={getValue()} onChange={...} />
    ),
  }),
], [dependencies]);
```

**Table Setup**:
```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  // other options
});
```

**Rendering**:
```typescript
<Table>
  <TableHeader>
    {table.getHeaderGroups().map(headerGroup => (
      <TableRow key={headerGroup.id}>
        {headerGroup.headers.map(header => (
          <TableHead key={header.id}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        ))}
      </TableRow>
    ))}
  </TableHeader>
  <TableBody>
    {table.getRowModel().rows.map(row => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map(cell => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## TypeScript Patterns

**Strict Mode**: Enabled, avoid `any`

**Type Annotations**:
```typescript
// Explicit return types for public functions
export async function loadProject(id: number): Promise<void> { ... }

// Inferred for simple cases
const items = await bomItems.getAll(); // Type inferred
```

**Nullability**:
```typescript
// Use `| null` for nullable fields
interface Part {
  id: number;
  description: string;
  notes: string | null;
}

// Use `??` for default values
const name = project.name ?? 'Untitled';
```

**Utility Types**:
```typescript
// Omit for excluding fields
type CreatePart = Omit<Part, 'id' | 'created_at' | 'updated_at'>;

// Partial for optional updates
type UpdatePart = Partial<CreatePart>;
```

**Generic Constraints**:
```typescript
export async function query<T>(sql: string, bindValues: unknown[] = []): Promise<T[]> {
  // Implementation
}
```

## SQL Patterns

**Migrations**:
- Numbered prefixes: `001_`, `002_`, etc.
- Descriptive names: `001_initial.sql`, `002_bom_tables.sql`
- Always use `IF NOT EXISTS`
- Include comments for context

**Table Definitions**:
```sql
CREATE TABLE IF NOT EXISTS table_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES other_table(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_table_field ON table(field);
```

**Constraints**:
- Use `REFERENCES` for foreign keys
- Use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- Use `UNIQUE` for unique constraints
- Use `DEFAULT` for default values

## Logging & Comments

**Comments**:
- Use `//` for single-line comments
- Use `/* */` for multi-line comments
- Comment complex logic, not obvious code
- Use JSDoc for public APIs (optional, not consistently used)

**SQL Comments**:
```sql
-- Single line comment
/* Multi-line
   comment */
```

**No Console Logs in Production**:
- Use Tauri logging plugin in Rust (dev only)
- Use toast notifications for user feedback
- No `console.log` in committed code

## Testing

**Status**: Not yet configured

**Planned**: Jest or Vitest for unit tests, Playwright for E2E

## Do's and Don'ts

### ✅ DO

- Use TypeScript strict mode
- Use `@/` path alias for imports
- Use parameterized SQL queries
- Use `interface` for object shapes
- Use Zustand for global state
- Use shadcn/ui components as base
- Use `cn()` for conditional classes
- Use React Hook Form + Zod for forms
- Use TanStack Table for complex tables
- Keep components small and focused
- Handle loading and error states
- Use toast notifications for feedback
- Follow existing naming conventions
- Write migrations for schema changes

### ❌ DON'T

- Use `any` type (use `unknown` if needed)
- Use class components
- String interpolate SQL queries
- Add new UI libraries (use shadcn/ui)
- Modify `src/components/ui/` directly (shadcn components)
- Write Rust commands unless necessary (use SQL plugin)
- Use Redux or Context for global state
- Use `'use client'` directive (not Next.js)
- Create files without clear purpose
- Add features outside current scope
- Use `console.log` in production
- Skip error handling
- Forget to handle null/undefined
- Use `cd` in bash commands (use workdir parameter)

## Additional Patterns

### Async/Await
- Prefer `async/await` over `.then()` chains
- Always handle errors with try/catch
- Return Promises from async functions

### Array Operations
- Use `.map()`, `.filter()`, `.find()`, `.some()`, `.every()` for transformations
- Use `.includes()` for membership checks
- Use spread operator for immutability: `[...items, newItem]`

### Object Operations
- Use spread for cloning/merging: `{ ...obj, field: value }`
- Use destructuring: `const { name, id } = project;`
- Use optional chaining: `project?.name`

### Boolean Logic
- Use ternary for JSX: `isActive ? <Active /> : <Inactive />`
- Use `&&` for conditional rendering: `{items.length > 0 && <List />}`
- Use `??` for nullish coalescing: `value ?? defaultValue`

### Icons (Lucide React)
```typescript
import { ArrowLeft, Trash2, Plus } from 'lucide-react';

<ArrowLeft className="w-4 h-4" />
<Button><Plus className="w-4 h-4 mr-2" />Add</Button>
```

### Route Params
```typescript
import { useParams, useNavigate } from 'react-router-dom';

const { projectId } = useParams<{ projectId: string }>();
const navigate = useNavigate();

navigate('/bom');
navigate(`/bom/${id}`);
```

### Dialogs/Modals (shadcn/ui)
```typescript
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

## File Templates

### React Component Template
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

export function MyComponent({ value, onChange }: MyComponentProps) {
  const [localState, setLocalState] = useState('');
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Store Template
```typescript
import { create } from 'zustand';

interface MyStore {
  // State
  items: Item[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadItems: () => Promise<void>;
}

export const useMyStore = create<MyStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  
  loadItems: async () => {
    set({ loading: true, error: null });
    try {
      const items = await api.getItems();
      set({ items, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load', 
        loading: false 
      });
    }
  },
}));
```

## Summary

**Key Principles**:
1. **Consistency** - Follow existing patterns
2. **Type Safety** - Use TypeScript strictly
3. **Simplicity** - Prefer explicit over clever
4. **Maintainability** - Code should be easy to understand
5. **Composition** - Build with small, reusable pieces

When in doubt, look at existing code for similar patterns and follow those conventions.
