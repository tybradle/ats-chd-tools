# Cross-Platform Development Workflow

## 🎯 Overview

**Development Environment**: Ubuntu VM (code-server SSH)  
**Target Platform**: Windows desktop  
**Strategy**: Develop and test 95% on Ubuntu, verify periodically on Windows

---

## ✅ What Works Identically on Ubuntu

**ALL application functionality works the same on Ubuntu and Windows:**

- ✅ Full Tauri app with SQLite database
- ✅ BOM import/export (CSV, Excel parsing)
- ✅ Database migrations and seeding
- ✅ All UI components and interactions
- ✅ File system operations
- ✅ DevTools and debugging
- ✅ Glenair part number builder
- ✅ State management (Zustand)

**Only cosmetic difference**: Window chrome (title bar, buttons) looks different. **All functionality is identical.**

---

## 📋 Recommended Daily Workflow

### Day-to-Day Development (Ubuntu)

```bash
# 1. Start development server
npm run tauri:dev

# App opens with full functionality
# - DevTools available (F12)
# - Hot reload on code changes
# - Full database access
# - Console logging works
```

**You should do 95% of development this way.** The app works identically to Windows.

### When to Test on Windows

**Only test on Windows for:**
1. **Before releasing** - Final verification
2. **File path edge cases** - Different path separators (rare in Tauri)
3. **Performance** - Test on actual target hardware
4. **User experience** - Native window feel

**Don't waste time testing on Windows for:**
- ❌ New features (test on Ubuntu)
- ❌ Bug fixes (test on Ubuntu)
- ❌ UI changes (test on Ubuntu)
- ❌ Database queries (test on Ubuntu)

---

## 🗄️ Database Development

See [DATABASE.md](./DATABASE.md) for complete guide.

**Quick start with test data:**

```bash
# Fresh start
npm run db:reset

# Generate test BOM data (3 projects, 110 items)
npm run db:seed:bom

# Restart app
npm run tauri:dev

# Apply seed data (in new terminal)
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_data.sql
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db < src-tauri/scripts/seed_bom_data.sql
```

Now you have a fully populated database to test imports, exports, etc.

---

## 🪟 Windows Testing Options

### Option 1: GitHub Actions (Current - Zero Setup)

**Best for**: Infrequent testing, CI/CD builds

**Pros:**
- ✅ No Windows machine needed
- ✅ Automated, consistent builds
- ✅ Already configured

**Cons:**
- ❌ ~10 minute build time
- ❌ Manual download and install
- ❌ Slow iteration cycle

**How to use:**
1. Commit and push to GitHub
2. Go to **Actions** → **Build Windows Installer**
3. Click **Run workflow**
4. Wait ~10 minutes
5. Download MSI installer from artifacts
6. Install on Windows and test

**When to use**: End of week testing, before releases

---

### Option 2: Local Windows VM (Recommended)

**Best for**: Frequent testing, faster iteration

**Setup (one-time, ~30 minutes):**

```bash
# On Ubuntu host
sudo apt install virtualbox virtualbox-ext-pack

# Download Windows 10/11 ISO from Microsoft
# https://www.microsoft.com/software-download/windows11

# Create VM in VirtualBox:
# - Name: windows-dev
# - RAM: 4GB minimum
# - Disk: 50GB
# - Network: Bridged adapter (for SSH access)
```

**Inside Windows VM:**
```powershell
# Install Node.js
winget install -e --id OpenJS.NodeJS.LTS

# Install Rust
winget install -e --id Rustlang.Rustup

# Install Git
winget install -e --id Git.Git

# Clone repo
git clone <your-repo-url> C:\dev\ats-chd-tools
cd C:\dev\ats-chd-tools
npm install
```

**Daily usage:**

```bash
# On Ubuntu (when ready to test on Windows)
git push

# In Windows VM
cd C:\dev\ats-chd-tools
git pull
npm run tauri:build

# Installer at: src-tauri\target\release\bundle\msi\*.msi
# Double-click to install and test
```

**Build time**: ~2 minutes (vs 10 on GitHub Actions)

**When to use**: Weekly testing, major feature completion

---

### Option 3: Physical Windows Machine

**Best for**: Final testing, performance validation

If you have a Windows machine on the network:

```bash
# On Ubuntu - sync code to Windows
./.dev-scripts/sync-to-windows.sh windows-machine-hostname

# On Windows machine
cd C:\dev\ats-chd-tools
npm run tauri:build
```

---

## 🔍 Debugging

### DevTools (Works in Production Now!)

