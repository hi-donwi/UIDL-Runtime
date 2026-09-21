import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { seed } from "../../../mock-data/seed";
import {
  DEVICE_BATCH_META,
  MURABAHAH_FINANCING_META,
  PROJECT_MILESTONE_META,
  ROASTING_BATCH_META,
  TUITION_FEE_META,
  WORK_ORDER_META,
} from "../../../console/doctypes";
import { createTransitionPostingDispatcher } from "../transitionPostingDispatcher";
import { createAdapterMutationHandler } from "../mutationHandler";
import { buildFormPage } from "../../generators/buildFormPage";

describe("Transition posting dispatcher", () => {
  it("dispatches MurabahahAgreement 'disburse' transition to create balanced GL entries", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const agreement = seed.MurabahahAgreement?.[0] as Record<string, unknown>;
    expect(agreement).toBeDefined();

    // Set status to Disetujui so it is valid for disbursement
    await adapter.update({
      collection: "MurabahahAgreement",
      id: String(agreement.id),
      data: { status: "Disetujui" },
    });

    const result = await dispatcher({
      meta: MURABAHAH_FINANCING_META,
      transition: { name: "disburse", from: ["Disetujui"], to: "Aktif", posting: true, label: { id: "Cairkan Dana", en: "Disburse" } },
      record: { ...agreement, status: "Disetujui" },
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
    expect(result.glEntries?.length).toBeGreaterThan(0);

    const sumDebit = result.glEntries!.reduce((acc, row) => acc + (row.debit || 0), 0);
    const sumCredit = result.glEntries!.reduce((acc, row) => acc + (row.credit || 0), 0);
    expect(sumDebit).toBe(sumCredit);
  });

  it("dispatches ProjectMilestone 'certify' transition to create balanced EPC GL entries", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const milestone = seed.ProjectMilestone?.[0] as Record<string, unknown>;
    expect(milestone).toBeDefined();

    await adapter.update({
      collection: "ProjectMilestone",
      id: String(milestone.id),
      data: { status: "On Schedule", actualProgress: 80, certifiedProgress: 75 },
    });

    const result = await dispatcher({
      meta: PROJECT_MILESTONE_META,
      transition: { name: "certify", from: ["On Schedule"], to: "Certified PoC", posting: true, label: { id: "Certify PoC", en: "Certify PoC" } },
      record: { ...milestone, status: "On Schedule", actualProgress: 80, certifiedProgress: 75 },
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
    const sumDebit = result.glEntries!.reduce((acc, row) => acc + (row.debit || 0), 0);
    const sumCredit = result.glEntries!.reduce((acc, row) => acc + (row.credit || 0), 0);
    expect(sumDebit).toBe(sumCredit);
  });

  it("dispatches TuitionFee 'pay' transition to record tuition payment and balanced GL", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const fee = seed.TuitionFee?.[0] as Record<string, unknown>;
    expect(fee).toBeDefined();

    const result = await dispatcher({
      meta: TUITION_FEE_META,
      transition: { name: "pay", from: ["Belum Bayar"], to: "Lunas", posting: true, label: { id: "Bayar", en: "Pay" } },
      record: fee,
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
    const sumDebit = result.glEntries!.reduce((acc, row) => acc + (row.debit || 0), 0);
    const sumCredit = result.glEntries!.reduce((acc, row) => acc + (row.credit || 0), 0);
    expect(sumDebit).toBe(sumCredit);
  });

  it("dispatches WorkOrder 'finish' transition to release finished goods and post GL", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const wo = seed.WorkOrder?.[0] as Record<string, unknown>;
    expect(wo).toBeDefined();

    await adapter.update({
      collection: "WorkOrder",
      id: String(wo.id),
      data: { status: "Quality Check" },
    });

    const result = await dispatcher({
      meta: WORK_ORDER_META,
      transition: { name: "finish", from: ["Quality Check"], to: "Completed", posting: true, label: { id: "Finish", en: "Finish" } },
      record: { ...wo, status: "Quality Check" },
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
  });

  it("dispatches RoastingBatch 'package' transition to post finished roast inventory", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const batch = seed.RoastingBatch?.[0] as Record<string, unknown>;
    expect(batch).toBeDefined();

    await adapter.update({
      collection: "RoastingBatch",
      id: String(batch.id),
      data: { status: "Cupping Passed", roastedWeightKg: 50 },
    });

    const result = await dispatcher({
      meta: ROASTING_BATCH_META,
      transition: { name: "package", from: ["Cupping Passed"], to: "Packaged", posting: true, label: { id: "Package", en: "Package" } },
      record: { ...batch, status: "Cupping Passed", roastedWeightKg: 50 },
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
  });

  it("dispatches DeviceBatch 'release' transition for QA release", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const dispatcher = createTransitionPostingDispatcher(adapter);

    const dev = seed.DeviceBatch?.[0] as Record<string, unknown>;
    expect(dev).toBeDefined();

    await adapter.update({
      collection: "DeviceBatch",
      id: String(dev.id),
      data: { status: "Sterilization Passed" },
    });

    const result = await dispatcher({
      meta: DEVICE_BATCH_META,
      transition: { name: "release", from: ["Sterilization Passed"], to: "QA Released", posting: true, label: { id: "Release", en: "Release" } },
      record: { ...dev, status: "Sterilization Passed" },
    }) as { glEntries?: Array<{ debit: number; credit: number }> };

    expect(result).toBeDefined();
    expect(result?.glEntries).toBeDefined();
  });

  it("mutationHandler auto-generates sequential ID using meta.naming when id is omitted on create", async () => {
    const adapter = createInMemoryAdapter({ seed });
    const handler = createAdapterMutationHandler({
      adapter,
      doctypes: [PROJECT_MILESTONE_META],
    });

    const result = await handler({
      operation: "create",
      collection: "ProjectMilestone",
      payload: {
        projectName: "EPC Power Plant Unit 3",
        projectCode: "EPC-PL-03",
        milestoneName: "Turbine Installation",
        contractValue: "500000000",
        companyId: "epc-contractor",
      },
    }) as { id?: string; record?: Record<string, unknown> };

    expect(result).toBeDefined();
    const createdId = result.record?.id ?? result.id;
    expect(typeof createdId).toBe("string");
    expect(createdId).toMatch(/^MLS-\d{4}-\d{5}$/);
    // Currency was string "500000000", sanitized to number 500000000
    expect(result.record?.contractValue).toBe(500000000);
  });

  it("buildFormPage renders 'Cetak Dokumen' button on edit mode for supported doctypes", () => {
    const doc = buildFormPage(PROJECT_MILESTONE_META, "MLS-2026-00001", {
      company: "epc-contractor",
    });

    const json = JSON.stringify(doc);
    expect(json).toContain("Cetak Dokumen");
    expect(json).toContain("/meridian/print/bast-milestone/epc-contractor/MLS-2026-00001");
  });
});
