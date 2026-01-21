# Phase 1 Plan 01-04 Summary

**Completed:** 2026-01-20
**Status:** ✅ Complete

## Objective
Deliver Phase 1 entry UX: landing page tiles + BOM workspace gated by blocking modal.

## Changes Made

### Home Page (`src/pages/home.tsx`)
- Already correctly implemented: non-ready modules show "Coming Soon" badge
- Disabled tiles have `pointer-events-none` and reduced opacity
- No action on click (per phase requirements)

### BOM Page Refactor (`src/pages/bom.tsx`)
**New Behavior:**
- Opens `ProjectManagerDialog` immediately on mount if no scope selected
- Modal is **blocking**: `onOpenChange(false)` is ignored when `currentScopePackageId === null`
- Displays current scope in header: `{project_number} / {package_name}` with "Change" button
- Shows LocationTabs + BomTable only when scope is selected

**Scope Selection Flow:**
```
1. User enters /bom
2. Modal opens (can't dismiss without selecting)
3. User selects package → setScope() → modal closes
4. BOM workspace loads with locations/items
```

### Legacy Route Handler (`src/pages/bom-project.tsx`)
- Converted to redirect handler: treats `:projectId` as `packageId`
- Calls `setScope()` then navigates to `/bom`
- Modal still opens on `/bom` per phase requirements

### Component Updates for Scope-First Architecture
Updated all BOM components to use new store state:
- **LocationTabs**: `currentScopePackageId` instead of `currentProject.id`
- **BomTable**: `currentScopePackageId` instead of `currentProject.id`
- **ExportDialog**: `currentScope` instead of `currentProject`
- **ImportDialog**: `currentScopePackageId` instead of `currentProject.id`

### App Routes (`src/App.tsx`)
- `/bom` - Main BOM workspace entry (gated by modal)
- `/bom/:projectId` - Legacy redirect (treats as packageId)

## Verification
- ✅ `npm run build` succeeds
- ✅ Entering `/bom` without scope opens blocking modal
- ✅ Cannot dismiss modal without selecting package
- ✅ Selecting package closes modal and loads workspace
- ✅ Scope display shows "Change" button to reopen modal

## Next Steps
- Plan 01-05: Complete Project Manager Dialog with full CRUD + inline uniqueness errors
