#!/usr/bin/env node
/**
 * Seed Load Calc parts from CHD Parts Master CSV
 * Conventions:
 * - Uses local CSV at ./samples/CHD Parts Master.csv if present
 * - Idempotent upsert by (manufacturer, part_number)
 * - Normalizes voltage types to known VoltageType values
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const sqlite3 = require('sqlite3').verbose();

// Resolve DB path: allow CLI arg or env override; fall back to common platform locations
const CLI_DB_PATH = process.argv[2];
const DB_PATH = CLI_DB_PATH || process.env.DB_PATH || (process.env.APPDATA || process.env.LOCALAPPDATA || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.local', 'share', 'com.ats.chd-tools'));
const DB_FILE = path.isAbsolute(DB_PATH) && DB_PATH.endsWith('.db') ? DB_PATH : path.join(DB_PATH, 'ats-chd-tools.db');
const CSV_PATH = path.join(__dirname, '..', '..', 'samples', 'CHD Parts Master.csv');

function normalizeVoltageType(src) {
  if (!src) return 'LEGACY';
  const s = src.toString().trim().toUpperCase();
  if (s === 'DC') return 'DC';
  if (s.includes('120') && s.includes('1')) return '120VAC_1PH';
  if (s.includes('230') && s.includes('3')) return '230VAC_3PH';
  if (s.includes('480') && s.includes('3')) return '480VAC_3PH';
  if (s.includes('480') && s.includes('1')) return '480VAC_1PH';
  if (s.includes('600')) return '600VAC_3PH';
  return 'LEGACY';
}

function parseCSV(text) {
  // RFC4180-ish parser: handles quoted fields and doubled quotes
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* ignore */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  // push last
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found:', CSV_PATH);
  process.exit(1);
}

// Ensure DB directory exists
try {
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
} catch (e) {
  console.warn('Failed to ensure DB directory exists:', e.message);
}

const db = new sqlite3.Database(DB_FILE);
const runAsync = util.promisify(db.run.bind(db));
const getAsync = util.promisify(db.get.bind(db));
const allAsync = util.promisify(db.all.bind(db));
const closeAsync = util.promisify(db.close.bind(db));

async function seed() {
  const data = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(data).map(r => r.map(c => (typeof c === 'string' ? c.trim() : c)) ).filter(r => r.length > 0);
  if (rows.length === 0) {
    console.error('CSV is empty');
    await closeAsync();
    process.exit(1);
  }

  const header = rows.shift().map(h => h || '');

  for (const cols of rows) {
    const obj = {};
    header.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    const manufacturer = obj['Manufacturer'] || 'Unknown';
    const part_number = obj['PartNumber'] || obj['Part Number'] || obj['PN'] || 'UNKNOWN';
    const voltage_src = obj['Voltage'] || obj['VoltageType'] || '';
    const voltage_type = normalizeVoltageType(voltage_src);

    // Upsert manufacturer
    await runAsync(`INSERT INTO manufacturers (name) VALUES (?) ON CONFLICT(name) DO NOTHING`, [manufacturer]);
    const mrow = await getAsync(`SELECT id FROM manufacturers WHERE name = ? LIMIT 1`, [manufacturer]);
    const manufacturer_id = mrow?.id;
    if (!manufacturer_id) continue;

    // Upsert part
    await runAsync(`INSERT INTO parts (part_number, manufacturer_id, description) VALUES (?, ?, ?) ON CONFLICT(part_number, manufacturer_id) DO UPDATE SET description = excluded.description`, [part_number, manufacturer_id, obj['Description'] || null]);
    const prow = await getAsync(`SELECT id FROM parts WHERE part_number = ? AND manufacturer_id = ? LIMIT 1`, [part_number, manufacturer_id]);
    const partId = prow?.id;
    if (!partId) continue;

    // Upsert part_electrical (by part_id + voltage_type)
    await runAsync(`INSERT INTO part_electrical (part_id, voltage, phase, amperage, wattage, heat_dissipation_btu, voltage_type) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(part_id, voltage_type) DO UPDATE SET amperage = excluded.amperage, wattage = excluded.wattage`, [partId, obj['VoltageValue'] || null, obj['Phase'] || null, obj['Amperage'] || null, obj['Wattage'] || null, obj['HeatBTU'] || null, voltage_type]);
  }

  await closeAsync();
  console.log('Seed completed');
}

seed().catch(async (err) => {
  console.error('Seed failed:', err && err.message ? err.message : err);
  try { await closeAsync(); } catch (e) {}
  process.exit(1);
});
