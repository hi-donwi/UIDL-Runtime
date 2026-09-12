import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { buildHospitalReconciliationReport, classifyStatus } from "../hospitalReconciliationService";

const COMPANY = "hospital-medika";

describe("hospital claim reconciliation domain correctness", () => {
  it("joins bills, claims, payments, and adjustments into per-bill outstanding balances", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        HospitalPatientBill: [
          bill("B1", "Umum", 500_000, 300_000, 200_000),
          bill("B2", "BPJS Kesehatan", 1_000_000, 600_000, 400_000),
          bill("B3", "BPJS Kesehatan", 800_000, 500_000, 300_000),
          bill("B4", "Asuransi Swasta", 600_000, 400_000, 200_000),
          bill("B5", "BPJS Kesehatan", 400_000, 240_000, 160_000),
          bill("B6", "Asuransi Swasta", 700_000, 420_000, 280_000),
        ],
        HospitalInsuranceClaim: [
          claim("C2", "B2", 1_000_000, 900_000),
          claim("C3", "B3", 800_000, 700_000),
          claim("C4", "B4", 600_000, 550_000),
          claim("C5", "B5", 400_000, null),
          claim("C6", "B6", 700_000, 500_000),
        ],
        HospitalClaimAdjustment: [
          adjustment("A2", "C2", 100_000, "Write-off", "Posted"),
          adjustment("A3", "C3", 100_000, "Write-off", "Posted"),
          adjustment("A4", "C4", 50_000, "Write-off", "Posted"),
          adjustment("A6", "C6", 200_000, "Dispute", "Open"),
        ],
        HospitalClaimPayment: [
          payment("P1", "B1", 500_000),
          payment("P2", "B2", 900_000),
          payment("P3", "B3", 400_000),
        ],
      },
    });

    const report = await buildHospitalReconciliationReport(adapter, { companyId: COMPANY, asOf: "2026-08-28" });

    expect(report.summary).toEqual({
      asOf: "2026-08-28",
      tolerance: 0,
      billCount: 6,
      reconciledCount: 2,
      partiallyPaidCount: 1,
      awaitingPaymentCount: 1,
      underReviewCount: 1,
      disputedCount: 1,
      overpaidCount: 0,
      totalBilled: 4_000_000,
      totalClaimed: 3_500_000,
      totalApproved: 2_650_000,
      totalWriteOff: 250_000,
      totalDisputed: 200_000,
      totalPaid: 1_800_000,
      totalOutstanding: 1_950_000,
      claimApprovalRate: 0.8548,
    });

    expect(
      report.rows.map((row) => ({ billId: row.billId, outstandingAmount: row.outstandingAmount, status: row.status })),
    ).toEqual([
      { billId: "B6", outstandingAmount: 700_000, status: "Disputed" },
      { billId: "B4", outstandingAmount: 550_000, status: "Awaiting Payment" },
      { billId: "B5", outstandingAmount: 400_000, status: "Under Review" },
      { billId: "B3", outstandingAmount: 300_000, status: "Partially Paid" },
      { billId: "B2", outstandingAmount: 0, status: "Reconciled" },
      { billId: "B1", outstandingAmount: 0, status: "Reconciled" },
    ]);

    const disputedRow = report.rows.find((row) => row.billId === "B6");
    expect(disputedRow).toMatchObject({ writeOffAmount: 0, disputedAmount: 200_000, claimVariance: 200_000 });
  });

  it("flags payer overpayment instead of clamping the balance", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        HospitalPatientBill: [bill("B1", "Umum", 500_000, 300_000, 200_000)],
        HospitalClaimPayment: [payment("P1", "B1", 600_000)],
      },
    });

    const report = await buildHospitalReconciliationReport(adapter, { companyId: COMPANY, asOf: "2026-08-28" });

    expect(report.summary.overpaidCount).toBe(1);
    expect(report.rows[0]).toMatchObject({ outstandingAmount: -100_000, status: "Overpaid" });
  });

  it("fails loudly on broken bill and claim invariants", async () => {
    const feeMismatch = createInMemoryAdapter({
      seed: { HospitalPatientBill: [bill("B1", "Umum", 500_000, 100_000, 100_000)] },
    });
    await expect(buildHospitalReconciliationReport(feeMismatch, { companyId: COMPANY, asOf: "2026-08-28" })).rejects.toBeInstanceOf(
      DataError,
    );

    const brokenIdentity = createInMemoryAdapter({
      seed: {
        HospitalPatientBill: [bill("B1", "BPJS Kesehatan", 1_000_000, 600_000, 400_000)],
        HospitalInsuranceClaim: [claim("C1", "B1", 1_000_000, 900_000)],
        HospitalClaimAdjustment: [adjustment("A1", "C1", 50_000, "Write-off", "Posted")],
      },
    });
    await expect(
      buildHospitalReconciliationReport(brokenIdentity, { companyId: COMPANY, asOf: "2026-08-28" }),
    ).rejects.toMatchObject({ code: "validation" });

    const duplicateClaim = createInMemoryAdapter({
      seed: {
        HospitalPatientBill: [bill("B1", "BPJS Kesehatan", 1_000_000, 600_000, 400_000)],
        HospitalInsuranceClaim: [claim("C1", "B1", 1_000_000, 1_000_000), claim("C2", "B1", 1_000_000, 1_000_000)],
      },
    });
    await expect(
      buildHospitalReconciliationReport(duplicateClaim, { companyId: COMPANY, asOf: "2026-08-28" }),
    ).rejects.toBeInstanceOf(DataError);

    await expect(buildHospitalReconciliationReport(feeMismatch, { companyId: "wrong", asOf: "2026-08-28" })).rejects.toMatchObject(
      { code: "validation" },
    );
    await expect(buildHospitalReconciliationReport(feeMismatch, { companyId: COMPANY, asOf: "not-a-date" })).rejects.toBeInstanceOf(
      DataError,
    );
  });

  it("classifies edge balances by status precedence", () => {
    const base = { claimPending: false, disputedAmount: 0, paidAmount: 0, outstandingAmount: 0, tolerance: 0 };
    expect(classifyStatus({ ...base, claimPending: true, outstandingAmount: 1_000 })).toBe("Under Review");
    expect(classifyStatus({ ...base, outstandingAmount: -5 })).toBe("Overpaid");
    expect(classifyStatus({ ...base, outstandingAmount: 0 })).toBe("Reconciled");
    expect(classifyStatus({ ...base, disputedAmount: 10, outstandingAmount: 100 })).toBe("Disputed");
    expect(classifyStatus({ ...base, outstandingAmount: 100 })).toBe("Awaiting Payment");
    expect(classifyStatus({ ...base, paidAmount: 40, outstandingAmount: 60 })).toBe("Partially Paid");
  });
});

