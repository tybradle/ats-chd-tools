const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const os = require('os');

const IDENTIFIER = 'com.ats.chd-tools';
const DB_NAME = 'ats-chd-tools.db';

function getDbPath() {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', IDENTIFIER, DB_NAME);
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', IDENTIFIER, DB_NAME);
  } else {
    return path.join(os.homedir(), '.local', 'share', IDENTIFIER, DB_NAME);
  }
}

const dbPath = getDbPath();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const migrations = [
  '001_initial.sql',
  '002_bom_tables.sql',
  '003_glenair_tables.sql',
  '004_project_package_scoping.sql',
  '005_load_calc_tables.sql'
];

async function runMigrations() {
  for (const file of migrations) {
    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(path.join(__dirname, 'src-tauri', 'migrations', file), 'utf8');
    
    // sqlite3's .exec can run multiple statements
    await new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  console.log('Migrations applied successfully');
  db.close();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  db.close();
  process.exit(1);
});
