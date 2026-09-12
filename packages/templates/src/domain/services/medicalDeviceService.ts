import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type MedicalDeviceRecord = Record<string, unknown>;

interface LoadedRecord {
  record: MedicalDeviceRecord;
  meta: RecordMeta;
}

export interface CreateDeviceMasterRecordInput {
  companyId: string;
  deviceName: string;
  riskClass: string;
  udiDi: string;
  revision: string;
  effectiveDate: string;
}

export interface CreateDeviceBatchDHRInput {
  companyId: string;
  dmrId: string;
  batchQty: number;
  unitCost: number;
  manufacturingDate: string;
  cleanroomClass: string;
}

export interface PassCleanroomInspectionInput {
  batchId: string;
  particleCount: number;
  bioburdenCfu: number;
  inspectedBy: string;
  inspectedAt: string;
}

export interface CompleteSterilizationCycleInput {
  batchId: string;
  chamber: string;
  temperatureC: number;
  durationMinutes: number;
  biologicalIndicator: string;
  sterilizedAt: string;
}

export interface OpenCAPAForBatchInput {
  batchId: string;
  issue: string;
  severity: string;
  owner: string;
  openedAt: string;
}

export interface CloseCAPAForBatchInput {
  capaId: string;
  resolution: string;
  closedAt: string;
}

export interface ReleaseDeviceBatchQAInput {
  batchId: string;
  releasedBy: string;
  releasedAt: string;
}

export interface DeviceBatchDHRResult {
  batch: MedicalDeviceRecord;
  dhr: MedicalDeviceRecord;
}

export interface CleanroomInspectionResult {
  batch: MedicalDeviceRecord;
  inspection: MedicalDeviceRecord;
}

export interface SterilizationCycleResult {
  batch: MedicalDeviceRecord;
  cycle: MedicalDeviceRecord;
}

export interface CAPAResult {
  batch: MedicalDeviceRecord;
  capa: MedicalDeviceRecord;
}

export interface QAReleaseResult {
  batch: MedicalDeviceRecord;
  release: MedicalDeviceRecord;
  trace: MedicalDeviceRecord;
  glEntries: MedicalDeviceRecord[];
}

const MEDICAL_DEVICE_COMPANY_ID = "medical-device";
const FG_ACCOUNT = "1315 - Finished Goods Medical Devices";
const WIP_ACCOUNT = "1325 - WIP Medical Devices";

export async function createDeviceMasterRecord(
  adapter: DataAdapter,
  input: CreateDeviceMasterRecordInput,
): Promise<MedicalDeviceRecord> {
  assertMedicalDeviceCompany(input.companyId);
  if (!input.deviceName.trim()) throw new DataError("DMR requires device name", "validation", { deviceName: "Required" });
  if (!input.udiDi.trim()) throw new DataError("DMR requires UDI-DI", "validation", { udiDi: "Required" });

  const id = await nextSequentialId(adapter, "DeviceMasterRecord", "DMR-MD-", 4);
  const record: MedicalDeviceRecord = {
    id,
    companyId: input.companyId,
    deviceName: input.deviceName,
    riskClass: input.riskClass,
    udiDi: input.udiDi,
    revision: input.revision,
    effectiveDate: input.effectiveDate,
    status: "Effective",
  };
  const created = await adapter.create<MedicalDeviceRecord>({ collection: "DeviceMasterRecord", data: record });
  return created.record;
}

