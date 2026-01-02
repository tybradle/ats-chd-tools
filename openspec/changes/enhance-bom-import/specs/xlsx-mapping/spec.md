# Requirements: XLSX Import & Mapping

## ADDED Requirements

### Requirement: Flexible Header Selection
The system MUST allow users to specify which row in the imported file contains the column headers, rather than assuming it is always the first row.

#### Scenario: Import Excel file with metadata in top rows
- **Given** an Excel file has a project title in Row 1 and Date in Row 2
- **And** the actual column headers ("Part Number", "Qty") are in Row 3
- **When** the user selects the file and chooses Row 3 as the "Header Row"
- **Then** the mapping dropdowns should show the values from Row 3
- **And** the data preview should show rows starting from Row 4

### Requirement: Complete Field Mapping
The mapping interface MUST include all available BOM Item fields, specifically ensuring `Secondary Description` is available for mapping.

#### Scenario: Map Secondary Description
- **Given** the user has an Excel file with a "Technical Details" column
- **When** they reach the Mapping step
- **Then** they should see "Secondary Description" as a target field
- **And** they can map "Technical Details" to "Secondary Description"
- **And** the imported item will preserve this data

### Requirement: Robust Data Parsing
The import process MUST robustly handle dirty data, specifically currency symbols in price columns and mixed text/numbers in quantity columns.

#### Scenario: Import Price with Currency Symbol
- **Given** the "Unit Price" column contains values like "$12.50" or "€ 5.00"
- **When** the file is imported
- **Then** the system should strip the symbol and store `12.50` or `5.00` as a number

#### Scenario: Import Quantity with Text
- **Given** the "Quantity" column contains "10 (Spare)"
- **When** the file is imported
- **Then** the system should extract `10` as the quantity
