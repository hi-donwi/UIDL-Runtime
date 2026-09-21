import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { buildSchoolDunningReport } from "../schoolDunningService";

describe("school dunning domain correctness", () => {
  it("derives aging, stages, and totals from due dates and outstanding balances", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        TuitionFee: [
          tuitionFee("SPP-1", "Alya", "2026-08-10", 1_500_000, 0, "Jatuh Tempo", 0),
          tuitionFee("SPP-2", "Bima", "2026-08-25", 1_500_000, 500_000, "Belum Bayar", 1),
          tuitionFee("SPP-3", "Citra", "2026-09-02", 1_500_000, 0, "Belum Bayar", 0),
          tuitionFee("SPP-4", "Dewi", "2026-08-01", 1_500_000, 1_500_000, "Lunas", 2),
        ],
      },
    });

    const report = await buildSchoolDunningReport(adapter, { companyId: "school-abc", asOf: "2026-09-15" });

    expect(report.summary).toEqual({
      asOf: "2026-09-15",
      invoiceCount: 4,
      exposedInvoiceCount: 3,
      overdueInvoiceCount: 3,
      totalOutstanding: 4_000_000,
      overdueOutstanding: 4_000_000,
      highestDaysOverdue: 36,
      paidInvoiceCount: 1,
      currentInvoiceCount: 0,
    });
    expect(report.rows.map((row) => ({ id: row.id, daysOverdue: row.daysOverdue, stage: row.stage, outstandingAmount: row.outstandingAmount }))).toEqual([
      { id: "SPP-1", daysOverdue: 36, stage: "Final Notice", outstandingAmount: 1_500_000 },
      { id: "SPP-2", daysOverdue: 21, stage: "Second Reminder", outstandingAmount: 1_000_000 },
      { id: "SPP-3", daysOverdue: 13, stage: "First Reminder", outstandingAmount: 1_500_000 },
    ]);
  });

  it("keeps not-yet-due balances out of overdue exposure and excludes paid invoices", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        TuitionFee: [
          tuitionFee("SPP-1", "Alya", "2026-09-30", 1_500_000, 0, "Belum Bayar", 0),
          tuitionFee("SPP-2", "Bima", "2026-08-10", 1_500_000, 1_500_000, "Lunas", 3),
        ],
      },
    });

    const report = await buildSchoolDunningReport(adapter, { companyId: "school-abc", asOf: "2026-09-15" });

    expect(report.summary).toMatchObject({
      exposedInvoiceCount: 1,
      overdueInvoiceCount: 0,
      totalOutstanding: 1_500_000,
      overdueOutstanding: 0,
      paidInvoiceCount: 1,
      currentInvoiceCount: 1,
    });
    expect(report.rows).toEqual([
      expect.objectContaining({ id: "SPP-1", daysOverdue: 0, stage: "Not Due", outstandingAmount: 1_500_000 }),
    ]);
  });

  it("fails loudly on invalid money or date inputs", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        TuitionFee: [tuitionFee("SPP-1", "Alya", "not-a-date", 1_500_000, 0, "Belum Bayar", 0)],
      },
    });

    await expect(buildSchoolDunningReport(adapter, { companyId: "school-abc", asOf: "2026-09-15" })).rejects.toBeInstanceOf(DataError);
    await expect(buildSchoolDunningReport(adapter, { companyId: "wrong", asOf: "2026-09-15" })).rejects.toMatchObject({ code: "validation" });
  });
});

function tuitionFee(
  id: string,
  studentName: string,
  dueDate: string,
  total: number,
  paidAmount: number,
  status: string,
  dunningCount: number,
): Record<string, unknown> {
  return {
    id,
    companyId: "school-abc",
    studentName,
    studentId: `NIS-${id}`,
    grade: "Kelas 10 IPA 1",
    month: "September 2026",
    date: "2026-09-01",
    dueDate,
    total,
    paidAmount,
    outstandingAmount: total - paidAmount,
    dunningCount,
    status,
  };
}
