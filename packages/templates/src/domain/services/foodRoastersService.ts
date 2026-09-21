import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type FoodRoastersRecord = Record<string, unknown>;

interface LoadedGreenBeanContract {
  record: FoodRoastersRecord;
  meta: RecordMeta;
}

interface LoadedRoastingBatch {
  record: FoodRoastersRecord;
  meta: RecordMeta;
}

export interface CreateGreenBeanContractInput {
  companyId: string;
  origin: string;
  farmer: string;
  contractedKg: number;
  pricePerKg: number;
  contractDate: string;
}

export interface ReceiveGreenBeanLotInput {
  contractId: string;
  lotCode: string;
  profile: string;
  roasterOperator: string;
  receivedAt: string;
}

export interface RecordRoastLossInput {
  roastingBatchId: string;
  roastedWeightKg: number;
  energyCost: number;
  roastedAt: string;
}

export interface SubmitCuppingResultInput {
  roastingBatchId: string;
  cuppingScore: number;
  moisturePct: number;
  agtron: number;
  cuppedAt: string;
}

export interface PackageRoastedBatchInput {
  roastingBatchId: string;
  sku: string;
  bagCount: number;
  bagSizeGrams: number;
  packagedAt: string;
}

export interface RecordWholesaleSaleInput {
  roastingBatchId: string;
  customer: string;
  soldWeightKg: number;
  saleAmount: number;
  soldAt: string;
}

export interface ReceiveGreenBeanLotResult {
  batch: FoodRoastersRecord;
  stockLedger: FoodRoastersRecord;
  glEntries: FoodRoastersRecord[];
}

export interface PackageRoastedBatchResult {
  batch: FoodRoastersRecord;
  packaging: FoodRoastersRecord;
  stockLedger: FoodRoastersRecord;
  glEntries: FoodRoastersRecord[];
}

export interface RecordWholesaleSaleResult {
  batch: FoodRoastersRecord;
  sale: FoodRoastersRecord;
  stockLedger: FoodRoastersRecord;
  glEntries: FoodRoastersRecord[];
  report: FoodRoastersRecord;
}

const FOOD_ROASTERS_COMPANY_ID = "food-roasters";
const GREEN_BEAN_INVENTORY_ACCOUNT = "1152 - Green Bean Inventory";
const ROASTERY_WIP_ACCOUNT = "1162 - Roastery WIP";
const ROASTED_GOODS_ACCOUNT = "1172 - Roasted Coffee Inventory";
const ROASTERY_COGS_ACCOUNT = "5112 - Roastery COGS";
const WHOLESALE_REVENUE_ACCOUNT = "4112 - Wholesale Coffee Revenue";
const ACCOUNTS_RECEIVABLE_ACCOUNT = "1120 - Accounts Receivable";
const GRIR_ACCOUNT = "2115 - GR/IR Green Bean";

export async function createGreenBeanContract(
  adapter: DataAdapter,
  input: CreateGreenBeanContractInput,
): Promise<FoodRoastersRecord> {
  assertFoodRoastersCompany(input.companyId);
  if (!input.origin.trim()) throw new DataError("Green bean contract requires origin", "validation", { origin: "Required" });
  if (!input.farmer.trim()) throw new DataError("Green bean contract requires farmer", "validation", { farmer: "Required" });
  assertPositiveNumber(input.contractedKg, "contractedKg");
  assertMoney(input.pricePerKg, "pricePerKg");

  const year = input.contractDate.slice(0, 4);
  const id = await nextSequentialId(adapter, "GreenBeanContract", `GB-CON-${year}-`, 4);
  const contractValue = roundMoney(input.contractedKg * input.pricePerKg);
  const record: FoodRoastersRecord = {
    id,
    companyId: input.companyId,
    origin: input.origin,
    farmer: input.farmer,
    contractedKg: input.contractedKg,
    pricePerKg: roundMoney(input.pricePerKg),
    contractValue,
    receivedKg: 0,
    contractDate: input.contractDate,
    status: "Active",
  };
  const created = await adapter.create<FoodRoastersRecord>({ collection: "GreenBeanContract", data: record });
  return created.record;
}

