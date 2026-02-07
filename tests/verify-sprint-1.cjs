/**
 * Sprint 1 Verification Script
 * - Runs migrations 001-005
 * - Mocks CHD Parts Master CSV
 * - Runs seed script
 * - Verifies normalization
 * - Cleans up
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function run() {
  console.log('--- Sprint 1 Verification ---');

  // 1. Check sqlite3
  try {
    require('sqlite3');
  } catch (e) {
    console.log('NOTICE: sqlite3 not found in environment. Skipping DB-dependent tests.');
    process.exit(0);
  }

  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'temp-test.db');
  const csvPath = path.join(__dirname, '..', 'samples', 'CHD Parts Master.csv');
  const backupPath = csvPath + '.bak';
  const migrationsDir = path.join(__dirname, '..', 'src-tauri', 'migrations');
  const seedScript = path.join(__dirname, '..', 'src-tauri', 'scripts', 'seed_load_calc_parts.cjs');

  try {
    // 2. Backup CSV
    if (fs.existsSync(csvPath)) {
      fs.copyFileSync(csvPath, backupPath);
      console.log('Backed up existing CSV');
    } else {
      // Ensure samples dir exists
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    }

    // 3. Mock CSV
    const mockData = `Manufacturer,PartNumber,Description,VoltageType,VoltageValue,Phase,Amperage,Wattage,HeatBTU
TestMfr,TEST-001,Test Part 1,120VAC_1PH,120,1,1.5,180,614
TestMfr,TEST-002,Test Part 2,24VAC,,1,0.5,,
`;
    fs.writeFileSync(csvPath, mockData);
    console.log('Created mock CSV');

    // 4. Run Migrations
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new sqlite3.Database(dbPath);
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .slice(0, 5); // 001 to 005

    console.log(`Running ${migrationFiles.length} migrations...`);
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) reject(new Error(`Migration ${file} failed: ${err.message}`));
          else resolve();
        });
      });
    }

    // 5. Run Seed
    console.log('Running seed script...');
    execSync(`node "${seedScript}" "${dbPath}"`, { 
      stdio: 'inherit', 
      env: { ...process.env, DB_PATH: dbPath } 
    });

    // 6. Verify
    console.log('Verifying data...');
    const parts = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM parts', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (parts.length !== 2) {
      throw new Error(`Expected 2 parts, found ${parts.length}`);
    }
    console.log('✓ parts table has 2 rows');

    const electrical = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM part_electrical', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const v120 = electrical.find(e => e.voltage === 120 || e.voltage === '120');
    if (v120?.voltage_type !== '120VAC_1PH') {
      throw new Error(`Normalization failed for 120VAC. Found: ${v120?.voltage_type}`);
    }
    
    const p2 = parts.find(r => r.part_number === 'TEST-002');
    const v24 = electrical.find(e => e.part_id === p2.id);
    if (v24?.voltage_type !== 'LEGACY') {
       throw new Error(`Normalization failed for 24VAC. Found: ${v24?.voltage_type}`);
    }

    console.log('✓ voltage_type normalization verified');
    console.log('--- Verification SUCCESS ---');

    await new Promise((resolve) => db.close(resolve));
  } catch (err) {
    console.error('--- Verification FAILED ---');
    console.error(err.message);
    process.exit(1);
  } finally {
    // 7. Cleanup
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath); } catch(e) {}
    }
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, csvPath);
      fs.unlinkSync(backupPath);
      console.log('Restored CSV backup');
    } else if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
      console.log('Removed mock CSV');
    }
  }
}

run();
