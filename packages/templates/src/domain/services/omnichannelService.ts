import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type OmnichannelRecord = Record<string, unknown>;

interface LoadedFulfillmentOrder {
  record: OmnichannelRecord;
  meta: RecordMeta;
}

export interface CreateMarketplaceOrderInput {
  companyId: string;
  marketplaceOrderNo: string;
  channel: string;
  customerName: string;
  totalItems: number;
  grossAmount: number;
  orderDate: string;
  courier: string;
}

export interface ReserveFulfillmentStockInput {
  fulfillmentOrderId: string;
  warehouse: string;
  skuCount: number;
  reservedAt: string;
}

export interface AssignWavePickingInput {
  fulfillmentOrderId: string;
  picker: string;
  assignedAt: string;
}

export interface CreateShippingLabelInput {
  fulfillmentOrderId: string;
  trackingNo: string;
  labelUrl: string;
  printedAt: string;
}

export interface RecordMarketplaceSettlementInput {
  fulfillmentOrderId: string;
  marketplaceFee: number;
  settledAt: string;
}

export interface ReserveFulfillmentStockResult {
  order: OmnichannelRecord;
  reservation: OmnichannelRecord;
}

export interface AssignWavePickingResult {
  order: OmnichannelRecord;
  wave: OmnichannelRecord;
}

export interface CreateShippingLabelResult {
  order: OmnichannelRecord;
  label: OmnichannelRecord;
}

export interface RecordMarketplaceSettlementResult {
  order: OmnichannelRecord;
  settlement: OmnichannelRecord;
  report: OmnichannelRecord;
}

const OMNI_COMPANY_ID = "omnichannel-dist";

export async function createMarketplaceOrder(adapter: DataAdapter, input: CreateMarketplaceOrderInput): Promise<OmnichannelRecord> {
  assertOmnichannelCompany(input.companyId);
  if (!input.marketplaceOrderNo.trim()) {
    throw new DataError("Fulfillment order requires marketplace order number", "validation", { marketplaceOrderNo: "Required" });
  }
  if (!input.customerName.trim()) {
    throw new DataError("Fulfillment order requires customer name", "validation", { customerName: "Required" });
  }
  assertPositiveInteger(input.totalItems, "totalItems");
  assertMoney(input.grossAmount, "grossAmount");

  const id = await nextSequentialId(adapter, "FulfillmentOrder", "FUL-OMNI-", 4);
  const record: OmnichannelRecord = {
    id,
    companyId: input.companyId,
    marketplaceOrderNo: input.marketplaceOrderNo,
    channel: input.channel,
    customerName: input.customerName,
    totalItems: input.totalItems,
    grossAmount: roundMoney(input.grossAmount),
    orderDate: input.orderDate,
    courier: input.courier,
    trackingNo: "",
    stockReserved: false,
    settlementStatus: "Pending",
    netSettlement: 0,
    status: "Synced",
    route: `/app/omnichannel-dist/edit/FulfillmentOrder/${id}`,
  };
  const created = await adapter.create<OmnichannelRecord>({ collection: "FulfillmentOrder", data: record });
  return created.record;
}

export async function reserveFulfillmentStock(
  adapter: DataAdapter,
  input: ReserveFulfillmentStockInput,
): Promise<ReserveFulfillmentStockResult> {
  const order = await loadFulfillmentOrder(adapter, input.fulfillmentOrderId);
  if (order.record.status !== "Synced") {
    throw new DataError(`Fulfillment order "${input.fulfillmentOrderId}" must be synced before reservation`, "validation", {
      status: "Expected Synced",
    });
  }
  assertPositiveInteger(input.skuCount, "skuCount");
  const year = input.reservedAt.slice(0, 4);
  const reservationId = await nextSequentialId(adapter, "OmnichannelStockReservation", `OMNI-RES-${year}-`, 4);
  const reservation: OmnichannelRecord = {
    id: reservationId,
    companyId: OMNI_COMPANY_ID,
    fulfillmentOrderId: input.fulfillmentOrderId,
    warehouse: input.warehouse,
    quantity: input.skuCount,
    reservedAt: input.reservedAt,
    status: "Reserved",
  };
  const createdReservation = await adapter.create<OmnichannelRecord>({
    collection: "OmnichannelStockReservation",
    data: reservation,
  });
  const updatedOrder = await updateFulfillmentOrder(adapter, order, {
    warehouse: input.warehouse,
    stockReserved: true,
    reservedAt: input.reservedAt,
    status: "Wave Assigned",
  });
  return { order: updatedOrder, reservation: createdReservation.record };
}

export async function assignWavePicking(adapter: DataAdapter, input: AssignWavePickingInput): Promise<AssignWavePickingResult> {
  const order = await loadFulfillmentOrder(adapter, input.fulfillmentOrderId);
  if (order.record.status !== "Wave Assigned") {
    throw new DataError(`Fulfillment order "${input.fulfillmentOrderId}" must be wave assigned before picking`, "validation", {
      status: "Expected Wave Assigned",
    });
  }
  const year = input.assignedAt.slice(0, 4);
  const waveId = await nextSequentialId(adapter, "OmnichannelPickWave", `OMNI-WAVE-${year}-`, 4);
  const wave: OmnichannelRecord = {
    id: waveId,
    companyId: OMNI_COMPANY_ID,
    fulfillmentOrderId: input.fulfillmentOrderId,
    warehouse: order.record.warehouse,
    picker: input.picker,
    assignedAt: input.assignedAt,
    status: "Picking",
  };
  const createdWave = await adapter.create<OmnichannelRecord>({ collection: "OmnichannelPickWave", data: wave });
  const updatedOrder = await updateFulfillmentOrder(adapter, order, {
    waveId,
    picker: input.picker,
    pickingStartedAt: input.assignedAt,
    status: "Picking",
  });
  return { order: updatedOrder, wave: createdWave.record };
}

