import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type EPCRecord = Record<string, unknown>;

interface LoadedMilestone {
  record: EPCRecord;
  meta: RecordMeta;
}

export interface CreateProjectWBSInput {
  companyId: string;
  projectCode: string;
  projectName: string;
  milestoneName: string;
  weightPercentage: number;
  contractValue: number;
  estimatedCost: number;
  startDate: string;
}

export interface UpdateProjectProgressInput {
  milestoneId: string;
  actualProgress: number;
  costIncurred: number;
  updatedAt: string;
}

export interface CertifyPercentageOfCompletionInput {
  milestoneId: string;
  certifiedProgress: number;
  certifiedBy: string;
  certifiedAt: string;
}

export interface SubmitProgressBillingInput {
  milestoneId: string;
  retentionRate: number;
  invoiceDate: string;
  dueDate: string;
}

export interface VerifyMilestoneBASTInput {
  milestoneId: string;
  bastNo: string;
  verifiedAt: string;
}

export interface CertifyPercentageOfCompletionResult {
  milestone: EPCRecord;
  certification: EPCRecord;
  glEntries: EPCRecord[];
}

export interface SubmitProgressBillingResult {
  milestone: EPCRecord;
  billing: EPCRecord;
  glEntries: EPCRecord[];
}

export interface VerifyMilestoneBASTResult {
  milestone: EPCRecord;
  retentionRelease: EPCRecord;
  glEntries: EPCRecord[];
  report: EPCRecord;
}

const EPC_COMPANY_ID = "epc-contractor";
const CONTRACT_ASSET_ACCOUNT = "1135 - Contract Asset Unbilled";
const ACCOUNTS_RECEIVABLE_ACCOUNT = "1120 - Accounts Receivable";
const RETENTION_RECEIVABLE_ACCOUNT = "1136 - Retention Receivable";
const POC_REVENUE_ACCOUNT = "4105 - PoC Construction Revenue";

export async function createProjectWBS(adapter: DataAdapter, input: CreateProjectWBSInput): Promise<EPCRecord> {
  assertEPCCompany(input.companyId);
  if (!input.projectCode.trim()) throw new DataError("EPC milestone requires project code", "validation", { projectCode: "Required" });
  if (!input.projectName.trim()) throw new DataError("EPC milestone requires project name", "validation", { projectName: "Required" });
  if (!input.milestoneName.trim()) throw new DataError("EPC milestone requires milestone name", "validation", { milestoneName: "Required" });
  assertPercent(input.weightPercentage, "weightPercentage");
  assertMoney(input.contractValue, "contractValue");
  assertMoney(input.estimatedCost, "estimatedCost");

  const id = await nextSequentialId(adapter, "ProjectMilestone", "MLS-", 4);
  const record: EPCRecord = {
    id,
    companyId: input.companyId,
    projectCode: input.projectCode,
    projectName: input.projectName,
    milestoneName: input.milestoneName,
    weightPercentage: input.weightPercentage,
    actualProgress: 0,
    certifiedProgress: 0,
    contractValue: roundMoney(input.contractValue),
    estimatedCost: roundMoney(input.estimatedCost),
    costIncurred: 0,
    revenueRecognized: 0,
    margin: 0,
    retentionAmount: 0,
    netBillable: 0,
    date: input.startDate,
    status: "In Progress",
    route: `/app/epc-contractor/edit/ProjectMilestone/${id}`,
  };
  const created = await adapter.create<EPCRecord>({ collection: "ProjectMilestone", data: record });
  return created.record;
}

export async function updateProjectProgress(adapter: DataAdapter, input: UpdateProjectProgressInput): Promise<EPCRecord> {
  const milestone = await loadMilestone(adapter, input.milestoneId);
  if (milestone.record.status !== "In Progress") {
    throw new DataError(`Milestone "${input.milestoneId}" must be In Progress before progress update`, "validation", {
      status: "Expected In Progress",
    });
  }
  assertPercent(input.actualProgress, "actualProgress");
  assertMoney(input.costIncurred, "costIncurred");

  const updated = await updateMilestone(adapter, milestone, {
    actualProgress: input.actualProgress,
    costIncurred: roundMoney(input.costIncurred),
    progressUpdatedAt: input.updatedAt,
    status: input.actualProgress >= 60 ? "On Schedule" : "In Progress",
  });
  return updated;
}

