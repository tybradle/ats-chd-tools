import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Plus, Trash2, FolderOpen, Pencil } from 'lucide-react';
import { useBOMStore } from '@/stores/bom-store';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Zod schemas for validation
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

type CreateProjectValues = z.infer<typeof createProjectSchema>;
type RenameProjectValues = z.infer<typeof renameProjectSchema>;
type CreatePackageValues = z.infer<typeof createPackageSchema>;
type RenamePackageValues = z.infer<typeof renamePackageSchema>;

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject?: (projectId: number) => void;
  onSelectPackage?: (packageId: number) => void;
}

export function ProjectManagerDialog({
  open,
  onOpenChange,
  onSelectProject,
  onSelectPackage,
}: ProjectManagerDialogProps) {
  const {
    jobProjects,
    packages,
    loadJobProjects,
    loadPackages,
    createJobProjectWithInitialPackage,
    renameJobProject,
    deleteJobProject,
    createPackage,
    renamePackage,
    deletePackage,
    setScope,
  } = useBOMStore();

  // UI state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreatePackageOpen, setIsCreatePackageOpen] = useState(false);
  const [isRenameProjectOpen, setIsRenameProjectOpen] = useState(false);
  const [isRenamePackageOpen, setIsRenamePackageOpen] = useState(false);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<number | null>(null);
  const [deleteConfirmPackage, setDeleteConfirmPackage] = useState<number | null>(null);
  const [selectedJobProjectId, setSelectedJobProjectId] = useState<number | null>(null);

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
      toast.success('Project and package created successfully');
      setIsCreateProjectOpen(false);
      createProjectForm.reset();

      // Load packages for the new project
      const newProject = jobProjects.find(jp => jp.project_number === values.project_number);
      if (newProject) {
        await loadPackages(newProject.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // Check for SQLite UNIQUE constraint violations
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
      await loadPackages(selectedJobProjectId!);
      toast.success('Package renamed successfully');
      setIsRenamePackageOpen(false);
      renamePackageForm.reset();
      setSelectedJobProjectId(null);
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
      await loadPackages(selectedJobProjectId!);
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
    } catch (error) {
      toast.error('Failed to open package: ' + (error instanceof Error ? error.message : String(error)));
      return; // Stop if scope setting failed
    }

    if (onSelectPackage) {
      onSelectPackage(packageId);
    } else if (onSelectProject) {
      onSelectProject(packageId);
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Manager</DialogTitle>
            <DialogDescription>
              Create and manage Job Projects and Packages. Select a Package to begin working.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-base font-medium">Projects ({jobProjects.length})</Label>
                <p className="text-sm text-muted-foreground">Job #</p>
              </div>
              <Button size="sm" onClick={() => setIsCreateProjectOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            {jobProjects.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground mb-4">No projects found. Create your first project to get started.</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job #</TableHead>
                      <TableHead>Packages</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobProjects.map((jp) => {
                      const projectPackages = packages.filter(p => p.project_id === jp.id);
                      return (
                        <TableRow key={jp.id}>
                          <TableCell className="font-medium">{jp.project_number}</TableCell>
                          <TableCell>{projectPackages.length}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedJobProjectId(jp.id);
                                loadPackages(jp.id);
                              }}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedJobProjectId(jp.id);
                                renameProjectForm.setValue('project_number', jp.project_number);
                                setIsRenameProjectOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmProject(jp.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedJobProjectId && (
              <>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <Label className="text-base font-medium">
                      Packages for {jobProjects.find(jp => jp.id === selectedJobProjectId)?.project_number}
                    </Label>
                    <p className="text-sm text-muted-foreground">Workspace scopes</p>
                  </div>
                  <Button size="sm" onClick={() => setIsCreatePackageOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Package
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package Name</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.filter(p => p.project_id === selectedJobProjectId).map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">
                            {pkg.package_name}
                            {pkg.name && <span className="text-muted-foreground text-sm ml-2">({pkg.name})</span>}
                          </TableCell>
                          <TableCell>{pkg.item_count}</TableCell>
                          <TableCell>{pkg.location_count}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleSelectPackage(pkg.id);
                              }}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedJobProjectId(pkg.project_id);
                                renamePackageForm.setValue('package_name', pkg.package_name);
                                setIsRenamePackageOpen(true);
                                // Store package ID in a ref or similar
                                (renamePackageForm as any)._packageId = pkg.id;
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmPackage(pkg.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectOpen} onOpenChange={(open) => {
        setIsCreateProjectOpen(open);
        if (!open) createProjectForm.reset();
      }}>
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

              <FormField
                control={createProjectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Package Dialog */}
      <Dialog open={isCreatePackageOpen} onOpenChange={(open) => {
        setIsCreatePackageOpen(open);
        if (!open) createPackageForm.reset();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Package</DialogTitle>
            <DialogDescription>
              Add a new package to the selected Job Project.
            </DialogDescription>
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

              <FormField
                control={createPackageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatePackageOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={isRenameProjectOpen} onOpenChange={(open) => {
        setIsRenameProjectOpen(open);
        if (!open) {
          renameProjectForm.reset();
          setSelectedJobProjectId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Job Project</DialogTitle>
            <DialogDescription>
              Change the job number for this project.
            </DialogDescription>
          </DialogHeader>

          <Form {...renameProjectForm}>
            <form onSubmit={renameProjectForm.handleSubmit(handleRenameProject)} className="space-y-4">
              <FormField
                control={renameProjectForm.control}
                name="project_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Job # *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsRenameProjectOpen(false);
                  renameProjectForm.reset();
                  setSelectedJobProjectId(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit">Rename</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rename Package Dialog */}
      <Dialog open={isRenamePackageOpen} onOpenChange={(open) => {
        setIsRenamePackageOpen(open);
        if (!open) {
          renamePackageForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Package</DialogTitle>
            <DialogDescription>
              Change the package name.
            </DialogDescription>
          </DialogHeader>

          <Form {...renamePackageForm}>
            <form onSubmit={(e) => {
              e.preventDefault();
              const packageId = (renamePackageForm as any)._packageId;
              if (packageId) {
                renamePackageForm.handleSubmit((values) => handleRenamePackage(values, packageId))(e);
              }
            }} className="space-y-4">
              <FormField
                control={renamePackageForm.control}
                name="package_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Package Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsRenamePackageOpen(false);
                  renamePackageForm.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Rename</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={deleteConfirmProject !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirmProject(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the job project and all its packages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmProject(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmProject && handleDeleteProject(deleteConfirmProject)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Package Confirmation */}
      <AlertDialog open={deleteConfirmPackage !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirmPackage(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the package and all its BOM data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmPackage(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmPackage && handleDeletePackage(deleteConfirmPackage)}
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
