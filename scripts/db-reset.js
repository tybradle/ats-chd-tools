const fs = require('fs');
const path = require('path');
const os = require('os');

const IDENTIFIER = 'com.ats.chd-tools';
const DB_NAME = 'ats-chd-tools.db';

function getDbPath() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows: %LOCALAPPDATA%/{identifier}/{db}
    return path.join(process.env.LOCALAPPDATA || '', IDENTIFIER, DB_NAME);
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/{identifier}/{db}
    return path.join(os.homedir(), 'Library', 'Application Support', IDENTIFIER, DB_NAME);
  } else {
    // Linux: ~/.local/share/{identifier}/{db}
    return path.join(os.homedir(), '.local', 'share', IDENTIFIER, DB_NAME);
  }
}

const dbPath = getDbPath();

console.log(`Targeting database at: ${dbPath}`);

if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ Database deleted successfully.');
    console.log('👉 Restart the application to recreate the database with fresh migrations.');
  } catch (err) {
    console.error(`❌ Failed to delete database: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('ℹ️ Database file not found. It might have already been deleted or not yet created.');
}
