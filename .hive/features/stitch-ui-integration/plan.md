# Feature: Stitch UI Integration

## Overview
Migrate the existing ATS CHD Tools UI to the "Stitch" aesthetic found in `.stitchUI/`. This involves updating global theme tokens, layout structure, and implementing high-density UI patterns for the BOM management module.

## Tasks

### 1. Global Theme Configuration
Update `src/index.css` with the Stitch color palette and typography.
- Configure Tailwind 4 `@theme` block with new color variables.
- Add Google Fonts (Inter) to the project.
- Implement custom scrollbar styles for a native desktop feel.

### 2. Layout Refinement
Update `src/components/layout/root-layout.tsx` to match the Stitch layout hierarchy.
- Use `surface` colors for the sidebar and header.
- Refine navigation item styling (active states, spacing).
- Add "Status Footer" to the layout as seen in the Stitch prototype.

### 3. High-Density UI Components
Create specialized versions of Radix/Shadcn components for data-heavy views.
- `DenseInput`: A compact input component (h-8) for spreadsheet-like editing.
- `DenseTable`: A table configuration with sticky headers and group-hover actions.

### 4. Page Updates
Apply the new styles to primary pages.
- Update `BomProjectPage` to use the new `DenseTable` and high-density inputs.
- Ensure dark mode consistency across all routes.
