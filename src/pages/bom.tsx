import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { ProjectManagerDialog } from '@/components/bom/project-manager-dialog';

export function BomPage() {
  const navigate = useNavigate();
  const { projects, loading, loadProjects } = useBOMStore();
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: number) => {
    navigate(`/bom/${projectId}`);
  };

  const handleOpenProjectManager = () => {
    setIsProjectManagerOpen(true);
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

      <ProjectManagerDialog
        open={isProjectManagerOpen}
        onOpenChange={setIsProjectManagerOpen}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
}
