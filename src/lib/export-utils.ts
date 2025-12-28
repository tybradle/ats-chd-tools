import type { BOMItem, BOMLocation, BOMProject, BOMProjectWithCounts } from '@/types/bom';

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Eplan P8-compatible XML export
 */
export function generateEplanXML(
  project: BOMProject | BOMProjectWithCounts,
  locations: BOMLocation[],
  items: BOMItem[]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<EplanBomExport>
  <Project Number="${escapeXml(project.project_number)}" Name="${escapeXml(project.package_name)}" Version="${escapeXml(project.version)}">
`;

  locations.forEach(loc => {
    const locItems = items.filter(i => i.location_id === loc.id);
    if (locItems.length === 0) return;

    xml += `    <KittingLocation Name="${escapeXml(loc.export_name || loc.name)}">\n`;
    
    locItems.forEach(item => {
      xml += `      <Part>
        <PartNumber>${escapeXml(item.part_number)}</PartNumber>
        <Description>${escapeXml(item.description)}</Description>
        <SecondaryDescription>${escapeXml(item.secondary_description)}</SecondaryDescription>
        <Quantity>${item.quantity}</Quantity>
        <Unit>${escapeXml(item.unit)}</Unit>
        <UnitPrice>${item.unit_price ?? ''}</UnitPrice>
        <Manufacturer>${escapeXml(item.manufacturer)}</Manufacturer>
        <Supplier>${escapeXml(item.supplier)}</Supplier>
        <Category>${escapeXml(item.category)}</Category>
        <RefDes>${escapeXml(item.reference_designator)}</RefDes>
        <IsSpare>${item.is_spare ? 'true' : 'false'}</IsSpare>
      </Part>\n`;
    });

    xml += `    </KittingLocation>\n`;
  });

  xml += `  </Project>
</EplanBomExport>`;

  return xml;
}

/**
 * Generate CSV export for current location's items
 */
export function generateCSV(items: BOMItem[]): string {
  const headers = [
    'Part Number',
    'Manufacturer',
    'Description',
    'Secondary Description',
    'Quantity',
    'Unit',
    'Unit Price',
    'Supplier',
    'Category',
    'Ref Des',
    'Is Spare'
  ];
  
  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = items.map(i => [
    escapeCSV(i.part_number),
    escapeCSV(i.manufacturer),
    escapeCSV(i.description),
    escapeCSV(i.secondary_description),
    escapeCSV(i.quantity),
    escapeCSV(i.unit),
    escapeCSV(i.unit_price),
    escapeCSV(i.supplier),
    escapeCSV(i.category),
    escapeCSV(i.reference_designator),
    escapeCSV(i.is_spare ? 'Yes' : 'No'),
  ].join(','));
  
  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate JSON export with full project structure
 */
export function generateJSON(
  project: BOMProject | BOMProjectWithCounts,
  locations: BOMLocation[],
  items: BOMItem[]
): string {
  const exportData = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    project: {
      projectNumber: project.project_number,
      packageName: project.package_name,
      name: project.name,
      description: project.description,
      version: project.version,
    },
    locations: locations.map(loc => ({
      name: loc.name,
      exportName: loc.export_name,
      items: items
        .filter(i => i.location_id === loc.id)
        .map(item => ({
          partNumber: item.part_number,
          description: item.description,
          secondaryDescription: item.secondary_description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          manufacturer: item.manufacturer,
          supplier: item.supplier,
          category: item.category,
          referenceDesignator: item.reference_designator,
          isSpare: item.is_spare === 1,
        })),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate .zw1 header file for Eplan imports
 * This file tells Eplan how to interpret the XML structure
 */
export function generateZW1Header(projectNumber: string): string {
  return `[Header]
Version=1.0
Project=${projectNumber}
Type=BOM
Format=XML
Encoding=UTF-8

[ColumnMapping]
PartNumber=PartNumber
Description=Description
Quantity=Quantity
Unit=Unit
Manufacturer=Manufacturer
Supplier=Supplier
RefDes=RefDes

[Options]
CreateParts=true
UpdateExisting=true
`;
}
