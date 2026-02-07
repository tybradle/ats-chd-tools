import { useEffect } from 'react';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDown, FolderOpen, Plus, Link as LinkIcon } from 'lucide-react';

export function ProjectSelector() {
  const {
    currentProject,
    projects,
    fetchProjects,
    selectProject,
  } = useLoadCalcProjectStore();
  const setProjectManagerOpen = useAppStore((s) => s.setProjectManagerOpen);

  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
  }, [projects.length, fetchProjects]);

  const otherProjects = projects.filter((p) => p.id !== currentProject?.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-auto py-0.5 px-1.5">
          <span className="text-2xl font-bold">{currentProject?.name ?? 'Select Project'}</span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {otherProjects.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Project
            </DropdownMenuLabel>
            {otherProjects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => selectProject(p)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{p.name}</span>
                  {p.bom_package_id && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="h-2.5 w-2.5" />
                      BOM linked
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => setProjectManagerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project / Manage...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
