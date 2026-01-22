import { z } from 'zod';

/**
 * Project Package File Format (v1)
 *
 * Portable JSON format for sharing Job Projects with all packages, locations, and items.
 * Items reference parts by part_number only (part_id is NULL on import).
 */

export const ProjectPackageFileSchema = z.object({
  format: z.literal('ats-chd-project-package'),
  version: z.literal('1'),
  metadata: z.object({
    exported_at: z.string(),
    source_app_version: z.string().optional(),
  }),
  job_project: z.object({
    project_number: z.string(),
  }),
  packages: z.array(
    z.object({
      package_name: z.string(),
      name: z.string().nullable(),
      description: z.string().nullable(),
      version: z.string(),
      metadata: z.string().nullable(),
    })
  ),
  locations: z.array(
    z.object({
      package_name: z.string(),
      name: z.string(),
      export_name: z.string().nullable(),
      sort_order: z.number(),
    })
  ),
  items: z.array(
    z.object({
      package_name: z.string(),
      location_name: z.string(),
      part_number: z.string(),
      description: z.string(),
      secondary_description: z.string().nullable(),
      quantity: z.number(),
      unit: z.string(),
      unit_price: z.number().nullable(),
      manufacturer: z.string().nullable(),
      supplier: z.string().nullable(),
      category: z.string().nullable(),
      reference_designator: z.string().nullable(),
      is_spare: z.boolean(),
      metadata: z.string().nullable(),
      sort_order: z.number(),
    })
  ),
});

export type ProjectPackageFile = z.infer<typeof ProjectPackageFileSchema>;
