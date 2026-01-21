import { create } from 'zustand';
import type {
  BOMJobProject,
  BOMPackage,
  BOMPackageWithCounts,
  BOMLocationWithCount,
  BOMItem,
  BOMItemWithLocation,
} from '@/types/bom';
import { bomJobProjects, bomPackages, bomLocations, bomItems, settings } from '@/lib/db/client';

interface BOMStore {
  // State
  jobProjects: BOMJobProject[];
  packages: BOMPackageWithCounts[];  // All packages (not filtered by job project)
  currentJobProjectId: number | null;
  currentScopePackageId: number | null;
  currentScope: (BOMPackage & { project_number: string }) | null;
  locations: BOMLocationWithCount[];
  currentLocationId: number | null;
  items: BOMItemWithLocation[];
  loading: boolean;
  error: string | null;
  pendingWrites: number;

  // UI State
  searchTerm: string;
  selectedItemIds: number[];

  // Job Project Actions
  loadJobProjects: () => Promise<void>;
  createJobProjectWithInitialPackage: (values: { project_number: string; package_name: string; name?: string; description?: string }) => Promise<void>;
  renameJobProject: (id: number, newProjectNumber: string) => Promise<void>;
  deleteJobProject: (id: number) => Promise<void>;

  // Package Actions
  loadAllPackages: () => Promise<void>;
  loadPackages: (projectId: number) => Promise<void>;
  createPackage: (projectId: number, packageName: string, name?: string, description?: string) => Promise<void>;
  renamePackage: (packageId: number, newPackageName: string) => Promise<void>;
  deletePackage: (packageId: number) => Promise<void>;

  // Scope Actions
  setScope: (packageId: number | null) => Promise<void>;
  clearScope: () => void;
  ensureScopeSelected: () => boolean;
  loadLastScope: () => Promise<number | null>;

  // Location Actions
  loadLocations: (packageId: number) => Promise<void>;
  createLocation: (packageId: number, name: string, exportName?: string) => Promise<void>;
  updateLocation: (id: number, name: string, exportName?: string | null) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;
  setCurrentLocationId: (locationId: number | null) => void;

  // Item Actions
  loadItems: (packageId: number, locationId?: number) => Promise<void>;
  createItem: (item: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateItem: (id: number, updates: Partial<BOMItem>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  bulkDeleteItems: (ids: number[]) => Promise<void>;
  duplicateItem: (id: number) => Promise<void>;
  moveItem: (id: number, direction: 'up' | 'down') => Promise<void>;
  bulkImportItems: (items: Omit<BOMItem, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;

  // UI Actions
  setSearchTerm: (term: string) => void;
  setSelectedItemIds: (ids: number[]) => void;
  setError: (error: string | null) => void;

  // Internal
  flushPendingWrites: () => Promise<void>;
}

export const useBOMStore = create<BOMStore>((set, get) => ({
  // Initial State
  jobProjects: [],
  packages: [],
  currentJobProjectId: null,
  currentScopePackageId: null,
  currentScope: null,
  locations: [],
  currentLocationId: null,
  items: [],
  loading: false,
  error: null,
  pendingWrites: 0,
  searchTerm: '',
  selectedItemIds: [],

  // Flush pending writes (used before scope switch)
  // MUST terminate: re-checks state each iteration with timeout safety
  flushPendingWrites: async () => {
    const MAX_WAIT_MS = 5000; // 5 second timeout
    const CHECK_INTERVAL_MS = 50; // Check every 50ms
    const startTime = Date.now();

    // Re-read pendingWrites each iteration (not captured snapshot)
    while (get().pendingWrites > 0) {
      // Check timeout
      if (Date.now() - startTime > MAX_WAIT_MS) {
        set({
          error: 'Pending writes did not complete; scope switch aborted',
        });
        return; // Abort scope switch - writes didn't settle in time
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
    // All writes settled - safe to proceed with scope switch
  },

  // Job Project Actions
  loadJobProjects: async () => {
    set({ loading: true, error: null });
    try {
      const jobProjects = await bomJobProjects.getAll();
      set({ jobProjects, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load job projects',
        loading: false,
      });
    }
  },

  createJobProjectWithInitialPackage: async (values) => {
    set({ loading: true, error: null });
    try {
      // Create job project first
      const jpResult = await bomJobProjects.create(values.project_number);
      const jobProjectId = jpResult.lastInsertId ?? 0;

      // Then create initial package
      await bomPackages.create(
        jobProjectId,
        values.package_name,
        values.name,
        values.description
      );

      await get().loadJobProjects();
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create job project',
        loading: false,
      });
      throw error;
    }
  },

  renameJobProject: async (id, newProjectNumber) => {
    set({ loading: true, error: null });
    try {
      await bomJobProjects.update(id, { project_number: newProjectNumber });
      await get().loadJobProjects();
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to rename job project',
        loading: false,
      });
      throw error;
    }
  },

  deleteJobProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomJobProjects.delete(id);
      await get().loadJobProjects();

      // Clear if current scope was affected
      if (get().currentJobProjectId === id) {
        set({
          currentJobProjectId: null,
          packages: [],
          currentScopePackageId: null,
          currentScope: null,
          locations: [],
          items: [],
          currentLocationId: null,
        });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete job project',
        loading: false,
      });
      throw error;
    }
  },

