import { create } from 'zustand';
import type {
  BOMProject,
  BOMProjectWithCounts,
  BOMLocationWithCount,
  BOMItem,
  BOMItemWithLocation,
} from '@/types/bom';
import { bomProjects, bomLocations, bomItems } from '@/lib/db/client';

interface BOMStore {
  // State
  projects: BOMProjectWithCounts[];
  currentProject: BOMProjectWithCounts | null;
  locations: BOMLocationWithCount[];
  currentLocationId: number | null;
  items: BOMItemWithLocation[];
  loading: boolean;
  error: string | null;

  // UI State
  searchTerm: string;
  selectedItemIds: number[];

  // Project Actions
  loadProjects: () => Promise<void>;
  loadProject: (id: number) => Promise<void>;
  createProject: (projectNumber: string, packageName: string, name?: string, description?: string) => Promise<number>;
  updateProject: (id: number, updates: Partial<BOMProject>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setCurrentProject: (project: BOMProjectWithCounts | null) => void;

  // Location Actions
  loadLocations: (projectId: number) => Promise<void>;
  createLocation: (projectId: number, name: string, exportName?: string) => Promise<void>;
  updateLocation: (id: number, name: string, exportName?: string | null) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;
  setCurrentLocationId: (locationId: number | null) => void;

  // Item Actions
  loadItems: (projectId: number, locationId?: number) => Promise<void>;
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
}

export const useBOMStore = create<BOMStore>((set, get) => ({
  // Initial State
  projects: [],
  currentProject: null,
  locations: [],
  currentLocationId: null,
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  selectedItemIds: [],

  // Project Actions
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await bomProjects.getAll();
      set({ projects, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load projects',
        loading: false,
      });
    }
  },

  loadProject: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const project = await bomProjects.getById(id);
      if (!project) {
        set({ error: 'Project not found', loading: false });
        return;
      }
      set({ currentProject: project, loading: false });
      // Also load locations for this project
      await get().loadLocations(id);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load project',
        loading: false,
      });
    }
  },

  createProject: async (projectNumber, packageName, name, description) => {
    set({ loading: true, error: null });
    try {
      const result = await bomProjects.create(projectNumber, packageName, name, description);
      await get().loadProjects();
      set({ loading: false });
      return result.lastInsertId ?? 0;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create project',
        loading: false,
      });
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await bomProjects.update(id, updates);
      await get().loadProjects();
      if (get().currentProject?.id === id) {
        await get().loadProject(id);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update project',
        loading: false,
      });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomProjects.delete(id);
      await get().loadProjects();
      if (get().currentProject?.id === id) {
        set({ currentProject: null, locations: [], items: [], currentLocationId: null });
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete project',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  // Location Actions
  loadLocations: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const locations = await bomLocations.getByProject(projectId);
      set({ locations, loading: false });
      // Auto-select first location if none selected
      if (locations.length > 0 && !get().currentLocationId) {
        set({ currentLocationId: locations[0].id });
        await get().loadItems(projectId, locations[0].id);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load locations',
        loading: false,
      });
    }
  },

  createLocation: async (projectId, name, exportName) => {
    set({ loading: true, error: null });
    try {
      await bomLocations.create(projectId, name, exportName);
      await get().loadLocations(projectId);
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
      const projectId = get().currentProject?.id;
      if (projectId) {
        await get().loadLocations(projectId);
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
      const projectId = get().currentProject?.id;
      if (projectId) {
        await get().loadLocations(projectId);
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
    const projectId = get().currentProject?.id;
    if (projectId && locationId) {
      get().loadItems(projectId, locationId);
    }
  },

  // Item Actions
  loadItems: async (projectId, locationId) => {
    set({ loading: true, error: null });
    try {
      const items = await bomItems.getByProject(projectId, locationId);
      set({ items, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load items',
        loading: false,
      });
    }
  },

  createItem: async (item) => {
    set({ loading: true, error: null });
    try {
      await bomItems.create(item);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create item',
        loading: false,
      });
      throw error;
    }
  },

  updateItem: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));

    try {
      await bomItems.update(id, updates);
    } catch (error) {
      // Revert on error
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to update item',
      });
      throw error;
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null });
    try {
      await bomItems.delete(id);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
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
    set({ loading: true, error: null });
    try {
      await bomItems.bulkDelete(ids);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
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
    set({ loading: true, error: null });
    try {
      await bomItems.duplicate(id);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
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
      
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move item',
      });
    }
  },

  bulkImportItems: async (items) => {
    set({ loading: true, error: null });
    try {
      await bomItems.bulkCreate(items);
      const projectId = get().currentProject?.id;
      const locationId = get().currentLocationId;
      if (projectId && locationId) {
        await get().loadItems(projectId, locationId);
      }
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