export async function certifyPercentageOfCompletion(
  adapter: DataAdapter,
  input: CertifyPercentageOfCompletionInput,
): Promise<CertifyPercentageOfCompletionResult> {
  const milestone = await loadMilestone(adapter, input.milestoneId);
  if (milestone.record.status !== "On Schedule") {
    throw new DataError(`Milestone "${input.milestoneId}" must be On Schedule before PoC certification`, "validation", {
      status: "Expected On Schedule",
    });
  }
  assertPercent(input.certifiedProgress, "certifiedProgress");
  if (input.certifiedProgress > Number(milestone.record.actualProgress ?? 0)) {
    throw new DataError("Certified progress cannot exceed actual progress", "validation", { certifiedProgress: "Exceeds actual progress" });
  }
  if (!input.certifiedBy.trim()) throw new DataError("PoC certification requires certifier", "validation", { certifiedBy: "Required" });

  const year = input.certifiedAt.slice(0, 4);
  const revenueRecognized = roundMoney(Number(milestone.record.contractValue ?? 0) * (input.certifiedProgress / 100));
  const margin = roundMoney(revenueRecognized - Number(milestone.record.costIncurred ?? 0));
  const certificationId = await nextSequentialId(adapter, "EPCCertification", `EPC-POC-${year}-`, 4);
  const certification: EPCRecord = {
    id: certificationId,
    companyId: EPC_COMPANY_ID,
    milestoneId: input.milestoneId,
    certifiedProgress: input.certifiedProgress,
    certifiedBy: input.certifiedBy,
    certifiedAt: input.certifiedAt,
    revenueRecognized,
    costIncurred: milestone.record.costIncurred,
    margin,
    status: "Certified",
  };
  const createdCertification = await adapter.create<EPCRecord>({ collection: "EPCCertification", data: certification });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.certifiedAt,
    voucherType: "PoCCertification",
    voucherNo: certificationId,
    party: String(milestone.record.projectName ?? ""),
    lines: [
      { account: CONTRACT_ASSET_ACCOUNT, debit: revenueRecognized, credit: 0 },
      { account: POC_REVENUE_ACCOUNT, debit: 0, credit: revenueRecognized },
    ],
  });
  const updatedMilestone = await updateMilestone(adapter, milestone, {
    certifiedProgress: input.certifiedProgress,
    certifiedBy: input.certifiedBy,
    certifiedAt: input.certifiedAt,
    certificationId,
    revenueRecognized,
    margin,
    status: "Certified PoC",
  });
  return { milestone: updatedMilestone, certification: createdCertification.record, glEntries };
}

export async function submitProgressBilling(
  adapter: DataAdapter,
  input: SubmitProgressBillingInput,
): Promise<SubmitProgressBillingResult> {
  const milestone = await loadMilestone(adapter, input.milestoneId);
  if (milestone.record.status !== "Certified PoC") {
    throw new DataError(`Milestone "${input.milestoneId}" must be Certified PoC before billing`, "validation", {
      status: "Expected Certified PoC",
    });
  }
  assertPercent(input.retentionRate, "retentionRate");

  const year = input.invoiceDate.slice(0, 4);
  const grossAmount = roundMoney(Number(milestone.record.revenueRecognized ?? 0));
  const retentionAmount = roundMoney(grossAmount * (input.retentionRate / 100));
  const netBillable = roundMoney(grossAmount - retentionAmount);
  const billingId = await nextSequentialId(adapter, "EPCProgressBilling", `EPC-PB-${year}-`, 4);
  const billing: EPCRecord = {
    id: billingId,
    companyId: EPC_COMPANY_ID,
    milestoneId: input.milestoneId,
    projectCode: milestone.record.projectCode,
    grossAmount,
    retentionRate: input.retentionRate,
    retentionAmount,
    netBillable,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    status: "Submitted",
  };
  const createdBilling = await adapter.create<EPCRecord>({ collection: "EPCProgressBilling", data: billing });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.invoiceDate,
    voucherType: "ProgressBilling",
    voucherNo: billingId,
    party: String(milestone.record.projectName ?? ""),
    lines: [
      { account: ACCOUNTS_RECEIVABLE_ACCOUNT, debit: netBillable, credit: 0 },
      { account: RETENTION_RECEIVABLE_ACCOUNT, debit: retentionAmount, credit: 0 },
      { account: CONTRACT_ASSET_ACCOUNT, debit: 0, credit: grossAmount },
    ],
  });
  const updatedMilestone = await updateMilestone(adapter, milestone, {
    billingId,
    retentionRate: input.retentionRate,
    retentionAmount,
    netBillable,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    status: "Billed",
  });
  return { milestone: updatedMilestone, billing: createdBilling.record, glEntries };
}

