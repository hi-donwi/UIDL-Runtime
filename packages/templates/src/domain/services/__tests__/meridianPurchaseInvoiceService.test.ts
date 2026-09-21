import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import {
  cancelPurchaseInvoice,
  submitPurchaseInvoice,
} from "../meridianPurchaseInvoiceService";

function seededAdapter(invoices: Array<Record<string, unknown>>, payments: Array<Record<string, unknown>> = []) {
  return createInMemoryAdapter({ seed: { PurchaseInvoice: invoices, GeneralLedger: [], PurchasePayment: payments } });
}

function invoice(id: string, status: string, total: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    supplier: "SUPP-001",
    supplierName: "PT Distribusi Utama",
    date: "2027-07-30",
    dueDate: "2027-08-29",
    status,
    total,
    isTaxable: true,
    ...extra,
  };
}

const balanced = (lines: Array<{ debit: number; credit: number }>) =>
  Math.round(lines.reduce((s, l) => s + l.debit, 0)) === Math.round(lines.reduce((s, l) => s + l.credit, 0));

describe("meridian purchase invoice lifecycle", () => {
  it("submits a Draft: posts a balanced expense / input-tax / AP voucher and flips status to Unpaid", async () => {
    const adapter = seededAdapter([invoice("PINV-1", "Draft", 11_100_000)]);

    const result = await submitPurchaseInvoice(adapter, { invoiceId: "PINV-1", submittedAt: "2027-08-20" });

    expect(result.invoice).toMatchObject({ status: "Unpaid", subtotal: 10_000_000, tax: 1_100_000 });
    expect(result.voucher.voucherType).toBe("Purchase Invoice");
    expect(result.voucher.lines).toEqual([
      { account: "5120", accountName: "5120 - Beban Pembelian", debit: 10_000_000, credit: 0 },
      { account: "1155", accountName: "1155 - PPN Masukan", debit: 1_100_000, credit: 0 },
      { account: "2110", accountName: "2110 - Hutang Usaha", debit: 0, credit: 11_100_000 },
    ]);
    expect(balanced(result.voucher.lines)).toBe(true);

    const ledger = await adapter.query({ collection: "GeneralLedger" });
    expect(ledger.rows).toHaveLength(1);
  });

  it("rejects submitting a non-Draft invoice, a missing invoice, and a double submit", async () => {
    const adapter = seededAdapter([invoice("PINV-1", "Draft", 1_110_000), invoice("PINV-2", "Unpaid", 1_110_000)]);

    await expect(submitPurchaseInvoice(adapter, { invoiceId: "PINV-2" })).rejects.toMatchObject({ code: "validation" });
    await expect(submitPurchaseInvoice(adapter, { invoiceId: "PINV-404" })).rejects.toMatchObject({ code: "not_found" });

    await submitPurchaseInvoice(adapter, { invoiceId: "PINV-1" });
    await expect(submitPurchaseInvoice(adapter, { invoiceId: "PINV-1" })).rejects.toBeInstanceOf(DataError);
  });

  it("cancels a submitted invoice with a mirror-image reversal voucher", async () => {
    const adapter = seededAdapter([invoice("PINV-1", "Draft", 11_100_000)]);
    await submitPurchaseInvoice(adapter, { invoiceId: "PINV-1", submittedAt: "2027-08-20" });

    const result = await cancelPurchaseInvoice(adapter, { invoiceId: "PINV-1", cancelledAt: "2027-08-21" });

    expect(result.invoice).toMatchObject({ status: "Cancelled" });
    expect(result.reversalVoucher.voucherType).toBe("Purchase Invoice Reversal");
    expect(result.reversalVoucher.lines).toEqual([
      { account: "5120", accountName: "5120 - Beban Pembelian", debit: 0, credit: 10_000_000 },
      { account: "1155", accountName: "1155 - PPN Masukan", debit: 0, credit: 1_100_000 },
      { account: "2110", accountName: "2110 - Hutang Usaha", debit: 11_100_000, credit: 0 },
    ]);
    expect(balanced(result.reversalVoucher.lines)).toBe(true);
  });

  it("blocks cancelling a Draft, a Paid, or an invoice that already has a purchase payment", async () => {
    const adapter = seededAdapter(
      [invoice("PINV-1", "Draft", 11_100_000), invoice("PINV-2", "Paid", 11_100_000)],
      [{ id: "PPAY-1", for: [{ invoiceId: "PINV-1", amount: 11_100_000 }], status: "Submitted" }],
    );
    await expect(cancelPurchaseInvoice(adapter, { invoiceId: "PINV-1" })).rejects.toMatchObject({ code: "validation" });
    await expect(cancelPurchaseInvoice(adapter, { invoiceId: "PINV-2" })).rejects.toMatchObject({ code: "validation" });

    await submitPurchaseInvoice(adapter, { invoiceId: "PINV-1" });
    await expect(cancelPurchaseInvoice(adapter, { invoiceId: "PINV-1" })).rejects.toMatchObject({ code: "validation" });
  });
});