export async function createDeviceBatchDHR(
  adapter: DataAdapter,
  input: CreateDeviceBatchDHRInput,
): Promise<DeviceBatchDHRResult> {
  assertMedicalDeviceCompany(input.companyId);
  assertPositiveInteger(input.batchQty, "batchQty");
  assertMoney(input.unitCost, "unitCost");
  const dmr = await loadDMR(adapter, input.dmrId);
  const batchId = await nextSequentialId(adapter, "DeviceBatch", "LOT-MD-", 4);
  const year = input.manufacturingDate.slice(0, 4);
  const dhrId = await nextSequentialId(adapter, "DeviceHistoryRecord", `DHR-MD-${year}-`, 4);
  const udiCode = `(01)${dmr.record.udiDi}(10)${batchId}`;
  const dhr: MedicalDeviceRecord = {
    id: dhrId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    dmrId: input.dmrId,
    batchId,
    deviceName: dmr.record.deviceName,
    revision: dmr.record.revision,
    manufacturingDate: input.manufacturingDate,
    status: "Draft",
  };
  const createdDHR = await adapter.create<MedicalDeviceRecord>({ collection: "DeviceHistoryRecord", data: dhr });
  const batch: MedicalDeviceRecord = {
    id: batchId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    dmrId: input.dmrId,
    dhrId,
    deviceName: dmr.record.deviceName,
    riskClass: dmr.record.riskClass,
    batchQty: input.batchQty,
    unitCost: input.unitCost,
    udiCode,
    cleanroomClass: input.cleanroomClass,
    sterilizationMethod: "Ethylene Oxide (EtO)",
    manufacturingDate: input.manufacturingDate,
    qaHold: false,
    dhrApproved: false,
    status: "In Assembly",
    route: `/app/medical-device/edit/DeviceBatch/${batchId}`,
  };
  const createdBatch = await adapter.create<MedicalDeviceRecord>({ collection: "DeviceBatch", data: batch });
  return { batch: createdBatch.record, dhr: createdDHR.record };
}

export async function passCleanroomInspection(
  adapter: DataAdapter,
  input: PassCleanroomInspectionInput,
): Promise<CleanroomInspectionResult> {
  const batch = await loadBatch(adapter, input.batchId);
  assertBatchStatus(batch, "In Assembly");
  assertPositiveInteger(input.particleCount, "particleCount");
  assertPositiveInteger(input.bioburdenCfu, "bioburdenCfu");
  const year = input.inspectedAt.slice(0, 4);
  const inspectionId = await nextSequentialId(adapter, "CleanroomInspection", `CLN-MD-${year}-`, 4);
  const inspection: MedicalDeviceRecord = {
    id: inspectionId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    batchId: input.batchId,
    particleCount: input.particleCount,
    bioburdenCfu: input.bioburdenCfu,
    inspectedBy: input.inspectedBy,
    inspectedAt: input.inspectedAt,
    status: "Passed",
  };
  const createdInspection = await adapter.create<MedicalDeviceRecord>({ collection: "CleanroomInspection", data: inspection });
  const updatedBatch = await updateBatch(adapter, batch, {
    cleanroomInspectionId: inspectionId,
    particleCount: input.particleCount,
    bioburdenCfu: input.bioburdenCfu,
    status: "Cleanroom Passed",
  });
  return { batch: updatedBatch, inspection: createdInspection.record };
}

export async function completeSterilizationCycle(
  adapter: DataAdapter,
  input: CompleteSterilizationCycleInput,
): Promise<SterilizationCycleResult> {
  const batch = await loadBatch(adapter, input.batchId);
  assertBatchStatus(batch, "Cleanroom Passed");
  assertMoney(input.temperatureC, "temperatureC");
  assertPositiveInteger(input.durationMinutes, "durationMinutes");
  if (!input.biologicalIndicator.trim()) {
    throw new DataError("Sterilization requires biological indicator result", "validation", { biologicalIndicator: "Required" });
  }
  const year = input.sterilizedAt.slice(0, 4);
  const cycleId = await nextSequentialId(adapter, "SterilizationCycle", `ETO-MD-${year}-`, 4);
  const cycle: MedicalDeviceRecord = {
    id: cycleId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    batchId: input.batchId,
    chamber: input.chamber,
    temperatureC: input.temperatureC,
    durationMinutes: input.durationMinutes,
    biologicalIndicator: input.biologicalIndicator,
    sterilizedAt: input.sterilizedAt,
    status: "Passed",
  };
  const createdCycle = await adapter.create<MedicalDeviceRecord>({ collection: "SterilizationCycle", data: cycle });
  const updatedBatch = await updateBatch(adapter, batch, {
    sterilizationCycleId: cycleId,
    sterilizedAt: input.sterilizedAt,
    status: "Sterilization Passed",
  });
  return { batch: updatedBatch, cycle: createdCycle.record };
}

