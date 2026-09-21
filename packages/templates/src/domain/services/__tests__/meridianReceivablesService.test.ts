import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { seed } from "../../../mock-data/seed";
import { recordSalesPayment } from "../meridianPaymentService";
import { assertReceivablesTieOut, buildMeridianReceivablesReport } from "../meridianReceivablesService";

function meridianAdapter() {
  return createInMemoryAdapter({
    seed: {
      SalesInvoice: seed.SalesInvoice,
      Payment: seed.Payment,
      CreditNote: [],
      GeneralLedger: seed.GeneralLedger,
    },
  });
}

describe("meridian AR subledger ↔ GL reconciliation", () => {
  it("ties out for the seeded book: Paid invoices settled, Unpaid/Overdue outstanding", async () => {
    const adapter = meridianAdapter();
    const report = await buildMeridianReceivablesReport(adapter);

    expect(() => assertReceivablesTieOut(report)).not.toThrow();
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.totalOutstanding).toBe(report.summary.arControlBalance);
    expect(report.summary.settledCount).toBeGreaterThan(0);
    expect(report.summary.openCount).toBeGreaterThan(0);
    // every row shown in the outstanding table has a positive balance
    expect(report.rows.filter((row) => row.outstanding > 0).every((row) => row.arStatus !== "Settled")).toBe(true);
  });

  it("stays tied out after a partial payment, a full settlement, and an overpayment", async () => {
    const adapter = meridianAdapter();
    const open = (await adapter.query({ collection: "SalesInvoice" })).rows.filter(
      (row) => row.status === "Unpaid" || row.status === "Overdue",
    );
    const first = open[0] as Record<string, unknown>;
    const second = open[1] as Record<string, unknown>;
    const firstTotal = Number(first.total);

    await recordSalesPayment(adapter, {
      party: String(first.customerName),
      method: "Bank Transfer",
      receivedAt: "2027-08-15",
      allocations: [{ invoiceId: String(first.id), allocatedAmount: Math.round(firstTotal * 0.4) }],
    });
    let report = await buildMeridianReceivablesReport(adapter);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.partiallyPaidCount).toBe(1);

    await recordSalesPayment(adapter, {
      party: String(first.customerName),
      method: "Cash",
      receivedAt: "2027-08-20",
      allocations: [{ invoiceId: String(first.id), allocatedAmount: firstTotal - Math.round(firstTotal * 0.4) }],
    });
    report = await buildMeridianReceivablesReport(adapter);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.rows.find((row) => row.invoiceId === String(first.id))).toMatchObject({ arStatus: "Settled", outstanding: 0 });

    await recordSalesPayment(adapter, {
      party: String(second.customerName),
      method: "Bank Transfer",
      receivedAt: "2027-08-21",
      allocations: [{ invoiceId: String(second.id), allocatedAmount: Number(second.total) }],
      amountReceived: Number(second.total) + 500_000,
    });
    report = await buildMeridianReceivablesReport(adapter);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.customerAdvances).toBe(500_000);
  });
});
