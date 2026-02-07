import { query, loadCalcVoltageTables, loadCalcLineItems } from '@/lib/db/client';
import { calculatePhaseLoading, calculateBalance, isThreePhase, resolveLineItem } from './calculations';

export interface HeatReportRow {
  locationId: number | null;
  locationName: string;
  totalWatts: number;
  tableCount: number;
}

export interface LoadingReportRow {
  voltageTableId: number;
  voltageType: string;
  locationName: string;
  totalWatts: number;
  totalAmperes: number;
  isCalculated: boolean;
}

export interface BalanceReportRow {
  voltageTableId: number;
  voltageType: string;
  locationName: string;
  L1: number;
  L2: number;
  L3: number;
  balancePct: number | null;
  isCalculated: boolean;
}

/**
 * Aggregates total heat (in Watts) grouped by enclosure location.
 * Per requirement: Heat report shows heating in WATTS, not BTU.
 */
export async function aggregateHeatWattsByLocation(projectId: number): Promise<HeatReportRow[]> {
  const sql = `
    SELECT 
      vt.location_id as locationId,
      COALESCE(loc.name, 'Unassigned') as locationName,
      SUM(COALESCE(res.total_watts, 0)) as totalWatts,
      COUNT(vt.id) as tableCount
    FROM load_calc_voltage_tables vt
    LEFT JOIN load_calc_results res ON vt.id = res.voltage_table_id
    LEFT JOIN bom_locations loc ON vt.location_id = loc.id
    WHERE vt.project_id = ?
    GROUP BY vt.location_id, locationName
    ORDER BY locationName
  `;
  return query<HeatReportRow>(sql, [projectId]);
}

/**
 * Aggregates loading data per voltage table.
 */
export async function aggregateLoadingByVoltageTable(projectId: number): Promise<LoadingReportRow[]> {
  const sql = `
    SELECT 
      vt.id as voltageTableId,
      vt.voltage_type as voltageType,
      COALESCE(loc.name, 'Unassigned') as locationName,
      COALESCE(res.total_watts, 0) as totalWatts,
      COALESCE(res.total_amperes, 0) as totalAmperes,
      CASE WHEN res.id IS NOT NULL THEN 1 ELSE 0 END as isCalculated
    FROM load_calc_voltage_tables vt
    LEFT JOIN load_calc_results res ON vt.id = res.voltage_table_id
    LEFT JOIN bom_locations loc ON vt.location_id = loc.id
    WHERE vt.project_id = ?
    ORDER BY locationName, vt.voltage_type
  `;
  const rows = await query<any>(sql, [projectId]);
  return rows.map(r => ({
    ...r,
    isCalculated: Boolean(r.isCalculated)
  }));
}

/**
 * Gets phase balance data for all 3-phase tables in the project.
 * Recalculates phase loading from line items since it's not cached in results table.
 */
export async function getThreePhaseBalanceData(projectId: number): Promise<BalanceReportRow[]> {
  const tables = await loadCalcVoltageTables.getByProject(projectId);
  const threePhaseTables = tables.filter(t => isThreePhase(t.voltage_type));
  
  const results: BalanceReportRow[] = [];
  
  for (const table of threePhaseTables) {
    const lineItems = await loadCalcLineItems.getByVoltageTable(table.id);
    
    // Check if we have results cached to know if it's "calculated"
    const cachedResult = await query('SELECT id FROM load_calc_results WHERE voltage_table_id = ? LIMIT 1', [table.id]);
    const isCalculated = cachedResult.length > 0;

    // We always calculate for the report to ensure freshness/completeness
    const resolved = await Promise.all(
      lineItems.map(item => resolveLineItem(item, table.voltage_type))
    );
    const phaseLoading = calculatePhaseLoading(resolved);
    const balancePct = calculateBalance(phaseLoading);
    
    let locationName = 'Unassigned';
    if (table.location_id) {
        const loc = await query<{name: string}>('SELECT name FROM bom_locations WHERE id = ?', [table.location_id]);
        if (loc[0]) locationName = loc[0].name;
    }

    results.push({
      voltageTableId: table.id,
      voltageType: table.voltage_type,
      locationName,
      ...phaseLoading,
      balancePct,
      isCalculated
    });
  }
  
  return results;
}
