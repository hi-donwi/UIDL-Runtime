import { describe, expect, it } from "vitest";
import { getReportBuilder } from "../reports";

describe("Meridian inventory reconciliation report", () => {
  it("surfaces the stock-to-GL discrepancy and warehouse control limitation", () => {
    const builder = getReportBuilder("InventoryReconciliation");
    expect(builder).toBeTypeOf("function");

    const document = builder!();
    const renderedContract = JSON.stringify(document);

    expect(document.id).toBe("meridian-report-inventory-reconciliation");
    expect(document.name).toBe("Inventory Reconciliation");
    expect(renderedContract).toContain("Stock Value: Rp 63.900.000");
    expect(renderedContract).toContain("Inventory GL: Rp 0");
    expect(renderedContract).toContain("Difference: Rp 63.900.000");
    expect(renderedContract).toContain("Mismatch");
    expect(renderedContract).toContain("Warehouse reconciliation is unavailable");
    expect(renderedContract).toContain("Raw Material Store");
    expect(renderedContract).toContain("Showroom");
  });

  it("uses the explicit stock-balance snapshot instead of summing transfer movements", () => {
    const builder = getReportBuilder("StockBalance");
    const renderedContract = JSON.stringify(builder!());

    expect(renderedContract).toContain("Total Stock Value: Rp 63.900.000");
    expect(renderedContract).toContain("Raw Material Store");
    expect(renderedContract).toContain("Showroom");
  });
});
