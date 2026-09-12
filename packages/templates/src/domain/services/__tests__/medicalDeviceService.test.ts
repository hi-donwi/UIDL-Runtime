import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  closeCAPAForBatch,
  completeSterilizationCycle,
  createDeviceBatchDHR,
  createDeviceMasterRecord,
  openCAPAForBatch,
  passCleanroomInspection,
  releaseDeviceBatchQA,
} from "../medicalDeviceService";

describe("medical device service workflow", () => {
  it("runs DMR -> DHR -> sterilization -> CAPA block -> QA release -> UDI trace with balanced GL", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const dmr = await createDeviceMasterRecord(adapter, {
      companyId: "medical-device",
      deviceName: "Spuit Sekali Pakai 5ml Luer Lock Steril",
      riskClass: "Kelas IIa",
      udiDi: "08994567890123",
      revision: "Rev. 8",
      effectiveDate: "2026-08-25",
    });
    expect(dmr).toMatchObject({ id: "DMR-MD-0004", status: "Effective" });

    const dhr = await createDeviceBatchDHR(adapter, {
      companyId: "medical-device",
      dmrId: String(dmr.id),
      batchQty: 2500,
      unitCost: 8500,
      manufacturingDate: "2026-08-25",
      cleanroomClass: "ISO Class 7",
    });
    expect(dhr.batch).toMatchObject({
      id: "LOT-MD-0066",
      dhrId: "DHR-MD-2026-0001",
      status: "In Assembly",
      dhrApproved: false,
    });
    expect(dhr.dhr).toMatchObject({ id: "DHR-MD-2026-0001", dmrId: dmr.id, status: "Draft" });

    const cleanroom = await passCleanroomInspection(adapter, {
      batchId: String(dhr.batch.id),
      particleCount: 72,
      bioburdenCfu: 4,
      inspectedBy: "QA Cleanroom Lead",
      inspectedAt: "2026-08-25T09:00:00+07:00",
    });
    expect(cleanroom.inspection).toMatchObject({ id: "CLN-MD-2026-0001", status: "Passed" });
    expect(cleanroom.batch).toMatchObject({ status: "Cleanroom Passed" });

    const sterilized = await completeSterilizationCycle(adapter, {
      batchId: String(dhr.batch.id),
      chamber: "Chamber A",
      temperatureC: 54,
      durationMinutes: 260,
      biologicalIndicator: "BI Negative",
      sterilizedAt: "2026-08-25T14:30:00+07:00",
    });
    expect(sterilized.cycle).toMatchObject({ id: "ETO-MD-2026-0001", status: "Passed" });
    expect(sterilized.batch).toMatchObject({ status: "Sterilization Passed" });

    const capa = await openCAPAForBatch(adapter, {
      batchId: String(dhr.batch.id),
      issue: "Label UDI kurang kontras saat scan sampling",
      severity: "Major",
      owner: "QA Manager",
      openedAt: "2026-08-25T15:00:00+07:00",
    });
    expect(capa.capa).toMatchObject({ id: "CAPA-MD-2026-0001", status: "Open" });
    expect(capa.batch).toMatchObject({ qaHold: true });

    await expect(
      releaseDeviceBatchQA(adapter, {
        batchId: String(dhr.batch.id),
        releasedBy: "QA Manager",
        releasedAt: "2026-08-25T16:00:00+07:00",
      }),
    ).rejects.toThrow(/open CAPA/i);

    const closedCapa = await closeCAPAForBatch(adapter, {
      capaId: String(capa.capa.id),
      resolution: "Kontras label UDI dinaikkan dan sampling scan ulang passed",
      closedAt: "2026-08-25T16:20:00+07:00",
    });
    expect(closedCapa.capa).toMatchObject({ status: "Closed" });
    expect(closedCapa.batch).toMatchObject({ qaHold: false });

    const released = await releaseDeviceBatchQA(adapter, {
      batchId: String(dhr.batch.id),
      releasedBy: "QA Manager",
      releasedAt: "2026-08-25T16:45:00+07:00",
    });
    expect(released.release).toMatchObject({ id: "QA-MD-2026-0001", status: "Released" });
    expect(released.trace).toMatchObject({ id: "UDI-MD-2026-0001", lotNo: dhr.batch.id, status: "Traceable" });
    expect(released.batch).toMatchObject({
      status: "QA Released",
      dhrApproved: true,
      qaReleaseId: "QA-MD-2026-0001",
      udiTraceId: "UDI-MD-2026-0001",
    });

    const gl = await adapter.query({
      collection: "MedicalDeviceGLEntry",
      filters: [{ field: "voucherNo", op: "eq", value: released.release.id }],
    });
    const debit = gl.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = gl.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    expect(debit).toBe(credit);
  });
});
