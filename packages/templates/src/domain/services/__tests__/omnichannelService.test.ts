import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  assignWavePicking,
  createMarketplaceOrder,
  createShippingLabel,
  recordMarketplaceSettlement,
  reserveFulfillmentStock,
} from "../omnichannelService";

describe("omnichannel fulfillment service workflow", () => {
  it("runs marketplace sync -> reserve -> wave pick -> label -> settlement with derived stock/report rows", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const order = await createMarketplaceOrder(adapter, {
      companyId: "omnichannel-dist",
      marketplaceOrderNo: "INV/TKP/900001",
      channel: "TokoPrima Official",
      customerName: "PT Sinar Jaya Abadi",
      totalItems: 3,
      grossAmount: 825000,
      orderDate: "2026-08-24",
      courier: "KirimCepat",
    });

    expect(order).toMatchObject({
      id: "FUL-OMNI-0066",
      status: "Synced",
      settlementStatus: "Pending",
    });

    const reserved = await reserveFulfillmentStock(adapter, {
      fulfillmentOrderId: String(order.id),
      warehouse: "Hub Jakarta",
      skuCount: 3,
      reservedAt: "2026-08-24T10:00:00+07:00",
    });
    expect(reserved.order).toMatchObject({
      status: "Wave Assigned",
      warehouse: "Hub Jakarta",
      stockReserved: true,
    });
    expect(reserved.reservation).toMatchObject({
      id: "OMNI-RES-2026-0001",
      quantity: 3,
      status: "Reserved",
    });

    const wave = await assignWavePicking(adapter, {
      fulfillmentOrderId: String(order.id),
      picker: "Tim A",
      assignedAt: "2026-08-24T11:00:00+07:00",
    });
    expect(wave.order).toMatchObject({
      status: "Picking",
      waveId: "OMNI-WAVE-2026-0001",
      picker: "Tim A",
    });

    const label = await createShippingLabel(adapter, {
      fulfillmentOrderId: String(order.id),
      trackingNo: "JNT900001",
      labelUrl: "https://mock.local/labels/JNT900001.pdf",
      printedAt: "2026-08-24T12:00:00+07:00",
    });
    expect(label.order).toMatchObject({
      status: "Shipped",
      trackingNo: "JNT900001",
    });
    expect(label.label).toMatchObject({
      id: "OMNI-LBL-2026-0001",
      trackingNo: "JNT900001",
      status: "Printed",
    });

    const settlement = await recordMarketplaceSettlement(adapter, {
      fulfillmentOrderId: String(order.id),
      marketplaceFee: 41250,
      settledAt: "2026-08-24T16:00:00+07:00",
    });
    expect(settlement.order).toMatchObject({
      status: "Delivered",
      settlementStatus: "Settled",
      netSettlement: 783750,
    });
    expect(settlement.settlement).toMatchObject({
      id: "OMNI-SET-2026-0001",
      netSettlement: 783750,
      status: "Settled",
    });
    expect(settlement.report).toMatchObject({
      id: "OMNI-RPT-2026-0001",
      shippedOrders: 1,
      settledGMV: 825000,
      netSettlement: 783750,
    });

    const reports = await adapter.query({
      collection: "OmnichannelFulfillmentReport",
      filters: [{ field: "fulfillmentOrderId", op: "eq", value: order.id }],
    });
    expect(reports.rows).toHaveLength(1);
  });
});