**Enabled in both dev and production builds:**

- Press `F12` or `Ctrl+Shift+I` to open DevTools
- Right-click → **Inspect Element**
- Works in GitHub Actions builds

### Console Output

**Frontend logs:**
- Open DevTools (F12) → Console tab
- All `console.log()`, `console.error()` appear here

**Backend logs (Rust):**
- Terminal where you ran `npm run tauri:dev`
- Database errors, Tauri plugin errors

**Production log files:**
- Ubuntu: `~/.local/share/com.ats.chd-tools/logs/ats-chd-tools.log`
- Windows: `%APPDATA%\com.ats.chd-tools\logs\ats-chd-tools.log`

### Debugging BOM Import Issues

If import shows white screen or no progress:

```bash
# 1. Open DevTools (F12)
# 2. Go to Console tab
# 3. Try import again
# 4. Look for errors:
#    - Red text = JavaScript errors
#    - "Failed to import" = Check error message
#    - Database errors = Check SQLite logs

# 5. Check database directly
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db
> SELECT COUNT(*) FROM bom_items;  -- Should show items
> .quit
```

---

## 🚀 Recommended Workflow Summary

### Daily Development Cycle

```
1. Write code on Ubuntu (code-server)
   ↓
2. Test in `npm run tauri:dev` (Ubuntu)
   ↓
3. Fix bugs, iterate quickly
   ↓
4. Commit to Git when feature complete
   ↓
5. (Optional) Test on Windows VM weekly
   ↓
6. Before release: GitHub Actions → Test installer
```

### When You Need Windows Testing

**Weekly/Bi-weekly:**
- Boot Windows VM
- Pull latest code
- Build and test locally (~2 min build)

**Before Release:**
- Run GitHub Actions workflow
- Download installer
- Test full installation process on fresh Windows

---

## 📊 Development Time Breakdown

**Recommended time allocation:**
- 90% - Develop and test on Ubuntu (`npm run tauri:dev`)
- 5% - Test in Windows VM (weekly check-in)
- 5% - Final Windows installer testing (before release)

**Reality check:**
- SQLite, React, TypeScript, Tauri APIs are **100% cross-platform**
- File paths are handled by Tauri (abstracts OS differences)
- Only window chrome is different visually

---

## ⚡ Performance Tips

### Fast Iteration on Ubuntu

```bash
# Keep this running in one terminal
npm run tauri:dev

# Make code changes
# App auto-reloads (Vite HMR)
# Test immediately - no rebuild needed
```

### First-Time Setup Performance

```bash
# Only needed once or when dependencies change
npm install           # ~1 minute
npm run tauri:build   # ~3 minutes (first time)

# Subsequent dev starts
npm run tauri:dev     # ~10 seconds
```

---

## 🐛 Troubleshooting

### "Can't find database"
```bash
# Database location on Ubuntu
ls -la ~/.local/share/com.ats.chd-tools/

# If missing, app will create on startup
# Migrations run automatically
```

### "Import shows white screen"
```bash
# 1. Open DevTools (F12)
# 2. Check Console for errors
# 3. Verify database has tables:
sqlite3 ~/.local/share/com.ats.chd-tools/ats-chd-tools.db ".tables"

# Should show: bom_items, bom_locations, bom_projects, etc.
```

### "GitHub Actions build failing"
```bash
# Common causes:
# 1. TypeScript errors - Run locally: npm run build
# 2. Lint errors - Run: npm run lint
# 3. Missing migrations - Check src-tauri/src/lib.rs includes all

# Test build locally before pushing:
npm run build  # Should succeed with no errors
```

---

## 📚 Related Documentation

- [DATABASE.md](./DATABASE.md) - Complete database management guide
- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - Initial environment setup
- [AGENTS.md](../AGENTS.md) - Code conventions and patterns

---

## 💡 Pro Tips

**1. Use Ubuntu for everything during development**
- Faster iteration (no VM boot time)
- Full debugging capabilities
- Identical functionality to Windows

**2. Set up Windows VM once, use occasionally**
- Don't test on Windows for every change
- Only verify periodically (weekly or before release)

**3. Trust the platform abstractions**
- Tauri handles OS differences
- SQLite is cross-platform
- React doesn't care about OS

**4. Use GitHub Actions for final builds**
- Consistent, reproducible builds
- No "works on my machine" issues
- Automated versioning

**5. Keep database fresh with seed scripts**
- Quick reset with test data
- Don't manually create test data
- Use `npm run db:seed:bom` liberally
