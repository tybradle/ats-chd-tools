## Phase 4: Project Detail Page Shell (1 hour)
# BOM Translation Module - Phase 4: Project Detail Page & Location Tabs

**Navigation:** [Phase 1](./2025-12-27-bom-translation-module-phase-1-database.md) | [Phase 2](./2025-12-27-bom-translation-module-phase-2-store.md) | [Phase 3](./2025-12-27-bom-translation-module-phase-3-projects-ui.md) | **[Phase 4]** | [Phase 5](./2025-12-27-bom-translation-module-phase-5-bom-table.md) | [Phase 6](./2025-12-27-bom-translation-module-phase-6-import-export.md) | [Index](./2025-12-27-bom-translation-module-INDEX.md)

**Prerequisites:**
- [ ] Phase 3 completed (project selection UI)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create project detail routing and location management tabs for BOM editing.

**Architecture:** Project detail page with location tabs component for organizing BOM items by kitting location.

**Tech Stack:** React Router, React components, Zustand state management.

---

## Phase 4: Project Detail Page Shell (1 hour)

### Task 4.1: Create Project Detail Route and Page

**Files:**
- Create: `src/pages/bom-project.tsx`
- Modify: `src/App.tsx`

**Step 1: Create project detail page**

Create `src/pages/bom-project.tsx`:

```typescript
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';

export function BomProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading, error, loadProject } = useBOMStore();

  useEffect(() => {
    if (projectId) {
      loadProject(Number(projectId));
    }
  }, [projectId, loadProject]);

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Project</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Error</CardTitle>
            <CardDescription>
              {error || 'Project not found'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/bom')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bom')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BOM Management</h1>
            <p className="text-muted-foreground">
              {currentProject.name || `${currentProject.project_number} - ${currentProject.package_name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Locations and items will be shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Location tabs and editable BOM table will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Add route to App**

Modify `src/App.tsx`, import at top:

```typescript
import { BomProjectPage } from '@/pages/bom-project';
```

Add route inside `<Routes>`:

```typescript
<Route path="/bom/:projectId" element={<BomProjectPage />} />
```

**Step 3: Test navigation**

Run: `npm run tauri:dev`

Test:
1. Go to BOM page
2. Click project from list or create new one
3. Should navigate to `/bom/:projectId`
4. Shows project name in header
5. "Back to Projects" button works

**Step 4: Commit**

```bash
git add src/pages/bom-project.tsx src/App.tsx
git commit -m "feat(ui): add project detail page shell with routing"
```

---

**[Continue to Phase 5 in next message due to length...]**

This plan is comprehensive and follows the bite-sized task structure. Each step is 2-5 minutes, with exact file paths, complete code, and verification steps. Should I continue with Phase 5 (Location Tabs), Phase 6 (Editable BOM Table), Phase 7 (CSV Import), and Phase 8 (Export)?

---

## Phase 5: Location Tabs Component (1.5 hours)

### Task 5.1: Create Location Tabs Component

**Files:**
- Create: `src/components/bom/location-tabs.tsx`

**Step 1: Create component**

Create `src/components/bom/location-tabs.tsx` (replicated from BOM_JS with Tauri/Zustand adaptations):

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, X, Pencil } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function LocationTabs() {
  const {
    currentProject,
    locations,
    currentLocationId,
    setCurrentLocationId,
    createLocation,
    updateLocation,
    deleteLocation,
    loading,
  } = useBOMStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string; export_name: string | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [editExportName, setEditExportName] = useState('');

  const handleAdd = async () => {
    if (!currentProject || !newName.trim()) return;

    try {
      await createLocation(currentProject.id, newName.trim());
      setNewName('');
      setIsAddOpen(false);
      toast.success('Location added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add location');
    }
  };

  const handleEditClick = (loc: any) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditExportName(loc.export_name || '');
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLocation || !editName.trim()) return;

    try {
      await updateLocation(
        editingLocation.id,
        editName.trim(),
        editExportName.trim() || null
      );
      setIsEditOpen(false);
      setEditingLocation(null);
      toast.success('Location updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update location');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete location "${name}"? This will also delete all items in this location.`)) {
      return;
    }

    try {
      await deleteLocation(id);
      toast.success('Location deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete location');
    }
  };

  return (
    <div className="border-b bg-muted/30">
      <div className="flex items-center">
        {/* Tabs */}
        <div className="flex flex-1 overflow-x-auto no-scrollbar">
          {locations.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted-foreground italic">
              No locations created yet.
            </div>
          ) : (
            locations.map((loc, index) => (
              <div
                key={loc.id}
                className={cn(
                  "group relative flex items-center border-r border-t transition-colors",
                  currentLocationId === loc.id
                    ? "bg-background border-t-2 border-t-primary border-r-transparent"
                    : "bg-muted/50 hover:bg-muted/70 border-t-transparent"
                )}
              >
                <button
                  onClick={() => setCurrentLocationId(loc.id)}
                  className="px-6 py-2.5 text-sm font-medium text-left min-w-[100px]"
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <span>{loc.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({loc.item_count})
                    </span>
                    {loc.export_name && (
                      <span className="text-[10px] text-blue-500 uppercase font-bold" title={`Export: ${loc.export_name}`}>
                        [${loc.export_name}]
                      </span>
                    )}
                  </div>
                </button>

                {/* Actions */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                  <button
                    onClick={() => handleEditClick(loc)}
                    className="p-1 rounded hover:bg-primary hover:text-primary-foreground"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id, loc.name)}
                    className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground"
                    title="Delete"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Button */}
        <div className="border-l border-t">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 border-0 rounded-none hover:bg-muted/50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Location</DialogTitle>
                <DialogDescription>
                  e.g., CP1, MA, FIELD
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., CP1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!newName.trim()}>
                  Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Export Name (Optional)</Label>
              <Input
                value={editExportName}
                onChange={(e) => setEditExportName(e.target.value)}
                placeholder="Name for XML export"
              />
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!editName.trim()}>
              Update Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Wire up to Project Detail Page**

Modify `src/pages/bom-project.tsx`:

1. Import LocationTabs:
```typescript
import { LocationTabs } from '@/components/bom/location-tabs';
```

2. Add to render (replace placeholder card):
```typescript
      {/* Locations */}
      <LocationTabs />

      {/* Table Area */}
      <div className="flex-1 bg-background p-4 min-h-0 overflow-hidden">
        {/* Table will go here in Phase 6 */}
        <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg text-muted-foreground">
          Select or add a location to manage items
        </div>
      </div>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Open a project
2. Add locations (CP1, MA)
3. See tabs appear with (0) items
4. Switch between tabs (currentLocationId updates in store)
5. Edit a location name/export name
6. Delete a location

**Step 4: Commit**

```bash
git add src/components/bom/location-tabs.tsx src/pages/bom-project.tsx
git commit -m "feat(ui): add location tabs management"
```

---

## Phase Complete Checklist

Before moving to next phase, verify:
- [ ] Project detail routing configured in App.tsx
- [ ] Project detail page loads with project name and navigation
- [ ] Location tabs component allows adding, editing, deleting locations
- [ ] Location management integrates with store from Phase 2
- [ ] UI properly filters BOM items by selected location
- [ ] All code committed and ready for Phase 5 (BOM Table)