export async function createShippingLabel(adapter: DataAdapter, input: CreateShippingLabelInput): Promise<CreateShippingLabelResult> {
  const order = await loadFulfillmentOrder(adapter, input.fulfillmentOrderId);
  if (order.record.status !== "Picking") {
    throw new DataError(`Fulfillment order "${input.fulfillmentOrderId}" must be picking before shipping label`, "validation", {
      status: "Expected Picking",
    });
  }
  const year = input.printedAt.slice(0, 4);
  const labelId = await nextSequentialId(adapter, "OmnichannelShippingLabel", `OMNI-LBL-${year}-`, 4);
  const label: OmnichannelRecord = {
    id: labelId,
    companyId: OMNI_COMPANY_ID,
    fulfillmentOrderId: input.fulfillmentOrderId,
    courier: order.record.courier,
    trackingNo: input.trackingNo,
    labelUrl: input.labelUrl,
    printedAt: input.printedAt,
    status: "Printed",
  };
  const createdLabel = await adapter.create<OmnichannelRecord>({ collection: "OmnichannelShippingLabel", data: label });
  const updatedOrder = await updateFulfillmentOrder(adapter, order, {
    trackingNo: input.trackingNo,
    labelUrl: input.labelUrl,
    shippedAt: input.printedAt,
    status: "Shipped",
  });
  return { order: updatedOrder, label: createdLabel.record };
}

export async function recordMarketplaceSettlement(
  adapter: DataAdapter,
  input: RecordMarketplaceSettlementInput,
): Promise<RecordMarketplaceSettlementResult> {
  const order = await loadFulfillmentOrder(adapter, input.fulfillmentOrderId);
  if (order.record.status !== "Shipped") {
    throw new DataError(`Fulfillment order "${input.fulfillmentOrderId}" must be shipped before settlement`, "validation", {
      status: "Expected Shipped",
    });
  }
  assertMoney(input.marketplaceFee, "marketplaceFee");
  const year = input.settledAt.slice(0, 4);
  const grossAmount = Number(order.record.grossAmount ?? 0);
  const netSettlement = roundMoney(grossAmount - input.marketplaceFee);
  const settlementId = await nextSequentialId(adapter, "OmnichannelSettlement", `OMNI-SET-${year}-`, 4);
  const settlement: OmnichannelRecord = {
    id: settlementId,
    companyId: OMNI_COMPANY_ID,
    fulfillmentOrderId: input.fulfillmentOrderId,
    channel: order.record.channel,
    grossAmount,
    marketplaceFee: roundMoney(input.marketplaceFee),
    netSettlement,
    settledAt: input.settledAt,
    status: "Settled",
  };
  const createdSettlement = await adapter.create<OmnichannelRecord>({ collection: "OmnichannelSettlement", data: settlement });
  const updatedOrder = await updateFulfillmentOrder(adapter, order, {
    marketplaceFee: roundMoney(input.marketplaceFee),
    netSettlement,
    settlementStatus: "Settled",
    settledAt: input.settledAt,
    status: "Delivered",
  });

  const reportId = await nextSequentialId(adapter, "OmnichannelFulfillmentReport", `OMNI-RPT-${year}-`, 4);
  const report: OmnichannelRecord = {
    id: reportId,
    companyId: OMNI_COMPANY_ID,
    fulfillmentOrderId: input.fulfillmentOrderId,
    channel: order.record.channel,
    shippedOrders: 1,
    settledGMV: grossAmount,
    netSettlement,
    snapshotAt: input.settledAt,
    status: "Submitted",
  };
  const createdReport = await adapter.create<OmnichannelRecord>({ collection: "OmnichannelFulfillmentReport", data: report });
  return { order: updatedOrder, settlement: createdSettlement.record, report: createdReport.record };
}

async function loadFulfillmentOrder(adapter: DataAdapter, fulfillmentOrderId: string): Promise<LoadedFulfillmentOrder> {
  const order = await adapter.get<OmnichannelRecord>("FulfillmentOrder", fulfillmentOrderId);
  if (!order) throw new DataError(`Fulfillment order "${fulfillmentOrderId}" was not found`, "not_found");
  if (order.record.companyId !== OMNI_COMPANY_ID) {
    throw new DataError(`Fulfillment order "${fulfillmentOrderId}" belongs to another company`, "validation", {
      companyId: "Wrong company",
    });
  }
  return order;
}

async function updateFulfillmentOrder(
  adapter: DataAdapter,
  order: LoadedFulfillmentOrder,
  data: OmnichannelRecord,
): Promise<OmnichannelRecord> {
  const updated = await adapter.update<OmnichannelRecord>({
    collection: "FulfillmentOrder",
    id: String(order.record.id),
    version: order.meta.version,
    data,
  });
  return updated.record;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<OmnichannelRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertOmnichannelCompany(companyId: string): void {
  if (companyId !== OMNI_COMPANY_ID) {
    throw new DataError(`Omnichannel service only supports "${OMNI_COMPANY_ID}"`, "validation", { companyId: "Unsupported company" });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Omnichannel field "${field}" must be a positive integer`, "validation", {
      [field]: "Must be a positive integer",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Omnichannel amount "${field}" must be zero or greater`, "validation", {
      [field]: "Must be zero or greater",
    });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
