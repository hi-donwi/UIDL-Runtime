import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  createJobCard,
  createProductionPlan,
  issueWorkOrderMaterial,
  releaseFinishedGoods,
  submitQualityInspection,
} from "../factoryService";

function isBalanced(rows: Array<Record<string, unknown>>): boolean {
  const debit = rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
  const credit = rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  return debit === credit;
}

describe("factory manufacturing service workflow", () => {
  it("runs plan -> material issue -> job card -> QC -> finished goods with stock/GL proof", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const workOrder = await createProductionPlan(adapter, {
      companyId: "factory-abc",
      productName: "Bearing Presisi High-Temp",
      bomCode: "BOM-101",
      targetQty: 100,
      workstation: "Mesin Bubut CNC-1",
      startDate: "2026-08-24",
      plannedMaterialCost: 2000000,
      plannedLaborCost: 1200000,
      plannedOverheadCost: 800000,
    });
    expect(workOrder).toMatchObject({
      id: "WO-2026-0066",
      status: "Draft",
      plannedCost: 4000000,
    });

    const material = await issueWorkOrderMaterial(adapter, {
      workOrderId: String(workOrder.id),
      materialItem: "Steel Coil SPCC 1.2mm",
      quantity: 240,
      materialCost: 2050000,
      issuedAt: "2026-08-24T09:00:00+07:00",
    });
    expect(material.workOrder).toMatchObject({ status: "In Progress", actualMaterialCost: 2050000 });
    expect(material.stockLedger).toMatchObject({ id: "FACT-SLE-2026-0001", quantity: -240, value: -2050000 });
    expect(isBalanced(material.glEntries)).toBe(true);

    const jobCard = await createJobCard(adapter, {
      workOrderId: String(workOrder.id),
      operator: "Dedi Kurnia",
      completedQty: 96,
      laborCost: 1150000,
      overheadCost: 750000,
      completedAt: "2026-08-24T14:00:00+07:00",
    });
    expect(jobCard.workOrder).toMatchObject({ completedQty: 96, actualLaborCost: 1150000, actualOverheadCost: 750000 });
    expect(jobCard.jobCard).toMatchObject({ id: "FACT-JC-2026-0001", status: "Completed" });

    const qc = await submitQualityInspection(adapter, {
      workOrderId: String(workOrder.id),
      sampleQty: 32,
      acceptedQty: 96,
      rejectedQty: 4,
      inspectedAt: "2026-08-24T15:00:00+07:00",
    });
    expect(qc.workOrder).toMatchObject({ status: "Quality Check", qcStatus: "Passed", rejectedQty: 4 });
    expect(qc.inspection).toMatchObject({ id: "FACT-QC-2026-0001", result: "Passed" });

    const released = await releaseFinishedGoods(adapter, {
      workOrderId: String(workOrder.id),
      releasedAt: "2026-08-24T16:00:00+07:00",
    });
    expect(released.workOrder).toMatchObject({
      status: "Completed",
      actualCost: 3950000,
      variance: -50000,
    });
    expect(released.stockLedger).toMatchObject({ id: "FACT-SLE-2026-0002", quantity: 96, value: 3950000 });
    expect(released.report).toMatchObject({
      id: "FACT-RPT-2026-0001",
      workOrderId: workOrder.id,
      yieldRate: 96,
      variance: -50000,
    });
    expect(isBalanced(released.glEntries)).toBe(true);
  });
});

