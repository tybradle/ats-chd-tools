import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { LocationTabs } from '@/components/bom/location-tabs';
import { BomTable } from '@/components/bom/bom-table';
import { ProjectManagerDialog } from '@/components/bom/project-manager-dialog';
import { Loader2 } from 'lucide-react';

export function BomPage() {
  const navigate = useNavigate();
  const {
    currentScope,
    currentScopePackageId,
    loading,
    error,
    loadJobProjects,
    loadAllPackages,
    loadLastScope,
    setScope,
  } = useBOMStore();
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  useEffect(() => {
    // Load job projects and packages on mount
    loadJobProjects();
    loadAllPackages();

    // Check if there's a last used scope (but don't auto-bypass modal)
    loadLastScope().then(() => {
      // We load it for preselection in modal, but modal still opens
      // This is per phase context: modal always opens on BOM entry
    });
  }, [loadJobProjects, loadAllPackages, loadLastScope]);

  // Always open modal if no scope selected
  useEffect(() => {
    if (!currentScopePackageId) {
      setIsProjectManagerOpen(true);
    }
  }, [currentScopePackageId]);

  const handleChangeScope = () => {
    setIsProjectManagerOpen(true);
  };

  const handleSelectPackage = async (packageId: number) => {
    await setScope(packageId);
    setIsProjectManagerOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent closing if no scope is selected (blocking behavior)
    if (!open && !currentScopePackageId) {
      return; // Ignore close attempt
    }
    setIsProjectManagerOpen(open);
  };

  if (loading && !currentScope) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading BOM Workspace</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !currentScope) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Select a Package</CardTitle>
            <CardDescription>
              Choose a Project and Package to begin working with BOMs.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ProjectManagerDialog
              open={isProjectManagerOpen}
              onOpenChange={handleOpenChange}
              onSelectPackage={handleSelectPackage}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with scope display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BOM Translation</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>{currentScope.project_number} / {currentScope.package_name}</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={handleChangeScope}
              >
                Change
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Location Tabs */}
      <LocationTabs />

      {/* BOM Table */}
      <BomTable />

      {/* Project Manager Dialog - blocking until scope selected */}
      <ProjectManagerDialog
        open={isProjectManagerOpen}
        onOpenChange={handleOpenChange}
        onSelectPackage={handleSelectPackage}
      />
    </div>
  );
}
