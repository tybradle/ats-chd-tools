# Stitch UI Integration Research

## Design System Findings
- **Background**: `#09090b` (Deep dark)
- **Surface**: `#121214` (Secondary dark layer)
- **Primary**: `#3b82f6` (Vibrant Blue)
- **Borders**: `#27272a`
- **Typography**: Inter (Sans-serif)
- **Density**: High-density "spreadsheet-like" inputs (h-8) and tables.

## Implementation Strategy
- Use CSS variables in `src/index.css` (Tailwind 4 @theme).
- Update `RootLayout` for sidebar/header hierarchy.
- Create specialized "Dense" UI components for BOM management.
- Stick with Lucide icons for now but adjust sizing to match Material Symbols (18-20px).
