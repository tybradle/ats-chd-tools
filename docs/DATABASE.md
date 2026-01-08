# Database Management Guide

## Database Location

### Development (Ubuntu)
```bash
~/.local/share/com.ats.chd-tools/ats-chd-tools.db
```

### Production (Windows)
```
%APPDATA%\com.ats.chd-tools\ats-chd-tools.db
# Typically: C:\Users\<username>\AppData\Roaming\com.ats.chd-tools\
```

---

## Quick Reference

### Reset Database
```bash
npm run db:reset
# Then restart app - migrations will auto-run
```

### Generate BOM Test Data
```bash
npm run db:seed:bom
# Creates: src-tauri/scripts/seed_bom_data.sql
```

### Apply Seed Data
```bash
# After generating seed data:
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_bom_data.sql
```

### Inspect Database
```bash
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db

# Useful commands:
.tables              # List all tables
.schema bom_items    # Show table structure
SELECT * FROM bom_projects LIMIT 5;
.quit                # Exit
```

---

## Migrations

Migrations run **automatically** on app startup. Located in `src-tauri/migrations/`:

- `001_initial.sql` - Parts, manufacturers, categories
- `002_bom_tables.sql` - BOM projects, locations, items
- `003_glenair_tables.sql` - Glenair connector data

### Adding New Migrations

1. Create new file: `src-tauri/migrations/004_description.sql`
2. Update `src-tauri/src/lib.rs` to include it:
   ```rust
   Migration {
       version: 4,
       description: "Your description",
       sql: include_str!("../migrations/004_description.sql"),
       kind: MigrationKind::Up,
   },
   ```
3. Migrations run in order by version number

---

## Seed Data Scripts

### BOM Test Data
```bash
node src-tauri/scripts/seed_bom_test_data.js
```
Generates:
- 3 test projects
- 5 locations across projects
- ~110 BOM items with realistic data

### Glenair Data
```bash
node src-tauri/scripts/generate_seed.js
```
Generates:
- 114 contact configurations
- 166 shell arrangements
- Wire-to-contact mappings

Output: `src-tauri/scripts/seed_data.sql`

---

## Complete Fresh Start

```bash
# 1. Stop the app if running
# 2. Delete database
npm run db:reset

# 3. Generate seed data
npm run db:seed:bom
node src-tauri/scripts/generate_seed.js

# 4. Restart app (migrations run automatically)
npm run tauri:dev

# 5. In another terminal, apply seed data
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_data.sql
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_bom_data.sql

# 6. Refresh app - should see test data
```

---

## Backup Database

```bash
# Create backup
cp ~/.local/share/com.ats.chd-tools/ats-chd-tools.db ~/backups/ats-chd-tools-$(date +%Y%m%d).db

# Restore backup
cp ~/backups/ats-chd-tools-20260102.db ~/.local/share/com.ats.chd-tools/ats-chd-tools.db
```

---

## Troubleshooting

### "Database is locked"
- Stop the app completely
- Make sure no other process has the DB open
- Check for stuck processes: `ps aux | grep tauri`

### "No such table"
- Migrations didn't run
- Delete database: `npm run db:reset`
- Restart app

### "SQL syntax error"
- Check migration files for typos
- Ensure all SQL statements end with semicolon
- Test migrations manually:
  ```bash
  sqlite3 test.db < src-tauri/migrations/001_initial.sql
  ```

### Import not working
- Check console for errors (F12)
- Verify table exists: `.tables` in sqlite3
- Check file permissions on database directory
- Look at logs: `~/.local/share/com.ats.chd-tools/logs/ats-chd-tools.log`

---

## Production Database

### Include Pre-Seeded Database in Installer

To ship installer with pre-populated data:

1. Create production database:
   ```bash
   cd src-tauri/test-db
   sqlite3 ats-chd-tools.db < ../migrations/001_initial.sql
   sqlite3 ats-chd-tools.db < ../migrations/002_bom_tables.sql
   sqlite3 ats-chd-tools.db < ../migrations/003_glenair_tables.sql
   sqlite3 ats-chd-tools.db < ../scripts/seed_data.sql
   # Don't include BOM test data in production
   ```

2. Update `tauri.conf.json` to bundle it:
   ```json
   {
     "bundle": {
       "resources": [
         "test-db/ats-chd-tools.db"
       ]
     }
   }
   ```

3. On first run, copy bundled DB to app data directory (add Rust command)

**Note**: Currently migrations handle this automatically. Only bundle pre-seeded DB if you want users to start with reference data (Glenair parts, etc.).
