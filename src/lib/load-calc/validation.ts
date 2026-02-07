import type { LoadCalcLineItem } from '@/types/load-calc';
import { isThreePhase } from './calculations';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  lineItemId: number;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

/**
 * Validate line items for a voltage table before running calculations.
 * Returns an array of issues. Empty array = valid.
 */
export function validateLineItems(
  lineItems: LoadCalcLineItem[],
  voltageType: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const threePhase = isThreePhase(voltageType);

  for (const item of lineItems) {
    // QTY must be > 0
    if (item.qty <= 0) {
      issues.push({
        lineItemId: item.id,
        field: 'qty',
        message: `Quantity must be greater than 0 (row: ${item.manual_part_number || item.description || item.id})`,
        severity: 'error',
      });
    }

    // Utilization must be 0.0 - 1.0
    if (item.utilization_pct < 0 || item.utilization_pct > 1) {
      issues.push({
        lineItemId: item.id,
        field: 'utilization_pct',
        message: `Utilization must be between 0% and 100% (row: ${item.manual_part_number || item.description || item.id})`,
        severity: 'error',
      });
    }

    // 3-phase tables: items should have a phase assignment
    if (threePhase && !item.phase_assignment) {
      issues.push({
        lineItemId: item.id,
        field: 'phase_assignment',
        message: `Phase assignment required for 3-phase table (row: ${item.manual_part_number || item.description || item.id})`,
        severity: 'warning',
      });
    }

    // Wattage should be available (from override or part spec)
    // We can only check override here; part spec check happens during calculation
    const hasOverrideWattage = item.wattage_override != null && item.wattage_override > 0;
    const isManualEntry = !item.part_id;
    if (isManualEntry && !hasOverrideWattage) {
      issues.push({
        lineItemId: item.id,
        field: 'wattage_override',
        message: `Manual entry has no wattage specified (row: ${item.manual_part_number || item.description || item.id})`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

/**
 * Check if issues contain any errors (not just warnings).
 */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some(i => i.severity === 'error');
}
