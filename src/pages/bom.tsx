import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, Folders } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { useAppStore } from '@/stores/app-store';
import { LocationTabs } from '@/components/bom/location-tabs';
import { BomTable } from '@/components/bom/bom-table';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function BomPage() {
  const navigate = useNavigate();
  const {
    currentScope,
    error,
    loadJobProjects,
    loadAllPackages,
    loadLastScope,
  } = useBOMStore();
  const setProjectManagerOpen = useAppStore((state) => state.setProjectManagerOpen);

  useEffect(() => {
    // Load job projects and packages on mount
    loadJobProjects();
    loadAllPackages();

    // Check if there's a last used scope
    loadLastScope();
  }, [loadJobProjects, loadAllPackages, loadLastScope]);

  const handleChangeScope = () => {
    setProjectManagerOpen(true);
  };

  if (error || !currentScope) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>BOM Workspace</CardTitle>
            <CardDescription>
              Select a project package to begin translating BOM data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {error && (
              <Alert variant="destructive" className="text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="py-6 flex flex-col items-center gap-4">
              <Folders className="h-12 w-12 text-muted-foreground/50" />
              <Button onClick={() => setProjectManagerOpen(true)}>
                Open Project Manager
              </Button>
            </div>
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
    </div>
  );
}
