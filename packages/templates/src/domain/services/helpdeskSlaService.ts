import { DataError, type DataAdapter } from "~/data/types";

/**
 * Helpdesk SLA elapsed-time reconciliation.
 *
 * Read-only. Recomputes first-response and resolution elapsed time for every
 * support ticket directly from its lifecycle timestamps, nets out clock-stopped
 * pause windows, and derives a breach verdict against the ticket's SLA target.
 * Escalation is surfaced as an advisory signal; no ticket state is mutated.
 */

export type BreachStatus = "Met" | "On Track" | "At Risk" | "Breached";

export interface HelpdeskSlaInput {
  companyId: string;
  asOf: string;
}

export interface HelpdeskSlaRow {
  ticketId: string;
  subject: string;
  customerName: string;
  priority: string;
  status: string;
  slaDueMinutes: number;
  firstResponseMinutes: number | null;
  firstResponseBreached: boolean;
  pausedMinutes: number;
  elapsedMinutes: number;
  slaConsumedPct: number;
  resolved: boolean;
  breachStatus: BreachStatus;
  escalated: boolean;
  escalationRecommended: boolean;
}

export interface HelpdeskSlaSummary {
  asOf: string;
  ticketCount: number;
  openCount: number;
  resolvedCount: number;
  metCount: number;
  onTrackCount: number;
  atRiskCount: number;
  breachedCount: number;
  firstResponseBreachedCount: number;
  escalatedCount: number;
  escalationRecommendedCount: number;
  totalPausedMinutes: number;
  avgFirstResponseMinutes: number;
  avgResolutionMinutes: number;
  slaAttainmentPct: number;
}

export interface HelpdeskSlaReport {
  summary: HelpdeskSlaSummary;
  rows: HelpdeskSlaRow[];
  controls: string[];
}

interface PauseWindow {
  pausedAt: string;
  resumedAt: string | null;
}

const HELPDESK_COMPANY_ID = "helpdesk";
const AT_RISK_THRESHOLD = 0.8;
const BREACH_SEVERITY: Record<BreachStatus, number> = { Breached: 0, "At Risk": 1, "On Track": 2, Met: 3 };

