import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type SupportTicketRecord = Record<string, unknown>;

interface LoadedTicket {
  record: SupportTicketRecord;
  meta: RecordMeta;
}

export interface CreateSupportTicketInput {
  companyId: string;
  subject: string;
  customerName: string;
  priority: "Low" | "Medium" | "High" | "Critical P1";
  channel: "WhatsApp" | "Portal" | "Email" | "API Hook";
  createdAt: string;
}

export interface SendCannedReplyInput {
  ticketId: string;
  responseCode: string;
  agent: string;
  respondedAt: string;
}

export interface EscalateSupportTicketInput {
  ticketId: string;
  escalatedTo: string;
  reason: string;
  escalatedAt: string;
}

export interface CloseSupportTicketInput {
  ticketId: string;
  resolution: string;
  closedAt: string;
  csatRating: number;
  csatComment: string;
}

export interface CloseSupportTicketResult {
  ticket: SupportTicketRecord;
  csat: SupportTicketRecord;
}

export async function createSupportTicket(adapter: DataAdapter, input: CreateSupportTicketInput): Promise<SupportTicketRecord> {
  if (input.companyId !== "helpdesk") {
    throw new DataError('Helpdesk service only supports company "helpdesk"', "validation", { companyId: "Unsupported company" });
  }
  if (!input.subject.trim()) throw new DataError("Support ticket requires a subject", "validation", { subject: "Required" });
  if (!input.customerName.trim()) throw new DataError("Support ticket requires a customer", "validation", { customerName: "Required" });

  const id = await nextSequentialId(adapter, "SupportTicket", "HD-TICK-", 4);
  const slaDueMinutes = slaDueMinutesFor(input.priority);
  const record: SupportTicketRecord = {
    id,
    companyId: input.companyId,
    subject: input.subject,
    customerName: input.customerName,
    priority: input.priority,
    channel: input.channel,
    assignedAgent: "",
    slaDueMinutes,
    createdDate: input.createdAt.slice(0, 10),
    createdAt: input.createdAt,
    slaStatus: "On Track",
    status: "New",
    route: `/app/helpdesk/edit/SupportTicket/${id}`,
  };
  const created = await adapter.create<SupportTicketRecord>({ collection: "SupportTicket", data: record });
  return created.record;
}

export async function sendCannedReply(adapter: DataAdapter, input: SendCannedReplyInput): Promise<SupportTicketRecord> {
  const ticket = await loadTicket(adapter, input.ticketId);
  if (ticket.record.status === "Closed") {
    throw new DataError(`Support ticket "${input.ticketId}" is already closed`, "validation", { ticketId: "Closed" });
  }
  const firstResponseMinutes = minutesBetween(String(ticket.record.createdAt), input.respondedAt);
  const firstResponseSla = firstResponseMinutes <= Number(ticket.record.slaDueMinutes ?? 0) ? "Met" : "Breached";
  const updated = await adapter.update<SupportTicketRecord>({
    collection: "SupportTicket",
    id: input.ticketId,
    version: ticket.meta.version,
    data: {
      assignedAgent: input.agent,
      firstResponseAt: input.respondedAt,
      firstResponseMinutes,
      firstResponseSla,
      cannedResponseCode: input.responseCode,
      lastResponseAt: input.respondedAt,
      slaStatus: firstResponseSla,
      status: "In Progress",
    },
  });
  return updated.record;
}

export async function escalateSupportTicket(adapter: DataAdapter, input: EscalateSupportTicketInput): Promise<SupportTicketRecord> {
  const ticket = await loadTicket(adapter, input.ticketId);
  if (ticket.record.status === "Closed") {
    throw new DataError(`Support ticket "${input.ticketId}" is already closed`, "validation", { ticketId: "Closed" });
  }
  const updated = await adapter.update<SupportTicketRecord>({
    collection: "SupportTicket",
    id: input.ticketId,
    version: ticket.meta.version,
    data: {
      escalationLevel: "Level 2",
      escalatedTo: input.escalatedTo,
      escalationReason: input.reason,
      escalatedAt: input.escalatedAt,
      status: "In Progress",
    },
  });
  return updated.record;
}

export async function closeSupportTicketWithCSAT(
  adapter: DataAdapter,
  input: CloseSupportTicketInput,
): Promise<CloseSupportTicketResult> {
  if (!Number.isInteger(input.csatRating) || input.csatRating < 1 || input.csatRating > 5) {
    throw new DataError("CSAT rating must be between 1 and 5", "validation", { csatRating: "1-5 required" });
  }
  const ticket = await loadTicket(adapter, input.ticketId);
  const resolutionMinutes = minutesBetween(String(ticket.record.createdAt), input.closedAt);
  const resolutionSla = resolutionMinutes <= Number(ticket.record.slaDueMinutes ?? 0) ? "Met" : "Breached";
  const updated = await adapter.update<SupportTicketRecord>({
    collection: "SupportTicket",
    id: input.ticketId,
    version: ticket.meta.version,
    data: {
      resolution: input.resolution,
      resolvedAt: input.closedAt,
      closedAt: input.closedAt,
      resolutionMinutes,
      resolutionSla,
      slaStatus: resolutionSla,
      csatRating: input.csatRating,
      csatComment: input.csatComment,
      status: "Closed",
    },
  });

  const year = input.closedAt.slice(0, 4);
  const csatId = await nextSequentialId(adapter, "SupportCSAT", `CSAT-HD-${year}-`, 4);
  const csat = {
    id: csatId,
    companyId: "helpdesk",
    ticketId: input.ticketId,
    customerName: updated.record.customerName,
    agent: updated.record.assignedAgent,
    rating: input.csatRating,
    comment: input.csatComment,
    submittedAt: input.closedAt,
    status: "Submitted",
    route: `/app/helpdesk/edit/SupportCSAT/${csatId}`,
  };
  const createdCsat = await adapter.create<SupportTicketRecord>({ collection: "SupportCSAT", data: csat });
  return { ticket: updated.record, csat: createdCsat.record };
}

async function loadTicket(adapter: DataAdapter, ticketId: string): Promise<LoadedTicket> {
  const ticket = await adapter.get<SupportTicketRecord>("SupportTicket", ticketId);
  if (!ticket) throw new DataError(`Support ticket "${ticketId}" was not found`, "not_found");
  return ticket;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<SupportTicketRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function slaDueMinutesFor(priority: CreateSupportTicketInput["priority"]): number {
  if (priority === "Critical P1") return 60;
  if (priority === "High") return 240;
  if (priority === "Medium") return 480;
  return 1440;
}

function minutesBetween(start: string, end: string): number {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new DataError("Invalid support ticket timestamp", "validation", { timestamp: "Invalid date" });
  }
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}
