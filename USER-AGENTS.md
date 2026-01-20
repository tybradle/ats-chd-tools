# ATS CHD Tools - User Assistance Guide

<instructions>
This guide provides comprehensive assistance for users setting up, running, and troubleshooting ATS CHD Tools - a unified desktop application platform for the ATS CHD department.

## Document Purpose
This is a USER-ASSISTANCE guide designed for:
- End users installing and running the application
- System administrators deploying the application
- Support staff troubleshooting user issues

This is NOT a development guide. For development workflows, see AGENTS.md in the repository root.
</instructions>

---

<overview>
## Repository Overview

### Software Type & Purpose
**ATS CHD Tools** is a unified desktop application platform that replaces multiple Excel-based workflows for the ATS CHD department with a single Tauri desktop app.

**Key Characteristics:**
- **Platform**: Windows desktop application
- **Deployment**: 100% offline capable, single-user
- **Installer Size**: ~15-20 MB
- **Architecture**: Tauri 2.0 (Rust backend) + React 19 (TypeScript frontend)

### Main Technologies Used
| Technology | Purpose | Version |
|------------|---------|---------|
| Tauri | Desktop application framework | 2.0 |
| React | User interface framework | 19 |
| TypeScript | Programming language | 5.9 |
| SQLite | Local database | Built-in |
| TailwindCSS | UI styling | 4.1 |
| shadcn/ui | Pre-built UI components | Latest |

### Modules Included
1. **BOM Translation** (Primary) - Convert BOMs between CSV, Excel, XML, and EPLAN formats
2. **Parts Library** - Master parts catalog with full-text search
3. **Glenair Part Number Creator** - Build Glenair part numbers (fully implemented)

### Future Modules (Planned)
- QR Label Generator
- Quoting Workbook
- Heat/Load Calculator
</overview>

---

<resources>
## Official Documentation Resources

### Primary Documentation
- **Project README**: `README.md` - Basic project information
- **Project Overview**: `PROJECT.md` - Current state and module status
- **Architecture**: `ARCHITECTURE.md` - Technical architecture details
- **Development Setup**: `docs/DEVELOPMENT_SETUP.md` - GitHub authentication and development workflow
- **Code Style**: `CODE_STYLE.md` - Coding conventions (for reference)

### External Documentation
| Technology | Documentation URL |
|------------|-------------------|
| Tauri 2.0 | https://v2.tauri.app/ |
| React 19 | https://react.dev/ |
| TailwindCSS | https://tailwindcss.com/docs |
| shadcn/ui | https://ui.shadcn.com/ |
| Zustand | https://zustand-demo.pmnd.rs/ |

### Key Documentation Files
```
ats-chd-tools/
├── README.md                    # Basic project info
├── PROJECT.md                   # Project summary and status
├── ARCHITECTURE.md              # Technical architecture
├── CODE_STYLE.md                # Coding conventions
├── docs/
│   └── DEVELOPMENT_SETUP.md     # Setup guide for developers
└── .github/workflows/
    └── build-windows.yml        # CI/CD build configuration
```

**Note**: No `llms.txt` file is present in this repository.
</resources>

---

<structure>
## Key Directory Structure

```
ats-chd-tools/
├── src/                          # Frontend application source code
│   ├── components/
│   │   ├── ui/                   # Pre-built UI components (DO NOT MODIFY)
│   │   ├── layout/               # App shell and navigation
│   │   ├── bom/                  # BOM Translation module
│   │   └── glenair/              # Glenair Part Number Creator
│   ├── pages/                    # Application pages/screens
│   ├── lib/
│   │   └── db/
│   │       └── client.ts        # Database access layer
│   ├── stores/                   # State management (Zustand)
│   ├── types/                    # TypeScript type definitions
│   ├── App.tsx                   # Route configuration
│   └── main.tsx                  # Application entry point
│
├── src-tauri/                    # Rust backend application
│   ├── src/
│   │   ├── main.rs              # Binary entry point
│   │   └── lib.rs               # Tauri app setup
│   ├── migrations/               # Database schema migrations
│   │   ├── 001_initial.sql      # Core tables (parts, manufacturers)
│   │   ├── 002_bom_tables.sql   # BOM module tables
│   │   └── 003_glenair_tables.sql # Glenair module tables
│   ├── icons/                    # Application icons
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── public/                       # Static assets
├── docs/                         # Documentation
│   └── plans/                    # Implementation plans
├── .github/workflows/            # CI/CD workflows
│
├── package.json                  # Node.js dependencies and scripts
├── vite.config.ts               # Vite build configuration
├── tsconfig.json                # TypeScript configuration
├── eslint.config.js             # Code linting rules
├── .env.example                 # Environment variable template
└── README.md                    # Project overview
```

