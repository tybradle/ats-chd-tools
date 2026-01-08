export type WireSystem = 'AWG' | 'MM2';

export interface GlenairContact {
  part_number: string;
  type: 'Pin' | 'Socket';
  contact_size: string;
  awg_range: string | null;
  mm2_range: string | null;
  description: string | null;
}

export interface GlenairArrangement {
  arrangement: string;
  total_contacts: number;
  contact_size: string;
  contact_count: number;
}

export interface GlenairPHM {
  arrangement: string;
  shell_size: number;
  dash_number: string;
}

export interface WireContactMapping {
  wire_size: string;
  system: WireSystem;
  contact_size: string;
}

export interface GlenairPartConfig {
  wireSystem: WireSystem;
  wireValue: string;
  conductorCount: number;
  shellStyle: string;
  arrangement: string;
  contactSize: string;
  selectedContacts: GlenairContact[];
}

export interface GlenairBuilderResult {
  partNumber: string;
  description: string;
  metadata: Record<string, unknown>;
}