export async function buildHelpdeskSlaReport(adapter: DataAdapter, input: HelpdeskSlaInput): Promise<HelpdeskSlaReport> {
  if (input.companyId !== HELPDESK_COMPANY_ID) {
    throw new DataError(`Helpdesk SLA report only supports "${HELPDESK_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
  const asOfMs = parseInstant(input.asOf, "asOf");

  const result = await adapter.query<Record<string, unknown>>({ collection: "SupportTicket" });
  const tickets = result.rows.filter((row) => row.companyId === input.companyId);

  const rows: HelpdeskSlaRow[] = [];
  for (const ticket of tickets) {
    const ticketId = String(ticket.id ?? "");
    const createdMs = parseInstant(String(ticket.createdAt ?? ""), `createdAt (${ticketId})`);
    const slaDueMinutes = Number(ticket.slaDueMinutes ?? 0);
    if (!Number.isFinite(slaDueMinutes) || slaDueMinutes <= 0) {
      throw new DataError(`Ticket "${ticketId}" has an invalid slaDueMinutes`, "validation", { slaDueMinutes: "Invalid" });
    }

    const status = String(ticket.status ?? "New");
    const resolvedAtRaw = ticket.resolvedAt ?? ticket.closedAt ?? null;
    const resolved = resolvedAtRaw != null;
    const measureEndMs = resolved ? parseInstant(String(resolvedAtRaw), `resolvedAt (${ticketId})`) : asOfMs;
    if (measureEndMs < createdMs) {
      throw new DataError(`Ticket "${ticketId}" resolves before it was created`, "validation", { resolvedAt: "Before createdAt" });
    }

    const pauses = readPauses(ticket.pauses, ticketId);
    const pausedMinutes = totalOverlapMinutes(pauses, createdMs, measureEndMs);
    const elapsedMinutes = Math.max(0, minutesBetweenMs(createdMs, measureEndMs) - pausedMinutes);

    let firstResponseMinutes: number | null = null;
    let firstResponseBreached = false;
    if (ticket.firstResponseAt != null) {
      const frMs = parseInstant(String(ticket.firstResponseAt), `firstResponseAt (${ticketId})`);
      if (frMs < createdMs) {
        throw new DataError(`Ticket "${ticketId}" first response precedes creation`, "validation", { firstResponseAt: "Before createdAt" });
      }
      const frPaused = totalOverlapMinutes(pauses, createdMs, frMs);
      firstResponseMinutes = Math.max(0, minutesBetweenMs(createdMs, frMs) - frPaused);
      firstResponseBreached = firstResponseMinutes > firstResponseTarget(slaDueMinutes);
    }

    const slaConsumedPct = roundRate(elapsedMinutes / slaDueMinutes);
    const breachStatus = classifyBreach({ resolved, elapsedMinutes, slaDueMinutes });
    const escalated = ticket.escalationLevel != null;
    const escalationRecommended = !resolved && !escalated && (breachStatus === "At Risk" || breachStatus === "Breached");

    rows.push({
      ticketId,
      subject: String(ticket.subject ?? ""),
      customerName: String(ticket.customerName ?? ""),
      priority: String(ticket.priority ?? ""),
      status,
      slaDueMinutes,
      firstResponseMinutes,
      firstResponseBreached,
      pausedMinutes,
      elapsedMinutes,
      slaConsumedPct,
      resolved,
      breachStatus,
      escalated,
      escalationRecommended,
    });
  }

  rows.sort(
    (a, b) =>
      BREACH_SEVERITY[a.breachStatus] - BREACH_SEVERITY[b.breachStatus] ||
      b.slaConsumedPct - a.slaConsumedPct ||
      a.ticketId.localeCompare(b.ticketId),
  );

  return { summary: summarize(rows, input.asOf), rows, controls: buildControls() };
}

export function classifyBreach(args: { resolved: boolean; elapsedMinutes: number; slaDueMinutes: number }): BreachStatus {
  const { resolved, elapsedMinutes, slaDueMinutes } = args;
  const consumed = elapsedMinutes / slaDueMinutes;
  if (resolved) return elapsedMinutes <= slaDueMinutes ? "Met" : "Breached";
  if (consumed >= 1) return "Breached";
  if (consumed >= AT_RISK_THRESHOLD) return "At Risk";
  return "On Track";
}

function summarize(rows: HelpdeskSlaRow[], asOf: string): HelpdeskSlaSummary {
  const resolvedRows = rows.filter((row) => row.resolved);
  const withFirstResponse = rows.filter((row) => row.firstResponseMinutes != null);
  const metCount = rows.filter((row) => row.breachStatus === "Met").length;
  const breachedCount = rows.filter((row) => row.breachStatus === "Breached").length;
  const verdictCount = metCount + breachedCount;

  return {
    asOf,
    ticketCount: rows.length,
    openCount: rows.length - resolvedRows.length,
    resolvedCount: resolvedRows.length,
    metCount,
    onTrackCount: rows.filter((row) => row.breachStatus === "On Track").length,
    atRiskCount: rows.filter((row) => row.breachStatus === "At Risk").length,
    breachedCount,
    firstResponseBreachedCount: rows.filter((row) => row.firstResponseBreached).length,
    escalatedCount: rows.filter((row) => row.escalated).length,
    escalationRecommendedCount: rows.filter((row) => row.escalationRecommended).length,
    totalPausedMinutes: rows.reduce((sum, row) => sum + row.pausedMinutes, 0),
    avgFirstResponseMinutes: average(withFirstResponse.map((row) => row.firstResponseMinutes ?? 0)),
    avgResolutionMinutes: average(resolvedRows.map((row) => row.elapsedMinutes)),
    slaAttainmentPct: verdictCount > 0 ? roundRate(metCount / verdictCount) : 0,
  };
}

function buildControls(): string[] {
  return [
    "Elapsed time is wall-clock minutes between the intake timestamp and resolution (or the as-of time for open tickets), minus paused windows.",
    "Paused windows model 'Waiting on Customer' clock stops; an open pause runs to the as-of time. Business-hour calendars are not modeled.",
    "First-response target is a quarter of the resolution SLA, capped at 60 minutes.",
    "Escalation recommendation is advisory — this report never mutates ticket state.",
  ];
}

function firstResponseTarget(slaDueMinutes: number): number {
  return Math.min(60, Math.round(slaDueMinutes / 4));
}

function readPauses(value: unknown, ticketId: string): PauseWindow[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new DataError(`Ticket "${ticketId}" has a malformed pauses field`, "validation");
  return value.map((entry) => {
    const window = entry as Record<string, unknown>;
    const pausedAt = String(window.pausedAt ?? "");
    const resumedAt = window.resumedAt == null ? null : String(window.resumedAt);
    const pausedMs = parseInstant(pausedAt, `pause.pausedAt (${ticketId})`);
    if (resumedAt != null) {
      const resumedMs = parseInstant(resumedAt, `pause.resumedAt (${ticketId})`);
      if (resumedMs < pausedMs) {
        throw new DataError(`Ticket "${ticketId}" has a pause window that resumes before it pauses`, "validation", {
          resumedAt: "Before pausedAt",
        });
      }
    }
    return { pausedAt, resumedAt };
  });
}

function totalOverlapMinutes(pauses: PauseWindow[], windowStartMs: number, windowEndMs: number): number {
  let total = 0;
  for (const pause of pauses) {
    const pauseStart = Date.parse(pause.pausedAt);
    const pauseEnd = pause.resumedAt == null ? windowEndMs : Date.parse(pause.resumedAt);
    const overlapStart = Math.max(pauseStart, windowStartMs);
    const overlapEnd = Math.min(pauseEnd, windowEndMs);
    if (overlapEnd > overlapStart) total += minutesBetweenMs(overlapStart, overlapEnd);
  }
  return total;
}

function parseInstant(value: string, field: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new DataError(`${field} must be a valid timestamp`, "validation", { [field]: "Invalid timestamp" });
  }
  return ms;
}

function minutesBetweenMs(startMs: number, endMs: number): number {
  return Math.round((endMs - startMs) / 60_000);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}