function bill(id: string, payer: string, total: number, serviceFee: number, medicationFee: number): Record<string, unknown> {
  return {
    id,
    companyId: COMPANY,
    admissionId: `REG-${id}`,
    patientName: `Pasien ${id}`,
    payer,
    serviceFee,
    medicationFee,
    totalAmount: total,
    billedAt: "2026-08-10",
    status: "Claim Submitted",
  };
}

function claim(id: string, billId: string, claimedAmount: number, approvedAmount: number | null): Record<string, unknown> {
  return {
    id,
    companyId: COMPANY,
    billId,
    admissionId: `REG-${billId}`,
    payer: "BPJS Kesehatan",
    claimedAmount,
    approvedAmount,
    submittedAt: "2026-08-11",
    status: approvedAmount == null ? "Submitted" : "Verified",
  };
}

function adjustment(
  id: string,
  claimId: string,
  amount: number,
  adjustmentType: string,
  status: string,
): Record<string, unknown> {
  return { id, companyId: COMPANY, claimId, amount, adjustmentType, reason: "Test", status, recordedAt: "2026-08-12" };
}

function payment(id: string, billId: string, amount: number): Record<string, unknown> {
  return { id, companyId: COMPANY, billId, amount, method: "Transfer", paidAt: "2026-08-15", status: "Settled" };
}
