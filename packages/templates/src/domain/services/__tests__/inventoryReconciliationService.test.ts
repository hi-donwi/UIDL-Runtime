import { describe, expect, it } from "vitest";
import { reconcileInventoryToGl } from "../inventoryReconciliationService";

describe("reconcileInventoryToGl", () => {
  it("reconciles stock value to warehouse-dimensioned inventory GL with explicit tolerance", () => {
    const result = reconcileInventoryToGl({
      companyId: "meridian-trading",
      tolerance: 1,
      stockLines: [
        { itemId: "ITEM-001", warehouse: "Main", quantity: 2, valuationRate: 100 },
        { itemId: "ITEM-002", warehouse: "Showroom", quantity: 3, valuationRate: 50 },
      ],
      glBalances: [
        { accountId: "inventory", warehouse: "Main", amount: 200 },
        { accountId: "inventory", warehouse: "Showroom", amount: 349 },
      ],
    });

    expect(result).toEqual({
      companyId: "meridian-trading",
      stockValue: 350,
      inventoryGlBalance: 549,
      difference: -199,
      absoluteDifference: 199,
      tolerance: 1,
      status: "mismatch",
      warehouseAllocationAvailable: true,
      warehouses: [
        { warehouse: "Main", stockValue: 200, inventoryGlBalance: 200, difference: 0, status: "matched" },
        { warehouse: "Showroom", stockValue: 150, inventoryGlBalance: 349, difference: -199, status: "mismatch" },
      ],
      controls: [],
    });
  });

  it("reports a company-level mismatch and discloses unavailable warehouse allocation", () => {
    const result = reconcileInventoryToGl({
      companyId: "meridian-trading",
      stockLines: [
        { itemId: "ITEM-001", warehouse: "Showroom", quantity: 4, valuationRate: 45_000 },
        { itemId: "ITEM-002", warehouse: "Raw Material Store", quantity: 10, valuationRate: 25_000 },
      ],
      glBalances: [{ accountId: "inventory", amount: 0 }],
    });

    expect(result.stockValue).toBe(430_000);
    expect(result.inventoryGlBalance).toBe(0);
    expect(result.difference).toBe(430_000);
    expect(result.status).toBe("mismatch");
    expect(result.warehouseAllocationAvailable).toBe(false);
    expect(result.warehouses).toEqual([
      { warehouse: "Raw Material Store", stockValue: 250_000, inventoryGlBalance: null, difference: null, status: "unallocated" },
      { warehouse: "Showroom", stockValue: 180_000, inventoryGlBalance: null, difference: null, status: "unallocated" },
    ]);
    expect(result.controls).toEqual([
      "Warehouse reconciliation is unavailable because inventory GL balances have no warehouse dimension.",
    ]);
  });

  it("treats a company-level rounding difference inside tolerance as matched", () => {
    const result = reconcileInventoryToGl({
      companyId: "meridian-trading",
      tolerance: 1,
      stockLines: [{ itemId: "ITEM-001", warehouse: "Main", quantity: 1, valuationRate: 100 }],
      glBalances: [{ accountId: "inventory", amount: 99 }],
    });

    expect(result.difference).toBe(1);
    expect(result.status).toBe("matched");
  });

  it("rejects unsafe numeric inputs instead of producing a misleading reconciliation", () => {
    expect(() =>
      reconcileInventoryToGl({
        companyId: "meridian-trading",
        stockLines: [{ itemId: "ITEM-001", warehouse: "Main", quantity: Number.NaN, valuationRate: 100 }],
        glBalances: [{ accountId: "inventory", amount: 0 }],
      }),
    ).toThrow("Stock quantity must be a finite number");
  });
});
