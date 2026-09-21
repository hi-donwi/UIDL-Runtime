import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { issueStock, receiveStock } from "../meridianStockService";
import { buildMeridianStockValuationReport } from "../meridianStockValuationService";

function item(id: string, stockQty: number, stockValue: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    tenant: "meridian",
    name: id,
    warehouse: "Gudang Utama Meridian",
    stockQty,
    stockValue,
    valuationRate: stockQty > 0 ? Math.round(stockValue / stockQty) : 0,
    stockUOM: "Nos",
    uomConversions: {},
    ...extra,
  };
}
function adapter(items: Array<Record<string, unknown>>) {
  return createInMemoryAdapter({ seed: { MeridianItem: items, MeridianStockLedgerEntry: [], GeneralLedger: [] } });
}
const bal = (lines: Array<{ debit: number; credit: number }>) =>
  Math.round(lines.reduce((s, l) => s + l.debit, 0)) === Math.round(lines.reduce((s, l) => s + l.credit, 0));

describe("meridian stock movement + moving-average valuation", () => {
  it("reprices moving-average on receipt and posts Inventory / GRNI", async () => {
    const a = adapter([item("ITEM-1", 500, 20_000_000)]); // avg 40_000

    const result = await receiveStock(a, { item: "ITEM-1", quantity: 200, rate: 45_000, receivedAt: "2027-07-10" });

    // (500*40_000 + 200*45_000) / 700 = 29_000_000 / 700 = 41_428.57 -> 41_429 display, value stays exact
    expect(result.item).toMatchObject({ stockQty: 700, stockValue: 29_000_000, valuationRate: 41_429 });
    expect(result.voucher.lines).toEqual([
      { account: "1140", accountName: "1140 - Persediaan Barang Dagang", debit: 9_000_000, credit: 0 },
      { account: "2150", accountName: "2150 - Utang Pembelian Diterima Blm Ditagih", debit: 0, credit: 9_000_000 },
    ]);
    expect(bal(result.voucher.lines)).toBe(true);
  });

  it("issues at the current average value and posts COGS / Inventory", async () => {
    const a = adapter([item("ITEM-1", 700, 29_000_000)]);

    const result = await issueStock(a, { item: "ITEM-1", quantity: 300, issuedAt: "2027-07-20" });

    // 29_000_000 * 300 / 700 = 12_428_571
    expect(result.item).toMatchObject({ stockQty: 400, stockValue: 16_571_429 });
    expect(result.voucher.lines).toEqual([
      { account: "5110", accountName: "5110 - Harga Pokok Penjualan", debit: 12_428_571, credit: 0 },
      { account: "1140", accountName: "1140 - Persediaan Barang Dagang", debit: 0, credit: 12_428_571 },
    ]);
  });

  it("rejects a non-positive quantity, an unknown item, and an over-issue", async () => {
    const a = adapter([item("ITEM-1", 10, 1_000_000)]);
    await expect(receiveStock(a, { item: "ITEM-1", quantity: 0, rate: 100, receivedAt: "2027-07-10" })).rejects.toBeInstanceOf(DataError);
    await expect(issueStock(a, { item: "ITEM-404", quantity: 1, issuedAt: "2027-07-10" })).rejects.toMatchObject({ code: "not_found" });
    await expect(issueStock(a, { item: "ITEM-1", quantity: 50, issuedAt: "2027-07-10" })).rejects.toMatchObject({ code: "validation" });
  });

  it("converts a transaction UOM to the item's stock UOM for quantity and rate", async () => {
    const a = adapter([item("ITEM-1", 400, 16_000_000, { stockUOM: "Lembar", uomConversions: { Rim: 500, Lembar: 1 } })]);

    const result = await receiveStock(a, { item: "ITEM-1", quantity: 2, uom: "Rim", rate: 225_000, receivedAt: "2027-08-01" });

    // 2 Rim = 1000 Lembar; total value 450_000; new value 16_450_000 over 1400 Lembar
    expect(result.item).toMatchObject({ stockQty: 1400, stockValue: 16_450_000 });
    expect(result.entry).toMatchObject({ quantityChange: 1000, valuationRate: 450, txnUom: "Rim", txnQuantity: 2, conversionFactor: 500 });

    await expect(receiveStock(a, { item: "ITEM-1", quantity: 1, uom: "Pallet", rate: 1, receivedAt: "2027-08-02" })).rejects.toBeInstanceOf(DataError);
  });

  it("requires a batch number on a batch-tracked item and records it on the ledger entry", async () => {
    const a = adapter([item("ITEM-1", 100, 8_000_000, { hasBatchNo: true })]);

    await expect(issueStock(a, { item: "ITEM-1", quantity: 10, issuedAt: "2027-08-01" })).rejects.toMatchObject({ code: "validation" });

    const result = await issueStock(a, { item: "ITEM-1", quantity: 10, batchNo: "BATCH-A", issuedAt: "2027-08-01" });
    expect(result.entry).toMatchObject({ batchNo: "BATCH-A", quantityChange: -10 });
  });

  it("requires one distinct serial number per unit on a serial-tracked item", async () => {
    const a = adapter([item("ITEM-1", 0, 0, { hasSerialNo: true })]);

    await expect(receiveStock(a, { item: "ITEM-1", quantity: 3, rate: 100, receivedAt: "2027-08-01" })).rejects.toMatchObject({ code: "validation" });
    await expect(
      receiveStock(a, { item: "ITEM-1", quantity: 3, rate: 100, serialNos: ["SN-1", "SN-1", "SN-2"], receivedAt: "2027-08-01" }),
    ).rejects.toMatchObject({ code: "validation" });

    const result = await receiveStock(a, { item: "ITEM-1", quantity: 3, rate: 100, serialNos: ["SN-1", "SN-2", "SN-3"], receivedAt: "2027-08-01" });
    expect(result.entry).toMatchObject({ serialNos: ["SN-1", "SN-2", "SN-3"], quantityChange: 3 });
  });

  it("keeps the Inventory GL account equal to summed on-hand value across receipts and an issue", async () => {
    const a = adapter([item("ITEM-1", 0, 0), item("ITEM-2", 0, 0)]);

    await receiveStock(a, { item: "ITEM-1", quantity: 100, rate: 50_000, receivedAt: "2027-07-01" });
    await receiveStock(a, { item: "ITEM-2", quantity: 40, rate: 200_000, receivedAt: "2027-07-01" });
    await receiveStock(a, { item: "ITEM-1", quantity: 50, rate: 60_000, receivedAt: "2027-07-10" });
    await issueStock(a, { item: "ITEM-2", quantity: 15, issuedAt: "2027-07-15" });

    const report = await buildMeridianStockValuationReport(a);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.unbalancedVoucherCount).toBe(0);
    expect(report.summary.totalStockValue).toBe(report.summary.inventoryGlBalance);
  });
});