export async function receiveGreenBeanLot(
  adapter: DataAdapter,
  input: ReceiveGreenBeanLotInput,
): Promise<ReceiveGreenBeanLotResult> {
  const contract = await loadGreenBeanContract(adapter, input.contractId);
  if (contract.record.status !== "Active") {
    throw new DataError(`Green bean contract "${input.contractId}" must be active before receipt`, "validation", {
      status: "Expected Active",
    });
  }
  if (!input.lotCode.trim()) throw new DataError("Green bean receipt requires lot code", "validation", { lotCode: "Required" });

  const greenWeightKg = Number(contract.record.contractedKg ?? 0);
  const greenCost = roundMoney(Number(contract.record.contractValue ?? 0));
  const batchId = await nextSequentialId(adapter, "RoastingBatch", "ROAST-", 4);
  const batch: FoodRoastersRecord = {
    id: batchId,
    companyId: FOOD_ROASTERS_COMPANY_ID,
    contractId: input.contractId,
    lotCode: input.lotCode,
    origin: contract.record.origin,
    profile: input.profile,
    greenWeightKg,
    roastedWeightKg: 0,
    greenCost,
    energyCost: 0,
    batchCost: greenCost,
    roastLossPct: 0,
    cuppingScore: 0,
    qcStatus: "Pending",
    moisturePct: 0,
    agtron: 0,
    roastDate: input.receivedAt,
    roasterOperator: input.roasterOperator,
    status: "Scheduled",
    route: `/app/food-roasters/edit/RoastingBatch/${batchId}`,
  };
  const createdBatch = await adapter.create<FoodRoastersRecord>({ collection: "RoastingBatch", data: batch });

  await adapter.update<FoodRoastersRecord>({
    collection: "GreenBeanContract",
    id: String(contract.record.id),
    version: contract.meta.version,
    data: { receivedKg: greenWeightKg, status: "Received" },
  });

  const stockLedger = await createStockLedger(adapter, {
    idPrefix: `ROAST-SLE-${input.receivedAt.slice(0, 4)}-`,
    roastingBatchId: batchId,
    item: String(contract.record.origin ?? ""),
    warehouse: "Green Bean Silo",
    postingDate: input.receivedAt,
    quantityKg: greenWeightKg,
    value: greenCost,
    status: "Green Bean Receipt",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.receivedAt,
    voucherType: "GreenBeanReceipt",
    voucherNo: batchId,
    party: String(contract.record.farmer ?? ""),
    lines: [
      { account: GREEN_BEAN_INVENTORY_ACCOUNT, debit: greenCost, credit: 0 },
      { account: GRIR_ACCOUNT, debit: 0, credit: greenCost },
    ],
  });
  return { batch: createdBatch.record, stockLedger, glEntries };
}

export async function recordRoastLoss(adapter: DataAdapter, input: RecordRoastLossInput): Promise<FoodRoastersRecord> {
  const batch = await loadRoastingBatch(adapter, input.roastingBatchId);
  if (batch.record.status !== "Scheduled") {
    throw new DataError(`Roasting batch "${input.roastingBatchId}" must be Scheduled before roasting`, "validation", {
      status: "Expected Scheduled",
    });
  }
  assertPositiveNumber(input.roastedWeightKg, "roastedWeightKg");
  assertMoney(input.energyCost, "energyCost");

  const greenWeightKg = Number(batch.record.greenWeightKg ?? 0);
  if (input.roastedWeightKg > greenWeightKg) {
    throw new DataError("Roasted weight cannot exceed green weight", "validation", { roastedWeightKg: "Exceeds green weight" });
  }
  const batchCost = roundMoney(Number(batch.record.greenCost ?? 0) + input.energyCost);
  const updated = await updateRoastingBatch(adapter, batch, {
    roastedWeightKg: input.roastedWeightKg,
    energyCost: roundMoney(input.energyCost),
    batchCost,
    roastLossPct: round1(((greenWeightKg - input.roastedWeightKg) / greenWeightKg) * 100),
    roastedAt: input.roastedAt,
    status: "Roasting",
  });
  return updated;
}

