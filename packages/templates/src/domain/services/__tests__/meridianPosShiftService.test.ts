import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { closePosShift, openPosShift, submitPosInvoice } from "../meridianPosService";
import { assertPosReportOk, buildMeridianPosShiftReport } from "../meridianPosShiftService";
import { buildMeridianPosShifts } from "../../../mock-data/generators/meridianPosShifts";

describe("meridian POS shift reconciliation", () => {
  it("reconciles the seeded shifts: one open, one balanced, one short, GL ties out", async () => {
    const seed = buildMeridianPosShifts();
    const adapter = createInMemoryAdapter({
      seed: {
        POSOpeningShift: seed.openingShifts,
        POSClosingShift: seed.closingShifts,
        POSSalesInvoice: seed.invoices,
        GeneralLedger: seed.vouchers,
      },
    });

    const report = await buildMeridianPosShiftReport(adapter);
    expect(() => assertPosReportOk(report)).not.toThrow();
    expect(report.summary).toMatchObject({
      shiftCount: 3,
      openCount: 1,
      closedCount: 2,
      balancedCount: 1,
      shortCount: 1,
      overCount: 0,
      netCashVariance: -50_000,
      invoiceCount: 6,
      unbalancedVoucherCount: 0,
      tieOutDifference: 0,
    });
    expect(report.summary.totalInvoiceValue).toBe(report.summary.ledgerRevenuePlusTax);
    expect(report.rows.find((row) => row.closeStatus === "Short")).toMatchObject({ differenceAmount: -50_000 });
    expect(report.rows.find((row) => row.status === "Open")).toMatchObject({ countedCash: null });
  });

  it("stays tied out after a live open → sale → balanced close", async () => {
    const seed = buildMeridianPosShifts();
    const adapter = createInMemoryAdapter({
      seed: {
        POSOpeningShift: seed.openingShifts,
        POSClosingShift: seed.closingShifts,
        POSSalesInvoice: seed.invoices,
        GeneralLedger: seed.vouchers,
      },
    });

    const { shift } = await openPosShift(adapter, {
      cashier: "Sari",
      posProfile: "Kasir Meridian 9",
      openedAt: "2027-08-03T08:00:00+07:00",
      openingCash: [{ denomination: 100_000, count: 2 }],
    });
    await submitPosInvoice(adapter, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-03",
      lines: [{ item: "ITEM-001", quantity: 2, rate: 100_000 }],
      payments: [{ method: "Cash", amount: 222_000 }],
    });
    await closePosShift(adapter, {
      shiftId: String(shift.id),
      supervisor: "Budi",
      closedAt: "2027-08-03T21:00:00+07:00",
      closingCash: [{ denomination: 100_000, count: 4 }, { denomination: 20_000, count: 1 }, { denomination: 2_000, count: 1 }],
    });

    const report = await buildMeridianPosShiftReport(adapter);
    expect(() => assertPosReportOk(report)).not.toThrow();
    expect(report.summary).toMatchObject({ shiftCount: 4, closedCount: 3, balancedCount: 2, tieOutDifference: 0, unbalancedVoucherCount: 0 });
  });
});
