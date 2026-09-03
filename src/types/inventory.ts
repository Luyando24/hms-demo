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
  created_at?: string;
  updated_at?: string;
}
