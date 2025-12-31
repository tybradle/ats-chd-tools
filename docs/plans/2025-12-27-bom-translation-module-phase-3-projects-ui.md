## Phase 3: Projects List UI (2-3 hours)
# BOM Translation Module - Phase 3: Projects List UI

**Navigation:** [Phase 1](./2025-12-27-bom-translation-module-phase-1-database.md) | [Phase 2](./2025-12-27-bom-translation-module-phase-2-store.md) | **[Phase 3]** | [Phase 4](./2025-12-27-bom-translation-module-phase-4-detail-locations.md) | [Phase 5](./2025-12-27-bom-translation-module-phase-5-bom-table.md) | [Phase 6](./2025-12-27-bom-translation-module-phase-6-import-export.md) | [Index](./2025-12-27-bom-translation-module-INDEX.md)

**Prerequisites:**
- [ ] None (can run parallel to Phase 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create project selection UI and project management dialog with full CRUD operations.

**Architecture:** React components for project listing and management, integrated with Zustand store.

**Tech Stack:** React, TypeScript, shadcn/ui components, Zustand.

---

## Phase 3: Projects List UI (2-3 hours)

### Task 3.1: Update BOM Landing Page

**Files:**
- Modify: `src/pages/bom.tsx`

**Step 1: Replace placeholder with project selector**

Replace entire contents of `src/pages/bom.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';

export function BomPage() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects } = useBOMStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: number) => {
    navigate(`/bom/${projectId}`);
  };

  const handleOpenProjectManager = () => {
    // Will be implemented in next task
    console.log('Open project manager');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Projects</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BOM Translation</h1>
        <p className="text-muted-foreground mt-1">
          Convert Bills of Materials between formats.
        </p>
      </div>

      <div className="flex items-center justify-center min-h-[300px]">
        <Card className="max-w-md mx-auto w-full">
          <CardHeader className="text-center">
            <CardTitle>BOM Management</CardTitle>
            <CardDescription>
              {projects.length === 0
                ? 'Create your first project to get started'
                : 'Select a project to work with'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  No projects found. Create your first project to start managing BOMs.
                </p>
                <Button onClick={handleOpenProjectManager} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Found {projects.length} project(s). Select one to work with:
                </p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {project.name || `${project.project_number} - ${project.package_name}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.item_count} items · {project.location_count} locations
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
                <Button variant="outline" className="w-full" onClick={handleOpenProjectManager}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Project Manager
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Test UI**

Run: `npm run tauri:dev`

Expected: 
- BOM page renders
- Shows "Create First Project" if no projects
- Shows list of projects if any exist
- Loading spinner appears briefly on first load

**Step 3: Commit**

```bash
git add src/pages/bom.tsx
git commit -m "feat(ui): add BOM project selector page"
```

---

### Task 3.2: Create Project Manager Dialog

**Files:**
- Create: `src/components/bom/project-manager-dialog.tsx`

**Step 1: Create component**

Create `src/components/bom/project-manager-dialog.tsx`:

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Eye } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject?: (projectId: number) => void;
}

export function ProjectManagerDialog({
  open,
  onOpenChange,
  onSelectProject,
}: ProjectManagerDialogProps) {
  const { projects, loading, createProject, deleteProject } = useBOMStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [projectNumber, setProjectNumber] = useState('');
  const [packageName, setPackageName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const generateProjectNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const counter = projects.length + 1;
    return `BOM-${year}-${String(counter).padStart(3, '0')}`;
  };

  const handleCreate = async () => {
    if (!projectNumber.trim() || !packageName.trim()) {
      toast.error('Project number and package name are required');
      return;
    }

    try {
      const newId = await createProject(
        projectNumber.trim(),
        packageName.trim(),
        name.trim() || undefined,
        description.trim() || undefined
      );
      toast.success('Project created successfully');
      setIsCreateOpen(false);
      resetForm();
      
      // Auto-navigate to new project
      if (onSelectProject) {
        onSelectProject(newId);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProject(id);
      toast.success('Project deleted successfully');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  const resetForm = () => {
    setProjectNumber('');
    setPackageName('');
    setName('');
    setDescription('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Manager</DialogTitle>
            <DialogDescription>
              Create, view, and manage BOM translation projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Number</TableHead>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Locations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No projects found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.project_number}</TableCell>
                        <TableCell>{project.package_name}</TableCell>
                        <TableCell>{project.name || '—'}</TableCell>
                        <TableCell className="text-right">{project.item_count}</TableCell>
                        <TableCell className="text-right">{project.location_count}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (onSelectProject) {
                                  onSelectProject(project.id);
                                  onOpenChange(false);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(project.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new BOM translation project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-number">Project Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="project-number"
                  value={projectNumber}
                  onChange={(e) => setProjectNumber(e.target.value)}
                  placeholder="e.g., BOM-2025-001"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProjectNumber(generateProjectNumber())}
                >
                  Auto
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="package-name">Package Name *</Label>
              <Input
                id="package-name"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g., Main Control Panel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Project XYZ Control System"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., BOM for building 3 retrofit project"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all associated locations and items.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**Step 2: Wire up to BOM page**

Modify `src/pages/bom.tsx`, import at top:

```typescript
import { ProjectManagerDialog } from '@/components/bom/project-manager-dialog';
```

Add state at top of component:

```typescript
const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
```

Update `handleOpenProjectManager`:

```typescript
const handleOpenProjectManager = () => {
  setIsProjectManagerOpen(true);
};
```

Add dialog before closing `</div>`:

```typescript
<ProjectManagerDialog
  open={isProjectManagerOpen}
  onOpenChange={setIsProjectManagerOpen}
  onSelectProject={handleSelectProject}
/>
```

**Step 3: Test workflow**

Run: `npm run tauri:dev`

Test:
1. Click "Create First Project" or "Project Manager"
2. Click "New Project"
3. Generate auto project number
4. Fill in package name (e.g., "Test Panel")
5. Click "Create Project"
6. See project in table
7. Click eye icon → navigates to project detail (will show placeholder for now)
8. Go back, open manager, delete project → confirms deletion

**Step 4: Commit**

```bash
git add src/components/bom/project-manager-dialog.tsx src/pages/bom.tsx
git commit -m "feat(ui): add project manager dialog with CRUD"
```

---

## Phase Complete Checklist

Before moving to next phase, verify:
- [ ] BOM landing page shows project selector with counts
- [ ] Project manager dialog allows full CRUD operations
- [ ] Project creation, editing, and deletion work correctly
- [ ] UI integrates with database operations from Phase 1
- [ ] All code committed and ready for Phase 4 (Detail & Locations)

