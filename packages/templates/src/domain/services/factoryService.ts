import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type FactoryRecord = Record<string, unknown>;

interface LoadedWorkOrder {
  record: FactoryRecord;
  meta: RecordMeta;
}

export interface CreateProductionPlanInput {
  companyId: string;
  productName: string;
  bomCode: string;
  targetQty: number;
  workstation: string;
  startDate: string;
  plannedMaterialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
}

export interface IssueWorkOrderMaterialInput {
  workOrderId: string;
  materialItem: string;
  quantity: number;
  materialCost: number;
  issuedAt: string;
}

export interface CreateJobCardInput {
  workOrderId: string;
  operator: string;
  completedQty: number;
  laborCost: number;
  overheadCost: number;
  completedAt: string;
}

export interface SubmitQualityInspectionInput {
  workOrderId: string;
  sampleQty: number;
  acceptedQty: number;
  rejectedQty: number;
  inspectedAt: string;
}

export interface ReleaseFinishedGoodsInput {
  workOrderId: string;
  releasedAt: string;
}

export interface IssueWorkOrderMaterialResult {
  workOrder: FactoryRecord;
  stockLedger: FactoryRecord;
  glEntries: FactoryRecord[];
}

export interface CreateJobCardResult {
  workOrder: FactoryRecord;
  jobCard: FactoryRecord;
}

export interface SubmitQualityInspectionResult {
  workOrder: FactoryRecord;
  inspection: FactoryRecord;
}

export interface ReleaseFinishedGoodsResult {
  workOrder: FactoryRecord;
  stockLedger: FactoryRecord;
  glEntries: FactoryRecord[];
  report: FactoryRecord;
}

const FACTORY_COMPANY_ID = "factory-abc";
const RAW_MATERIAL_ACCOUNT = "1151 - Raw Material Inventory";
const WIP_ACCOUNT = "1160 - Work In Progress";
const FINISHED_GOODS_ACCOUNT = "1170 - Finished Goods Inventory";

export async function createProductionPlan(adapter: DataAdapter, input: CreateProductionPlanInput): Promise<FactoryRecord> {
  assertFactoryCompany(input.companyId);
  if (!input.productName.trim()) throw new DataError("Work order requires product name", "validation", { productName: "Required" });
  assertPositiveInteger(input.targetQty, "targetQty");
  assertMoney(input.plannedMaterialCost, "plannedMaterialCost");
  assertMoney(input.plannedLaborCost, "plannedLaborCost");
  assertMoney(input.plannedOverheadCost, "plannedOverheadCost");

  const year = input.startDate.slice(0, 4);
  const id = await nextSequentialId(adapter, "WorkOrder", `WO-${year}-`, 4);
  const plannedCost = roundMoney(input.plannedMaterialCost + input.plannedLaborCost + input.plannedOverheadCost);
  const record: FactoryRecord = {
    id,
    companyId: input.companyId,
    productName: input.productName,
    bomCode: input.bomCode,
    targetQty: input.targetQty,
    completedQty: 0,
    rejectedQty: 0,
    workstation: input.workstation,
    startDate: input.startDate,
    plannedMaterialCost: roundMoney(input.plannedMaterialCost),
    plannedLaborCost: roundMoney(input.plannedLaborCost),
    plannedOverheadCost: roundMoney(input.plannedOverheadCost),
    plannedCost,
    actualMaterialCost: 0,
    actualLaborCost: 0,
    actualOverheadCost: 0,
    actualCost: 0,
    variance: 0,
    qcStatus: "",
    status: "Draft",
    route: `/app/factory-abc/edit/WorkOrder/${id}`,
  };
  const created = await adapter.create<FactoryRecord>({ collection: "WorkOrder", data: record });
  return created.record;
}

export async function issueWorkOrderMaterial(
  adapter: DataAdapter,
  input: IssueWorkOrderMaterialInput,
): Promise<IssueWorkOrderMaterialResult> {
  const workOrder = await loadWorkOrder(adapter, input.workOrderId);
  if (workOrder.record.status !== "Draft") {
    throw new DataError(`Work order "${input.workOrderId}" must be Draft before material issue`, "validation", { status: "Expected Draft" });
  }
  assertPositiveInteger(input.quantity, "quantity");
  assertMoney(input.materialCost, "materialCost");

  const year = input.issuedAt.slice(0, 4);
  const stockLedger = await createStockLedger(adapter, {
    idPrefix: `FACT-SLE-${year}-`,
    workOrderId: input.workOrderId,
    item: input.materialItem,
    postingDate: input.issuedAt,
    quantity: -input.quantity,
    value: -roundMoney(input.materialCost),
    status: "Issued",
  });
  const updatedWorkOrder = await updateWorkOrder(adapter, workOrder, {
    actualMaterialCost: roundMoney(input.materialCost),
    materialIssuedAt: input.issuedAt,
    status: "In Progress",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.issuedAt,
    voucherType: "MaterialIssue",
    voucherNo: input.workOrderId,
    party: String(workOrder.record.productName ?? ""),
    lines: [
      { account: WIP_ACCOUNT, debit: roundMoney(input.materialCost), credit: 0 },
      { account: RAW_MATERIAL_ACCOUNT, debit: 0, credit: roundMoney(input.materialCost) },
    ],
  });
  return { workOrder: updatedWorkOrder, stockLedger, glEntries };
}

