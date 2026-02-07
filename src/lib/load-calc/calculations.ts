import type { LoadCalcLineItem, PhaseAssignment } from '@/types/load-calc';
import { partsElectrical } from '@/lib/db/client';

const BTU_PER_WATT = 3.412;

export interface ResolvedLineItem {
  lineItem: LoadCalcLineItem;
  wattage: number;    // effective wattage (override or part spec)
  amperage: number;   // effective amperage (override or part spec)
  heatBtu: number;    // effective heat BTU (override or part spec)
}

export interface PhaseLoading {
  L1: number;
  L2: number;
  L3: number;
}

export interface TableCalculationResult {
  totalWatts: number;
  totalAmperes: number;
  totalBtu: number;
  phaseLoading: PhaseLoading;
  balancePct: number | null; // null if not a 3-phase table
  itemCount: number;
}

/**
 * Resolve effective electrical values for a line item.
 * Override fields take precedence over part_electrical specs.
 */
export async function resolveLineItem(
  item: LoadCalcLineItem,
  voltageType: string
): Promise<ResolvedLineItem> {
  let wattage = 0;
  let amperage = 0;
  let heatBtu = 0;

  // Try to get part electrical specs if linked to a master part
  if (item.part_id) {
    const spec = await partsElectrical.getByPartAndVoltageType(item.part_id, voltageType);
    if (spec) {
      wattage = Number(spec.wattage) || 0;
      amperage = Number(spec.amperage) || 0;
      heatBtu = Number(spec.heat_dissipation_btu) || 0;
    }
  }

  // Overrides take precedence
  if (item.wattage_override != null) wattage = item.wattage_override;
  if (item.amperage_override != null) amperage = item.amperage_override;
  if (item.heat_dissipation_override != null) heatBtu = item.heat_dissipation_override;

  return { lineItem: item, wattage, amperage, heatBtu };
}

/**
 * Calculate total heat dissipation in BTU/hr.
 * Formula: sum of (qty × utilization_pct × wattage × 3.412) for each item.
 * If heat BTU override/spec exists, uses that directly instead of wattage conversion.
 */
export function calculateHeat(resolved: ResolvedLineItem[]): number {
  let totalBtu = 0;
  for (const r of resolved) {
    const qty = r.lineItem.qty;
    const util = r.lineItem.utilization_pct;
    if (r.heatBtu > 0) {
      // Use direct BTU value if available
      totalBtu += qty * util * r.heatBtu;
    } else {
      // Convert watts to BTU
      totalBtu += qty * util * r.wattage * BTU_PER_WATT;
    }
  }
  return Math.round(totalBtu * 100) / 100;
}

/**
 * Calculate total loading in watts.
 */
export function calculateTotalWatts(resolved: ResolvedLineItem[]): number {
  let total = 0;
  for (const r of resolved) {
    total += r.lineItem.qty * r.lineItem.utilization_pct * r.wattage;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculate total amperage.
 */
export function calculateTotalAmperes(resolved: ResolvedLineItem[]): number {
  let total = 0;
  for (const r of resolved) {
    total += r.lineItem.qty * r.lineItem.utilization_pct * r.amperage;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculate per-phase loading in watts for 3-phase tables.
 * Only items with phase_assignment L1/L2/L3 contribute.
 */
export function calculatePhaseLoading(resolved: ResolvedLineItem[]): PhaseLoading {
  const loading: PhaseLoading = { L1: 0, L2: 0, L3: 0 };
  for (const r of resolved) {
    const phase = r.lineItem.phase_assignment as PhaseAssignment;
    if (phase === 'L1' || phase === 'L2' || phase === 'L3') {
      loading[phase] += r.lineItem.qty * r.lineItem.utilization_pct * r.wattage;
    }
  }
  loading.L1 = Math.round(loading.L1 * 100) / 100;
  loading.L2 = Math.round(loading.L2 * 100) / 100;
  loading.L3 = Math.round(loading.L3 * 100) / 100;
  return loading;
}

/**
 * Calculate phase balance/imbalance percentage.
 * Formula: (Max - Min) / Max × 100
 * Returns null if max is 0 (no phase-assigned loads).
 */
export function calculateBalance(phaseLoading: PhaseLoading): number | null {
  const values = [phaseLoading.L1, phaseLoading.L2, phaseLoading.L3];
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === 0) return null;
  return Math.round(((max - min) / max) * 10000) / 100; // 2 decimal places
}

/**
 * Is this a 3-phase voltage type?
 */
export function isThreePhase(voltageType: string): boolean {
  return voltageType.includes('3PH');
}

/**
 * Run all calculations for a voltage table's line items.
 */
export async function calculateTableResults(
  lineItems: LoadCalcLineItem[],
  voltageType: string
): Promise<TableCalculationResult> {
  // Resolve all line items in parallel
  const resolved = await Promise.all(
    lineItems.map(item => resolveLineItem(item, voltageType))
  );

  const totalWatts = calculateTotalWatts(resolved);
  const totalAmperes = calculateTotalAmperes(resolved);
  const totalBtu = calculateHeat(resolved);
  const phaseLoading = calculatePhaseLoading(resolved);
  const balancePct = isThreePhase(voltageType) ? calculateBalance(phaseLoading) : null;

  return {
    totalWatts,
    totalAmperes,
    totalBtu,
    phaseLoading,
    balancePct,
    itemCount: lineItems.length,
  };
}
