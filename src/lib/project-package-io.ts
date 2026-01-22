import * as db from '@/lib/db/client';
import type { ProjectPackageFile } from '@/types/project-package';
import { ProjectPackageFileSchema } from '@/types/project-package';

/**
 * Export a Job Project as a portable Project Package JSON file.
 * Includes all packages, locations, and items within the job project.
 */
export async function exportJobProjectToFile(jobProjectId: number): Promise<ProjectPackageFile> {
  // Load job project
  const jobProject = await db.bomJobProjects.getById(jobProjectId);
  if (!jobProject) {
    throw new Error('Job project not found');
  }

  // Load all packages in the job project
  const packages = await db.bomPackages.getByProject(jobProjectId);

  // Build package data structure with locations and items
  const packageData = await Promise.all(
    packages.map(async (pkg) => {
      const locations = await db.bomLocations.getByProject(pkg.id);
      const items = await db.bomItems.getByProject(pkg.id);

      return {
        package: pkg,
        locations,
        items,
      };
    })
  );

  // Flatten locations and items, adding package_name context
  const packagesForExport = packageData.map((p) => ({
    package_name: p.package.package_name,
    name: p.package.name,
    description: p.package.description,
    version: p.package.version,
    metadata: p.package.metadata,
  }));

  const locationsForExport = packageData.flatMap((p) =>
    p.locations.map((l) => ({
      package_name: p.package.package_name,
      name: l.name,
      export_name: l.export_name,
      sort_order: l.sort_order,
    }))
  );

  const itemsForExport = packageData.flatMap((p) =>
    p.items.map((i) => ({
      package_name: p.package.package_name,
      location_name: i.location_name || 'Unknown',
      part_number: i.part_number,
      description: i.description,
      secondary_description: i.secondary_description,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      manufacturer: i.manufacturer,
      supplier: i.supplier,
      category: i.category,
      reference_designator: i.reference_designator,
      is_spare: i.is_spare === 1,
      metadata: i.metadata,
      sort_order: i.sort_order,
    }))
  );

  // Build the project package file
  const projectPackageFile: ProjectPackageFile = {
    format: 'ats-chd-project-package',
    version: '1',
    metadata: {
      exported_at: new Date().toISOString(),
    },
    job_project: {
      project_number: jobProject.project_number,
    },
    packages: packagesForExport,
    locations: locationsForExport,
    items: itemsForExport,
  };

  // Validate against schema
  const validated = ProjectPackageFileSchema.parse(projectPackageFile);

  return validated;
}

/**
 * Import a Job Project from a Project Package JSON file.
 * Creates a new job project with all packages, locations, and items.
 * Handles name collisions by suffixing with (import N).
 */
