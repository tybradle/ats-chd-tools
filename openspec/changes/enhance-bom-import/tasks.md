# Tasks: Enhance BOM Import

## 1. Library Updates
- [x] Refactor `src/lib/excel-parser.ts` to support `headerRowIndex` parameter in `parseExcelSheet`.
- [x] Create `src/lib/import-utils.ts` (or update `csv-parser.ts`) with robust data cleaning functions:
    - `parseQuantity(value: string): number`
    - `parseCurrency(value: string): number | null`

## 2. Component Updates
- [x] Update `ImportDialog` state to track `headerRowIndex`.
- [x] Add UI control for "Header Row" in the Mapping step (input type number).
- [x] Trigger re-parsing of headers and data when `headerRowIndex` changes.
- [x] Add `secondaryDescription` to the `fields` list in `ImportDialog`.

## 3. Integration & Validation
- [x] Update `handleImport` to use the robust data parsing functions.
- [x] Verify `Secondary Description` is correctly passed to `bulkImportItems`.
- [x] Manual Test: Import Excel with headers on row 5.
- [x] Manual Test: Import Excel with prices like "$100".