export async function submitCuppingResult(adapter: DataAdapter, input: SubmitCuppingResultInput): Promise<FoodRoastersRecord> {
  const batch = await loadRoastingBatch(adapter, input.roastingBatchId);
  if (batch.record.status !== "Roasting") {
    throw new DataError(`Roasting batch "${input.roastingBatchId}" must be Roasting before cupping`, "validation", {
      status: "Expected Roasting",
    });
  }
  assertPositiveNumber(input.cuppingScore, "cuppingScore");
  assertPositiveNumber(input.moisturePct, "moisturePct");
  assertPositiveNumber(input.agtron, "agtron");

  const passed = input.cuppingScore >= 84 && input.moisturePct <= 12;
  const updated = await updateRoastingBatch(adapter, batch, {
    cuppingScore: input.cuppingScore,
    moisturePct: input.moisturePct,
    agtron: input.agtron,
    qcStatus: passed ? "Passed" : "Hold",
    cuppedAt: input.cuppedAt,
    status: passed ? "Cupping Passed" : "Roasting",
  });
  return updated;
}

export async function packageRoastedBatch(
  adapter: DataAdapter,
  input: PackageRoastedBatchInput,
): Promise<PackageRoastedBatchResult> {
  const batch = await loadRoastingBatch(adapter, input.roastingBatchId);
  if (batch.record.status !== "Cupping Passed") {
    throw new DataError(`Roasting batch "${input.roastingBatchId}" must pass cupping before packaging`, "validation", {
      status: "Expected Cupping Passed",
    });
  }
  if (!input.sku.trim()) throw new DataError("Packaging requires SKU", "validation", { sku: "Required" });
  assertPositiveInteger(input.bagCount, "bagCount");
  assertPositiveInteger(input.bagSizeGrams, "bagSizeGrams");

  const packagedWeightKg = round2((input.bagCount * input.bagSizeGrams) / 1000);
  if (packagedWeightKg > Number(batch.record.roastedWeightKg ?? 0)) {
    throw new DataError("Packaged weight cannot exceed roasted weight", "validation", { packagedWeightKg: "Exceeds roasted weight" });
  }

  const year = input.packagedAt.slice(0, 4);
  const packagingId = await nextSequentialId(adapter, "RoasteryPackaging", `ROAST-PACK-${year}-`, 4);
  const packaging: FoodRoastersRecord = {
    id: packagingId,
    companyId: FOOD_ROASTERS_COMPANY_ID,
    roastingBatchId: input.roastingBatchId,
    sku: input.sku,
    bagCount: input.bagCount,
    bagSizeGrams: input.bagSizeGrams,
    packagedWeightKg,
    packagedAt: input.packagedAt,
    status: "Completed",
  };
  const createdPackaging = await adapter.create<FoodRoastersRecord>({ collection: "RoasteryPackaging", data: packaging });
  const batchCost = roundMoney(Number(batch.record.batchCost ?? 0));
  const stockLedger = await createStockLedger(adapter, {
    idPrefix: `ROAST-SLE-${year}-`,
    roastingBatchId: input.roastingBatchId,
    item: input.sku,
    warehouse: "Finished Goods",
    postingDate: input.packagedAt,
    quantityKg: packagedWeightKg,
    value: batchCost,
    status: "Finished Goods Receipt",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.packagedAt,
    voucherType: "RoasteryFinishedGoods",
    voucherNo: input.roastingBatchId,
    party: input.sku,
    lines: [
      { account: ROASTED_GOODS_ACCOUNT, debit: batchCost, credit: 0 },
      { account: ROASTERY_WIP_ACCOUNT, debit: 0, credit: batchCost },
    ],
  });
  const updatedBatch = await updateRoastingBatch(adapter, batch, {
    packagingId,
    sku: input.sku,
    bagCount: input.bagCount,
    bagSizeGrams: input.bagSizeGrams,
    packagedWeightKg,
    packagedAt: input.packagedAt,
    status: "Packaged",
  });
  return { batch: updatedBatch, packaging: createdPackaging.record, stockLedger, glEntries };
}

