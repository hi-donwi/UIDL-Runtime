import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { cancelSalesInvoice, createSalesCreditNote, submitSalesInvoice } from "../meridianSalesInvoiceService";
import { buildMeridianSalesLedgerReport } from "../meridianSalesLedgerService";

function invoice(id: string, status: string, total: number): Record<string, unknown> {
  return { id, customer: "CUST-001", customerName: "PT Surya Jaya Abadi", date: "2027-07-30", status, total, isTaxable: true };
}

function salesVoucher(invoiceId: string, total: number): Record<string, unknown> {
  const subtotal = Math.round(total / 1.11);
  return {
    id: `JV-NIMB-${invoiceId}`,
    tenant: "meridian",
    voucherType: "Sales Invoice",
    voucherNo: invoiceId,
    postingDate: "2027-07-30",
    remarks: `Penjualan ${invoiceId}`,
    totalAmount: total,
    lines: [
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: total, credit: 0 },
      { account: "4110", accountName: "4110 - Pendapatan Penjualan", debit: 0, credit: subtotal },
      { account: "2140", accountName: "2140 - Hutang PPN Keluaran", debit: 0, credit: total - subtotal },
    ],
  };
}

describe("meridian sales invoice ↔ ledger reconciliation", () => {
  it("marks Draft invoices unposted, submitted invoices balanced, and ties out to zero", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [invoice("SINV-1", "Unpaid", 11_100_000), invoice("SINV-2", "Draft", 2_220_000)],
        GeneralLedger: [salesVoucher("SINV-1", 11_100_000)],
        CreditNote: [],
      },
    });

    const before = await buildMeridianSalesLedgerReport(adapter);
    expect(before.summary).toMatchObject({
      invoiceCount: 2,
      postedCount: 1,
      draftCount: 1,
      cancelledCount: 0,
      unbalancedVoucherCount: 0,
      totalPostedBilled: 11_100_000,
      totalArDebit: 11_100_000,
      tieOutDifference: 0,
    });
    expect(before.rows.find((row) => row.invoiceId === "SINV-2")).toMatchObject({ posted: false, arDebit: 0 });

    await submitSalesInvoice(adapter, { invoiceId: "SINV-2", submittedAt: "2027-08-20" });
    const after = await buildMeridianSalesLedgerReport(adapter);
    expect(after.summary).toMatchObject({
      postedCount: 2,
      draftCount: 0,
      totalPostedBilled: 13_320_000,
      totalArDebit: 13_320_000,
      tieOutDifference: 0,
      unbalancedVoucherCount: 0,
    });
    expect(after.rows.find((row) => row.invoiceId === "SINV-2")).toMatchObject({ posted: true, voucherBalanced: true });
  });

  it("keeps tie-out at zero across cancel (reversal) and credit-note postings", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [invoice("SINV-1", "Draft", 11_100_000), invoice("SINV-2", "Draft", 5_550_000)],
        GeneralLedger: [],
        CreditNote: [],
      },
    });
    await submitSalesInvoice(adapter, { invoiceId: "SINV-1", submittedAt: "2027-08-20" });
    await submitSalesInvoice(adapter, { invoiceId: "SINV-2", submittedAt: "2027-08-20" });
    await cancelSalesInvoice(adapter, { invoiceId: "SINV-2", cancelledAt: "2027-08-21" });
    await createSalesCreditNote(adapter, { invoiceId: "SINV-1", amount: 1_110_000, issuedAt: "2027-08-21" });

    const report = await buildMeridianSalesLedgerReport(adapter);
    expect(report.summary).toMatchObject({
      postedCount: 2,
      cancelledCount: 1,
      creditNoteCount: 1,
      totalCreditNotes: 1_110_000,
      totalPostedBilled: 11_100_000,
      tieOutDifference: 0,
      unbalancedVoucherCount: 0,
    });
    expect(report.rows.find((row) => row.invoiceId === "SINV-2")).toMatchObject({ reversed: true, status: "Cancelled" });
    expect(report.rows.find((row) => row.invoiceId === "SINV-1")).toMatchObject({ creditNoteTotal: 1_110_000, netReceivable: 9_990_000 });
  });

  it("flags an unbalanced seeded voucher and rejects a bad as-of", async () => {
    const brokenVoucher = salesVoucher("SINV-1", 11_100_000);
    (brokenVoucher.lines as Array<Record<string, number>>)[0].debit = 999;
    const adapter = createInMemoryAdapter({
      seed: { SalesInvoice: [invoice("SINV-1", "Unpaid", 11_100_000)], GeneralLedger: [brokenVoucher], CreditNote: [] },
    });

    const report = await buildMeridianSalesLedgerReport(adapter);
    expect(report.summary.unbalancedVoucherCount).toBe(1);
    expect(report.rows[0].voucherBalanced).toBe(false);

    await expect(buildMeridianSalesLedgerReport(adapter, { asOf: "2027/08/22" })).rejects.toBeInstanceOf(DataError);
  });
});
