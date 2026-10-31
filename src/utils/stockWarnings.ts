export type MedicalStockStatus =
  | 'OUT_OF_STOCK'
  | 'CRITICAL_LOW'
  | 'APPROACHING_LOW'
  | 'ADEQUATE'
  | 'CAPITAL_ASSET';

export interface StockWarningInfo {
  status: MedicalStockStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
  threshold: number;
  approachingThreshold: number;
  needsRestock: boolean;
  isApproaching: boolean;
  message: string;
}

/**
 * Returns the configured reorder threshold for an inventory item, defaulting to 10 if unspecified.
 */
export function getReorderThreshold(item: {
  reorder_level?: number | null;
  min_reorder_level?: number | null;
}): number {
  if (item.reorder_level !== undefined && item.reorder_level !== null && !isNaN(Number(item.reorder_level))) {
    return Math.max(0, Number(item.reorder_level));
  }
  if (item.min_reorder_level !== undefined && item.min_reorder_level !== null && !isNaN(Number(item.min_reorder_level))) {
    return Math.max(0, Number(item.min_reorder_level));
  }
  return 10;
}

/**
 * Calculates the threshold below which an item is approaching its minimum reorder level.
 * Buffer is configured at ~25% above the reorder level (minimum +2 units).
 */
export function getApproachingThreshold(threshold: number): number {
  if (threshold <= 0) return 2;
  return Math.max(Math.ceil(threshold * 1.25), threshold + 2);
}

/**
 * Checks whether an item is a capital asset, which must NEVER generate medical stock warnings.
 */
export interface MedicalStockItemInput {
  id?: string;
  name?: string;
  stock_level?: number | null;
  reorder_level?: number | null;
  min_reorder_level?: number | null;
  inventory_type?: string | null;
  unit?: string | null;
  asset_tag?: string | null;
  serial_number?: string | null;
  model_number?: string | null;
}

export function isCapitalAsset(item: MedicalStockItemInput | Record<string, unknown> | null | undefined): boolean {
  if (!item) return false;
  if ('inventory_type' in item && item.inventory_type === 'CAPITAL') return true;
  // Check common asset properties if inventory_type isn't populated
  if ('asset_tag' in item || 'serial_number' in item || 'model_number' in item) return true;
  return false;
}

/**
 * Evaluates the health and warning level of a medical stock item based on actual quantities and configured thresholds.
 */
export function evaluateMedicalStock(item: MedicalStockItemInput | Record<string, unknown>): StockWarningInfo {
  if (isCapitalAsset(item)) {
    return {
      status: 'CAPITAL_ASSET',
      label: 'Capital Asset',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-700',
      threshold: 0,
      approachingThreshold: 0,
      needsRestock: false,
      isApproaching: false,
      message: 'Durable equipment asset (excluded from stock alerts)',
    };
  }

  const stock = Math.max(0, Number(item.stock_level) || 0);
  const threshold = getReorderThreshold(item);
  const approaching = getApproachingThreshold(threshold);
  const unit = item.unit || 'units';

  if (stock === 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: 'Out of Stock',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
      dotClass: 'bg-rose-600 animate-pulse',
      textClass: 'text-rose-700',
      threshold,
      approachingThreshold: approaching,
      needsRestock: true,
      isApproaching: false,
      message: `Depleted: 0 ${unit} remaining. Immediate restocking required.`,
    };
  }

  if (stock <= threshold) {
    return {
      status: 'CRITICAL_LOW',
      label: 'Reorder Level Reached',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700',
      threshold,
      approachingThreshold: approaching,
      needsRestock: true,
      isApproaching: false,
      message: `Critical: ${stock} ${unit} remaining (Reorder threshold: ${threshold} ${unit}).`,
    };
  }

  if (stock <= approaching) {
    return {
      status: 'APPROACHING_LOW',
      label: 'Approaching Minimum',
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 ring-yellow-500/20',
      dotClass: 'bg-yellow-500',
      textClass: 'text-yellow-800',
      threshold,
      approachingThreshold: approaching,
      needsRestock: false,
      isApproaching: true,
      message: `Advisory: ${stock} ${unit} remaining (Approaching reorder threshold of ${threshold} ${unit}).`,
    };
  }

  return {
    status: 'ADEQUATE',
    label: 'In Stock',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    threshold,
    approachingThreshold: approaching,
    needsRestock: false,
    isApproaching: false,
    message: `Adequate: ${stock} ${unit} available.`,
  };
}
