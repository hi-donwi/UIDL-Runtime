import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { cancelSalesInvoice, createSalesCreditNote, submitSalesInvoice } from "../meridianSalesInvoiceService";

function seededAdapter(invoices: Array<Record<string, unknown>>) {
  return createInMemoryAdapter({ seed: { SalesInvoice: invoices, GeneralLedger: [], CreditNote: [] } });
}

function invoice(id: string, status: string, total: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, customer: "CUST-001", customerName: "PT Surya Jaya Abadi", date: "2027-07-30", dueDate: "2027-08-29", status, total, isTaxable: true, ...extra };
}

const balanced = (lines: Array<{ debit: number; credit: number }>) =>
  Math.round(lines.reduce((s, l) => s + l.debit, 0)) === Math.round(lines.reduce((s, l) => s + l.credit, 0));

describe("meridian sales invoice lifecycle", () => {
  it("submits a Draft: posts a balanced AR / revenue / output-tax voucher and flips status to Unpaid", async () => {
    const adapter = seededAdapter([invoice("SINV-1", "Draft", 11_100_000)]);

    const result = await submitSalesInvoice(adapter, { invoiceId: "SINV-1", submittedAt: "2027-08-20" });

    expect(result.invoice).toMatchObject({ status: "Unpaid", subtotal: 10_000_000, tax: 1_100_000 });
    expect(result.voucher.voucherType).toBe("Sales Invoice");
    expect(result.voucher.lines).toEqual([
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: 11_100_000, credit: 0 },
      { account: "4110", accountName: "4110 - Pendapatan Penjualan", debit: 0, credit: 10_000_000 },
      { account: "2140", accountName: "2140 - Hutang PPN Keluaran", debit: 0, credit: 1_100_000 },
    ]);
    expect(balanced(result.voucher.lines)).toBe(true);

    const ledger = await adapter.query({ collection: "GeneralLedger" });
    expect(ledger.rows).toHaveLength(1);
  });

  it("rejects submitting a non-Draft invoice, a missing invoice, and a double submit", async () => {
    const adapter = seededAdapter([invoice("SINV-1", "Draft", 1_110_000), invoice("SINV-2", "Unpaid", 1_110_000)]);

    await expect(submitSalesInvoice(adapter, { invoiceId: "SINV-2" })).rejects.toMatchObject({ code: "validation" });
    await expect(submitSalesInvoice(adapter, { invoiceId: "SINV-404" })).rejects.toMatchObject({ code: "not_found" });

    await submitSalesInvoice(adapter, { invoiceId: "SINV-1" });
    await expect(submitSalesInvoice(adapter, { invoiceId: "SINV-1" })).rejects.toBeInstanceOf(DataError);
  });

  it("cancels a submitted invoice with a mirror-image reversal voucher", async () => {
    const adapter = seededAdapter([invoice("SINV-1", "Draft", 11_100_000)]);
    await submitSalesInvoice(adapter, { invoiceId: "SINV-1", submittedAt: "2027-08-20" });

    const result = await cancelSalesInvoice(adapter, { invoiceId: "SINV-1", cancelledAt: "2027-08-21" });

    expect(result.invoice).toMatchObject({ status: "Cancelled" });
    expect(result.reversalVoucher.voucherType).toBe("Sales Invoice Reversal");
    expect(result.reversalVoucher.lines).toEqual([
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: 0, credit: 11_100_000 },
      { account: "4110", accountName: "4110 - Pendapatan Penjualan", debit: 10_000_000, credit: 0 },
      { account: "2140", accountName: "2140 - Hutang PPN Keluaran", debit: 1_100_000, credit: 0 },
    ]);
  });

  it("blocks cancelling a Draft, a Paid, or an invoice that already has a credit note", async () => {
    const adapter = seededAdapter([invoice("SINV-1", "Draft", 11_100_000), invoice("SINV-2", "Paid", 11_100_000)]);
    await expect(cancelSalesInvoice(adapter, { invoiceId: "SINV-1" })).rejects.toMatchObject({ code: "validation" });
    await expect(cancelSalesInvoice(adapter, { invoiceId: "SINV-2" })).rejects.toMatchObject({ code: "validation" });

    await submitSalesInvoice(adapter, { invoiceId: "SINV-1" });
    await createSalesCreditNote(adapter, { invoiceId: "SINV-1", amount: 1_000_000, issuedAt: "2027-08-21" });
    await expect(cancelSalesInvoice(adapter, { invoiceId: "SINV-1" })).rejects.toMatchObject({ code: "validation" });
  });

  it("posts a contra-revenue credit note and caps the cumulative amount at the invoice total", async () => {
    const adapter = seededAdapter([invoice("SINV-1", "Draft", 11_100_000)]);
    await submitSalesInvoice(adapter, { invoiceId: "SINV-1", submittedAt: "2027-08-20" });

    const cn = await createSalesCreditNote(adapter, { invoiceId: "SINV-1", amount: 5_550_000, issuedAt: "2027-08-21" });
    expect(cn.creditNote).toMatchObject({ id: "CN-NIMB-00001", invoice: "SINV-1", amount: 5_550_000, subtotal: 5_000_000, tax: 550_000 });
    expect(cn.voucher.lines).toEqual([
      { account: "4110", accountName: "4110 - Pendapatan Penjualan", debit: 5_000_000, credit: 0 },
      { account: "2140", accountName: "2140 - Hutang PPN Keluaran", debit: 550_000, credit: 0 },
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: 0, credit: 5_550_000 },
    ]);
    expect(balanced(cn.voucher.lines)).toBe(true);

    await expect(
      createSalesCreditNote(adapter, { invoiceId: "SINV-1", amount: 6_000_000 }),
    ).rejects.toMatchObject({ code: "validation" });
  });
});
