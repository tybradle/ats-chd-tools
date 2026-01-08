#!/usr/bin/env node

/**
 * Generate BOM test data for development
 * Creates sample projects, locations, and BOM items
 */

const fs = require('fs');
const path = require('path');

// Sample manufacturers
const manufacturers = [
  'TE Connectivity', 'Molex', 'Amphenol', 'Glenair', 
  'ITT Cannon', 'Deutsch', 'Souriau', 'Radiall'
];

// Sample part categories
const categories = [
  'Connector', 'Contact', 'Backshell', 'Cable', 
  'Hardware', 'Tool', 'Wire', 'Accessory'
];

// Generate test BOM items
function generateBomItems(projectId, locationId, count = 50) {
  const items = [];
  for (let i = 1; i <= count; i++) {
    const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const partNum = `${manufacturer.substring(0, 3).toUpperCase()}-${String(i).padStart(5, '0')}`;
    
    items.push({
      project_id: projectId,
      location_id: locationId,
      part_number: partNum,
      description: `${category} assembly - ${manufacturer}`,
      secondary_description: `Test component for development`,
      quantity: Math.floor(Math.random() * 100) + 1,
      unit: Math.random() > 0.3 ? 'EA' : 'FT',
      unit_price: (Math.random() * 500).toFixed(2),
      manufacturer: manufacturer,
      category: category,
      reference_designator: Math.random() > 0.5 ? `J${i}` : null,
      is_spare: Math.random() > 0.8 ? 1 : 0,
      sort_order: i
    });
  }
  return items;
}

// Generate SQL
const sql = [];

// Add test projects
sql.push(`-- Test BOM Projects`);
sql.push(`INSERT INTO bom_projects (name, customer, description, status, created_by) VALUES`);
sql.push(`  ('Test Avionics System', 'Boeing', 'Sample avionics harness project', 'active', 'dev'),`);
sql.push(`  ('Marine Navigation Unit', 'Northrop Grumman', 'Naval electronics assembly', 'active', 'dev'),`);
sql.push(`  ('Satellite Comm Module', 'SpaceX', 'Communication harness for satellite', 'active', 'dev');`);
sql.push(``);

// Add test locations
sql.push(`-- Test Locations`);
sql.push(`INSERT INTO bom_locations (project_id, name, description) VALUES`);
sql.push(`  (1, 'Main Harness', 'Primary wiring harness'),`);
sql.push(`  (1, 'Cockpit Panel', 'Instrument panel assembly'),`);
sql.push(`  (2, 'Power Distribution', 'Power routing assembly'),`);
sql.push(`  (2, 'Sensor Array', 'Navigation sensor connections'),`);
sql.push(`  (3, 'Antenna Feed', 'RF connection harness');`);
sql.push(``);

// Add test BOM items
sql.push(`-- Test BOM Items`);
sql.push(`INSERT INTO bom_items (`);
sql.push(`  project_id, location_id, part_number, description, secondary_description,`);
sql.push(`  quantity, unit, unit_price, manufacturer, category, reference_designator, is_spare, sort_order`);
sql.push(`) VALUES`);

const allItems = [
  ...generateBomItems(1, 1, 25),
  ...generateBomItems(1, 2, 20),
  ...generateBomItems(2, 3, 30),
  ...generateBomItems(2, 4, 15),
  ...generateBomItems(3, 5, 20)
];

allItems.forEach((item, idx) => {
  const values = [
    item.project_id,
    item.location_id,
    `'${item.part_number}'`,
    `'${item.description}'`,
    item.secondary_description ? `'${item.secondary_description}'` : 'NULL',
    item.quantity,
    `'${item.unit}'`,
    item.unit_price,
    `'${item.manufacturer}'`,
    item.category ? `'${item.category}'` : 'NULL',
    item.reference_designator ? `'${item.reference_designator}'` : 'NULL',
    item.is_spare,
    item.sort_order
  ];
  
  const comma = idx < allItems.length - 1 ? ',' : ';';
  sql.push(`  (${values.join(', ')})${comma}`);
});

sql.push(``);

// Write to file
const outputPath = path.join(__dirname, 'seed_bom_data.sql');
fs.writeFileSync(outputPath, sql.join('\n'), 'utf8');

console.log(`✅ Generated ${allItems.length} test BOM items`);
console.log(`📝 Output: ${outputPath}`);
console.log(`\n🔧 To apply to your database:`);
console.log(`   1. Stop the app if running`);
console.log(`   2. Delete existing DB: rm ~/.local/share/com.ats.chd-tools/ats-chd-tools.db`);
console.log(`   3. Restart app (migrations will run)`);
console.log(`   4. Apply seed: sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_bom_data.sql`);
