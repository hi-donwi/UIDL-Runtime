export interface StockValuationLine {
  itemId: string;
  warehouse: string;
  quantity: number;
  valuationRate: number;
}

export interface InventoryGlBalance {
  accountId: string;
  amount: number;
  warehouse?: string;
}

export interface InventoryReconciliationInput {
  companyId: string;
  stockLines: StockValuationLine[];
  glBalances: InventoryGlBalance[];
  tolerance?: number;
}

export interface WarehouseReconciliation {
  warehouse: string;
  stockValue: number;
  inventoryGlBalance: number | null;
  difference: number | null;
  status: "matched" | "mismatch" | "unallocated";
}

export interface InventoryReconciliationResult {
  companyId: string;
  stockValue: number;
  inventoryGlBalance: number;
  difference: number;
  absoluteDifference: number;
  tolerance: number;
  status: "matched" | "mismatch";
  warehouseAllocationAvailable: boolean;
  warehouses: WarehouseReconciliation[];
  controls: string[];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
}

function sumByWarehouse(stockLines: StockValuationLine[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const line of stockLines) {
    assertFinite(line.quantity, "Stock quantity");
    assertFinite(line.valuationRate, "Stock valuation rate");
    const value = line.quantity * line.valuationRate;
    assertFinite(value, "Stock value");
    values.set(line.warehouse, (values.get(line.warehouse) ?? 0) + value);
  }
  return values;
}

export function reconcileInventoryToGl(input: InventoryReconciliationInput): InventoryReconciliationResult {
  const tolerance = input.tolerance ?? 0;
  assertFinite(tolerance, "Reconciliation tolerance");
  if (tolerance < 0) throw new Error("Reconciliation tolerance cannot be negative");

  const stockByWarehouse = sumByWarehouse(input.stockLines);
  const stockValue = [...stockByWarehouse.values()].reduce((total, value) => total + value, 0);

  for (const balance of input.glBalances) assertFinite(balance.amount, "Inventory GL balance");
  const inventoryGlBalance = input.glBalances.reduce((total, balance) => total + balance.amount, 0);
  const difference = stockValue - inventoryGlBalance;
  const warehouseAllocationAvailable =
    input.glBalances.length > 0 && input.glBalances.every((balance) => Boolean(balance.warehouse));

  const glByWarehouse = new Map<string, number>();
  if (warehouseAllocationAvailable) {
    for (const balance of input.glBalances) {
      const warehouse = balance.warehouse!;
      glByWarehouse.set(warehouse, (glByWarehouse.get(warehouse) ?? 0) + balance.amount);
    }
  }

  const warehouseNames = warehouseAllocationAvailable
    ? new Set([...stockByWarehouse.keys(), ...glByWarehouse.keys()])
    : new Set(stockByWarehouse.keys());
  const warehouses = [...warehouseNames].sort().map((warehouse): WarehouseReconciliation => {
    const warehouseStockValue = stockByWarehouse.get(warehouse) ?? 0;
    if (!warehouseAllocationAvailable) {
      return {
        warehouse,
        stockValue: warehouseStockValue,
        inventoryGlBalance: null,
        difference: null,
        status: "unallocated",
      };
    }

    const warehouseGlBalance = glByWarehouse.get(warehouse) ?? 0;
    const warehouseDifference = warehouseStockValue - warehouseGlBalance;
    return {
      warehouse,
      stockValue: warehouseStockValue,
      inventoryGlBalance: warehouseGlBalance,
      difference: warehouseDifference,
      status: Math.abs(warehouseDifference) <= tolerance ? "matched" : "mismatch",
    };
  });

  return {
    companyId: input.companyId,
    stockValue,
    inventoryGlBalance,
    difference,
    absoluteDifference: Math.abs(difference),
    tolerance,
    status: Math.abs(difference) <= tolerance ? "matched" : "mismatch",
    warehouseAllocationAvailable,
    warehouses,
    controls: warehouseAllocationAvailable
      ? []
      : ["Warehouse reconciliation is unavailable because inventory GL balances have no warehouse dimension."],
  };
}
