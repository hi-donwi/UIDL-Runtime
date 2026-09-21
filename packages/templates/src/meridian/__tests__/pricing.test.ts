import { describe, expect, it } from "vitest";
import { resolveItemPrice, calculateDocumentTotals } from "../pricing";

describe("Meridian Pricing Engine", () => {
  it("resolves default selling price list entry", () => {
    const result = resolveItemPrice("ITEM-001", "Selling");
    expect(result.baseRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBe(result.baseRate);
    expect(result.discountPercent).toBe(0);
  });

  it("resolves buying price list entry with wholesale margin", () => {
    const selling = resolveItemPrice("ITEM-001", "Selling");
    const buying = resolveItemPrice("ITEM-001", "Buying");
    expect(buying.baseRate).toBeLessThan(selling.baseRate);
  });

  it("applies pricing rule discount for matching item group", () => {
    // ITEM-005 (Meja Kantor) belongs to Furniture group with PR-001 (5% discount)
    const result = resolveItemPrice("ITEM-005", "Selling");
    expect(result.discountPercent).toBe(5);
    expect(result.effectiveRate).toBe(Math.round(result.baseRate * 0.95));
    expect(result.appliedRule).toContain("Volume Discount");
  });

  it("applies coupon code discount", () => {
    const result = resolveItemPrice("ITEM-001", "Selling", 1, "MERIDIAN10");
    expect(result.discountPercent).toBe(10);
    expect(result.appliedRule).toBe("MERIDIAN10");
  });

  it("calculates document totals with PPN 11%", () => {
    const totals = calculateDocumentTotals([
      { quantity: 2, rate: 100000 },
      { quantity: 1, rate: 50000 },
    ]);
    expect(totals.subtotal).toBe(250000);
    expect(totals.tax).toBe(27500);
    expect(totals.total).toBe(277500);
  });
});
