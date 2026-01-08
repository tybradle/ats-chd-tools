export interface Manufacturer {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface Part {
  id: number;
  part_number: string;
  manufacturer_id: number;
  description: string;
  secondary_description: string | null;
  category_id: number | null;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface PartWithManufacturer extends Part {
  manufacturer_name: string;
  manufacturer_code: string | null;
  category_name: string | null;
}
