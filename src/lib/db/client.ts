// Database client switch
// Automatically selects Real (Tauri/SQLite) or Mock (Browser/Memory) client

// 1. Import both clients
import * as RealClient from './real-client';
import * as MockClient from './mock-client';

// 2. Export types directly (they should be the same)
export type { Manufacturer, Category, Part, PartWithManufacturer } from '@/types/parts';
export type { Setting } from './real-client'; // or define interface here

// 3. Detect Environment
// window.__TAURI_INTERNALS__ exists only in the Tauri WebView
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (!isTauri) {
  console.warn("⚠️ ATS Tools: Running in Browser Mode. Using In-Memory Mock Database.");
}

// 4. Export the correct implementation
export const getDb = isTauri ? RealClient.getDb : MockClient.getDb;
export const closeDb = isTauri ? RealClient.closeDb : MockClient.closeDb;
export const query = isTauri ? RealClient.query : MockClient.query;
export const execute = isTauri ? RealClient.execute : MockClient.execute;
export const transaction = isTauri ? RealClient.transaction : MockClient.transaction;

export const manufacturers = isTauri ? RealClient.manufacturers : MockClient.manufacturers;
export const categories = isTauri ? RealClient.categories : MockClient.categories;
export const parts = isTauri ? RealClient.parts : MockClient.parts;
export const settings = isTauri ? RealClient.settings : MockClient.settings;

export const bomJobProjects = isTauri ? RealClient.bomJobProjects : MockClient.bomJobProjects;
export const bomPackages = isTauri ? RealClient.bomPackages : MockClient.bomPackages;
export const bomProjects = isTauri ? RealClient.bomProjects : MockClient.bomProjects;
export const bomLocations = isTauri ? RealClient.bomLocations : MockClient.bomLocations;
export const bomItems = isTauri ? RealClient.bomItems : MockClient.bomItems;
export const bomExports = isTauri ? RealClient.bomExports : MockClient.bomExports;

export const glenair = isTauri ? RealClient.glenair : MockClient.glenair;

// Load Calc APIs
export const partsElectrical = isTauri ? RealClient.partsElectrical : MockClient.partsElectrical;
export const loadCalcProjects = isTauri ? RealClient.loadCalcProjects : MockClient.loadCalcProjects;
export const loadCalcVoltageTables = isTauri ? RealClient.loadCalcVoltageTables : MockClient.loadCalcVoltageTables;
export const loadCalcLineItems = isTauri ? RealClient.loadCalcLineItems : MockClient.loadCalcLineItems;
export const loadCalcResults = isTauri ? RealClient.loadCalcResults : MockClient.loadCalcResults;
