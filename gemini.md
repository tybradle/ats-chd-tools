# Gemini Workspace Context

## Project Overview
**Name**: ATS CHD Tools
**Description**: Unified desktop platform to replace Excel workflows for the ATS CHD department. The application is a single-user, offline Windows desktop app built with Tauri.
**Current Focus**: BOM Translation and Parts Library modules.

## Technology Stack
- **Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite
- **Desktop/Native**: Tauri 2.0 (Rust)
- **Styling**: TailwindCSS 4, shadcn/ui
- **State Management**: Zustand 5
- **Form Handling**: react-hook-form + zod
- **Database**: SQLite (via @tauri-apps/plugin-sql)
- **Routing**: react-router-dom

## Project Structure
- `src/`: Frontend source code (React components, pages, lib).
- `src-tauri/`: Backend source code (Rust, Tauri configuration).
- `src-tauri/migrations/`: Database migration files.
- `src/lib/db/client.ts`: Centralized database query logic.

## Key Modules
1. **BOM Translation**: Import, manage, and export Bill of Materials.
2. **Parts Library**: Library for managing and searching parts.
3. **QR Labeling**: (Future) Label generation.

## Development Commands
- `npm run dev`: Start frontend dev server.
- `npm run tauri:dev`: Start Tauri dev environment.
- `npm run tauri:build`: Build for production.
- `npm run db:reset`: Reset database.
- `npm run db:seed:bom`: Seed BOM test data.

## Deployment
- **Target**: Windows Desktop
- **Environment**: Offline, Single-user
