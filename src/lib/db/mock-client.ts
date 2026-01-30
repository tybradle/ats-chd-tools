/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Manufacturer, Category, Part, PartWithManufacturer
} from '@/types/parts';

// LocalStorage Key
const STORAGE_KEY = 'ats_mock_db_v1';

// Initial Seed Data
const seedData = {
  jobProjects: [] as any[],
  packages: [] as any[],
  locations: [] as any[],
  items: [] as any[],
  exports: [] as any[],
  manufacturers: [] as any[],
  categories: [] as any[],
  parts: [] as any[],
  settings: [] as any[],
  ids: {
    jobProjects: 1,
    packages: 1,
    locations: 1,
    items: 1,
    exports: 1,
    manufacturers: 1,
    categories: 1,
    parts: 1,
  }
};

// State Container
const store = {
  jobProjects: new Map<number, any>(),
  packages: new Map<number, any>(),
  locations: new Map<number, any>(),
  items: new Map<number, any>(),
  exports: new Map<number, any>(),
  manufacturers: new Map<number, any>(),
  categories: new Map<number, any>(),
  parts: new Map<number, any>(),
  settings: new Map<string, any>(),
  ids: { ...seedData.ids }
};

// Persistence Helpers
function saveToStorage() {
  if (typeof window === 'undefined') return;

  const data = {
    jobProjects: Array.from(store.jobProjects.entries()),
    packages: Array.from(store.packages.entries()),
    locations: Array.from(store.locations.entries()),
    items: Array.from(store.items.entries()),
    exports: Array.from(store.exports.entries()),
    manufacturers: Array.from(store.manufacturers.entries()),
    categories: Array.from(store.categories.entries()),
    parts: Array.from(store.parts.entries()),
    settings: Array.from(store.settings.entries()),
    ids: store.ids
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save mock DB to localStorage', e);
  }
}

function loadFromStorage() {
  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    store.jobProjects = new Map(data.jobProjects || []);
    store.packages = new Map(data.packages || []);
    store.locations = new Map(data.locations);
    store.items = new Map(data.items);
    store.exports = new Map(data.exports);
    store.manufacturers = new Map(data.manufacturers);
    store.categories = new Map(data.categories);
    store.parts = new Map(data.parts);
    store.settings = new Map(data.settings);
    store.ids = { ...seedData.ids, ...(data.ids || {}) };

    console.log('📦 Mock DB loaded from localStorage');
    return true;
  } catch (e) {
    console.error('Failed to load mock DB from localStorage', e);
    return false;
  }
}

// Reset Function (exposed to window for debugging)
if (typeof window !== 'undefined') {
  (window as any).resetMockDB = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}