  // Package Actions
  loadAllPackages: async () => {
    set({ loading: true, error: null });
    try {
      const packages = await bomPackages.getAllWithCounts();
      set({ packages, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load packages',
        loading: false,
      });
    }
  },

  loadPackages: async (projectId: number) => {
    set({ loading: true, error: null });
    try {
      const packages = await bomPackages.getByProject(projectId);
      set({ packages, currentJobProjectId: projectId, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load packages',
        loading: false,
      });
    }
  },

  createPackage: async (projectId, packageName, name, description) => {
    set({ loading: true, error: null });
    try {
      await bomPackages.create(projectId, packageName, name, description);
      await get().loadPackages(projectId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create package',
        loading: false,
      });
      throw error;
    }
  },

  renamePackage: async (packageId, newPackageName) => {
    set({ loading: true, error: null });
    try {
      await bomPackages.update(packageId, { package_name: newPackageName });

      // Reload packages for current job project
      const currentJobProjectId = get().currentJobProjectId;
      if (currentJobProjectId) {
        await get().loadPackages(currentJobProjectId);
      }

      // Update current scope if it was renamed
      if (get().currentScopePackageId === packageId) {
        const pkg = await bomPackages.getById(packageId);
        const jp = await bomJobProjects.getById(currentJobProjectId!);
        if (pkg && jp) {
          set({
            currentScope: { ...pkg, project_number: jp.project_number }
          });
        }
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to rename package',
        loading: false,
      });
      throw error;
    }
  },

  deletePackage: async (packageId) => {
    set({ loading: true, error: null });
    try {
      await bomPackages.delete(packageId);

      // Reload packages for current job project
      const currentJobProjectId = get().currentJobProjectId;
      if (currentJobProjectId) {
        await get().loadPackages(currentJobProjectId);
      }

      // Clear if current scope was deleted
      if (get().currentScopePackageId === packageId) {
        set({
          currentScopePackageId: null,
          currentScope: null,
          locations: [],
          items: [],
          currentLocationId: null,
        });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete package',
        loading: false,
      });
      throw error;
    }
  },

  // Scope Actions
  setScope: async (packageId) => {
    if (!packageId) {
      get().clearScope();
      return;
    }

    // Flush any pending writes before switching
    await get().flushPendingWrites();

    try {
      // Load package details
      const pkg = await bomPackages.getById(packageId);
      if (!pkg) {
        set({ error: 'Package not found' });
        return;
      }

      // Load job project for project_number
      const jp = await bomJobProjects.getById(pkg.project_id);
      if (!jp) {
        set({ error: 'Job project not found' });
        return;
      }

      // Clear UI state before loading new scope
      set({
        currentScopePackageId: packageId,
        currentScope: { ...pkg, project_number: jp.project_number },
        currentJobProjectId: pkg.project_id,
        currentLocationId: null,
        selectedItemIds: [],
        searchTerm: '',
      });

      // Persist selection
      await settings.set('bom.active_package_id', String(packageId));

      // Load locations and items for this scope
      await get().loadLocations(packageId);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to set scope',
      });
    }
  },

  clearScope: () => {
    set({
      currentScopePackageId: null,
      currentScope: null,
      locations: [],
      items: [],
      currentLocationId: null,
    });
  },

  ensureScopeSelected: () => {
    return get().currentScopePackageId !== null;
  },

  loadLastScope: async () => {
    try {
      const lastPackageId = await settings.get('bom.active_package_id');
      return lastPackageId ? parseInt(lastPackageId, 10) : null;
    } catch {
      return null;
    }
  },

  // Location Actions
  loadLocations: async (packageId) => {
    set({ loading: true, error: null });
    try {
      const locations = await bomLocations.getByProject(packageId);
      set({ locations, loading: false });

      // Auto-select first location and load items
      if (locations.length > 0 && !get().currentLocationId) {
        set({ currentLocationId: locations[0].id });
        await get().loadItems(packageId, locations[0].id);
      } else {
        // Clear items if no locations
        set({ items: [] });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load locations',
        loading: false,
      });
    }
  },

  createLocation: async (packageId, name, exportName) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.create(packageId, name, exportName);
      await get().loadLocations(packageId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create location',
        loading: false,
      });
      throw error;
    }
  },

  updateLocation: async (id, name, exportName) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.update(id, name, exportName);
      const packageId = get().currentScopePackageId;
      if (packageId) {
        await get().loadLocations(packageId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update location',
        loading: false,
      });
      throw error;
    }
  },

  deleteLocation: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.delete(id);
      const packageId = get().currentScopePackageId;
      if (packageId) {
        await get().loadLocations(packageId);
      }
      if (get().currentLocationId === id) {
        set({ currentLocationId: null, items: [] });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete location',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentLocationId: (locationId) => {
    set({ currentLocationId: locationId });
    const packageId = get().currentScopePackageId;
    if (packageId && locationId) {
      get().loadItems(packageId, locationId);
    } else {
      set({ items: [] });
    }
  },

  // Item Actions
  loadItems: async (packageId, locationId) => {
    set({ loading: true, error: null });
    try {
      const items = await bomItems.getByProject(packageId, locationId);
      set({ items, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load items',
        loading: false,
      });
    }
  },

  createItem: async (item) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    set(state => ({ pendingWrites: state.pendingWrites + 1, loading: true, error: null }));
    try {
      await bomItems.create({ ...item, project_id: packageId, location_id: locationId });
      await get().loadItems(packageId, locationId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create item',
        loading: false,
      });
      throw error;
    } finally {
      set(state => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) }));
    }
  },

  updateItem: async (id, updates) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      pendingWrites: state.pendingWrites + 1,
    }));

    try {
      await bomItems.update(id, updates);
    } catch (error) {
      // Revert on error
      await get().loadItems(packageId, locationId);
      set({
        error: error instanceof Error ? error.message : 'Failed to update item',
      });
      throw error;
    } finally {
      set(state => ({ pendingWrites: Math.max(0, state.pendingWrites - 1) }));
    }
  },

  deleteItem: async (id) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    set({ loading: true, error: null });
    try {
      await bomItems.delete(id);
      await get().loadItems(packageId, locationId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete item',
        loading: false,
      });
      throw error;
    }
  },

  bulkDeleteItems: async (ids) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    set({ loading: true, error: null });
    try {
      await bomItems.bulkDelete(ids);
      await get().loadItems(packageId, locationId);
      set({ selectedItemIds: [], loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete items',
        loading: false,
      });
      throw error;
    }
  },

  duplicateItem: async (id) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    set({ loading: true, error: null });
    try {
      await bomItems.duplicate(id);
      await get().loadItems(packageId, locationId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to duplicate item',
        loading: false,
      });
      throw error;
    }
  },

  moveItem: async (id, direction) => {
    const items = [...get().items];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap sort_order
    const currentItem = items[index];
    const targetItem = items[targetIndex];

    const currentOrder = currentItem.sort_order;
    const targetOrder = targetItem.sort_order;

    try {
      await Promise.all([
        bomItems.update(currentItem.id, { sort_order: targetOrder }),
        bomItems.update(targetItem.id, { sort_order: currentOrder }),
      ]);

      const packageId = get().currentScopePackageId;
      const locationId = get().currentLocationId;
      if (packageId && locationId) {
        await get().loadItems(packageId, locationId);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move item',
      });
    }
  },

  bulkImportItems: async (items) => {
    const packageId = get().currentScopePackageId;
    const locationId = get().currentLocationId;
    if (!packageId || !locationId) return;

    set({ loading: true, error: null });
    try {
      const itemsWithScope = items.map(item => ({
        ...item,
        project_id: packageId,
        location_id: locationId,
      }));
      await bomItems.bulkCreate(itemsWithScope);
      await get().loadItems(packageId, locationId);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to import items',
        loading: false,
      });
      throw error;
    }
  },

  // UI Actions
  setSearchTerm: (term) => {
    set({ searchTerm: term });
  },

  setSelectedItemIds: (ids) => {
    set({ selectedItemIds: ids });
  },

  setError: (error) => {
    set({ error });
  },
}));
