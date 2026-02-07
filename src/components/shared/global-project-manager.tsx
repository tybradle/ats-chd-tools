import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router';
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
import { 
  Plus, 
  Trash2, 
  FolderOpen, 
  Pencil, 
  X, 
  Share2, 
  FileUp,
  Calculator,
  ListTodo,
  // ExternalLink
} from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { useLoadCalcProjectStore } from '@/stores/load-calc-project-store';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { exportJobProjectToFile, importJobProjectFromFile } from '@/lib/project-package-io';
import { save } from '@tauri-apps/plugin-dialog';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@/lib/db/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LoadCalcProject } from '@/types/load-calc';

// ... (schemas)
const createProjectSchema = z.object({
  project_number: z.string().min(1, 'Job # is required').trim(),
  package_name: z.string().min(1, 'Package name is required').trim(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const renameProjectSchema = z.object({
  project_number: z.string().min(1, 'Job # is required').trim(),
});

const createPackageSchema = z.object({
  package_name: z.string().min(1, 'Package name is required').trim(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const renamePackageSchema = z.object({
  package_name: z.string().min(1, 'Package name is required').trim(),
});

const createLoadCalcProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').trim(),
  description: z.string().optional(),
  bom_package_id: z.number().optional().nullable(),
});

type CreateProjectValues = z.infer<typeof createProjectSchema>;
type RenameProjectValues = z.infer<typeof renameProjectSchema>;
type CreatePackageValues = z.infer<typeof createPackageSchema>;
type RenamePackageValues = z.infer<typeof renamePackageSchema>;
type CreateLoadCalcProjectValues = z.infer<typeof createLoadCalcProjectSchema>;

export function GlobalProjectManager() {
  const navigate = useNavigate();
  const { isProjectManagerOpen: open, setProjectManagerOpen: onOpenChange } = useAppStore();
  
  const {
    jobProjects,
    packages,
    loadJobProjects,
    loadPackages,
    loadAllPackages,
    createJobProjectWithInitialPackage,
    renameJobProject,
    deleteJobProject,
    createPackage,
    renamePackage,
    deletePackage,
    setScope,
  } = useBOMStore();

  const {
    projects: loadCalcProjects,
    fetchProjects: fetchLoadCalcProjects,
    selectProject: selectLoadCalcProject,
    createProject: createLoadCalcProject,
    deleteProject: deleteLoadCalcProject,
  } = useLoadCalcProjectStore();

  // UI state
  const [activeTab, setActiveTab] = useState<'bom' | 'load-calc'>('bom');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false);
  const [isRenameProjectOpen, setIsRenameProjectOpen] = useState(false);
  const [isRenamePackageOpen, setIsRenamePackageOpen] = useState(false);
  const [isCreateLoadCalcOpen, setIsCreateLoadCalcOpen] = useState(false);
  
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<number | null>(null);
  const [deleteConfirmPackage, setDeleteConfirmPackage] = useState<number | null>(null);
  const [deleteConfirmLoadCalc, setDeleteConfirmLoadCalc] = useState<number | null>(null);
  
  const [selectedJobProjectId, setSelectedJobProjectId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const createProjectForm = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      project_number: '',
      package_name: '',
      name: '',
      description: '',
    },
  });

  const renameProjectForm = useForm<RenameProjectValues>({
    resolver: zodResolver(renameProjectSchema),
    defaultValues: {
      project_number: '',
    },
  });

  const createPackageForm = useForm<CreatePackageValues>({
    resolver: zodResolver(createPackageSchema),
    defaultValues: {
      package_name: '',
      name: '',
      description: '',
    },
  });

  const renamePackageForm = useForm<RenamePackageValues>({
    resolver: zodResolver(renamePackageSchema),
    defaultValues: {
      package_name: '',
    },
  });

  const createLoadCalcForm = useForm<CreateLoadCalcProjectValues>({
    resolver: zodResolver(createLoadCalcProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      bom_package_id: null,
    },
  });

  // Initial data loading
  useEffect(() => {
    if (open) {
      loadJobProjects();
      loadAllPackages();
      fetchLoadCalcProjects();
    }
  }, [open, loadJobProjects, loadAllPackages, fetchLoadCalcProjects]);

  // Generate auto project number
  const generateProjectNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const counter = jobProjects.length + 1;
    return `JOB-${year}-${String(counter).padStart(3, '0')}`;
  };

  // Create job project + initial package
  const handleCreateProject = async (values: CreateProjectValues) => {
    try {
      await createJobProjectWithInitialPackage(values);
      await loadJobProjects();
      await loadAllPackages();
      toast.success('Project and package created successfully');
      setIsCreateProjectOpen(false);
      createProjectForm.reset();

      // Find the new project and select it for package view
      const newProject = jobProjects.find(jp => jp.project_number === values.project_number);
      if (newProject) {
        setSelectedJobProjectId(newProject.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint failed: bom_job_projects.project_number')) {
        createProjectForm.setError('project_number', {
          type: 'manual',
          message: 'This job # already exists',
        });
      } else {
        toast.error(message);
      }
    }
  };

  // Create package under existing job project
  const handleCreatePackage = async (values: CreatePackageValues) => {
    if (!selectedJobProjectId) return;
    try {
      await createPackage(selectedJobProjectId, values.package_name, values.name, values.description);
      await loadPackages(selectedJobProjectId);
      await loadAllPackages();
      toast.success('Package created successfully');
      setIsCreatePackageOpen(false);
      createPackageForm.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint failed: bom_packages.project_id, bom_packages.package_name')) {
        createPackageForm.setError('package_name', {
          type: 'manual',
          message: 'Package name must be unique within this project',
        });
      } else {
        toast.error(message);
      }
    }
  };

  // Rename job project
  const handleRenameProject = async (values: RenameProjectValues) => {
    if (!selectedJobProjectId) return;
    try {
      await renameJobProject(selectedJobProjectId, values.project_number);
      await loadJobProjects();
      toast.success('Project renamed successfully');
      setIsRenameProjectOpen(false);
      renameProjectForm.reset();
      setSelectedJobProjectId(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint failed: bom_job_projects.project_number')) {
        renameProjectForm.setError('project_number', {
          type: 'manual',
          message: 'This job # already exists',
        });
      } else {
        toast.error(message);
      }
    }
  };

  // Rename package
  const handleRenamePackage = async (values: RenamePackageValues, packageId: number) => {
    try {
      await renamePackage(packageId, values.package_name);
      if (selectedJobProjectId) {
        await loadPackages(selectedJobProjectId);
      }
      await loadAllPackages();
      toast.success('Package renamed successfully');
      setIsRenamePackageOpen(false);
      renamePackageForm.reset();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint failed: bom_packages.project_id, bom_packages.package_name')) {
        renamePackageForm.setError('package_name', {
          type: 'manual',
          message: 'Package name must be unique within this project',
        });
      } else {
        toast.error(message);
      }
    }
  };

  // Delete job project (cascades to packages)
  const handleDeleteProject = async (id: number) => {
    try {
      await deleteJobProject(id);
      await loadJobProjects();
      await loadAllPackages();
      toast.success('Project deleted successfully');
      setDeleteConfirmProject(null);
      setSelectedJobProjectId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  // Delete package
  const handleDeletePackage = async (id: number) => {
    try {
      await deletePackage(id);
      if (selectedJobProjectId) {
        await loadPackages(selectedJobProjectId);
      }
      await loadAllPackages();
      toast.success('Package deleted successfully');
      setDeleteConfirmPackage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete package');
    }
  };

  // Select a package and set scope
  const handleSelectPackage = async (packageId: number) => {
    try {
      await setScope(packageId);
      onOpenChange(false);
      navigate('/bom');
    } catch (error) {
      toast.error('Failed to open package: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Load Calc Actions
  const handleCreateLoadCalc = async (values: CreateLoadCalcProjectValues) => {
    try {
      const project = await createLoadCalcProject(values.name, values.description, values.bom_package_id);
      if (project) {
        toast.success('Load Calc project created');
        setIsCreateLoadCalcOpen(false);
        createLoadCalcForm.reset();
        await selectLoadCalcProject(project);
        onOpenChange(false);
        navigate('/load-calc');
      }
    } catch {
      toast.error('Failed to create project');
    }
  };

  const handleSelectLoadCalc = async (project: LoadCalcProject) => {
    try {
      await selectLoadCalcProject(project);
      onOpenChange(false);
      navigate('/load-calc');
    } catch {
      toast.error('Failed to open Load Calc project');
    }
  };

  const handleDeleteLoadCalc = async (id: number) => {
    try {
      await deleteLoadCalcProject(id);
      toast.success('Project deleted');
      setDeleteConfirmLoadCalc(null);
    } catch {
      toast.error('Failed to delete project');
    }
  };

  // Export job project (BOM ONLY)
  const handleExportProject = async (jobProjectId: number) => {
    setExporting(jobProjectId);
    try {
      const projectPackage = await exportJobProjectToFile(jobProjectId);
      const content = JSON.stringify(projectPackage, null, 2);
      const defaultFilename = `${projectPackage.job_project.project_number}.chdproj.json`;

      if (isTauri) {
        const path = await save({
          defaultPath: defaultFilename,
          filters: [{ name: 'BOM Project Package', extensions: ['json'] }]
        });
        if (path) {
          await writeFile(path, new TextEncoder().encode(content));
          toast.success(`Exported BOM to ${path}`);
        }
      } else {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFilename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${defaultFilename} (BOM Only)`);
      }
    } catch (error) {
      toast.error('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setExporting(null);
    }
  };

  // Import job project (BOM ONLY)
  const handleImportProject = async (file?: File) => {
    setImporting(true);
    try {
      let content: string;
      if (isTauri) {
        const selectedPath = await openDialog({
          multiple: false,
          filters: [{ name: 'BOM Project Package', extensions: ['json'] }]
        });
        if (!selectedPath) {
          setImporting(false);
          return;
        }
        const data = await readFile(selectedPath);
        content = new TextDecoder().decode(data);
      } else {
        if (!file) {
          fileInputRef.current?.click();
          setImporting(false);
          return;
        }
        content = await file.text();
      }

      await importJobProjectFromFile(content);
      await loadJobProjects();
      await loadAllPackages();
      toast.success('BOM Project imported successfully');
    } catch (error) {
      toast.error('Import failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setImporting(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportProject(file);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col" showCloseButton={false}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl">Project Manager</DialogTitle>
                <DialogDescription>
                  Manage Job Projects, Packages, and Load Calculations.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bom' | 'load-calc')} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="bom" className="flex gap-2">
                <ListTodo className="w-4 h-4" />
                BOM & Packages
              </TabsTrigger>
              <TabsTrigger value="load-calc" className="flex gap-2">
                <Calculator className="w-4 h-4" />
                Load Calculations
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 min-h-0 overflow-y-auto">
              <TabsContent value="bom" className="space-y-4 m-0 h-full">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-base font-medium">BOM Projects ({jobProjects.length})</Label>
                    <p className="text-sm text-muted-foreground">Manage job-level projects and revisions</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleImportProject()} disabled={importing}>
                      <FileUp className="w-4 h-4 mr-2" />
                      {importing ? 'Importing...' : 'Import BOM Project'}
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                </div>

                {!isTauri && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                )}

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[150px]">Job #</TableHead>
                        <TableHead>Packages</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobProjects.map((jp) => {
                        const projectPackages = packages.filter(p => p.project_id === jp.id);
                        const isSelected = selectedJobProjectId === jp.id;
                        return (
                          <TableRow 
                            key={jp.id}
                            className={cn(isSelected && "bg-accent/50")}
                          >
                            <TableCell className="font-medium">{jp.project_number}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{projectPackages.length}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant={isSelected ? "secondary" : "ghost"}
                                  onClick={() => {
                                    setSelectedJobProjectId(isSelected ? null : jp.id);
                                    if (!isSelected) loadPackages(jp.id);
                                  }}
                                  title="View Packages"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleExportProject(jp.id)}
                                  disabled={exporting === jp.id}
                                  title="Export BOM (BOM Only)"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedJobProjectId(jp.id);
                                    renameProjectForm.setValue('project_number', jp.project_number);
                                    setIsRenameProjectOpen(true);
                                  }}
                                  title="Rename Project"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirmProject(jp.id)}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete Project"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {jobProjects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            No projects found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {selectedJobProjectId && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center py-4 border-t mt-4">
                      <div>
                        <Label className="text-base font-medium">
                          Packages for {jobProjects.find(jp => jp.id === selectedJobProjectId)?.project_number}
                        </Label>
                        <p className="text-sm text-muted-foreground">Select a package to start BOM translation</p>
                      </div>
                      <Button size="sm" onClick={() => setIsCreatePackageOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Package
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Package Name</TableHead>
                            <TableHead className="w-[100px]">Items</TableHead>
                            <TableHead className="w-[100px]">Locations</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packages.filter(p => p.project_id === selectedJobProjectId).map((pkg) => (
                            <TableRow key={pkg.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{pkg.package_name}</span>
                                  {pkg.name && <span className="text-xs text-muted-foreground">{pkg.name}</span>}
                                </div>
                              </TableCell>
                              <TableCell>{pkg.item_count}</TableCell>
                              <TableCell>{pkg.location_count}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSelectPackage(pkg.id)}
                                  >
                                    Open BOM
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      renamePackageForm.setValue('package_name', pkg.package_name);
                                      (renamePackageForm as unknown as { _packageId?: number })._packageId = pkg.id;
                                      setIsRenamePackageOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteConfirmPackage(pkg.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="load-calc" className="space-y-4 m-0 h-full">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-base font-medium">Load Calculations</Label>
                    <p className="text-sm text-muted-foreground">Projects for specialized load analysis</p>
                  </div>
                  <Button size="sm" onClick={() => {
                    createLoadCalcForm.reset();
                    setIsCreateLoadCalcOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Load Calc
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Linked Projects */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-primary" />
                      Linked to BOM Packages
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Linked Package</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadCalcProjects.filter(p => p.bom_package_id !== null).map((lp) => {
                            const pkg = packages.find(p => p.id === lp.bom_package_id);
                            const job = jobProjects.find(j => j.id === pkg?.project_id);
                            return (
                              <TableRow key={lp.id}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col">
                                    <span>{lp.name}</span>
                                    {lp.description && <span className="text-xs text-muted-foreground">{lp.description}</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {pkg ? (
                                    <div className="flex flex-col text-xs">
                                      <span className="font-medium text-primary">{job?.project_number}</span>
                                      <span className="text-muted-foreground">{pkg.package_name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Missing package</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" onClick={() => handleSelectLoadCalc(lp)}>
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteConfirmLoadCalc(lp.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {loadCalcProjects.filter(p => p.bom_package_id !== null).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="h-16 text-center text-muted-foreground text-xs italic">
                                No linked projects found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Standalone Projects */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-primary" />
                      Standalone Projects
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadCalcProjects.filter(p => p.bom_package_id === null).map((lp) => (
                            <TableRow key={lp.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{lp.name}</span>
                                  {lp.description && <span className="text-xs text-muted-foreground">{lp.description}</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" onClick={() => handleSelectLoadCalc(lp)}>
                                    Open
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeleteConfirmLoadCalc(lp.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {loadCalcProjects.filter(p => p.bom_package_id === null).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="h-16 text-center text-muted-foreground text-xs italic">
                                No standalone projects found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* --- Sub-Dialogs (Ported from original) --- */}

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Job Project</DialogTitle>
            <DialogDescription>
              Create a new Job Project with an initial Package to get started.
            </DialogDescription>
          </DialogHeader>
          <Form {...createProjectForm}>
            <form onSubmit={createProjectForm.handleSubmit(handleCreateProject)} className="space-y-4">
              <FormField
                control={createProjectForm.control}
                name="project_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job # *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="e.g., JOB-12345" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => createProjectForm.setValue('project_number', generateProjectNumber())}
                      >
                        Auto
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createProjectForm.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Package Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Initial Revision" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createProjectForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional friendly name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Package Dialog */}
      <Dialog open={isCreatePackageOpen} onOpenChange={setIsCreatePackageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Package</DialogTitle>
          </DialogHeader>
          <Form {...createPackageForm}>
            <form onSubmit={createPackageForm.handleSubmit(handleCreatePackage)} className="space-y-4">
              <FormField
                control={createPackageForm.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Revision 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createPackageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional friendly name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatePackageOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Load Calc Dialog */}
      <Dialog open={isCreateLoadCalcOpen} onOpenChange={setIsCreateLoadCalcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Load Calculation</DialogTitle>
          </DialogHeader>
          <Form {...createLoadCalcForm}>
            <form onSubmit={createLoadCalcForm.handleSubmit(handleCreateLoadCalc)} className="space-y-4">
              <FormField
                control={createLoadCalcForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Machine A Electrical Feed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createLoadCalcForm.control}
                name="bom_package_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to BOM Package (Optional)</FormLabel>
                    <select 
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                    >
                      <option value="">Standalone (No Link)</option>
                      {jobProjects.map(jp => (
                        <optgroup key={jp.id} label={jp.project_number}>
                          {packages.filter(p => p.project_id === jp.id).map(pkg => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.package_name} {pkg.name ? `(${pkg.name})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateLoadCalcOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={isRenameProjectOpen} onOpenChange={setIsRenameProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Project</DialogTitle></DialogHeader>
          <Form {...renameProjectForm}>
            <form onSubmit={renameProjectForm.handleSubmit(handleRenameProject)} className="space-y-4">
              <FormField
                control={renameProjectForm.control}
                name="project_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Job #</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRenameProjectOpen(false)}>Cancel</Button>
                <Button type="submit">Rename</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rename Package Dialog */}
      <Dialog open={isRenamePackageOpen} onOpenChange={setIsRenamePackageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Package</DialogTitle></DialogHeader>
          <Form {...renamePackageForm}>
            <form onSubmit={(e) => {
              const id = (renamePackageForm as unknown as { _packageId?: number })._packageId;
              if (id) renamePackageForm.handleSubmit(v => handleRenamePackage(v, id))(e);
            }} className="space-y-4">
              <FormField
                control={renamePackageForm.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Package Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRenamePackageOpen(false)}>Cancel</Button>
                <Button type="submit">Rename</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmations --- */}
      <AlertDialog open={deleteConfirmProject !== null} onOpenChange={(o) => !o && setDeleteConfirmProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Project?</AlertDialogTitle>
            <AlertDialogDescription>Cascades to all associated packages and BOM data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmProject && handleDeleteProject(deleteConfirmProject)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmPackage !== null} onOpenChange={(o) => !o && setDeleteConfirmPackage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>Deletes all BOM data for this package.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmPackage && handleDeletePackage(deleteConfirmPackage)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmLoadCalc !== null} onOpenChange={(o) => !o && setDeleteConfirmLoadCalc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Load Calculation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmLoadCalc && handleDeleteLoadCalc(deleteConfirmLoadCalc)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