// Initialize
if (!loadFromStorage()) {
  console.log('🌱 Seeding new Mock DB');

  // Seed Default Job Project + Package
  const jpid = store.ids.jobProjects++;
  store.jobProjects.set(jpid, {
    id: jpid,
    project_number: "MOCK-001",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const pkgId = store.ids.packages++;
  store.packages.set(pkgId, {
    id: pkgId,
    project_id: jpid,
    package_name: "Browser Dev",
    name: "Persistent Mock Package",
    description: "Data persists across reloads!",
    version: "1.0",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Seed Trial Packages (each under its own job project)
  const seedTrial = (pkgId: number, count: number, label: string) => {
    const jpid = store.ids.jobProjects++;
    store.jobProjects.set(jpid, {
      id: jpid,
      project_number: `TRIAL-${count}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    store.packages.set(pkgId, {
      id: pkgId,
      project_id: jpid,
      package_name: label,
      name: `Trial: ${count} Items`,
      description: `Trial package with ${count} line items for UI testing`,
      version: "1.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const locId = store.ids.locations++;
    store.locations.set(locId, {
      id: locId,
      project_id: pkgId,
      name: "Main Location",
      export_name: "MAIN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const components = [
      { pn: "RES-10K-0603", desc: "Resistor 10K 1/10W 1% 0603", mfr: "Yageo" },
      { pn: "CAP-10UF-0805", desc: "Capacitor 10uF 16V X7R 0805", mfr: "Murata" },
      { pn: "IC-STM32F103", desc: "MCU ARM Cortex-M3 72MHz 64KB", mfr: "STMicroelectronics" },
      { pn: "CON-RJ45", desc: "Connector RJ45 Shielded", mfr: "Amphenol" },
      { pn: "LED-RED-0603", desc: "LED Red 630nm 0603", mfr: "Lite-On" },
    ];

    for (let i = 1; i <= count; i++) {
       
      const comp = components[(i - 1) % components.length];
      const itemId = store.ids.items++;
      store.items.set(itemId, {
        id: itemId,
        project_id: pkgId,
        location_id: locId,
        part_number: `${comp.pn}-${i}`,
        description: comp.desc,
        manufacturer: comp.mfr,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: "EA",
        reference_designator: `R${i}, C${i}, U${i}`.split(', ')[(i - 1) % 3],
        sort_order: i,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  seedTrial(store.ids.packages++, 10, "Small Trial");
  seedTrial(store.ids.packages++, 40, "Medium Trial");
  seedTrial(store.ids.packages++, 80, "Large Trial");

  saveToStorage();
}

// Helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const mockDelay = () => delay(50); // Faster checks in browser

// Mock Generic Database Functions
export async function getDb(): Promise<any> { return {}; }
export async function closeDb(): Promise<void> { }

export async function query<T>(sql: string, bindValues: unknown[] = []): Promise<T[]> {
  console.log(`[MockDB] Query: ${sql}`, bindValues);
  return [];
}

export async function execute(
  sql: string,
  bindValues: unknown[] = []
): Promise<{ rowsAffected: number; lastInsertId: number | undefined }> {
  console.log(`[MockDB] Execute: ${sql}`, bindValues);
  return { rowsAffected: 1, lastInsertId: 999 };
}

export async function transaction<T>(fn: (db: any) => Promise<T>): Promise<T> {
  return fn({});
}

// Export Types
export type { Manufacturer, Category, Part, PartWithManufacturer };

export interface Setting {
  key: string;
  value: string | null;
  updated_at: string;
}

// ============================================
// Mock Implementations
// ============================================

export const manufacturers = {
  getAll: async () => { await mockDelay(); return Array.from(store.manufacturers.values()); },
  getById: async (id: number) => { await mockDelay(); return store.manufacturers.get(id) || null; },
  getByName: async (name: string) => {
    await mockDelay();
    const lowerName = name.toLowerCase();
    return Array.from(store.manufacturers.values()).find((m: any) => m.name.toLowerCase() === lowerName) || null;
  },
  create: async (name: string, code?: string) => {
    await mockDelay();
    const id = store.ids.manufacturers++;
    store.manufacturers.set(id, { id, name, code: code || null });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, name: string, code?: string) => {
    await mockDelay();
    if (store.manufacturers.has(id)) {
      store.manufacturers.set(id, { ...store.manufacturers.get(id), name, code: code || null });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.manufacturers.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  }
};

export const categories = {
  getAll: async () => { await mockDelay(); return Array.from(store.categories.values()); },
  getById: async (id: number) => { await mockDelay(); return store.categories.get(id) || null; },
  getByName: async (name: string) => {
    await mockDelay();
    const lowerName = name.toLowerCase();
    return Array.from(store.categories.values()).find((c: any) => c.name.toLowerCase() === lowerName) || null;
  },
  getByParent: async (parentId: number | null) => {
    await mockDelay();
    return Array.from(store.categories.values()).filter((c: any) => c.parent_id === parentId);
  },
  create: async (name: string, parentId?: number) => {
    await mockDelay();
    const id = store.ids.categories++;
    store.categories.set(id, { id, name, parent_id: parentId || null });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, name: string, parentId?: number) => {
    await mockDelay();
    if (store.categories.has(id)) {
      store.categories.set(id, { ...store.categories.get(id), name, parent_id: parentId || null });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.categories.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  }
};

export const parts = {
  getAll: async () => {
    await mockDelay();
    return Array.from(store.parts.values()).map((p: any) => {
      const mfr = store.manufacturers.get(p.manufacturer_id);
      const cat = store.categories.get(p.category_id);
      return {
        ...p,
        manufacturer_name: mfr?.name || '',
        manufacturer_code: mfr?.code || null,
        category_name: cat?.name || null
      };
    });
  },
  getById: async (id: number) => {
    await mockDelay();
    const p = store.parts.get(id);
    if (!p) return null;
    const mfr = store.manufacturers.get(p.manufacturer_id);
    const cat = store.categories.get(p.category_id);
    return {
      ...p,
      manufacturer_name: mfr?.name || '',
      manufacturer_code: mfr?.code || null,
      category_name: cat?.name || null
    };
  },
  getByKey: async (partNumber: string, manufacturerId: number) => {
    await mockDelay();
    const lowerPN = partNumber.toLowerCase();
    return Array.from(store.parts.values()).find((p: any) =>
      p.part_number.toLowerCase() === lowerPN && p.manufacturer_id === manufacturerId
    ) || null;
  },
  search: async (term: string, manufacturerIds: number[] = [], limit = 50) => {
    await mockDelay();
    const lowerTerm = term.toLowerCase().replace('*', '');
    const hasTerm = lowerTerm.length > 0;
    const hasMfrFilter = manufacturerIds.length > 0;

    return Array.from(store.parts.values())
      .filter((p: any) => {
        const mfr = store.manufacturers.get(p.manufacturer_id);
        const mfrName = mfr?.name.toLowerCase() || '';

        const matchesTerm = !hasTerm || (
          p.part_number.toLowerCase().includes(lowerTerm) ||
          p.description.toLowerCase().includes(lowerTerm) ||
          mfrName.includes(lowerTerm)
        );

        const matchesMfrFilter = !hasMfrFilter || manufacturerIds.includes(p.manufacturer_id);

        return matchesTerm && matchesMfrFilter;
      })
      .map((p: any) => {
        const mfr = store.manufacturers.get(p.manufacturer_id);
        const cat = store.categories.get(p.category_id);
        return {
          ...p,
          manufacturer_name: mfr?.name || '',
          manufacturer_code: mfr?.code || null,
          category_name: cat?.name || null
        };
      })
      .slice(0, limit);
  },
  create: async (part: any) => {
    await mockDelay();
    const id = store.ids.parts++;
    store.parts.set(id, { ...part, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, part: any) => {
    await mockDelay();
    if (store.parts.has(id)) {
      store.parts.set(id, { ...store.parts.get(id), ...part, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.parts.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  deleteAll: async () => {
    await mockDelay();
    store.parts.clear();
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: undefined };
  }
};

export const settings = {
  get: async (key: string) => { await mockDelay(); return store.settings.get(key)?.value ?? null; },
  set: async (key: string, value: string) => {
    await mockDelay();
    store.settings.set(key, { key, value, updated_at: new Date().toISOString() });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: undefined };
  },
  delete: async (key: string) => {
    await mockDelay();
    const deleted = store.settings.delete(key);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  getAll: async () => { await mockDelay(); return Array.from(store.settings.values()); }
};

// BOM Job Projects (job #)
export const bomJobProjects = {
  getAll: async () => {
    await mockDelay();
    return Array.from(store.jobProjects.values())
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },
  getById: async (id: number) => {
    await mockDelay();
    return store.jobProjects.get(id) || null;
  },
  create: async (projectNumber: string) => {
    await mockDelay();
    const id = store.ids.jobProjects++;
    store.jobProjects.set(id, {
      id,
      project_number: projectNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, updates: any) => {
    await mockDelay();
    if (store.jobProjects.has(id)) {
      store.jobProjects.set(id, { ...store.jobProjects.get(id), ...updates, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.jobProjects.delete(id);
    if (deleted) {
      // Cascade delete packages
      for (const [pkgId, pkg] of store.packages.entries()) {
        if ((pkg as any).project_id === id) {
          store.packages.delete(pkgId);
        }
      }
      saveToStorage();
    }
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  }
};

// BOM Packages (scoped to Job Projects)
export const bomPackages = {
  getByProject: async (projectId: number) => {
    await mockDelay();
    return Array.from(store.packages.values())
      .filter((p: any) => p.project_id === projectId)
      .map((p: any) => ({
        ...p,
        location_count: Array.from(store.locations.values()).filter((l: any) => l.project_id === p.id).length,
        item_count: Array.from(store.items.values()).filter((i: any) => i.project_id === p.id).length
      }))
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },
  getById: async (id: number) => {
    await mockDelay();
    const p = store.packages.get(id);
    if (!p) return null;
    return {
      ...(p as any),
      location_count: Array.from(store.locations.values()).filter((l: any) => l.project_id === id).length,
      item_count: Array.from(store.items.values()).filter((i: any) => i.project_id === id).length
    };
  },
  getAllWithCounts: async () => {
    await mockDelay();
    return Array.from(store.packages.values()).map((p: any) => ({
      ...p,
      project_number: (store.jobProjects.get((p as any).project_id) as any)?.project_number || '',
      location_count: Array.from(store.locations.values()).filter((l: any) => l.project_id === p.id).length,
      item_count: Array.from(store.items.values()).filter((i: any) => i.project_id === p.id).length
    })).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },
  create: async (projectId: number, packageName: string, name?: string, description?: string, version = '1.0', metadata?: string | null) => {
    await mockDelay();
    const id = store.ids.packages++;
    store.packages.set(id, {
      id,
      project_id: projectId,
      package_name: packageName,
      name: name ?? null,
      description: description ?? null,
      version,
      metadata: metadata ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, updates: any) => {
    await mockDelay();
    if (store.packages.has(id)) {
      store.packages.set(id, { ...store.packages.get(id), ...updates, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.packages.delete(id);
    if (deleted) {
      // Cascade delete locations and items
      for (const [locId, loc] of store.locations.entries()) {
        if ((loc as any).project_id === id) {
          store.locations.delete(locId);
        }
      }
      for (const [itemId, item] of store.items.entries()) {
        if ((item as any).project_id === id) {
          store.items.delete(itemId);
        }
      }
      saveToStorage();
    }
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  bulkCreate: async (packages: any[]) => {
    await mockDelay();
    const results: Array<{ rowsAffected: number; lastInsertId: number | undefined }> = [];
    for (const pkg of packages) {
      const id = store.ids.packages++;
      store.packages.set(id, { ...pkg, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      results.push({ rowsAffected: 1, lastInsertId: id });
    }
    saveToStorage();
    return results;
  }
};

// BOM Projects (legacy - deprecated, use bomPackages)
export const bomProjects = {
  getAll: async () => {
    await mockDelay();
    return Array.from(store.packages.values()).map((p: any) => {
      const jp = store.jobProjects.get(p.project_id) as any;
      return {
        ...p,
        project_number: jp?.project_number || '',
        location_count: Array.from(store.locations.values()).filter((l: any) => l.project_id === p.id).length,
        item_count: Array.from(store.items.values()).filter((i: any) => i.project_id === p.id).length
      };
    }).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },
  getById: async (id: number) => {
    await mockDelay();
    const p = store.packages.get(id);
    if (!p) return null;
    const jp = store.jobProjects.get((p as any).project_id) as any;
    return {
      ...(p as any),
      project_number: jp?.project_number || '',
      location_count: Array.from(store.locations.values()).filter((l: any) => l.project_id === id).length,
      item_count: Array.from(store.items.values()).filter((i: any) => i.project_id === id).length
    };
  },
  create: async (projectNumber: string, packageName: string, name?: string, description?: string, version = '1.0') => {
    await mockDelay();
    // Create job project first, then package
    const jpid = store.ids.jobProjects++;
    store.jobProjects.set(jpid, {
      id: jpid,
      project_number: projectNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const id = store.ids.packages++;
    store.packages.set(id, {
      id,
      project_id: jpid,
      package_name: packageName,
      name: name ?? null,
      description: description ?? null,
      version,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, updates: any) => {
    await mockDelay();
    if (store.packages.has(id)) {
      store.packages.set(id, { ...store.packages.get(id), ...updates, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.packages.delete(id);
    if (deleted) {
      // Cascade delete locations and items
      for (const [locId, loc] of store.locations.entries()) {
        if ((loc as any).project_id === id) {
          store.locations.delete(locId);
        }
      }
      saveToStorage();
    }
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  }
};

// BOM Locations
export const bomLocations = {
  getByProject: async (projectId: number) => {
    await mockDelay();
    return Array.from(store.locations.values())
      .filter((l: any) => l.project_id === projectId)
      .map((l: any) => ({
        ...l,
        item_count: Array.from(store.items.values()).filter((i: any) => i.location_id === l.id).length
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },
  getById: async (id: number) => { await mockDelay(); return store.locations.get(id) || null; },
  create: async (projectId: number, name: string, exportName?: string, sortOrder?: number) => {
    await mockDelay();
    const id = store.ids.locations++;
    store.locations.set(id, {
      id,
      project_id: projectId,
      name,
      export_name: exportName ?? null,
      sort_order: sortOrder ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  update: async (id: number, name: string, exportName?: string | null) => {
    await mockDelay();
    if (store.locations.has(id)) {
      store.locations.set(id, { ...store.locations.get(id), name, export_name: exportName ?? null, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.locations.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  bulkCreate: async (locations: any[]) => {
    await mockDelay();
    const results: Array<{ rowsAffected: number; lastInsertId: number | undefined }> = [];
    for (const loc of locations) {
      const id = store.ids.locations++;
      store.locations.set(id, { ...loc, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      results.push({ rowsAffected: 1, lastInsertId: id });
    }
    saveToStorage();
    return results;
  }
};

// BOM Items
export const bomItems = {
  getByProject: async (projectId: number, locationId?: number) => {
    await mockDelay();
    let items = Array.from(store.items.values()).filter((i: any) => i.project_id === projectId);
    if (locationId) {
      items = items.filter((i: any) => i.location_id === locationId);
    }
    return items.map((i: any) => {
      const loc = store.locations.get(i.location_id);
      return { ...i, location_name: loc ? loc.name : null };
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  },
  getById: async (id: number) => {
    await mockDelay();
    const item = store.items.get(id);
    if (!item) return null;
    const loc = store.locations.get(item.location_id);
    return { ...item, location_name: loc ? loc.name : null };
  },
  create: async (item: any) => {
    await mockDelay();
    const id = store.ids.items++;
    store.items.set(id, { ...item, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  bulkCreate: async (items: any[]) => {
    await mockDelay();
    for (const item of items) {
      const id = store.ids.items++;
      store.items.set(id, { ...item, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    saveToStorage();
    return Array(items.length).fill({ rowsAffected: 1, lastInsertId: 0 });
  },
  update: async (id: number, updates: any) => {
    await mockDelay();
    if (store.items.has(id)) {
      store.items.set(id, { ...store.items.get(id), ...updates, updated_at: new Date().toISOString() });
      saveToStorage();
      return { rowsAffected: 1, lastInsertId: undefined };
    }
    return { rowsAffected: 0, lastInsertId: undefined };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.items.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  bulkDelete: async (ids: number[]) => {
    await mockDelay();
    let count = 0;
    for (const id of ids) {
      if (store.items.delete(id)) count++;
    }
    saveToStorage();
    return { rowsAffected: count, lastInsertId: undefined };
  },
  duplicate: async (id: number) => {
    await mockDelay();
    const item = store.items.get(id);
    if (!item) throw new Error('Item not found');
    const newId = store.ids.items++;
    store.items.set(newId, { ...item, id: newId, sort_order: item.sort_order + 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: newId };
  }
};

export const bomExports = {
  getByProject: async (projectId: number) => {
    await mockDelay();
    return Array.from(store.exports.values())
      .filter((e: any) => e.project_id === projectId)
      .sort((a: any, b: any) => new Date(b.exported_at).getTime() - new Date(a.exported_at).getTime());
  },
  create: async (projectId: number, filename: string, format: any, version: string, locationId?: number) => {
    await mockDelay();
    const id = store.ids.exports++;
    store.exports.set(id, {
      id, project_id: projectId, location_id: locationId || null, filename, format, version,
      exported_at: new Date().toISOString()
    });
    saveToStorage();
    return { rowsAffected: 1, lastInsertId: id };
  },
  delete: async (id: number) => {
    await mockDelay();
    const deleted = store.exports.delete(id);
    if (deleted) saveToStorage();
    return { rowsAffected: deleted ? 1 : 0, lastInsertId: undefined };
  },
  deleteByProject: async (projectId: number) => {
    await mockDelay();
    console.log(`[MockDB] Deleted exports for project ${projectId}`);
    // Not actually deleting from mock store for now, but method exists
    return { rowsAffected: 1, lastInsertId: undefined };
  }
};

// Glenair (Empty mocks)
export const glenair = {
  getContactsBySize: async () => [],
  getContactsByPartNumber: async () => null,
  getArrangementsByContactCount: async () => [],
  getArrangementDetails: async () => [],
  getCompatibleContactSizes: async () => [],
  getPHMByArrangement: async () => null,
};
