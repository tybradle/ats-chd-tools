const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Logic from seed script to find DB
const CLI_DB_PATH = process.argv[2];
const DB_PATH = CLI_DB_PATH || process.env.DB_PATH || (process.env.APPDATA || process.env.LOCALAPPDATA || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.local', 'share', 'com.ats.chd-tools'));
const DB_FILE = path.isAbsolute(DB_PATH) && DB_PATH.endsWith('.db') ? DB_PATH : path.join(DB_PATH, 'ats-chd-tools.db');

console.log("Checking DB at:", DB_FILE);

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.get("SELECT COUNT(*) as count FROM parts", (err, row) => {
    if (err) {
      console.error("Error querying parts:", err);
      process.exit(1);
    }
    console.log(`Parts count: ${row.count}`);
    if (row.count > 0) {
      console.log("VERIFICATION PASS: Parts table has data.");
    } else {
      console.error("VERIFICATION FAIL: Parts table is empty.");
      process.exit(1);
    }
  });

  db.get("SELECT COUNT(*) as count FROM part_electrical", (err, row) => {
      if (err) {
        console.error("Error querying part_electrical:", err);
        process.exit(1);
      }
      console.log(`Electrical variants count: ${row.count}`);
    });
});