export async function recordWholesaleSale(
  adapter: DataAdapter,
  input: RecordWholesaleSaleInput,
): Promise<RecordWholesaleSaleResult> {
  const batch = await loadRoastingBatch(adapter, input.roastingBatchId);
  if (batch.record.status !== "Packaged") {
    throw new DataError(`Roasting batch "${input.roastingBatchId}" must be Packaged before wholesale sale`, "validation", {
      status: "Expected Packaged",
    });
  }
  if (!input.customer.trim()) throw new DataError("Wholesale sale requires customer", "validation", { customer: "Required" });
  assertPositiveNumber(input.soldWeightKg, "soldWeightKg");
  assertMoney(input.saleAmount, "saleAmount");

  const packagedWeightKg = Number(batch.record.packagedWeightKg ?? 0);
  if (input.soldWeightKg > packagedWeightKg) {
    throw new DataError("Sold weight cannot exceed packaged weight", "validation", { soldWeightKg: "Exceeds packaged weight" });
  }

  const year = input.soldAt.slice(0, 4);
  const cogs = roundMoney((Number(batch.record.batchCost ?? 0) * input.soldWeightKg) / packagedWeightKg);
  const grossMargin = roundMoney(input.saleAmount - cogs);
  const saleId = await nextSequentialId(adapter, "RoasteryWholesaleSale", `ROAST-SALE-${year}-`, 4);
  const sale: FoodRoastersRecord = {
    id: saleId,
    companyId: FOOD_ROASTERS_COMPANY_ID,
    roastingBatchId: input.roastingBatchId,
    customer: input.customer,
    sku: batch.record.sku,
    soldWeightKg: input.soldWeightKg,
    saleAmount: roundMoney(input.saleAmount),
    cogs,
    grossMargin,
    soldAt: input.soldAt,
    status: "Submitted",
  };
  const createdSale = await adapter.create<FoodRoastersRecord>({ collection: "RoasteryWholesaleSale", data: sale });
  const stockLedger = await createStockLedger(adapter, {
    idPrefix: `ROAST-SLE-${year}-`,
    roastingBatchId: input.roastingBatchId,
    item: String(batch.record.sku ?? ""),
    warehouse: "Finished Goods",
    postingDate: input.soldAt,
    quantityKg: -input.soldWeightKg,
    value: -cogs,
    status: "COGS Issue",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.soldAt,
    voucherType: "WholesaleSale",
    voucherNo: saleId,
    party: input.customer,
    lines: [
      { account: ACCOUNTS_RECEIVABLE_ACCOUNT, debit: roundMoney(input.saleAmount), credit: 0 },
      { account: ROASTERY_COGS_ACCOUNT, debit: cogs, credit: 0 },
      { account: WHOLESALE_REVENUE_ACCOUNT, debit: 0, credit: roundMoney(input.saleAmount) },
      { account: ROASTED_GOODS_ACCOUNT, debit: 0, credit: cogs },
    ],
  });
  const reportId = await nextSequentialId(adapter, "RoasteryMarginReport", `ROAST-RPT-${year}-`, 4);
  const report: FoodRoastersRecord = {
    id: reportId,
    companyId: FOOD_ROASTERS_COMPANY_ID,
    roastingBatchId: input.roastingBatchId,
    origin: batch.record.origin,
    sku: batch.record.sku,
    customer: input.customer,
    greenWeightKg: batch.record.greenWeightKg,
    roastedWeightKg: batch.record.roastedWeightKg,
    soldWeightKg: input.soldWeightKg,
    yieldRate: round1((Number(batch.record.roastedWeightKg ?? 0) / Number(batch.record.greenWeightKg ?? 1)) * 100),
    batchCost: Number(batch.record.batchCost ?? 0),
    saleAmount: roundMoney(input.saleAmount),
    cogs,
    grossMargin,
    snapshotAt: input.soldAt,
    status: "Submitted",
  };
  const createdReport = await adapter.create<FoodRoastersRecord>({ collection: "RoasteryMarginReport", data: report });
  const updatedBatch = await updateRoastingBatch(adapter, batch, {
    saleId,
    soldWeightKg: input.soldWeightKg,
    saleAmount: roundMoney(input.saleAmount),
    cogs,
    grossMargin,
    soldAt: input.soldAt,
  });
  return { batch: updatedBatch, sale: createdSale.record, stockLedger, glEntries, report: createdReport.record };
}

