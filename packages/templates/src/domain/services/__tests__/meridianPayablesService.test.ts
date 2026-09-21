import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { seed } from "../../../mock-data/seed";
import { assertPayablesTieOut, buildMeridianPayablesReport } from "../meridianPayablesService";
import { submitPurchaseInvoice } from "../meridianPurchaseInvoiceService";

function meridianAdapter() {
  return createInMemoryAdapter({
    seed: {
      PurchaseInvoice: seed.PurchaseInvoice,
      PurchasePayment: seed.PurchasePayment,
      GeneralLedger: seed.GeneralLedger,
    },
  });
}

describe("meridian AP subledger ↔ GL reconciliation", () => {
  it("ties out for the seeded book: Paid invoices settled, Unpaid/Overdue outstanding", async () => {
    const report = await buildMeridianPayablesReport(meridianAdapter());

    expect(() => assertPayablesTieOut(report)).not.toThrow();
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.summary.totalOutstanding).toBe(report.summary.apControlBalance);
    expect(report.summary.settledCount).toBeGreaterThan(0);
    expect(report.summary.openCount).toBeGreaterThan(0);
    expect(report.rows.filter((row) => row.outstanding > 0).every((row) => row.apStatus !== "Settled")).toBe(true);
  });

  it("stays tied out after submitting the seeded Draft purchase invoice", async () => {
    const adapter = meridianAdapter();
    const draft = (await adapter.query({ collection: "PurchaseInvoice" })).rows.find((row) => row.status === "Draft");
    expect(draft).toBeDefined();

    await submitPurchaseInvoice(adapter, { invoiceId: String(draft!.id), submittedAt: "2027-08-20" });

    const report = await buildMeridianPayablesReport(adapter);
    expect(report.summary.tieOutDifference).toBe(0);
    expect(report.rows.find((row) => row.invoiceId === String(draft!.id))).toMatchObject({ apStatus: "Open" });
  });
});