export async function createJobCard(adapter: DataAdapter, input: CreateJobCardInput): Promise<CreateJobCardResult> {
  const workOrder = await loadWorkOrder(adapter, input.workOrderId);
  if (workOrder.record.status !== "In Progress") {
    throw new DataError(`Work order "${input.workOrderId}" must be In Progress before job card`, "validation", {
      status: "Expected In Progress",
    });
  }
  assertPositiveInteger(input.completedQty, "completedQty");
  assertMoney(input.laborCost, "laborCost");
  assertMoney(input.overheadCost, "overheadCost");
  const year = input.completedAt.slice(0, 4);
  const jobCardId = await nextSequentialId(adapter, "FactoryJobCard", `FACT-JC-${year}-`, 4);
  const jobCard: FactoryRecord = {
    id: jobCardId,
    companyId: FACTORY_COMPANY_ID,
    workOrderId: input.workOrderId,
    operator: input.operator,
    completedQty: input.completedQty,
    laborCost: roundMoney(input.laborCost),
    overheadCost: roundMoney(input.overheadCost),
    completedAt: input.completedAt,
    status: "Completed",
  };
  const createdJobCard = await adapter.create<FactoryRecord>({ collection: "FactoryJobCard", data: jobCard });
  const updatedWorkOrder = await updateWorkOrder(adapter, workOrder, {
    completedQty: input.completedQty,
    actualLaborCost: roundMoney(input.laborCost),
    actualOverheadCost: roundMoney(input.overheadCost),
    jobCardId,
  });
  return { workOrder: updatedWorkOrder, jobCard: createdJobCard.record };
}

export async function submitQualityInspection(
  adapter: DataAdapter,
  input: SubmitQualityInspectionInput,
): Promise<SubmitQualityInspectionResult> {
  const workOrder = await loadWorkOrder(adapter, input.workOrderId);
  if (workOrder.record.status !== "In Progress") {
    throw new DataError(`Work order "${input.workOrderId}" must be In Progress before QC`, "validation", {
      status: "Expected In Progress",
    });
  }
  assertPositiveInteger(input.sampleQty, "sampleQty");
  assertPositiveInteger(input.acceptedQty, "acceptedQty");
  if (!Number.isInteger(input.rejectedQty) || input.rejectedQty < 0) {
    throw new DataError("Rejected quantity must be zero or greater", "validation", { rejectedQty: "Must be zero or greater" });
  }
  const year = input.inspectedAt.slice(0, 4);
  const inspectionId = await nextSequentialId(adapter, "FactoryQualityInspection", `FACT-QC-${year}-`, 4);
  const inspectedQty = input.acceptedQty + input.rejectedQty;
  const defectRate = inspectedQty === 0 ? 1 : input.rejectedQty / inspectedQty;
  const result = defectRate <= 0.05 ? "Passed" : "Hold";
  const inspection: FactoryRecord = {
    id: inspectionId,
    companyId: FACTORY_COMPANY_ID,
    workOrderId: input.workOrderId,
    sampleQty: input.sampleQty,
    acceptedQty: input.acceptedQty,
    rejectedQty: input.rejectedQty,
    inspectedAt: input.inspectedAt,
    result,
    status: "Submitted",
  };
  const createdInspection = await adapter.create<FactoryRecord>({ collection: "FactoryQualityInspection", data: inspection });
  const updatedWorkOrder = await updateWorkOrder(adapter, workOrder, {
    completedQty: input.acceptedQty,
    rejectedQty: input.rejectedQty,
    qcStatus: result,
    qcInspectionId: inspectionId,
    status: "Quality Check",
  });
  return { workOrder: updatedWorkOrder, inspection: createdInspection.record };
}