export async function importJobProjectFromFile(fileContent: string): Promise<{ jobProjectId: number }> {
  let parsed: ProjectPackageFile;

  try {
    const json = JSON.parse(fileContent);
    parsed = ProjectPackageFileSchema.parse(json);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid project package file: ${error.message}`);
    }
    throw new Error('Invalid project package file');
  }

  // Create job project with unique name
  let jobProjectNumber = parsed.job_project.project_number;
  let importAttempt = 0;
  let jobProjectId: number;

  while (true) {
    try {
      const result = await db.bomJobProjects.create(jobProjectNumber);
      if (!result.lastInsertId) {
        throw new Error('Failed to create job project');
      }
      jobProjectId = result.lastInsertId;
      break;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint failed: bom_job_projects.project_number')) {
        importAttempt++;
        jobProjectNumber = `${parsed.job_project.project_number} (import ${importAttempt})`;
        if (importAttempt > 100) {
          throw new Error('Could not create unique job project name after 100 attempts');
        }
        continue;
      }
      throw error;
    }
  }

  const packageIdMap: Record<string, number> = {};

  // Rollback helper: delete job project if import fails
  const rollback = async () => {
    try {
      await db.bomJobProjects.delete(jobProjectId);
    } catch (e) {
      console.warn('Failed to rollback job project import:', e);
    }
  };

  try {

  // Create packages
  for (const pkg of parsed.packages) {
    let packageName = pkg.package_name;
    let packageImportAttempt = 0;

    while (true) {
      try {
        const result = await db.bomPackages.create(
          jobProjectId,
          packageName,
          pkg.name ?? undefined,
          pkg.description ?? undefined,
          pkg.version,
          pkg.metadata
        );
        if (!result.lastInsertId) {
          throw new Error('Failed to create package');
        }
        packageIdMap[pkg.package_name] = result.lastInsertId;
        break;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('UNIQUE constraint failed') && message.includes('bom_packages')) {
          packageImportAttempt++;
          packageName = `${pkg.package_name} (import ${packageImportAttempt})`;
          if (packageImportAttempt > 100) {
            throw new Error(`Could not create unique package name for ${pkg.package_name} after 100 attempts`);
          }
          continue;
        }
        throw error;
      }
    }
  }

  // Create locations and build location map
  const locationIdMap: Record<string, Record<string, number>> = {};

  for (const loc of parsed.locations) {
    const packageId = packageIdMap[loc.package_name];
    if (!packageId) {
      console.warn(`Package ${loc.package_name} not found for location ${loc.name}, skipping`);
      continue;
    }

    if (!locationIdMap[loc.package_name]) {
      locationIdMap[loc.package_name] = {};
    }

    let locationName = loc.name;
    let locationImportAttempt = 0;

      while (true) {
        try {
          const result = await db.bomLocations.create(packageId, locationName, loc.export_name ?? undefined, loc.sort_order);
          if (!result.lastInsertId) {
            throw new Error('Failed to create location');
          }
          locationIdMap[loc.package_name][loc.name] = result.lastInsertId;
          break;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Check for UNIQUE constraint on (project_id, name) for bom_locations
        if (message.includes('UNIQUE constraint failed') && message.includes('bom_locations')) {
          locationImportAttempt++;
          locationName = `${loc.name} (import ${locationImportAttempt})`;
          if (locationImportAttempt > 100) {
            throw new Error(`Could not create unique location name for ${loc.name} after 100 attempts`);
          }
          continue;
        }
        throw error;
      }
    }
  }

  // Group items by package for bulk insert
  const itemsByPackage: Record<number, Array<Omit<Parameters<typeof db.bomItems.bulkCreate>[0][number], 'id' | 'created_at' | 'updated_at'>>> = {};

  for (const item of parsed.items) {
    const packageId = packageIdMap[item.package_name];
    if (!packageId) {
      console.warn(`Package ${item.package_name} not found for item, skipping`);
      continue;
    }

    const locationMap = locationIdMap[item.package_name];
    if (!locationMap) {
      console.warn(`No locations found for package ${item.package_name}, skipping item`);
      continue;
    }

    const locationId = locationMap[item.location_name];
    if (!locationId) {
      console.warn(`Location ${item.location_name} not found in package ${item.package_name}, skipping item`);
      continue;
    }

    if (!itemsByPackage[packageId]) {
      itemsByPackage[packageId] = [];
    }

    itemsByPackage[packageId].push({
      project_id: packageId,
      location_id: locationId,
      part_id: null,
      part_number: item.part_number,
      description: item.description,
      secondary_description: item.secondary_description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      manufacturer: item.manufacturer,
      supplier: item.supplier,
      category: item.category,
      reference_designator: item.reference_designator,
      is_spare: item.is_spare ? 1 : 0,
      metadata: item.metadata,
      sort_order: item.sort_order,
    });
  }

  // Bulk insert items by package
  for (const [, items] of Object.entries(itemsByPackage)) {
    if (items.length > 0) {
      await db.bomItems.bulkCreate(items);
    }
  }

  return { jobProjectId };
  } catch (error) {
    // Rollback job project on any failure
    await rollback();
    throw error;
  }
}
