import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { buildKoperasiCollectibilityReport, classifyCollectibilityTier } from "../koperasiCollectibilityService";

const COMPANY = "koperasi-bmt";
const AS_OF = "2026-12-01";

describe("koperasi murabahah collectibility correctness", () => {
  it("derives DPD from the earliest unpaid installment and maps the OJK five-tier grade and CKPN", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        MurabahahAgreement: [
          agreement("A1", "Aktif", 10_000_000),
          agreement("A2", "Aktif", 20_000_000),
          agreement("A3", "Aktif", 30_000_000),
          agreement("A4", "Aktif", 12_000_000),
          agreement("A5", "Aktif", 5_000_000),
          agreement("A6", "Lunas", 7_000_000),
          agreement("A7", "Pengajuan", 9_000_000), // undisbursed — excluded
        ],
        MurabahahInstallmentSchedule: [
          ...schedule("A1", [
            ["2026-04-25", true],
            ["2026-05-25", false],
            ["2026-06-25", false],
          ]),
          ...schedule("A2", [
            ["2026-07-20", false],
            ["2026-08-20", false],
          ]),
          ...schedule("A3", [
            ["2026-07-25", true],
            ["2026-08-25", false],
          ]),
          ...schedule("A4", [
            ["2026-09-15", true],
            ["2026-10-15", false],
          ]),
          ...schedule("A5", [
            ["2026-10-01", true],
            ["2026-11-01", true],
          ]),
          ...schedule("A6", [
            ["2026-11-20", true],
            ["2026-12-20", false],
          ]),
        ],
      },
    });

    const report = await buildKoperasiCollectibilityReport(adapter, { companyId: COMPANY, asOf: AS_OF });

    expect(report.summary).toEqual({
      asOf: AS_OF,
      agreementCount: 6,
      totalOutstandingPrincipal: 84_000_000,
      totalCkpnReserve: 25_220_000,
      performingOutstanding: 24_000_000,
      nonPerformingOutstanding: 60_000_000,
      nplRatio: 0.7143,
      atRiskOutstanding: 72_000_000,
      highestDaysPastDue: 190,
      tiers: [
        { tier: 1, grade: "1 - Lancar", agreementCount: 2, outstandingPrincipal: 12_000_000, ckpnReserve: 120_000 },
        { tier: 2, grade: "2 - Dalam Perhatian Khusus", agreementCount: 1, outstandingPrincipal: 12_000_000, ckpnReserve: 600_000 },
        { tier: 3, grade: "3 - Kurang Lancar", agreementCount: 1, outstandingPrincipal: 30_000_000, ckpnReserve: 4_500_000 },
        { tier: 4, grade: "4 - Diragukan", agreementCount: 1, outstandingPrincipal: 20_000_000, ckpnReserve: 10_000_000 },
        { tier: 5, grade: "5 - Macet", agreementCount: 1, outstandingPrincipal: 10_000_000, ckpnReserve: 10_000_000 },
      ],
    });

    expect(
      report.rows.map((row) => ({ id: row.agreementId, dpd: row.daysPastDue, tier: row.tier, ckpn: row.ckpnReserve })),
    ).toEqual([
      { id: "A1", dpd: 190, tier: 5, ckpn: 10_000_000 },
      { id: "A2", dpd: 134, tier: 4, ckpn: 10_000_000 },
      { id: "A3", dpd: 98, tier: 3, ckpn: 4_500_000 },
      { id: "A4", dpd: 47, tier: 2, ckpn: 600_000 },
      { id: "A6", dpd: 0, tier: 1, ckpn: 70_000 },
      { id: "A5", dpd: 0, tier: 1, ckpn: 50_000 },
    ]);

    expect(report.rows.find((row) => row.agreementId === "A5")).toMatchObject({ earliestUnpaidDueDate: null, performing: true });
    expect(report.rows.find((row) => row.agreementId === "A1")).toMatchObject({ earliestUnpaidDueDate: "2026-05-25", performing: false });
  });

  it("fails loudly on a disbursed agreement with no schedule and on bad inputs", async () => {
    const noSchedule = createInMemoryAdapter({ seed: { MurabahahAgreement: [agreement("A1", "Aktif", 10_000_000)] } });
    await expect(buildKoperasiCollectibilityReport(noSchedule, { companyId: COMPANY, asOf: AS_OF })).rejects.toBeInstanceOf(DataError);

    const badDue = createInMemoryAdapter({
      seed: {
        MurabahahAgreement: [agreement("A1", "Aktif", 10_000_000)],
        MurabahahInstallmentSchedule: schedule("A1", [["not-a-date", false]]),
      },
    });
    await expect(buildKoperasiCollectibilityReport(badDue, { companyId: COMPANY, asOf: AS_OF })).rejects.toMatchObject({ code: "validation" });

    const negativeOutstanding = createInMemoryAdapter({
      seed: {
        MurabahahAgreement: [agreement("A1", "Aktif", -1)],
        MurabahahInstallmentSchedule: schedule("A1", [["2026-06-01", false]]),
      },
    });
    await expect(buildKoperasiCollectibilityReport(negativeOutstanding, { companyId: COMPANY, asOf: AS_OF })).rejects.toBeInstanceOf(DataError);

    await expect(buildKoperasiCollectibilityReport(noSchedule, { companyId: "wrong", asOf: AS_OF })).rejects.toMatchObject({ code: "validation" });
    await expect(buildKoperasiCollectibilityReport(noSchedule, { companyId: COMPANY, asOf: "2026/12/01" })).rejects.toBeInstanceOf(DataError);
  });

  it("classifies tiers on the OJK day bands", () => {
    expect(classifyCollectibilityTier(0)).toBe(1);
    expect(classifyCollectibilityTier(90)).toBe(2);
    expect(classifyCollectibilityTier(91)).toBe(3);
    expect(classifyCollectibilityTier(120)).toBe(3);
    expect(classifyCollectibilityTier(121)).toBe(4);
    expect(classifyCollectibilityTier(180)).toBe(4);
    expect(classifyCollectibilityTier(181)).toBe(5);
    expect(() => classifyCollectibilityTier(-1)).toThrow(DataError);
  });
});

function agreement(id: string, status: string, outstandingPrincipal: number): Record<string, unknown> {
  return {
    id,
    companyId: COMPANY,
    memberName: `Anggota ${id}`,
    status,
    outstandingPrincipal,
    tenorMonths: 12,
    principalAmount: 12_000_000,
    marginAmount: 2_400_000,
    startDate: "2026-03-25",
  };
}

function schedule(agreementId: string, entries: Array<[string, boolean]>): Array<Record<string, unknown>> {
  return entries.map(([dueDate, paid], index) => ({
    id: `SCH-${agreementId}-${index + 1}`,
    companyId: COMPANY,
    agreementId,
    installmentNo: index + 1,
    dueDate,
    principalDue: 1_000_000,
    marginDue: 200_000,
    amountDue: 1_200_000,
    paidAt: paid ? dueDate : null,
    status: paid ? "Lunas" : "Belum Bayar",
  }));
}
