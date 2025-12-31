# Project Architecture

## High-Level Diagram
- **Frontend**: React 19 Single Page Application (SPA) using React Router 7.
- **Backend**: Tauri 2.0 Rust core, primarily used for system integration and database access.
- **Data Persistence**: Local SQLite database managed via `@tauri-apps/plugin-sql`.

## Key Components
- **BOM Translation**: Module for converting Bill of Materials between different formats.
- **Parts Library**: Shared database of master parts.
- **State Management**: Zustand stores for global application state.
- **UI System**: TailwindCSS 4 and shadcn/ui for consistent, accessible interface.

## Data Flow
1. User interacts with React frontend.
2. Frontend calls Tauri APIs or database plugins.
3. SQLite stores data locally on the user's machine.
4. Updates reflected back to UI via Zustand or local state.