### Important User-Facing Directories

| Directory | Purpose | User Access |
|-----------|---------|-------------|
| `src/` | Application source code | Read-only |
| `src-tauri/` | Backend source code | Read-only |
| `public/` | Static assets | Read-only |
| `docs/` | Documentation | Read-only |

### Application Data Locations
- **Database**: Created automatically on first run (location varies by OS)
- **Configuration**: `src-tauri/tauri.conf.json` (developer-managed)
- **Logs**: Development logs shown in terminal; production logs handled by Tauri

</structure>

---

<setup>
## Setup & Installation

### Prerequisites

**Required Software:**
1. **Node.js** - JavaScript runtime (version 18 or higher recommended)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** - Node package manager (included with Node.js)
   - Verify installation: `npm --version`

3. **Git** - Version control (for cloning repository)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

**Optional (for development):**
- **Rust** - Required for building from source
  - Download from: https://www.rust-lang.org/tools/install
  - Verify installation: `rustc --version`
- **Tauri CLI** - For development builds
  - Installed via npm: `npm install -g @tauri-apps/cli`

### Installation Methods

#### Method 1: Production Build (Recommended for Users)

**Pre-built Installer:**
1. Download the Windows installer (`.msi` or `.exe`) from:
   - GitHub Releases (when published)
   - CI/CD build artifacts (`.github/workflows/build-windows.yml`)

2. Run the installer and follow the prompts

3. Launch the application from:
   - Start Menu → "ATS CHD Tools"
   - Desktop shortcut (if created during install)

#### Method 2: Development Build (For Advanced Users)

**Build from Source:**

```bash
# 1. Clone the repository
git clone <repository-url>
cd ats-chd-tools

# 2. Install Node.js dependencies
npm install

# 3. Build the application
npm run tauri:build

# 4. Find the installer
# Windows: src-tauri/target/release/bundle/msi/ or nsis/
```

**Output Location:**
```
src-tauri/target/release/bundle/
├── msi/              # Windows MSI installer
│   └── ATS CHD Tools_0.1.0_x64_en-US.msi
└── nsis/             # NSIS installer (alternative)
    └── ATS CHD Tools_0.1.0_x64-setup.exe
```

### Configuration

#### Environment Variables (Optional)

Copy the example environment file and configure:

```bash
# Copy the template
cp .env.example .env

# Edit the file (use nano, vim, or your preferred editor)
nano .env
```

**Environment Variables:**

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | No | - |
| `GITHUB_USERNAME` | GitHub username | No | - |
| `NODE_ENV` | Environment mode | No | `development` |

**Note**: Environment variables are primarily for development and CI/CD. End users typically do not need to configure these.

#### Application Configuration

The application is configured via `src-tauri/tauri.conf.json`:

| Setting | Value | Description |
|---------|-------|-------------|
| Product Name | "ATS CHD Tools" | Application name |
| Window Size | 1280x800 | Default window dimensions |
| Min Window Size | 900x600 | Minimum window dimensions |
| Database | SQLite (automatic) | Created on first run |

**Users cannot modify these settings** without rebuilding the application.

### Database Setup

The application automatically creates and initializes the SQLite database on first launch.

**Migrations** (run automatically):
1. `001_initial.sql` - Core tables (manufacturers, categories, parts)
2. `002_bom_tables.sql` - BOM Translation module tables
3. `003_glenair_tables.sql` - Glenair module tables

**No manual database setup required.**
</setup>

---

<usage>
## Running & Usage

### Development Commands

**For developers working on the source code:**

| Command | Purpose | Description |
|---------|---------|-------------|
| `npm run dev` | Start frontend only | Vite dev server on port 1420 (UI only, no backend) |
| `npm run tauri:dev` | Start full application | Frontend + Rust backend with hot reload |
| `npm run tauri:build` | Create production build | Generates Windows installer |
| `npm run lint` | Check code quality | Runs ESLint |
| `npm run lint -- --fix` | Fix lint issues | Auto-fixes ESLint errors |
| `tsc -b` | Type checking | Validates TypeScript types |

### End User Usage

**Launching the Application:**

