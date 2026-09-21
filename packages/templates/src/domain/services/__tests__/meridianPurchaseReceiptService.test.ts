import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { submitPurchaseReceipt } from "../meridianPurchaseReceiptService";
import { submitPurchaseInvoice } from "../meridianPurchaseInvoiceService";

function item(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, tenant: "meridian", name: id, warehouse: "Gudang Utama Meridian", stockQty: 0, stockValue: 0, valuationRate: 0, stockUOM: "M3", uomConversions: { M3: 1 }, ...extra };
}

function seededAdapter() {
  return createInMemoryAdapter({
    seed: {
      MeridianItem: [item("ITEM-008")],
      MeridianStockLedgerEntry: [],
      PurchaseReceipt: [
        {
          id: "PREC-1",
          tenant: "meridian",
          purchaseInvoice: "PINV-1",
          date: "2027-07-27",
          status: "Draft",
          lines: [{ item: "ITEM-008", itemName: "Kayu Jati", quantity: 2, rate: 3_200_000, uom: "M3" }],
        },
      ],
      PurchaseInvoice: [
        { id: "PINV-1", supplier: "SUPP-1", supplierName: "CV Bahan Baku", date: "2027-07-26", status: "Draft", total: 7_104_000, isTaxable: true },
      ],
      GeneralLedger: [],
    },
  });
}

describe("meridian purchase receipt (goods-in)", () => {
  it("submits a Draft receipt: posts 1140 / 2150 GRNI per line and moves stock", async () => {
    const adapter = seededAdapter();

    const result = await submitPurchaseReceipt(adapter, { receiptId: "PREC-1", receivedAt: "2027-07-27" });

    expect(result.receipt).toMatchObject({ status: "Submitted", stockEntries: ["NSLE-00001"] });
    expect(result.vouchers).toHaveLength(1);
    expect(result.vouchers[0].lines).toEqual([
      { account: "1140", accountName: "1140 - Persediaan Barang Dagang", debit: 6_400_000, credit: 0 },
      { account: "2150", accountName: "2150 - Utang Pembelian Diterima Blm Ditagih", debit: 0, credit: 6_400_000 },
    ]);

    const items = await adapter.query({ collection: "MeridianItem" });
    expect(items.rows[0]).toMatchObject({ stockQty: 2, stockValue: 6_400_000 });
  });

  it("rejects receiving a non-Draft receipt and a missing receipt", async () => {
    const adapter = seededAdapter();
    await submitPurchaseReceipt(adapter, { receiptId: "PREC-1" });
    await expect(submitPurchaseReceipt(adapter, { receiptId: "PREC-1" })).rejects.toBeInstanceOf(DataError);
    await expect(submitPurchaseReceipt(adapter, { receiptId: "PREC-404" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("three-way match: a matched invoice clears GRNI instead of expensing to 5120", async () => {
    const adapter = seededAdapter();
    await submitPurchaseReceipt(adapter, { receiptId: "PREC-1", receivedAt: "2027-07-27" });

    const { voucher } = await submitPurchaseInvoice(adapter, { invoiceId: "PINV-1", submittedAt: "2027-07-28" });

    expect(voucher.lines).toEqual([
      { account: "2150", accountName: "2150 - Utang Pembelian Diterima Blm Ditagih", debit: 6_400_000, credit: 0 },
      { account: "1155", accountName: "1155 - PPN Masukan", debit: 704_000, credit: 0 },
      { account: "2110", accountName: "2110 - Hutang Usaha", debit: 0, credit: 7_104_000 },
    ]);

    // GRNI nets to zero for the matched pair.
    const ledger = await adapter.query<{ tenant: string; lines: Array<{ account: string; debit: number; credit: number }> }>({
      collection: "GeneralLedger",
    });
    const grni = ledger.rows
      .flatMap((v) => v.lines)
      .filter((l) => l.account === "2150")
      .reduce((sum, l) => sum + l.credit - l.debit, 0);
    expect(grni).toBe(0);
  });
});
