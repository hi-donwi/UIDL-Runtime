import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type CRMRecord = Record<string, unknown>;

interface LoadedOpportunity {
  record: CRMRecord;
  meta: RecordMeta;
}

export interface CreateOpportunityLeadInput {
  companyId: string;
  title: string;
  customer: string;
  source: string;
  leadScore: number;
  owner: string;
  dealValue: number;
  expectedCloseDate: string;
  createdAt: string;
}

export interface QualifyOpportunityInput {
  opportunityId: string;
  qualifiedAt: string;
  qualificationNotes: string;
}

export interface SendOpportunityQuoteInput {
  opportunityId: string;
  packageName: string;
  quotedAmount: number;
  discountPercent: number;
  sentAt: string;
}

export interface MoveOpportunityStageInput {
  opportunityId: string;
  stage: "Kualifikasi" | "Proposal" | "Negosiasi" | "Won" | "Lost";
  movedAt: string;
  reason: string;
}

export interface CloseWonOpportunityInput {
  opportunityId: string;
  closedAt: string;
  contractNo: string;
}

export interface SendOpportunityQuoteResult {
  opportunity: CRMRecord;
  quote: CRMRecord;
}

export interface CloseWonOpportunityResult {
  opportunity: CRMRecord;
  forecast: CRMRecord;
}

const CRM_COMPANY_ID = "crm-pipeline";

export async function createOpportunityLead(adapter: DataAdapter, input: CreateOpportunityLeadInput): Promise<CRMRecord> {
  assertCRMCompany(input.companyId);
  if (!input.title.trim()) throw new DataError("Opportunity requires a title", "validation", { title: "Required" });
  if (!input.customer.trim()) throw new DataError("Opportunity requires a customer", "validation", { customer: "Required" });
  assertPositiveAmount(input.dealValue, "dealValue");

  const id = await nextSequentialId(adapter, "Opportunity", "OPP-", 4);
  const probability = probabilityForStage("Lead Baru");
  const record: CRMRecord = {
    id,
    companyId: input.companyId,
    title: input.title,
    customer: input.customer,
    source: input.source,
    leadScore: input.leadScore,
    owner: input.owner,
    assignedAgent: input.owner,
    dealValue: roundMoney(input.dealValue),
    probability,
    weightedValue: weightedValue(input.dealValue, probability),
    expectedCloseDate: input.expectedCloseDate,
    createdAt: input.createdAt,
    stage: "Lead Baru",
    qualificationStatus: "New",
    forecastCategory: "Pipeline",
    route: `/app/crm-pipeline/edit/Opportunity/${id}`,
  };
  const created = await adapter.create<CRMRecord>({ collection: "Opportunity", data: record });
  return created.record;
}

export async function qualifyOpportunity(adapter: DataAdapter, input: QualifyOpportunityInput): Promise<CRMRecord> {
  const opportunity = await loadOpportunity(adapter, input.opportunityId);
  if (opportunity.record.stage !== "Lead Baru") {
    throw new DataError(`Opportunity "${input.opportunityId}" must be a new lead before qualification`, "validation", {
      stage: "Expected Lead Baru",
    });
  }
  return updateOpportunityStage(adapter, opportunity, "Kualifikasi", {
    qualificationStatus: "Qualified",
    qualifiedAt: input.qualifiedAt,
    qualificationNotes: input.qualificationNotes,
    lastStageMoveAt: input.qualifiedAt,
  });
}

export async function sendOpportunityQuote(
  adapter: DataAdapter,
  input: SendOpportunityQuoteInput,
): Promise<SendOpportunityQuoteResult> {
  const opportunity = await loadOpportunity(adapter, input.opportunityId);
  if (!["Kualifikasi", "Proposal"].includes(String(opportunity.record.stage))) {
    throw new DataError(`Opportunity "${input.opportunityId}" must be qualified before quote`, "validation", {
      stage: "Expected Kualifikasi",
    });
  }
  assertPositiveAmount(input.quotedAmount, "quotedAmount");
  if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 100) {
    throw new DataError("CRM quote discount must be between 0 and 100", "validation", { discountPercent: "0-100 required" });
  }

  const year = input.sentAt.slice(0, 4);
  const quoteId = await nextSequentialId(adapter, "CRMQuote", `CRM-QUO-${year}-`, 4);
  const netAmount = roundMoney(input.quotedAmount * (1 - input.discountPercent / 100));
  const quote: CRMRecord = {
    id: quoteId,
    companyId: CRM_COMPANY_ID,
    opportunityId: input.opportunityId,
    customer: opportunity.record.customer,
    packageName: input.packageName,
    quotedAmount: roundMoney(input.quotedAmount),
    discountPercent: input.discountPercent,
    netAmount,
    sentAt: input.sentAt,
    status: "Sent",
    route: `/meridian/print/commercial-quotation/crm-pipeline/${quoteId}`,
  };
  const createdQuote = await adapter.create<CRMRecord>({ collection: "CRMQuote", data: quote });
  const updatedOpportunity = await updateOpportunityStage(adapter, opportunity, "Proposal", {
    quoteId,
    quotedAmount: roundMoney(input.quotedAmount),
    quoteNetAmount: netAmount,
    quotedAt: input.sentAt,
    lastStageMoveAt: input.sentAt,
  });

  return { opportunity: updatedOpportunity, quote: createdQuote.record };
}