**Method 1: Installed Application**
- Windows: Start Menu → "ATS CHD Tools"
- Or double-click the desktop shortcut

**Method 2: Development Build**
```bash
# From the project directory
npm run tauri:dev
```

### Application Interface

**Main Navigation (Sidebar):**
- **Home** - Dashboard and overview
- **BOM Translation** - Convert BOMs between formats
- **Glenair Part Number Creator** - Build Glenair part numbers
- **Parts Library** - Search and manage parts catalog
- **Settings** - Application configuration

**Keyboard Shortcuts:**
- Standard keyboard shortcuts (Ctrl+C, Ctrl+V, etc.) work where applicable
- Tab navigation between form fields
- Escape closes dialogs/modals

### Common Usage Patterns

#### 1. BOM Translation Module

**Workflow:**
1. Create or open a BOM project
2. Add locations (e.g., "Panel A", "Panel B")
3. Add items to locations via:
   - Manual entry
   - Import from CSV/Excel
   - Search from Parts Library
4. Export BOM in desired format (CSV, Excel, XML, EPLAN)

**Supported File Formats:**
- **Import**: CSV, Excel (.xlsx)
- **Export**: CSV, Excel (.xlsx), XML, EPLAN (.zw1), JSON

#### 2. Glenair Part Number Creator

**Workflow:**
1. Select shell style
2. Configure options (shell size, inserts, plating, etc.)
3. View generated part number
4. Copy to clipboard or save to BOM

#### 3. Parts Library

**Features:**
- Full-text search across all parts
- Filter by manufacturer and category
- View part details and pricing
- Add new parts to catalog

### Data Storage

**Database Location:**
- Windows: `%APPDATA%/com.ats.chd-tools/` or similar
- Database file: `ats-chd-tools.db`

**Data Backup:**
- Database is a single SQLite file
- Copy the `.db` file to backup
- No built-in backup feature (manual file copy required)

**Data Export:**
- BOM data can be exported via the BOM Translation module
- Supports CSV, Excel, XML, EPLAN, and JSON formats
</usage>

---

<troubleshooting>
## Troubleshooting

### Common Issues & Solutions

#### Installation Issues

**Issue: "Cannot find module" error during npm install**
```
Error: Cannot find module '@tauri-apps/api'
```
**Solution:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: Rust compiler not found (when building)**
```
error: linker `link.exe` not found
```
**Solution:**
1. Install Microsoft C++ Build Tools
2. Or install Visual Studio with C++ development workload
3. Download from: https://visualstudio.microsoft.com/downloads/

#### Runtime Issues

**Issue: Application window is blank/white**
**Causes:**
- Frontend build failed
- Database initialization error
- Configuration error

**Solutions:**
1. Check console for errors (F12 in development mode)
2. Verify database migrations ran successfully
3. Clear application data and restart:
   ```bash
   # Delete database (will reset all data)
   # Location varies by OS - see Data Storage section
   ```

**Issue: "Database is locked" error**
```
Error: database is locked
```
**Solution:**
1. Ensure only one instance of the application is running
2. Check for background processes using Task Manager
3. If persistent, restart the computer

**Issue: Import/Export fails**
**Possible Causes:**
- Invalid file format
- Corrupted file data
- Insufficient permissions

**Solutions:**
1. Verify file format matches expected type
2. Try opening file in Excel/CSV viewer to validate
3. Run application as administrator (Windows)
4. Check file permissions (right-click file → Properties → Security)

#### Performance Issues

**Issue: Application is slow to load**
**Possible Causes:**
- Large database size
- Too many parts/items
- Low system resources

**Solutions:**
1. Archive old projects (export and delete from database)
2. Clear application cache
3. Upgrade system hardware (RAM, CPU)
4. Close other applications

**Issue: Search is slow**
**Solution:**
1. The Parts Library uses full-text search (SQLite FTS5)
2. Ensure database indexes are intact
3. Consider reducing database size if very large

#### Build Issues (Developers)

**Issue: TypeScript errors during build**
```
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```
**Solution:**
```bash
# Type check to see all errors
tsc -b

# Fix lint issues (if applicable)
npm run lint -- --fix
```

**Issue: Tauri build fails**
```
Error: failed to compile application
```
**Solutions:**
1. Verify Rust installation: `rustc --version`
2. Update Tauri CLI: `npm install -g @tauri-apps/cli@latest`
3. Clear build cache:
   ```bash
   rm -rf src-tauri/target
   npm run tauri:build
   ```

