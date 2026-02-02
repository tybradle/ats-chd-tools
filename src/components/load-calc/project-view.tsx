import { useEffect, useState } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  FolderOpen, 
  ChevronRight, 
  Link as LinkIcon, 
  Settings2,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { bomPackages } from '@/lib/db/client';
import type { BOMPackageWithCounts } from '@/types/bom';
import { LocationSidebar } from './location-sidebar';
import { VoltageTableTabs } from './voltage-table-tabs';

export function ProjectView() {
  const { 
    currentProject, 
    projects, 
    fetchProjects, 
    selectProject, 
    createProject,
    loading 
  } = useLoadCalcProjectStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedBomId, setSelectedBomId] = useState<string>('none');
  const [bomPkgs, setBomPkgs] = useState<BOMPackageWithCounts[]>([]);

  useEffect(() => {
    fetchProjects();
    
    const load = async () => {
      try {
        const pkgs = await bomPackages.getAllWithCounts();
        setBomPkgs(pkgs);
      } catch (e) {
        console.error('Failed to load BOM packages', e);
      }
    };
    load();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName) return;
    const bomId = selectedBomId === 'none' ? null : parseInt(selectedBomId);
    await createProject(newName, newDesc, bomId);
    setIsCreateOpen(false);
    setNewName('');
    setNewDesc('');
    setSelectedBomId('none');
  };

  if (loading.projects && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Select a Project</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Load Calc Project</DialogTitle>
                <DialogDescription>
                  Start a new electrical load analysis project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input 
                    id="name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    placeholder="e.g. 14403-ECM1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description (Optional)</Label>
                  <Input 
                    id="desc" 
                    value={newDesc} 
                    onChange={(e) => setNewDesc(e.target.value)} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bom">Link to BOM Package (Required for locations)</Label>
                  <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a BOM package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Standalone)</SelectItem>
                      {bomPkgs.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id.toString()}>
                          {pkg.package_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newName}>Create Project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:border-primary cursor-pointer transition-colors" onClick={() => selectProject(project)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  {project.name}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {project.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-muted-foreground gap-4">
                  <div className="flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    {project.bom_package_id ? 'Linked to BOM' : 'Standalone'}
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    Open <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed rounded-lg bg-muted/20">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-medium text-muted-foreground">No projects found</h3>
              <p className="text-sm text-muted-foreground/70">Create a new project to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{currentProject.name}</h2>
            <Button variant="ghost" size="icon" onClick={() => selectProject(null)} title="Change Project">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {currentProject.bom_package_id ? (
              <span className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Linked to BOM Package #{currentProject.bom_package_id}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Standalone (No locations)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Future calculation/export buttons */}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 border rounded-lg bg-card overflow-hidden flex flex-col">
          <LocationSidebar />
        </aside>
        
        <main className="col-span-12 md:col-span-9 lg:col-span-10 border rounded-lg bg-card overflow-hidden flex flex-col">
          <VoltageTableTabs />
        </main>
      </div>
    </div>
  );
}