export async function moveOpportunityStage(adapter: DataAdapter, input: MoveOpportunityStageInput): Promise<CRMRecord> {
  const opportunity = await loadOpportunity(adapter, input.opportunityId);
  if (input.stage === "Won") {
    throw new DataError("Use closeWonOpportunity for won deals", "validation", { stage: "Use closeWonOpportunity" });
  }
  return updateOpportunityStage(adapter, opportunity, input.stage, {
    lastStageMoveAt: input.movedAt,
    lastStageMoveReason: input.reason,
  });
}

export async function closeWonOpportunity(adapter: DataAdapter, input: CloseWonOpportunityInput): Promise<CloseWonOpportunityResult> {
  const opportunity = await loadOpportunity(adapter, input.opportunityId);
  if (!["Proposal", "Negosiasi"].includes(String(opportunity.record.stage))) {
    throw new DataError(`Opportunity "${input.opportunityId}" must be in proposal or negotiation before close won`, "validation", {
      stage: "Expected Proposal or Negosiasi",
    });
  }
  const updatedOpportunity = await updateOpportunityStage(adapter, opportunity, "Won", {
    closedAt: input.closedAt,
    contractNo: input.contractNo,
    forecastCategory: "Closed Won",
    lastStageMoveAt: input.closedAt,
  });
  const year = input.closedAt.slice(0, 4);
  const forecastId = await nextSequentialId(adapter, "CRMForecast", `CRM-FCST-${year}-`, 4);
  const forecast: CRMRecord = {
    id: forecastId,
    companyId: CRM_COMPANY_ID,
    opportunityId: input.opportunityId,
    customer: updatedOpportunity.customer,
    stage: updatedOpportunity.stage,
    dealValue: updatedOpportunity.dealValue,
    probability: updatedOpportunity.probability,
    weightedValue: updatedOpportunity.weightedValue,
    forecastCategory: "Closed Won",
    snapshotAt: input.closedAt,
    status: "Submitted",
  };
  const createdForecast = await adapter.create<CRMRecord>({ collection: "CRMForecast", data: forecast });
  return { opportunity: updatedOpportunity, forecast: createdForecast.record };
}

async function loadOpportunity(adapter: DataAdapter, opportunityId: string): Promise<LoadedOpportunity> {
  const opportunity = await adapter.get<CRMRecord>("Opportunity", opportunityId);
  if (!opportunity) throw new DataError(`Opportunity "${opportunityId}" was not found`, "not_found");
  if (opportunity.record.companyId !== CRM_COMPANY_ID) {
    throw new DataError(`Opportunity "${opportunityId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return opportunity;
}

async function updateOpportunityStage(
  adapter: DataAdapter,
  opportunity: LoadedOpportunity,
  stage: string,
  data: CRMRecord,
): Promise<CRMRecord> {
  const probability = probabilityForStage(stage);
  const dealValue = Number(opportunity.record.dealValue ?? 0);
  const updated = await adapter.update<CRMRecord>({
    collection: "Opportunity",
    id: String(opportunity.record.id),
    version: opportunity.meta.version,
    data: {
      ...data,
      stage,
      probability,
      weightedValue: weightedValue(dealValue, probability),
    },
  });
  return updated.record;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<CRMRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertCRMCompany(companyId: string): void {
  if (companyId !== CRM_COMPANY_ID) {
    throw new DataError(`CRM pipeline service only supports "${CRM_COMPANY_ID}"`, "validation", { companyId: "Unsupported company" });
  }
}

function assertPositiveAmount(amount: number, field: string): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DataError(`CRM amount "${field}" must be greater than zero`, "validation", { [field]: "Must be greater than zero" });
  }
}

function probabilityForStage(stage: string): number {
  if (stage === "Won") return 100;
  if (stage === "Negosiasi") return 75;
  if (stage === "Proposal") return 55;
  if (stage === "Kualifikasi") return 35;
  if (stage === "Lost") return 0;
  return 20;
}

function weightedValue(dealValue: number, probability: number): number {
  return roundMoney(dealValue * (probability / 100));
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
