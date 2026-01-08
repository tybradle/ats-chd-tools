# BOM Import Performance & UX Optimization

## Overview
Optimize the BOM Translation module's import workflow to resolve application lockups during file parsing and improve user experience with clear feedback.

## Problem Statement
The application currently freezes without feedback when importing large BOM files.
- **Redundant Processing**: Excel files are parsed 3 times in sequence (sheet listing, initial load, and sheet extraction).
- **Main Thread Blocking**: Synchronous parsing blocks React's render loop, preventing "Loading" states from appearing.
- **Zero Feedback**: No "Processing" indicator is shown until the database write phase, making the app appear crashed during the heavy parsing phase.

## Goals
- **Single-Pass Parsing**: Reduce Excel parsing time by ~60-70% through `WorkBook` object reuse.
- **Visual Feedback**: Show a "Processing file..." spinner immediately after file selection.
- **UI Responsiveness**: Ensure the loading state renders *before* the CPU-intensive parsing starts.

## Requirements
- **[FR-1] Optimized Excel Parser**: Modify `excel-parser.ts` to support reusing a pre-read `WorkBook` object.
- **[FR-2] Processing State**: Track a `processing` state in `ImportDialog` to show/hide the loading overlay.
- **[FR-3] Non-Blocking Entry**: Use `setTimeout(..., 0)` to allow the browser to paint the UI before starting the synchronous parse.
- **[UX-1] Loading Overlay**: Display a centered spinner/overlay during the parsing phase.

## Task Breakdown
- [ ] **[TASK-1]** Refactor `src/lib/excel-parser.ts` for workbook reuse.
- [ ] **[TASK-2]** Implement `processing` state and non-blocking handlers in `ImportDialog`.
- [ ] **[TASK-3]** Add visual "Processing..." overlay to `ImportDialog`.
- [ ] **[TASK-4]** Self-verification with large sample files.
