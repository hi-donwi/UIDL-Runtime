import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  certifyPercentageOfCompletion,
  createProjectWBS,
  submitProgressBilling,
  updateProjectProgress,
  verifyMilestoneBAST,
} from "../epcContractorService";

describe("epc contractor service workflow", () => {
  it("runs WBS -> progress -> PoC billing -> retention -> BAST with balanced GL/report", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const milestone = await createProjectWBS(adapter, {
      companyId: "epc-contractor",
      projectCode: "PRJ-EPC-999",
      projectName: "Pembangunan Gardu Induk 150kV",
      milestoneName: "Termin 3 - Mechanical Completion",
      weightPercentage: 20,
      contractValue: 12000000000,
      estimatedCost: 9000000000,
      startDate: "2026-08-24",
    });
    expect(milestone).toMatchObject({ id: "MLS-0066", companyId: "epc-contractor", status: "In Progress" });

    const progress = await updateProjectProgress(adapter, {
      milestoneId: String(milestone.id),
      actualProgress: 80,
      costIncurred: 7200000000,
      updatedAt: "2026-08-24T10:00:00+07:00",
    });
    expect(progress).toMatchObject({ status: "On Schedule", actualProgress: 80, costIncurred: 7200000000 });

    const certified = await certifyPercentageOfCompletion(adapter, {
      milestoneId: String(milestone.id),
      certifiedProgress: 80,
      certifiedBy: "Owner QS",
      certifiedAt: "2026-08-24T12:00:00+07:00",
    });
    expect(certified.certification).toMatchObject({
      id: "EPC-POC-2026-0001",
      revenueRecognized: 9600000000,
      margin: 2400000000,
      status: "Certified",
    });
    expect(certified.milestone).toMatchObject({ status: "Certified PoC", revenueRecognized: 9600000000 });

    const billing = await submitProgressBilling(adapter, {
      milestoneId: String(milestone.id),
      retentionRate: 5,
      invoiceDate: "2026-08-25",
      dueDate: "2026-09-24",
    });
    expect(billing.billing).toMatchObject({
      id: "EPC-PB-2026-0001",
      grossAmount: 9600000000,
      retentionAmount: 480000000,
      netBillable: 9120000000,
      status: "Submitted",
    });
    expect(billing.milestone).toMatchObject({ status: "Billed", billingId: "EPC-PB-2026-0001" });

    const bast = await verifyMilestoneBAST(adapter, {
      milestoneId: String(milestone.id),
      bastNo: "BAST-EPC-2026-0001",
      verifiedAt: "2026-09-30",
    });
    expect(bast.retentionRelease).toMatchObject({ id: "EPC-RET-2026-0001", amount: 480000000, status: "Released" });
    expect(bast.report).toMatchObject({
      id: "EPC-RPT-2026-0001",
      milestoneId: milestone.id,
      certifiedProgress: 80,
      revenueRecognized: 9600000000,
      retentionReleased: 480000000,
    });
    expect(bast.milestone).toMatchObject({ status: "Verified BAST", bastNo: "BAST-EPC-2026-0001" });

    const gl = await adapter.query({
      collection: "EPCGLEntry",
      filters: [
        {
          field: "voucherNo",
          op: "in",
          value: [certified.certification.id, billing.billing.id, bast.retentionRelease.id],
        },
      ],
    });
    const debit = gl.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = gl.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    expect(debit).toBe(credit);
  });
});