export async function openCAPAForBatch(adapter: DataAdapter, input: OpenCAPAForBatchInput): Promise<CAPAResult> {
  const batch = await loadBatch(adapter, input.batchId);
  if (batch.record.status === "QA Released") {
    throw new DataError(`Batch "${input.batchId}" is already released`, "validation", { status: "Already released" });
  }
  if (!input.issue.trim()) throw new DataError("CAPA requires issue", "validation", { issue: "Required" });
  const year = input.openedAt.slice(0, 4);
  const capaId = await nextSequentialId(adapter, "MedicalDeviceCAPA", `CAPA-MD-${year}-`, 4);
  const capa: MedicalDeviceRecord = {
    id: capaId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    batchId: input.batchId,
    issue: input.issue,
    severity: input.severity,
    owner: input.owner,
    openedAt: input.openedAt,
    status: "Open",
  };
  const createdCAPA = await adapter.create<MedicalDeviceRecord>({ collection: "MedicalDeviceCAPA", data: capa });
  const updatedBatch = await updateBatch(adapter, batch, { capaId, qaHold: true });
  return { batch: updatedBatch, capa: createdCAPA.record };
}

export async function closeCAPAForBatch(adapter: DataAdapter, input: CloseCAPAForBatchInput): Promise<CAPAResult> {
  const capa = await loadCAPA(adapter, input.capaId);
  if (!input.resolution.trim()) throw new DataError("CAPA closure requires resolution", "validation", { resolution: "Required" });
  const updatedCAPA = await adapter.update<MedicalDeviceRecord>({
    collection: "MedicalDeviceCAPA",
    id: input.capaId,
    version: capa.meta.version,
    data: { resolution: input.resolution, closedAt: input.closedAt, status: "Closed" },
  });
  const batch = await loadBatch(adapter, String(capa.record.batchId));
  const updatedBatch = await updateBatch(adapter, batch, { qaHold: false, capaId: "" });
  return { batch: updatedBatch, capa: updatedCAPA.record };
}

export async function releaseDeviceBatchQA(adapter: DataAdapter, input: ReleaseDeviceBatchQAInput): Promise<QAReleaseResult> {
  const batch = await loadBatch(adapter, input.batchId);
  assertBatchStatus(batch, "Sterilization Passed");
  if (batch.record.qaHold === true || batch.record.qaHold === "true") {
    throw new DataError(`Cannot release batch "${input.batchId}" with open CAPA`, "validation", { qaHold: "Open CAPA" });
  }
  await assertNoOpenCAPA(adapter, input.batchId);

  const year = input.releasedAt.slice(0, 4);
  const releaseId = await nextSequentialId(adapter, "QARelease", `QA-MD-${year}-`, 4);
  const traceId = await nextSequentialId(adapter, "UDITraceEvent", `UDI-MD-${year}-`, 4);
  const value = roundMoney(Number(batch.record.batchQty ?? 0) * Number(batch.record.unitCost ?? 0));
  const release: MedicalDeviceRecord = {
    id: releaseId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    batchId: input.batchId,
    dhrId: batch.record.dhrId,
    releasedBy: input.releasedBy,
    releasedAt: input.releasedAt,
    releaseValue: value,
    status: "Released",
  };
  const trace: MedicalDeviceRecord = {
    id: traceId,
    companyId: MEDICAL_DEVICE_COMPANY_ID,
    batchId: input.batchId,
    lotNo: input.batchId,
    udiCode: batch.record.udiCode,
    deviceName: batch.record.deviceName,
    batchQty: batch.record.batchQty,
    tracedAt: input.releasedAt,
    status: "Traceable",
  };
  const [createdRelease, createdTrace] = await Promise.all([
    adapter.create<MedicalDeviceRecord>({ collection: "QARelease", data: release }),
    adapter.create<MedicalDeviceRecord>({ collection: "UDITraceEvent", data: trace }),
  ]);
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.releasedAt,
    voucherNo: releaseId,
    party: String(batch.record.deviceName ?? ""),
    lines: [
      { account: FG_ACCOUNT, debit: value, credit: 0 },
      { account: WIP_ACCOUNT, debit: 0, credit: value },
    ],
  });
  const updatedBatch = await updateBatch(adapter, batch, {
    qaReleaseId: releaseId,
    udiTraceId: traceId,
    dhrApproved: true,
    releasedAt: input.releasedAt,
    status: "QA Released",
  });
  await closeDHRIfPresent(adapter, batch, input.releasedAt);
  return { batch: updatedBatch, release: createdRelease.record, trace: createdTrace.record, glEntries };
}

