import { useState } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  AlertCircle,
  Calculator,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LocationSidebar } from './location-sidebar';
import { VoltageTableTabs } from './voltage-table-tabs';
import { ProjectSelector } from './project-selector';
import { bomPackages, bomJobProjects } from '@/lib/db/client';
import type { BOMPackageWithCounts } from '@/types/bom';
import { toast } from 'sonner';

interface PackageOption {
  id: number;
  label: string;
  jobNumber: string;
  packageName: string;
}

export function ProjectView() {
  const {
    currentProject,
    bomPackageInfo,
    loading,
    linkToPackage,
    unlinkFromPackage,
    syncLocations,
  } = useLoadCalcProjectStore();
  const setProjectManagerOpen = useAppStore((state) => state.setProjectManagerOpen);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  const openLinkDialog = async () => {
    try {
      const allPackages = await bomPackages.getAllWithCounts();
      const jobs = await bomJobProjects.getAll();
      const jobMap = new Map(jobs.map((j) => [j.id, j.project_number]));

      const options: PackageOption[] = allPackages.map((pkg: BOMPackageWithCounts & { project_number?: string }) => ({
        id: pkg.id,
        label: `${jobMap.get(pkg.project_id) ?? pkg.project_number ?? '??'} / ${pkg.package_name}`,
        jobNumber: jobMap.get(pkg.project_id) ?? pkg.project_number ?? '??',
        packageName: pkg.package_name,
      }));
      setPackageOptions(options);
      setSelectedPackageId('');
      setLinkDialogOpen(true);
    } catch (error) {
      console.error('Failed to load BOM packages:', error);
      toast.error('Failed to load BOM packages');
    }
  };

  const handleLink = async () => {
    if (!selectedPackageId) return;
    setIsLinking(true);
    try {
      await linkToPackage(Number(selectedPackageId));
      setLinkDialogOpen(false);
    } finally {
      setIsLinking(false);
    }
  };

  if (loading.projects && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Load Calc Workspace</CardTitle>
            <CardDescription>
              Select a project to begin specialized load analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="py-6 flex flex-col items-center gap-4">
              <Calculator className="h-12 w-12 text-muted-foreground/50" />
              <Button onClick={() => setProjectManagerOpen(true)}>
                Open Project Manager
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLinked = !!currentProject.bom_package_id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex flex-col gap-1">
          <ProjectSelector />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isLinked && bomPackageInfo ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {bomPackageInfo.jobProjectNumber}
                </Badge>
                <span>{bomPackageInfo.packageName}</span>
              </span>
            ) : isLinked ? (
              <span className="flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                BOM Package #{currentProject.bom_package_id}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Standalone (No BOM link)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLinked ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={syncLocations}
                title="Sync locations from BOM"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Sync
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={unlinkFromPackage}
                title="Unlink from BOM package"
              >
                <Unlink className="mr-2 h-3.5 w-3.5" />
                Unlink
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={openLinkDialog}
            >
              <LinkIcon className="mr-2 h-3.5 w-3.5" />
              Link to BOM
            </Button>
          )}
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

      {/* Link to BOM Package Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Link to BOM Package
            </DialogTitle>
            <DialogDescription>
              Select a BOM package to link locations and project context.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a BOM package..." />
              </SelectTrigger>
              <SelectContent>
                {packageOptions.map((opt) => (
                  <SelectItem key={opt.id} value={String(opt.id)}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] px-1">
                        {opt.jobNumber}
                      </Badge>
                      {opt.packageName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLink}
              disabled={!selectedPackageId || isLinking}
              className="w-full"
            >
              {isLinking ? 'Linking...' : 'Link Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
