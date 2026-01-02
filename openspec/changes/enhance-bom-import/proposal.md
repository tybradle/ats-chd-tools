# Enhance BOM Import & Mapping

**Type:** Feature Enhancement
**Scope:** BOM Translation Module (Import Tool)
**Status:** Proposed

## Problem
The current BOM Import tool supports basic CSV and Excel import but lacks robustness for real-world scenarios:
1.  **Rigid Header Parsing**: Assumes row 1 is always the header, failing on files with metadata/titles in top rows.
2.  **Incomplete Mapping**: Missing fields like `Secondary Description` in the mapping UI.
3.  **Fragile Data Parsing**: Quantity and Price fields break on currency symbols (e.g., "$10.00") or mixed text.

## Solution
Enhance the import workflow to be "fully furnished":
1.  **Header Row Selection**: Allow users to specify which row contains column headers.
2.  **Complete Field Mapping**: Expose all available BOM fields (including `Secondary Description`) for mapping.
3.  **Robust Data Cleaning**: Strip currency symbols and handle non-numeric characters gracefully during import.

## Risks
- **Performance**: Re-parsing large Excel files when changing header rows might be slow (though likely negligible for typical BOM sizes).
- **User Confusion**: "Header Row" selection adds a configuration step; defaulting to Row 1 minimizes friction.

## Success Metrics
- Users can import Excel files with metadata/logos in the top rows without manual cleanup.
- Users can map `Secondary Description` columns.
- Prices with "$" and quantities with text (e.g. "10 (spare)") import correctly.