export async function verifyMilestoneBAST(adapter: DataAdapter, input: VerifyMilestoneBASTInput): Promise<VerifyMilestoneBASTResult> {
  const milestone = await loadMilestone(adapter, input.milestoneId);
  if (milestone.record.status !== "Billed") {
    throw new DataError(`Milestone "${input.milestoneId}" must be Billed before BAST`, "validation", {
      status: "Expected Billed",
    });
  }
  if (!input.bastNo.trim()) throw new DataError("BAST requires document number", "validation", { bastNo: "Required" });

  const year = input.verifiedAt.slice(0, 4);
  const retentionAmount = roundMoney(Number(milestone.record.retentionAmount ?? 0));
  const releaseId = await nextSequentialId(adapter, "EPCRetentionRelease", `EPC-RET-${year}-`, 4);
  const retentionRelease: EPCRecord = {
    id: releaseId,
    companyId: EPC_COMPANY_ID,
    milestoneId: input.milestoneId,
    billingId: milestone.record.billingId,
    amount: retentionAmount,
    releasedAt: input.verifiedAt,
    status: "Released",
  };
  const createdRelease = await adapter.create<EPCRecord>({ collection: "EPCRetentionRelease", data: retentionRelease });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.verifiedAt,
    voucherType: "RetentionRelease",
    voucherNo: releaseId,
    party: String(milestone.record.projectName ?? ""),
    lines: [
      { account: ACCOUNTS_RECEIVABLE_ACCOUNT, debit: retentionAmount, credit: 0 },
      { account: RETENTION_RECEIVABLE_ACCOUNT, debit: 0, credit: retentionAmount },
    ],
  });
  const reportId = await nextSequentialId(adapter, "EPCProgressReport", `EPC-RPT-${year}-`, 4);
  const report: EPCRecord = {
    id: reportId,
    companyId: EPC_COMPANY_ID,
    milestoneId: input.milestoneId,
    projectCode: milestone.record.projectCode,
    projectName: milestone.record.projectName,
    certifiedProgress: milestone.record.certifiedProgress,
    revenueRecognized: milestone.record.revenueRecognized,
    costIncurred: milestone.record.costIncurred,
    margin: milestone.record.margin,
    retentionHeld: milestone.record.retentionAmount,
    retentionReleased: retentionAmount,
    snapshotAt: input.verifiedAt,
    status: "Submitted",
  };
  const createdReport = await adapter.create<EPCRecord>({ collection: "EPCProgressReport", data: report });
  const updatedMilestone = await updateMilestone(adapter, milestone, {
    bastNo: input.bastNo,
    bastVerifiedAt: input.verifiedAt,
    status: "Verified BAST",
  });
  return { milestone: updatedMilestone, retentionRelease: createdRelease.record, glEntries, report: createdReport.record };
}

async function loadMilestone(adapter: DataAdapter, milestoneId: string): Promise<LoadedMilestone> {
  const milestone = await adapter.get<EPCRecord>("ProjectMilestone", milestoneId);
  if (!milestone) throw new DataError(`Project milestone "${milestoneId}" was not found`, "not_found");
  if (milestone.record.companyId !== EPC_COMPANY_ID) {
    throw new DataError(`Project milestone "${milestoneId}" belongs to another company`, "validation", {
      companyId: "Wrong company",
    });
  }
  return milestone;
}

async function updateMilestone(adapter: DataAdapter, milestone: LoadedMilestone, data: EPCRecord): Promise<EPCRecord> {
  const updated = await adapter.update<EPCRecord>({
    collection: "ProjectMilestone",
    id: String(milestone.record.id),
    version: milestone.meta.version,
    data,
  });
  return updated.record;
}

interface GLVoucherInput {
  postingDate: string;
  voucherType: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<EPCRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (roundMoney(debit) !== roundMoney(credit)) throw new DataError(`Unbalanced EPC GL voucher "${input.voucherNo}"`, "validation");

  const year = input.postingDate.slice(0, 4);
  const entries: EPCRecord[] = [];
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "EPCGLEntry", `EPC-GL-${year}-`, 4);
    const created = await adapter.create<EPCRecord>({
      collection: "EPCGLEntry",
      data: {
        id,
        companyId: EPC_COMPANY_ID,
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
  const result = await adapter.query<EPCRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertEPCCompany(companyId: string): void {
  if (companyId !== EPC_COMPANY_ID) {
    throw new DataError(`EPC service only supports "${EPC_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
}

function assertPercent(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new DataError(`EPC field "${field}" must be between 0 and 100`, "validation", {
      [field]: "Must be between 0 and 100",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`EPC amount "${field}" must be zero or greater`, "validation", {
      [field]: "Must be zero or greater",
    });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