### Log Locations

**Development Mode:**
- Logs shown in terminal/console where `npm run tauri:dev` is running
- Browser console (F12) for frontend errors

**Production Mode:**
- Windows Event Viewer (Windows) may have application logs
- No built-in log file for end users

**Error Messages:**
- Application displays user-friendly errors via toast notifications
- Technical errors logged to console (development only)

### Debug Methods

**Enable Detailed Logging:**
1. Run in development mode: `npm run tauri:dev`
2. Open browser console (F12)
3. Reproduce the issue
4. Check console for error messages

**Database Inspection:**
1. Install SQLite browser tool (e.g., DB Browser for SQLite)
2. Open the database file (see Data Storage section)
3. Inspect tables and data manually

**Configuration Validation:**
1. Check `src-tauri/tauri.conf.json` for syntax errors
2. Verify all paths are correct
3. Ensure environment variables are set (if using .env)

### Getting Help

**Before Reporting Issues:**
1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Try the latest version (if using older release)

**When Reporting Issues, Include:**
- Application version
- Operating system and version
- Steps to reproduce the issue
- Expected vs. actual behavior
- Error messages (screenshots if possible)
- Console logs (if available)

**Support Channels:**
- GitHub Issues (for bug reports and feature requests)
- Internal IT support (for department-specific issues)
- Project maintainer (contact information in repository)

</troubleshooting>

---

<references>
## Key Files for Reference

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview and quick start | All users |
| `PROJECT.md` | Project summary and module status | All users |
| `ARCHITECTURE.md` | Technical architecture details | Developers/Advanced users |
| `CODE_STYLE.md` | Coding conventions | Developers |
| `docs/DEVELOPMENT_SETUP.md` | GitHub authentication setup | Developers |
| `AGENTS.md` (this file) | User assistance guide | All users |

### Configuration Files

| File | Purpose | Editable |
|------|---------|----------|
| `package.json` | Node.js dependencies and scripts | Developers |
| `src-tauri/tauri.conf.json` | Tauri application configuration | Developers |
| `src-tauri/Cargo.toml` | Rust dependencies | Developers |
| `vite.config.ts` | Vite build configuration | Developers |
| `tsconfig.json` | TypeScript configuration | Developers |
| `.env.example` | Environment variable template | All users |
| `.env` | Actual environment variables | All users (create from .env.example) |

### Script Files

| Script | Purpose | Usage |
|--------|---------|-------|
| `npm run dev` | Start frontend dev server | Development |
| `npm run tauri:dev` | Start full application | Development |
| `npm run tauri:build` | Build production installer | Development |
| `npm run lint` | Check code quality | Development |
| `./dev-scripts/git-push.sh` | Push to GitHub with authentication | Development |

### Database Migration Files

| File | Purpose |
|------|---------|
| `src-tauri/migrations/001_initial.sql` | Core schema (manufacturers, categories, parts) |
| `src-tauri/migrations/002_bom_tables.sql` | BOM Translation module tables |
| `src-tauri/migrations/003_glenair_tables.sql` | Glenair module tables |

**Note**: Migrations run automatically on application startup. Do not modify these files unless you are a developer and understand the implications.

### CI/CD Files

| File | Purpose |
|------|---------|
| `.github/workflows/build-windows.yml` | Automatic Windows builds on push |

</references>

---

<summary>
## Quick Reference

### Installation Quick Start
```bash
# Clone repository
git clone <repository-url>
cd ats-chd-tools

# Install dependencies
npm install

# Run development version
npm run tauri:dev

# Or build for production
npm run tauri:build
```

### Essential Commands
| Command | Purpose |
|---------|---------|
| `npm run tauri:dev` | Start application (development) |
| `npm run tauri:build` | Build Windows installer |
| `npm run lint` | Check code quality |
| `tsc -b` | Type check code |

### Key Locations
- **Source Code**: `src/` (frontend), `src-tauri/` (backend)
- **Documentation**: `README.md`, `PROJECT.md`, `ARCHITECTURE.md`
- **Configuration**: `src-tauri/tauri.conf.json`
- **Database**: Automatic on first run

### Module Overview
1. **BOM Translation** - Convert BOMs between formats
2. **Glenair Part Number Creator** - Build Glenair part numbers
3. **Parts Library** - Search and manage parts catalog

### Getting Help
- Check troubleshooting section above
- Review documentation files listed in Key Files for Reference
- Report issues on GitHub with detailed information
</summary>