export async function releaseFinishedGoods(
  adapter: DataAdapter,
  input: ReleaseFinishedGoodsInput,
): Promise<ReleaseFinishedGoodsResult> {
  const workOrder = await loadWorkOrder(adapter, input.workOrderId);
  if (workOrder.record.status !== "Quality Check") {
    throw new DataError(`Work order "${input.workOrderId}" must be in Quality Check before release`, "validation", {
      status: "Expected Quality Check",
    });
  }
  if (workOrder.record.qcStatus !== "Passed") {
    throw new DataError(`Work order "${input.workOrderId}" is not QC passed`, "validation", { qcStatus: "Expected Passed" });
  }
  const actualCost = roundMoney(
    Number(workOrder.record.actualMaterialCost ?? 0) +
      Number(workOrder.record.actualLaborCost ?? 0) +
      Number(workOrder.record.actualOverheadCost ?? 0),
  );
  const plannedCost = Number(workOrder.record.plannedCost ?? 0);
  const variance = roundMoney(actualCost - plannedCost);
  const completedQty = Number(workOrder.record.completedQty ?? 0);
  const year = input.releasedAt.slice(0, 4);
  const stockLedger = await createStockLedger(adapter, {
    idPrefix: `FACT-SLE-${year}-`,
    workOrderId: input.workOrderId,
    item: String(workOrder.record.productName ?? ""),
    postingDate: input.releasedAt,
    quantity: completedQty,
    value: actualCost,
    status: "Finished Goods",
  });
  const updatedWorkOrder = await updateWorkOrder(adapter, workOrder, {
    actualCost,
    variance,
    releasedAt: input.releasedAt,
    status: "Completed",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.releasedAt,
    voucherType: "FinishedGoodsReceipt",
    voucherNo: input.workOrderId,
    party: String(workOrder.record.productName ?? ""),
    lines: [
      { account: FINISHED_GOODS_ACCOUNT, debit: actualCost, credit: 0 },
      { account: WIP_ACCOUNT, debit: 0, credit: actualCost },
    ],
  });
  const reportId = await nextSequentialId(adapter, "FactoryProductionReport", `FACT-RPT-${year}-`, 4);
  const report: FactoryRecord = {
    id: reportId,
    companyId: FACTORY_COMPANY_ID,
    workOrderId: input.workOrderId,
    productName: workOrder.record.productName,
    targetQty: workOrder.record.targetQty,
    completedQty,
    rejectedQty: workOrder.record.rejectedQty,
    yieldRate: Math.round((completedQty / Number(workOrder.record.targetQty ?? 1)) * 100),
    plannedCost,
    actualCost,
    variance,
    snapshotAt: input.releasedAt,
    status: "Submitted",
  };
  const createdReport = await adapter.create<FactoryRecord>({ collection: "FactoryProductionReport", data: report });
  return { workOrder: updatedWorkOrder, stockLedger, glEntries, report: createdReport.record };
}

async function loadWorkOrder(adapter: DataAdapter, workOrderId: string): Promise<LoadedWorkOrder> {
  const workOrder = await adapter.get<FactoryRecord>("WorkOrder", workOrderId);
  if (!workOrder) throw new DataError(`Work order "${workOrderId}" was not found`, "not_found");
  if (workOrder.record.companyId !== FACTORY_COMPANY_ID) {
    throw new DataError(`Work order "${workOrderId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return workOrder;
}

async function updateWorkOrder(adapter: DataAdapter, workOrder: LoadedWorkOrder, data: FactoryRecord): Promise<FactoryRecord> {
  const updated = await adapter.update<FactoryRecord>({
    collection: "WorkOrder",
    id: String(workOrder.record.id),
    version: workOrder.meta.version,
    data,
  });
  return updated.record;
}

async function createStockLedger(
  adapter: DataAdapter,
  input: { idPrefix: string; workOrderId: string; item: string; postingDate: string; quantity: number; value: number; status: string },
): Promise<FactoryRecord> {
  const id = await nextSequentialId(adapter, "FactoryStockLedger", input.idPrefix, 4);
  const created = await adapter.create<FactoryRecord>({
    collection: "FactoryStockLedger",
    data: {
      id,
      companyId: FACTORY_COMPANY_ID,
      workOrderId: input.workOrderId,
      item: input.item,
      postingDate: input.postingDate,
      quantity: input.quantity,
      value: roundMoney(input.value),
      status: input.status,
    },
  });
  return created.record;
}

interface GLVoucherInput {
  postingDate: string;
  voucherType: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<FactoryRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (debit !== credit) throw new DataError(`Unbalanced factory GL voucher "${input.voucherNo}"`, "validation");

  const entries: FactoryRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "FactoryGLEntry", `FACT-GL-${year}-`, 4);
    const created = await adapter.create<FactoryRecord>({
      collection: "FactoryGLEntry",
      data: {
        id,
        companyId: FACTORY_COMPANY_ID,
        postingDate: input.postingDate,
        account: line.account,
        party: input.party,
        voucherType: input.voucherType,
        voucherNo: input.voucherNo,
        debit: roundMoney(line.debit),
        credit: roundMoney(line.credit),
        status: "Posted",
      },
    });
    entries.push(created.record);
  }
  return entries;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<FactoryRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertFactoryCompany(companyId: string): void {
  if (companyId !== FACTORY_COMPANY_ID) {
    throw new DataError(`Factory service only supports "${FACTORY_COMPANY_ID}"`, "validation", { companyId: "Unsupported company" });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Factory field "${field}" must be a positive integer`, "validation", {
      [field]: "Must be a positive integer",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Factory amount "${field}" must be zero or greater`, "validation", { [field]: "Must be zero or greater" });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
