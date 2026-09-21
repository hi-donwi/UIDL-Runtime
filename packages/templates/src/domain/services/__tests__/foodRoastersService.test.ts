import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  createGreenBeanContract,
  packageRoastedBatch,
  receiveGreenBeanLot,
  recordRoastLoss,
  recordWholesaleSale,
  submitCuppingResult,
} from "../foodRoastersService";

describe("food roasters service workflow", () => {
  it("runs contract -> lot receive -> roast loss -> cupping -> pack -> sale with margin/stock report", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const contract = await createGreenBeanContract(adapter, {
      companyId: "food-roasters",
      origin: "Aceh Gayo",
      farmer: "Koperasi Gayo Megah",
      contractedKg: 60,
      pricePerKg: 60000,
      contractDate: "2026-08-24",
    });
    expect(contract).toMatchObject({ id: "GB-CON-2026-0001", status: "Active", contractValue: 3600000 });

    const received = await receiveGreenBeanLot(adapter, {
      contractId: String(contract.id),
      lotCode: "GAYO-2026-08-A",
      profile: "Medium Filter",
      roasterOperator: "Budi Roaster",
      receivedAt: "2026-08-24",
    });
    expect(received.batch).toMatchObject({
      id: "ROAST-0066",
      companyId: "food-roasters",
      status: "Scheduled",
      greenWeightKg: 60,
      greenCost: 3600000,
    });
    expect(received.stockLedger).toMatchObject({ id: "ROAST-SLE-2026-0001", quantityKg: 60, value: 3600000 });

    const roasted = await recordRoastLoss(adapter, {
      roastingBatchId: String(received.batch.id),
      roastedWeightKg: 50.1,
      energyCost: 120000,
      roastedAt: "2026-08-24T10:00:00+07:00",
    });
    expect(roasted).toMatchObject({
      status: "Roasting",
      roastedWeightKg: 50.1,
      roastLossPct: 16.5,
      batchCost: 3720000,
    });

    const cupping = await submitCuppingResult(adapter, {
      roastingBatchId: String(received.batch.id),
      cuppingScore: 85.2,
      moisturePct: 10.8,
      agtron: 58,
      cuppedAt: "2026-08-24T12:00:00+07:00",
    });
    expect(cupping).toMatchObject({ status: "Cupping Passed", cuppingScore: 85.2, qcStatus: "Passed" });

    const packaged = await packageRoastedBatch(adapter, {
      roastingBatchId: String(received.batch.id),
      sku: "GAYO-250-BEAN",
      bagCount: 200,
      bagSizeGrams: 250,
      packagedAt: "2026-08-24T14:00:00+07:00",
    });
    expect(packaged.batch).toMatchObject({ status: "Packaged", packagedWeightKg: 50 });
    expect(packaged.stockLedger).toMatchObject({ id: "ROAST-SLE-2026-0002", quantityKg: 50, value: 3720000 });

    const sale = await recordWholesaleSale(adapter, {
      roastingBatchId: String(received.batch.id),
      customer: "Kopi Kenangan Senopati",
      soldWeightKg: 50,
      saleAmount: 5400000,
      soldAt: "2026-08-24T16:00:00+07:00",
    });
    expect(sale.sale).toMatchObject({ id: "ROAST-SALE-2026-0001", grossMargin: 1680000, status: "Submitted" });
    expect(sale.report).toMatchObject({
      id: "ROAST-RPT-2026-0001",
      roastingBatchId: received.batch.id,
      yieldRate: 83.5,
      grossMargin: 1680000,
    });
  });
});

