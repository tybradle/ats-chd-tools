import { create } from 'zustand';
import { toast } from 'sonner';
import {
  loadCalcProjects,
  bomLocations,
  bomPackages,
  bomJobProjects,
  loadCalcVoltageTables,
  loadCalcLineItems,
  loadCalcResults,
} from '@/lib/db/client';
import type {
  LoadCalcProject,
  LoadCalcVoltageTable,
  LoadCalcLineItem,
  VoltageType
} from '@/types/load-calc';
import type { BOMLocation } from '@/types/bom';
import type { TableCalculationResult } from '@/lib/load-calc/calculations';
import type { ValidationIssue } from '@/lib/load-calc/validation';
import { 
  aggregateHeatWattsByLocation, 
  aggregateLoadingByVoltageTable, 
  getThreePhaseBalanceData,
  type HeatReportRow,
  type LoadingReportRow,
  type BalanceReportRow
} from '@/lib/load-calc/reports';

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

  // Calculation State
  calculationResult: TableCalculationResult | null;
  validationIssues: ValidationIssue[];
  isCalculating: boolean;

  // BOM Context (resolved display info for linked projects)
  bomPackageInfo: {
    jobProjectNumber: string;
    packageName: string;
  } | null;

  // Report State
  reportData: {
    heat: HeatReportRow[];
    loading: LoadingReportRow[];
    balance: BalanceReportRow[];
  } | null;
  isGeneratingReports: boolean;

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
  addLineItem: (item: Omit<LoadCalcLineItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLineItem: (id: number, updates: Partial<LoadCalcLineItem>) => Promise<void>;
  deleteLineItem: (id: number) => Promise<void>;

  // Actions - Calculations
  validateAndCalculate: () => Promise<boolean>;
  clearCalculation: () => void;

  // Actions - BOM Integration
  resolveBomPackageInfo: () => Promise<void>;
  linkToPackage: (bomPackageId: number) => Promise<void>;
  unlinkFromPackage: () => Promise<void>;
  syncLocations: () => Promise<void>;

  // Actions - Reports
  generateReports: () => Promise<void>;
  refreshReports: () => Promise<void>;
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

  calculationResult: null,
  validationIssues: [],
  isCalculating: false,

  bomPackageInfo: null,

  reportData: null,
  isGeneratingReports: false,

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
      lineItems: [],
      bomPackageInfo: null,
      reportData: null,
    });

    if (project) {
      if (project.bom_package_id) {
        await get().fetchLocations(project.bom_package_id);
      }
      await get().fetchVoltageTables(project.id);
      await get().resolveBomPackageInfo();
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
    set({ currentVoltageTable: table, lineItems: [], calculationResult: null, validationIssues: [] });
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

  addLineItem: async (item) => {
    try {
      await loadCalcLineItems.create(item);
      const table = get().currentVoltageTable;
      if (table) {
        await get().fetchLineItems(table.id);
      }
      toast.success('Added to project');
    } catch (error) {
      console.error('Failed to add line item:', error);
      toast.error('Failed to add item');
    }
  },

  updateLineItem: async (id, updates) => {
    try {
      await loadCalcLineItems.update(id, updates);
      const table = get().currentVoltageTable;
      if (table) {
        await get().fetchLineItems(table.id);
      }
    } catch (error) {
      console.error('Failed to update line item:', error);
      toast.error('Failed to update item');
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

  // Calculations
  validateAndCalculate: async () => {
    const { currentVoltageTable, currentProject, lineItems } = get();
    if (!currentVoltageTable || !currentProject || lineItems.length === 0) {
      toast.error('No line items to calculate');
      return false;
    }

    set({ isCalculating: true, validationIssues: [], calculationResult: null });

    try {
      // Run validation
      const { validateLineItems, hasErrors } = await import('@/lib/load-calc/validation');
      const issues = validateLineItems(lineItems, currentVoltageTable.voltage_type);
      set({ validationIssues: issues });

      if (hasErrors(issues)) {
        set({ isCalculating: false });
        toast.error(`Validation failed: ${issues.filter(i => i.severity === 'error').length} error(s)`);
        return false;
      }

      // Run calculations
      const { calculateTableResults } = await import('@/lib/load-calc/calculations');
      const result = await calculateTableResults(lineItems, currentVoltageTable.voltage_type);
      set({ calculationResult: result, isCalculating: false });

      // Cache results to DB
      await loadCalcResults.upsertForVoltageTable(currentProject.id, currentVoltageTable.id, {
        total_watts: result.totalWatts,
        total_amperes: result.totalAmperes,
        total_btu: result.totalBtu,
      });

      toast.success('Calculations complete');
      return true;
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error('Calculation failed');
      set({ isCalculating: false });
      return false;
    }
  },

  clearCalculation: () => {
    set({ calculationResult: null, validationIssues: [] });
  },

  // BOM Integration
  resolveBomPackageInfo: async () => {
    const project = get().currentProject;
    if (!project?.bom_package_id) {
      set({ bomPackageInfo: null });
      return;
    }
    try {
      const pkg = await bomPackages.getById(project.bom_package_id);
      if (pkg) {
        const job = await bomJobProjects.getById(pkg.project_id);
        set({
          bomPackageInfo: {
            jobProjectNumber: job?.project_number ?? 'Unknown',
            packageName: pkg.package_name,
          },
        });
      }
    } catch (error) {
      console.error('Failed to resolve BOM package info:', error);
    }
  },

  linkToPackage: async (bomPackageId) => {
    const project = get().currentProject;
    if (!project) return;
    try {
      await loadCalcProjects.update(project.id, { bom_package_id: bomPackageId });
      const updated = await loadCalcProjects.getById(project.id);
      if (updated) {
        set({ currentProject: updated });
        await get().fetchLocations(bomPackageId);
        await get().resolveBomPackageInfo();
        await get().fetchProjects();
        toast.success('Linked to BOM package');
      }
    } catch (error) {
      console.error('Failed to link to BOM package:', error);
      toast.error('Failed to link to BOM package');
    }
  },

  unlinkFromPackage: async () => {
    const project = get().currentProject;
    if (!project) return;
    try {
      await loadCalcProjects.update(project.id, { bom_package_id: null });
      const updated = await loadCalcProjects.getById(project.id);
      if (updated) {
        set({ currentProject: updated, locations: [], currentLocation: null, bomPackageInfo: null });
        await get().fetchProjects();
        toast.success('Unlinked from BOM package');
      }
    } catch (error) {
      console.error('Failed to unlink from BOM package:', error);
      toast.error('Failed to unlink from BOM package');
    }
  },

  syncLocations: async () => {
    const project = get().currentProject;
    if (!project?.bom_package_id) {
      toast.error('Project must be linked to a BOM package');
      return;
    }
    await get().fetchLocations(project.bom_package_id);
    toast.success('Locations synced from BOM');
  },

  // Reports
  generateReports: async () => {
    const project = get().currentProject;
    if (!project) return;

    set({ isGeneratingReports: true });
    try {
      const [heat, loading, balance] = await Promise.all([
        aggregateHeatWattsByLocation(project.id),
        aggregateLoadingByVoltageTable(project.id),
        getThreePhaseBalanceData(project.id)
      ]);
      set({ reportData: { heat, loading, balance } });
    } catch (error) {
      console.error('Failed to generate reports:', error);
      toast.error('Failed to generate reports');
    } finally {
      set({ isGeneratingReports: false });
    }
  },

  refreshReports: async () => {
    await get().generateReports();
    toast.success('Reports refreshed');
  },
}));