async function loadGreenBeanContract(adapter: DataAdapter, contractId: string): Promise<LoadedGreenBeanContract> {
  const contract = await adapter.get<FoodRoastersRecord>("GreenBeanContract", contractId);
  if (!contract) throw new DataError(`Green bean contract "${contractId}" was not found`, "not_found");
  if (contract.record.companyId !== FOOD_ROASTERS_COMPANY_ID) {
    throw new DataError(`Green bean contract "${contractId}" belongs to another company`, "validation", {
      companyId: "Wrong company",
    });
  }
  return contract;
}

async function loadRoastingBatch(adapter: DataAdapter, roastingBatchId: string): Promise<LoadedRoastingBatch> {
  const batch = await adapter.get<FoodRoastersRecord>("RoastingBatch", roastingBatchId);
  if (!batch) throw new DataError(`Roasting batch "${roastingBatchId}" was not found`, "not_found");
  if (batch.record.companyId !== FOOD_ROASTERS_COMPANY_ID) {
    throw new DataError(`Roasting batch "${roastingBatchId}" belongs to another company`, "validation", {
      companyId: "Wrong company",
    });
  }
  return batch;
}

async function updateRoastingBatch(
  adapter: DataAdapter,
  batch: LoadedRoastingBatch,
  data: FoodRoastersRecord,
): Promise<FoodRoastersRecord> {
  const updated = await adapter.update<FoodRoastersRecord>({
    collection: "RoastingBatch",
    id: String(batch.record.id),
    version: batch.meta.version,
    data,
  });
  return updated.record;
}

async function createStockLedger(
  adapter: DataAdapter,
  input: {
    idPrefix: string;
    roastingBatchId: string;
    item: string;
    warehouse: string;
    postingDate: string;
    quantityKg: number;
    value: number;
    status: string;
  },
): Promise<FoodRoastersRecord> {
  const id = await nextSequentialId(adapter, "RoasteryStockLedger", input.idPrefix, 4);
  const created = await adapter.create<FoodRoastersRecord>({
    collection: "RoasteryStockLedger",
    data: {
      id,
      companyId: FOOD_ROASTERS_COMPANY_ID,
      roastingBatchId: input.roastingBatchId,
      item: input.item,
      warehouse: input.warehouse,
      postingDate: input.postingDate,
      quantityKg: input.quantityKg,
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

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<FoodRoastersRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (roundMoney(debit) !== roundMoney(credit)) throw new DataError(`Unbalanced roastery GL voucher "${input.voucherNo}"`, "validation");

  const entries: FoodRoastersRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "RoasteryGLEntry", `ROAST-GL-${year}-`, 4);
    const created = await adapter.create<FoodRoastersRecord>({
      collection: "RoasteryGLEntry",
      data: {
        id,
        companyId: FOOD_ROASTERS_COMPANY_ID,
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
  const result = await adapter.query<FoodRoastersRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertFoodRoastersCompany(companyId: string): void {
  if (companyId !== FOOD_ROASTERS_COMPANY_ID) {
    throw new DataError(`Food roasters service only supports "${FOOD_ROASTERS_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Food roasters field "${field}" must be a positive integer`, "validation", {
      [field]: "Must be a positive integer",
    });
  }
}

function assertPositiveNumber(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DataError(`Food roasters field "${field}" must be a positive number`, "validation", {
      [field]: "Must be a positive number",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Food roasters amount "${field}" must be zero or greater`, "validation", {
      [field]: "Must be zero or greater",
    });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