async function loadDMR(adapter: DataAdapter, dmrId: string): Promise<LoadedRecord> {
  const dmr = await adapter.get<MedicalDeviceRecord>("DeviceMasterRecord", dmrId);
  if (!dmr) throw new DataError(`Device Master Record "${dmrId}" was not found`, "not_found");
  if (dmr.record.companyId !== MEDICAL_DEVICE_COMPANY_ID) {
    throw new DataError(`Device Master Record "${dmrId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return dmr;
}

async function loadBatch(adapter: DataAdapter, batchId: string): Promise<LoadedRecord> {
  const batch = await adapter.get<MedicalDeviceRecord>("DeviceBatch", batchId);
  if (!batch) throw new DataError(`Device batch "${batchId}" was not found`, "not_found");
  if (batch.record.companyId !== MEDICAL_DEVICE_COMPANY_ID) {
    throw new DataError(`Device batch "${batchId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return batch;
}

async function loadCAPA(adapter: DataAdapter, capaId: string): Promise<LoadedRecord> {
  const capa = await adapter.get<MedicalDeviceRecord>("MedicalDeviceCAPA", capaId);
  if (!capa) throw new DataError(`Medical Device CAPA "${capaId}" was not found`, "not_found");
  return capa;
}

async function updateBatch(adapter: DataAdapter, batch: LoadedRecord, data: MedicalDeviceRecord): Promise<MedicalDeviceRecord> {
  const updated = await adapter.update<MedicalDeviceRecord>({
    collection: "DeviceBatch",
    id: String(batch.record.id),
    version: batch.meta.version,
    data,
  });
  return updated.record;
}

async function assertNoOpenCAPA(adapter: DataAdapter, batchId: string): Promise<void> {
  const open = await adapter.query<MedicalDeviceRecord>({
    collection: "MedicalDeviceCAPA",
    filters: [
      { field: "batchId", op: "eq", value: batchId },
      { field: "status", op: "eq", value: "Open" },
    ],
  });
  if (open.rows.length > 0) {
    throw new DataError(`Cannot release batch "${batchId}" with open CAPA`, "validation", { capa: "Open CAPA" });
  }
}

async function closeDHRIfPresent(adapter: DataAdapter, batch: LoadedRecord, releasedAt: string): Promise<void> {
  const dhrId = String(batch.record.dhrId ?? "");
  if (!dhrId) return;
  const dhr = await adapter.get<MedicalDeviceRecord>("DeviceHistoryRecord", dhrId);
  if (!dhr) return;
  await adapter.update<MedicalDeviceRecord>({
    collection: "DeviceHistoryRecord",
    id: dhrId,
    version: dhr.meta.version,
    data: { releasedAt, status: "Released" },
  });
}

interface GLVoucherInput {
  postingDate: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<MedicalDeviceRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (roundMoney(debit) !== roundMoney(credit)) {
    throw new DataError(`Unbalanced medical device GL voucher "${input.voucherNo}"`, "validation");
  }

  const entries: MedicalDeviceRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "MedicalDeviceGLEntry", `MD-GL-${year}-`, 4);
    const created = await adapter.create<MedicalDeviceRecord>({
      collection: "MedicalDeviceGLEntry",
      data: {
        id,
        companyId: MEDICAL_DEVICE_COMPANY_ID,
        postingDate: input.postingDate,
        account: line.account,
        party: input.party,
        voucherType: "QARelease",
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
  const result = await adapter.query<MedicalDeviceRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertMedicalDeviceCompany(companyId: string): void {
  if (companyId !== MEDICAL_DEVICE_COMPANY_ID) {
    throw new DataError(`Medical device service only supports "${MEDICAL_DEVICE_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
}

function assertBatchStatus(batch: LoadedRecord, expected: string): void {
  if (batch.record.status !== expected) {
    throw new DataError(`Device batch "${batch.record.id}" must be "${expected}"`, "validation", { status: `Expected ${expected}` });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Medical device amount "${field}" must be zero or greater`, "validation", { [field]: "Must be zero or greater" });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Medical device field "${field}" must be a positive integer`, "validation", {
      [field]: "Must be a positive integer",
    });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
