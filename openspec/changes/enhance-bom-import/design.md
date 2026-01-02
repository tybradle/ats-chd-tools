# Design: Enhanced BOM Import

## Architecture

### 1. Excel Parsing Strategy
- **Current**: `parseExcel` and `parseExcelSheet` read row 0 as header.
- **New**: Update signatures to accept `headerRowIndex` (default 0).
- **Implementation**:
    - Use `XLSX.read` to get the sheet.
    - Use `XLSX.utils.sheet_to_json` with `header: 1` (array of arrays).
    - Slice the array from `headerRowIndex` to determine headers and data.

### 2. UI/UX Flow
The `ImportDialog` state machine will be refined:
1.  **Upload**: File selection (unchanged).
2.  **Sheet Select**: Sheet selection (unchanged).
3.  **Mapping Configuration** (Enhanced):
    - **Header Row Selector**: A number input or dropdown to pick the row index (1-based for UI, 0-based for logic).
    - **Preview**: Update available columns immediately when header row changes.
    - **Field Mapping**: Add `Secondary Description` to the list.
4.  **Preview**: Data preview (unchanged).

### 3. Data Transformation Layer
Refactor `mapCSVToBOM` into a more robust `mapImportRowsToBOM`:
- **Quantity**: regex to extract first valid number (e.g. "10 ea" -> 10).
- **Price**: regex to strip currency symbols (e.g. "$ 5.00" -> 5.00).
- **Trimming**: Aggressive whitespace trimming.

## Components
- `src/lib/excel-parser.ts`: Add `headerRowIndex` support.
- `src/components/bom/import-dialog.tsx`: Add header row input, update mapping fields.
- `src/lib/csv-parser.ts` / `src/lib/import-utils.ts`: Extract and enhance mapping logic.

## Database
No schema changes required (fields already exist).
