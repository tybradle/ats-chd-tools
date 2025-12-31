import type { WireSystem } from '@/types/glenair';

export const AWG_TO_MM2: Record<number, number> = {
  4: 21.15, 6: 13.30, 8: 8.37, 10: 5.26, 12: 3.31, 14: 2.08, 16: 1.31,
  18: 0.82, 20: 0.52, 22: 0.33, 24: 0.20, 26: 0.13, 28: 0.08, 30: 0.05,
  32: 0.03, 34: 0.02, 36: 0.013, 40: 0.005
};

export const STANDARD_WIRE_SIZES = {
  awg: ['40', '36', '34', '32', '30', '28', '26', '24', '22', '20', '18', '16', '14', '12', '10', '8', '6', '4'],
  mm2: ['0.005', '0.013', '0.02', '0.03', '0.05', '0.08', '0.13', '0.20', '0.33', '0.52', '0.82', '1.31', '2.08', '3.31', '5.26', '8.37', '13.30', '21.15']
};

export function parseAwgValue(value: string | number): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const v = String(value).trim();
  if (v.includes('/')) {
    const [numStr, denomStr] = v.split('/');
    const num = parseInt(numStr, 10);
    const denom = parseInt(denomStr, 10);
    if (!isNaN(num) && denom === 0) return -Math.abs(num);
  }
  if (v === '0') return 0;
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

export function formatWireValue(value: number, system: WireSystem): string {
  if (system === 'AWG') {
    if (value === -1) return '1/0';
    if (value === -2) return '2/0';
    if (value === -3) return '3/0';
    if (value === -4) return '4/0';
    return value.toString();
  }
  return value < 1 ? value.toFixed(2) : value.toFixed(1);
}

export function buildPartNumber(config: {
  shellStyle: string,
  arrangement: string,
  contactType: string,
  keying: string
}): string {
  // Glenair Series 80 PN Structure: 80x-xxx-xx-x
  return `80${config.shellStyle}-${config.arrangement}-${config.contactType}${config.keying}`;
}
