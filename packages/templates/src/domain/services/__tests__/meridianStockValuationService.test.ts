import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { seed } from "../../../mock-data/seed";
import { issueStock, receiveStock } from "../meridianStockService";
import { assertStockTieOut, buildMeridianStockValuationReport } from "../meridianStockValuationService";

function meridianAdapter() {
  return createInMemoryAdapter({
    seed: {
      MeridianItem: seed.MeridianItem,
      MeridianStockLedgerEntry: seed.MeridianStockLedgerEntry,
      GeneralLedger: seed.GeneralLedger,
    },
  });
}

describe("meridian stock valuation ↔ Inventory GL reconciliation", () => {
  it("ties out for the seeded stock ledger", async () => {
    const report = await buildMeridianStockValuationReport(meridianAdapter());
    expect(() => assertStockTieOut(report)).not.toThrow();
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.totalStockValue).toBe(report.summary.inventoryGlBalance);
    expect(report.summary.itemCount).toBe(5);
    expect(report.summary.unbalancedVoucherCount).toBe(0);
    expect(report.summary.totalReceiptsValue).toBeGreaterThan(report.summary.totalIssuesValue);
  });

  it("stays tied out after live receipts and issues", async () => {
    const adapter = meridianAdapter();
    await receiveStock(adapter, { item: "ITEM-002", quantity: 60, rate: 90_000, batchNo: "BATCH-INK-2707", receivedAt: "2027-08-01" });
    await issueStock(adapter, {
      item: "ITEM-004",
      quantity: 5,
      serialNos: ["SN-MON-0001", "SN-MON-0002", "SN-MON-0003", "SN-MON-0004", "SN-MON-0005"],
      issuedAt: "2027-08-02",
    });
    await issueStock(adapter, { item: "ITEM-009", quantity: 100, issuedAt: "2027-08-03" });

    const report = await buildMeridianStockValuationReport(adapter);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.unbalancedVoucherCount).toBe(0);
  });
});
