import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { invoiceOutstanding, recordSalesPayment } from "../meridianPaymentService";

function invoice(id: string, status: string, total: number): Record<string, unknown> {
  return { id, customer: "CUST-001", customerName: "PT Surya Jaya Abadi", date: "2027-07-30", status, total, isTaxable: true };
}
function adapter(invoices: Array<Record<string, unknown>>) {
  return createInMemoryAdapter({ seed: { SalesInvoice: invoices, Payment: [], CreditNote: [], GeneralLedger: [] } });
}
const bal = (lines: Array<{ debit: number; credit: number }>) =>
  Math.round(lines.reduce((s, l) => s + l.debit, 0)) === Math.round(lines.reduce((s, l) => s + l.credit, 0));

describe("meridian customer payment allocation", () => {
  it("allocates one receipt across several invoices and flips fully-settled ones to Paid", async () => {
    const a = adapter([invoice("SINV-1", "Unpaid", 1_000_000), invoice("SINV-2", "Overdue", 3_000_000)]);

    const result = await recordSalesPayment(a, {
      party: "PT Surya Jaya Abadi",
      method: "Bank Transfer",
      receivedAt: "2027-08-15",
      allocations: [
        { invoiceId: "SINV-1", allocatedAmount: 1_000_000 },
        { invoiceId: "SINV-2", allocatedAmount: 1_200_000 },
      ],
    });

    expect(result.payment).toMatchObject({ id: "PAY-NIMB-00001", allocatedAmount: 2_200_000, unallocatedAmount: 0 });
    expect(result.payment.for).toEqual([
      { invoiceId: "SINV-1", amount: 1_000_000, writeOffAmount: 0 },
      { invoiceId: "SINV-2", amount: 1_200_000, writeOffAmount: 0 },
    ]);
    expect(bal(result.voucher.lines)).toBe(true);
    expect(result.voucher.lines).toEqual([
      { account: "1110", accountName: "1110 - Kas Utama / Bank", debit: 2_200_000, credit: 0 },
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: 0, credit: 2_200_000 },
    ]);
    expect(result.invoices.map((row) => row.status)).toEqual(["Paid", "Overdue"]);
  });

  it("posts a bad-debt line for a write-off and a customer-advance line for an overpayment", async () => {
    const a = adapter([invoice("SINV-1", "Unpaid", 1_000_000)]);

    const result = await recordSalesPayment(a, {
      party: "PT Surya Jaya Abadi",
      method: "Cash",
      receivedAt: "2027-08-15",
      allocations: [{ invoiceId: "SINV-1", allocatedAmount: 950_000, writeOffAmount: 50_000 }],
      amountReceived: 1_200_000,
    });

    expect(result.payment).toMatchObject({ writeOffAmount: 50_000, unallocatedAmount: 250_000 });
    expect(result.voucher.lines).toEqual([
      { account: "1110", accountName: "1110 - Kas Utama / Bank", debit: 1_200_000, credit: 0 },
      { account: "5180", accountName: "5180 - Beban Piutang Tak Tertagih", debit: 50_000, credit: 0 },
      { account: "1130", accountName: "1130 - Piutang Usaha", debit: 0, credit: 1_000_000 },
      { account: "2135", accountName: "2135 - Uang Muka Pelanggan", debit: 0, credit: 250_000 },
    ]);
    expect(bal(result.voucher.lines)).toBe(true);
    expect(result.invoices[0].status).toBe("Paid");
  });

  it("computes outstanding from payments and credit notes", () => {
    const payments = [
      { for: [{ invoiceId: "SINV-1", amount: 300_000, writeOffAmount: 20_000 }] },
      { for: [{ invoiceId: "SINV-2", amount: 100_000 }] },
    ];
    const creditNotes = [{ invoice: "SINV-1", amount: 80_000 }];
    expect(invoiceOutstanding("SINV-1", 1_000_000, payments, creditNotes)).toBe(600_000);
    expect(invoiceOutstanding("SINV-2", 1_000_000, payments, creditNotes)).toBe(900_000);
  });

  it("rejects allocating to a Draft/Paid invoice, over-allocating, duplicates, and short receipts", async () => {
    const a = adapter([invoice("SINV-1", "Unpaid", 1_000_000), invoice("SINV-2", "Draft", 1_000_000), invoice("SINV-3", "Paid", 1_000_000)]);

    await expect(
      recordSalesPayment(a, { party: "x", method: "Cash", receivedAt: "2027-08-15", allocations: [{ invoiceId: "SINV-2", allocatedAmount: 100_000 }] }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      recordSalesPayment(a, { party: "x", method: "Cash", receivedAt: "2027-08-15", allocations: [{ invoiceId: "SINV-3", allocatedAmount: 100_000 }] }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      recordSalesPayment(a, { party: "x", method: "Cash", receivedAt: "2027-08-15", allocations: [{ invoiceId: "SINV-1", allocatedAmount: 1_500_000 }] }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      recordSalesPayment(a, {
        party: "x",
        method: "Cash",
        receivedAt: "2027-08-15",
        allocations: [
          { invoiceId: "SINV-1", allocatedAmount: 100_000 },
          { invoiceId: "SINV-1", allocatedAmount: 100_000 },
        ],
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      recordSalesPayment(a, { party: "x", method: "Cash", receivedAt: "2027-08-15", allocations: [{ invoiceId: "SINV-1", allocatedAmount: 500_000 }], amountReceived: 100_000 }),
    ).rejects.toBeInstanceOf(DataError);
  });
});
