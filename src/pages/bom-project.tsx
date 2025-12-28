import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { LocationTabs } from '@/components/bom/location-tabs';

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

      {/* Location Tabs */}
      <LocationTabs />

      {/* BOM Table Area - Placeholder for Phase 5 */}
      <Card>
        <CardHeader>
          <CardTitle>BOM Items</CardTitle>
          <CardDescription>
            Editable BOM table will be implemented in Phase 5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Select a location tab above to view and edit items
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
