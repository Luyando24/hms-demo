export interface InventoryCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  units?: InventoryUnit[];
  _count?: {
    units?: number;
    items?: number;
  };
}

export interface InventoryUnit {
  id: string;
  category_id: string;
  name: string;
  abbreviation?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category?: InventoryCategory;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  stock_level: number;
  reorder_level?: number;
  min_reorder_level?: number;
  unit_price?: number;
  inventory_type?: 'MEDICAL' | 'CAPITAL';
  batch_number?: string | null;
  expiry_date?: string | null;
  manufacturer?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  storage_condition?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CapitalItemCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  _count?: {
    items?: number;
  };
}

export interface CapitalItem {
  id: string;
  name: string;
  category: string;
  serial_number?: string | null;
  model_number?: string | null;
  location?: string | null;
  department?: string | null;
  assigned_to?: string | null;
  asset_tag?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  last_maintenance?: string | null;
  next_maintenance?: string | null;
  warranty_expiry?: string | null;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'UNDER_REPAIR' | 'DECOMMISSIONED';
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}
