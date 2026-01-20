# Feature: Stitch UI Remediation

## Overview
Address deficiencies identified in the `stitch-ui-integration` sprint evaluation. This sprint focuses on true componentization of high-density UI elements, adding missing assets (Fonts), and completing the layout with the "Status Footer" to match the `.stitchUI/` prototype.

## Tasks

### 1. Typography & Assets
Add the Inter font to the project to ensure typography matches the design.
- Update `index.html` to load Google Fonts (Inter).
- Verify `index.css` correctly references the font family.

### 2. High-Density Components
Create specialized UI components for data-heavy views to replace inline styles.
- `src/components/ui/dense-input.tsx`: A compact (h-8) input with spreadsheet-like focus states.
- `src/components/ui/dense-table.tsx`: A wrapper or variant of the Table component optimized for density.

### 3. Refactor BOM Table
Refactor `src/components/bom/bom-table.tsx` to use the new components.
- Replace `<Input className="h-8 ...">` with `<DenseInput>`.
- Remove manual height/padding overrides in favor of component defaults.

### 4. Layout Completion (Status Footer)
Implement the application status footer in `src/components/layout/root-layout.tsx`.
- Add a fixed bottom bar showing:
  - SQLite Sync Status (Green indicator)
  - "All changes saved" indicator
  - Version info
