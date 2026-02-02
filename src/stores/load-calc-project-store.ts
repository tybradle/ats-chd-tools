import { create } from 'zustand';
import { toast } from 'sonner';
import { 
  loadCalcProjects, 
  bomLocations, 
  loadCalcVoltageTables, 
  loadCalcLineItems
} from '@/lib/db/client';
import type { 
  LoadCalcProject, 
  LoadCalcVoltageTable, 
  LoadCalcLineItem,
  VoltageType
} from '@/types/load-calc';
import type { BOMLocation } from '@/types/bom';

interface LoadCalcProjectState {
  // Current Selections
  currentProject: LoadCalcProject | null;
  currentLocation: BOMLocation | null;
  currentVoltageTable: LoadCalcVoltageTable | null;
  
  // Data Lists
  projects: LoadCalcProject[];
  locations: BOMLocation[];
  voltageTables: LoadCalcVoltageTable[];
  lineItems: LoadCalcLineItem[];
  
  // Loading States
  loading: {
    projects: boolean;
    locations: boolean;
    voltageTables: boolean;
    lineItems: boolean;
  };

  // Actions - Projects
  fetchProjects: () => Promise<void>;
  selectProject: (project: LoadCalcProject | null) => Promise<void>;
  createProject: (name: string, description?: string, bomPackageId?: number | null) => Promise<LoadCalcProject | null>;
  updateProject: (id: number, updates: Partial<LoadCalcProject>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // Actions - Locations
  fetchLocations: (projectId: number) => Promise<void>;
  selectLocation: (location: BOMLocation | null) => Promise<void>;
  createLocation: (name: string) => Promise<void>;
  updateLocation: (id: number, name: string) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;

  // Actions - Voltage Tables
  fetchVoltageTables: (projectId: number) => Promise<void>;
  selectVoltageTable: (table: LoadCalcVoltageTable | null) => Promise<void>;
  createVoltageTable: (projectId: number, locationId: number | null, voltageType: VoltageType | string) => Promise<void>;
  toggleTableLock: (id: number, isLocked: boolean) => Promise<void>;
  deleteVoltageTable: (id: number) => Promise<void>;

  // Actions - Line Items
  fetchLineItems: (voltageTableId: number) => Promise<void>;
  deleteLineItem: (id: number) => Promise<void>;
}

export const useLoadCalcProjectStore = create<LoadCalcProjectState>((set, get) => ({
  currentProject: null,
  currentLocation: null,
  currentVoltageTable: null,
  projects: [],
  locations: [],
  voltageTables: [],
  lineItems: [],
  loading: {
    projects: false,
    locations: false,
    voltageTables: false,
    lineItems: false,
  },

  // Projects
  fetchProjects: async () => {
    set(state => ({ loading: { ...state.loading, projects: true } }));
    try {
      const projects = await loadCalcProjects.getAll();
      set({ projects });
    } catch (error) {
      console.error('Failed to fetch load calc projects:', error);
      toast.error('Failed to load projects');
    } finally {
      set(state => ({ loading: { ...state.loading, projects: false } }));
    }
  },

  selectProject: async (project) => {
    set({ 
      currentProject: project, 
      currentLocation: null, 
      currentVoltageTable: null,
      locations: [],
      voltageTables: [],
      lineItems: []
    });
    
    if (project) {
      if (project.bom_package_id) {
        await get().fetchLocations(project.bom_package_id);
      }
      await get().fetchVoltageTables(project.id);
    }
  },

  createProject: async (name, description, bomPackageId) => {
    try {
      const result = await loadCalcProjects.create(name, description, bomPackageId);
      if (result.lastInsertId) {
        await get().fetchProjects();
        const newProject = await loadCalcProjects.getById(result.lastInsertId);
        if (newProject) {
          await get().selectProject(newProject);
          return newProject;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to create load calc project:', error);
      toast.error('Failed to create project');
      return null;
    }
  },

  updateProject: async (id, updates) => {
    try {
      await loadCalcProjects.update(id, updates);
      await get().fetchProjects();
      if (get().currentProject?.id === id) {
        const updated = await loadCalcProjects.getById(id);
        set({ currentProject: updated });
      }
      toast.success('Project updated');
    } catch (error) {
      console.error('Failed to update load calc project:', error);
      toast.error('Failed to update project');
    }
  },

  deleteProject: async (id) => {
    try {
      await loadCalcProjects.delete(id);
      await get().fetchProjects();
      if (get().currentProject?.id === id) {
        await get().selectProject(null);
      }
      toast.success('Project deleted');
    } catch (error) {
      console.error('Failed to delete load calc project:', error);
      toast.error('Failed to delete project');
    }
  },

  // Locations
  fetchLocations: async (bomPackageId) => {
    set(state => ({ loading: { ...state.loading, locations: true } }));
    try {
      const locations = await bomLocations.getByProject(bomPackageId);
      set({ locations });
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      toast.error('Failed to load locations');
    } finally {
      set(state => ({ loading: { ...state.loading, locations: false } }));
    }
  },

  selectLocation: async (location) => {
    set({ currentLocation: location, currentVoltageTable: null, lineItems: [] });
  },

  createLocation: async (name) => {
    try {
      // NOTE: Location creation is on the BOM package, not directly on the Load Calc project
      const project = get().currentProject;
      if (!project?.bom_package_id) {
        toast.error('Project must be linked to a BOM package to manage locations');
        return;
      }
      await bomLocations.create(project.bom_package_id, name);
      await get().fetchLocations(project.bom_package_id);
      toast.success('Location created');
    } catch (error) {
      console.error('Failed to create location:', error);
      toast.error('Failed to create location');
    }
  },

  updateLocation: async (id, name) => {
    try {
      await bomLocations.update(id, name);
      const project = get().currentProject;
      if (project?.bom_package_id) {
        await get().fetchLocations(project.bom_package_id);
      }
      if (get().currentLocation?.id === id) {
        const updated = await bomLocations.getById(id);
        set({ currentLocation: updated });
      }
      toast.success('Location updated');
    } catch (error) {
      console.error('Failed to update location:', error);
      toast.error('Failed to update location');
    }
  },

  deleteLocation: async (id) => {
    try {
      await bomLocations.delete(id);
      const project = get().currentProject;
      if (project?.bom_package_id) {
        await get().fetchLocations(project.bom_package_id);
      }
      if (get().currentLocation?.id === id) {
        set({ currentLocation: null });
      }
      toast.success('Location deleted');
    } catch (error) {
      console.error('Failed to delete location:', error);
      toast.error('Failed to delete location');
    }
  },

  // Voltage Tables
  fetchVoltageTables: async (projectId) => {
    set(state => ({ loading: { ...state.loading, voltageTables: true } }));
    try {
      const voltageTables = await loadCalcVoltageTables.getByProject(projectId);
      set({ voltageTables });
    } catch (error) {
      console.error('Failed to fetch voltage tables:', error);
      toast.error('Failed to load voltage tables');
    } finally {
      set(state => ({ loading: { ...state.loading, voltageTables: false } }));
    }
  },

  selectVoltageTable: async (table) => {
    set({ currentVoltageTable: table, lineItems: [] });
    if (table) {
      await get().fetchLineItems(table.id);
    }
  },

  createVoltageTable: async (projectId, locationId, voltageType) => {
    try {
      await loadCalcVoltageTables.create(projectId, locationId, voltageType);
      await get().fetchVoltageTables(projectId);
      toast.success('Voltage table created');
    } catch (error) {
      console.error('Failed to create voltage table:', error);
      toast.error('Failed to create voltage table');
    }
  },

  toggleTableLock: async (id, isLocked) => {
    try {
      await loadCalcVoltageTables.update(id, { is_locked: isLocked });
      const project = get().currentProject;
      if (project) {
        await get().fetchVoltageTables(project.id);
      }
      if (get().currentVoltageTable?.id === id) {
        const updated = await loadCalcVoltageTables.getById(id);
        if (updated) {
          // Normalize is_locked to boolean if it's 0/1 from SQLite
          const normalized = { ...updated, is_locked: Boolean(updated.is_locked) };
          set({ currentVoltageTable: normalized });
        }
      }
      toast.success(isLocked ? 'Table locked' : 'Table unlocked');
    } catch (error) {
      console.error('Failed to toggle table lock:', error);
      toast.error('Failed to update lock status');
    }
  },

  deleteVoltageTable: async (id) => {
    try {
      await loadCalcVoltageTables.delete(id);
      const project = get().currentProject;
      if (project) {
        await get().fetchVoltageTables(project.id);
      }
      if (get().currentVoltageTable?.id === id) {
        set({ currentVoltageTable: null });
      }
      toast.success('Voltage table deleted');
    } catch (error) {
      console.error('Failed to delete voltage table:', error);
      toast.error('Failed to delete table');
    }
  },

  // Line Items
  fetchLineItems: async (voltageTableId) => {
    set(state => ({ loading: { ...state.loading, lineItems: true } }));
    try {
      const lineItems = await loadCalcLineItems.getByVoltageTable(voltageTableId);
      set({ lineItems });
    } catch (error) {
      console.error('Failed to fetch line items:', error);
      toast.error('Failed to load line items');
    } finally {
      set(state => ({ loading: { ...state.loading, lineItems: false } }));
    }
  },

  deleteLineItem: async (id) => {
    try {
      await loadCalcLineItems.delete(id);
      const table = get().currentVoltageTable;
      if (table) {
        await get().fetchLineItems(table.id);
      }
      toast.success('Line item deleted');
    } catch (error) {
      console.error('Failed to delete line item:', error);
      toast.error('Failed to delete item');
    }
  },
}));
