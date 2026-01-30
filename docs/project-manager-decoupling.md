# Project Manager Decoupling - Architecture Note

**Status**: Architectural Decision / Future Work  
**Last Updated**: 2026-01-30  
**Priority**: Medium (needed for multi-module workflow)

---

## Current State

The Project/Package selector is currently embedded within the **BOM Translation module**. When users click "BOM Translation" on the home page:

1. BOM page opens
2. Immediately shows Project Manager modal
3. User selects/creates Job Project → Package
4. Selected scope becomes the BOM workspace

**File**: `src/components/bom/ProjectManagerDialog.tsx` (or similar)

---

## The Problem

As we add more modules (Load Calculator, Quoting Tool, etc.), each needs access to the same Project/Package hierarchy:

- **Load Calculator** needs to link to BOM Packages for location sync
- **Quoting Tool** needs to create quotes for specific projects
- **Future modules** will also need project context

**Current limitation**: Project Manager is tightly coupled to BOM Translation and cannot be easily shared.

---

## Proposed Solution

Extract the Project Manager into a **standalone, reusable component** that can be:

1. **Opened from any module** via a shared hook/context
2. **Returns Project/Package context** to the calling module
3. **Maintains BOM Translation functionality** with its own dedicated selector

---

## Architecture Options

### Option A: Shared Modal Component (Recommended)

**Structure**:
```
src/
├── components/
│   └── project-manager/
│       ├── ProjectManagerModal.tsx      # Reusable modal
│       ├── ProjectSelector.tsx          # Project selection UI
│       ├── PackageSelector.tsx          # Package selection UI
│       └── hooks/
│           └── useProjectContext.ts     # Shared project state
├── stores/
│   └── project-store.ts                 # Zustand store for selected project/package
```

**Usage**:
```typescript
// In any module (Load Calc, Quoting, BOM)
const { openProjectManager, selectedProject, selectedPackage } = useProjectContext();

// Open the shared modal
openProjectManager({
  onSelect: (project, package) => {
    // Handle selection
  },
  allowCreate: true,  // Allow creating new projects
  filterByType: 'all' // Or 'bom', 'load_calc', etc.
});
```

**Benefits**:
- Single source of truth for project/package selection
- Consistent UI across all modules
- Easy to maintain

---

### Option B: Global Project Context

**Structure**:
- Add project/package selection to **global app state** (top-level provider)
- User selects project once when app opens
- All modules share that context

**Benefits**:
- No need to select project per module
- Always in context

**Drawbacks**:
- Less flexible (user might want different projects per module)
- Requires project switcher in header/navigation

---

### Option C: URL-Based Routing

**Structure**:
- Projects reflected in URL: `/project/14403/package/ECM1/bom`
- Project selector updates URL
- Modules read project from URL params

**Benefits**:
- Deep linking support
- Browser back/forward works
- Shareable URLs

**Drawbacks**:
- More complex routing
- Need to handle invalid project IDs in URLs

---

## Recommended Approach: Hybrid of A + C

1. **Shared Project Manager Modal** (Option A)
   - Reusable component for project/package selection
   - Available from any module
   - Updates global state

2. **URL Integration** (Option C - Phase 2)
   - Reflect project/package in URL
   - Enable deep linking
   - Sync URL with global state

3. **BOM Translation Dedicated Flow**
   - Keep current behavior: open Project Manager immediately on BOM entry
   - But use the shared component internally

---

## Implementation Plan

### Phase 1: Extract Shared Component

1. Create `src/stores/project-store.ts`
   - Track `selectedProjectId` and `selectedPackageId`
   - Actions: selectProject, selectPackage, clearSelection

2. Create `src/components/project-manager/ProjectManagerModal.tsx`
   - Extract logic from current BOM ProjectManagerDialog
   - Make it generic (accept callbacks, configuration)

3. Update BOM Translation
   - Replace inline ProjectManagerDialog with shared component
   - Ensure no functional changes

### Phase 2: Integrate with Load Calculator

1. Add project selection to Load Calculator workflow
   - On Load Calc entry: prompt for project selection
   - Option to create new or link to existing BOM Package

2. Sync locations between BOM and Load Calc
   - If linked to BOM Package, auto-populate `bom_locations`
   - Changes sync both ways

### Phase 3: Integrate with Quoting Tool

1. Similar integration as Load Calculator
2. Quote → BOM Package linking

### Phase 4: URL Integration (Optional)

1. Add project/package to URL routes
2. Enable deep linking

---

## Database Considerations

Current schema already supports this:

```sql
bom_job_projects (id, project_number)  -- Shared
bom_packages (id, project_id, package_name)  -- Shared
bom_locations (id, project_id, name)  -- Shared with Load Calc
```

New modules can reference the same tables:

```sql
load_calc_projects (id, bom_package_id)  -- Optional FK
quotes (id, bom_package_id)  -- Optional FK
```

---

## UI/UX Considerations

### Project Context Indicator

Add to app header or module headers:
```
┌─────────────────────────────────────────────────────────────┐
│ ATS CHD Tools                    Project: 14403 | ECM1 [▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Module content here]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Clicking `[▼]` opens Project Manager modal to switch context.

### Module-Specific Behavior

| Module | Project Selection Behavior |
|--------|---------------------------|
| BOM Translation | Block until project/package selected |
| Load Calculator | Optional link to BOM Package, can be standalone |
| Quoting Tool | Create quote for selected project |
| Parts Library | No project needed (global) |

---

## Open Questions

1. **Should project selection persist across app restarts?**
   - Save to local storage?
   - Or always start fresh?

2. **Can user have different "active" projects per module?**
   - Or one global active project?

3. **How to handle "no project selected" state?**
   - Empty workspace with prompt?
   - Redirect to project selector?

4. **BOM Translation special case**:
   - Keep current "blocking modal" behavior?
   - Or allow browsing then select later?

5. **Permissions**: 
   - Who can create projects? (Currently anyone)
   - Need approval workflow?

---

## Related Documents

- `load-calculator-architecture.md` - Load Calculator specs (needs Project Manager)
- `quoting-tool-concepts.md` - Quoting Tool specs (needs Project Manager)
- `docs/REQUIREMENTS.md` - PROJ-01 through PROJ-05 (Project/Package requirements)

---

## Action Items

- [ ] Create shared Project Manager component
- [ ] Extract from BOM Translation
- [ ] Integrate with Load Calculator
- [ ] Integrate with Quoting Tool
- [ ] Add project context indicator to UI
- [ ] Consider URL routing integration
