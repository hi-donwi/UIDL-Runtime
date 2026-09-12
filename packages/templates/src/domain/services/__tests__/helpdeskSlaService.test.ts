import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { buildHelpdeskSlaReport, classifyBreach } from "../helpdeskSlaService";

const COMPANY = "helpdesk";
const AS_OF = "2026-08-28T12:00:00.000Z";
const DAY_START = "2026-08-28T00:00:00.000Z";

function minus(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) - minutes * 60_000).toISOString();
}
function plus(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

describe("helpdesk SLA elapsed-time correctness", () => {
  it("recomputes elapsed time from timestamps net of pauses and derives breach verdicts", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SupportTicket: [
          ticket("T1", { createdAt: DAY_START, slaDueMinutes: 240, status: "Closed", resolvedAt: plus(DAY_START, 120) }),
          ticket("T2", {
            createdAt: DAY_START,
            slaDueMinutes: 240,
            status: "Resolved",
            resolvedAt: plus(DAY_START, 300),
            pauses: [{ pausedAt: plus(DAY_START, 60), resumedAt: plus(DAY_START, 180) }],
          }),
          ticket("T3", {
            createdAt: DAY_START,
            slaDueMinutes: 240,
            status: "Resolved",
            resolvedAt: plus(DAY_START, 300),
            pauses: [{ pausedAt: plus(DAY_START, 60), resumedAt: plus(DAY_START, 90) }],
          }),
          ticket("T4", { createdAt: minus(AS_OF, 100), slaDueMinutes: 240, status: "In Progress" }),
          ticket("T5", { createdAt: minus(AS_OF, 200), slaDueMinutes: 240, status: "In Progress" }),
          ticket("T6", { createdAt: minus(AS_OF, 260), slaDueMinutes: 240, status: "New" }),
          ticket("T7", { createdAt: minus(AS_OF, 250), slaDueMinutes: 240, status: "In Progress", escalationLevel: "Level 2" }),
        ],
      },
    });

    const report = await buildHelpdeskSlaReport(adapter, { companyId: COMPANY, asOf: AS_OF });

    expect(report.summary).toEqual({
      asOf: AS_OF,
      ticketCount: 7,
      openCount: 4,
      resolvedCount: 3,
      metCount: 2,
      onTrackCount: 1,
      atRiskCount: 1,
      breachedCount: 3,
      firstResponseBreachedCount: 0,
      escalatedCount: 1,
      escalationRecommendedCount: 2,
      totalPausedMinutes: 150,
      avgFirstResponseMinutes: 0,
      avgResolutionMinutes: 190,
      slaAttainmentPct: 0.4,
    });

    expect(
      report.rows.map((row) => ({ id: row.ticketId, elapsed: row.elapsedMinutes, breachStatus: row.breachStatus })),
    ).toEqual([
      { id: "T3", elapsed: 270, breachStatus: "Breached" },
      { id: "T6", elapsed: 260, breachStatus: "Breached" },
      { id: "T7", elapsed: 250, breachStatus: "Breached" },
      { id: "T5", elapsed: 200, breachStatus: "At Risk" },
      { id: "T4", elapsed: 100, breachStatus: "On Track" },
      { id: "T2", elapsed: 180, breachStatus: "Met" },
      { id: "T1", elapsed: 120, breachStatus: "Met" },
    ]);

    expect(report.rows.find((row) => row.ticketId === "T5")).toMatchObject({ escalated: false, escalationRecommended: true });
    expect(report.rows.find((row) => row.ticketId === "T7")).toMatchObject({ escalated: true, escalationRecommended: false });
  });

  it("derives a first-response breach from the response timestamp net of pauses", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SupportTicket: [
          ticket("FR1", { createdAt: DAY_START, slaDueMinutes: 240, status: "In Progress", firstResponseAt: plus(DAY_START, 90) }),
          ticket("FR2", { createdAt: DAY_START, slaDueMinutes: 240, status: "In Progress", firstResponseAt: plus(DAY_START, 30) }),
        ],
      },
    });

    const report = await buildHelpdeskSlaReport(adapter, { companyId: COMPANY, asOf: AS_OF });

    expect(report.rows.find((row) => row.ticketId === "FR1")).toMatchObject({ firstResponseMinutes: 90, firstResponseBreached: true });
    expect(report.rows.find((row) => row.ticketId === "FR2")).toMatchObject({ firstResponseMinutes: 30, firstResponseBreached: false });
    expect(report.summary.firstResponseBreachedCount).toBe(1);
  });

  it("fails loudly on broken timestamps and inputs", async () => {
    const backwards = createInMemoryAdapter({
      seed: { SupportTicket: [ticket("B1", { createdAt: DAY_START, slaDueMinutes: 240, status: "Closed", resolvedAt: minus(DAY_START, 10) })] },
    });
    await expect(buildHelpdeskSlaReport(backwards, { companyId: COMPANY, asOf: AS_OF })).rejects.toBeInstanceOf(DataError);

    const badPause = createInMemoryAdapter({
      seed: {
        SupportTicket: [
          ticket("B2", {
            createdAt: DAY_START,
            slaDueMinutes: 240,
            status: "In Progress",
            pauses: [{ pausedAt: plus(DAY_START, 120), resumedAt: plus(DAY_START, 60) }],
          }),
        ],
      },
    });
    await expect(buildHelpdeskSlaReport(badPause, { companyId: COMPANY, asOf: AS_OF })).rejects.toMatchObject({ code: "validation" });

    const badSla = createInMemoryAdapter({
      seed: { SupportTicket: [ticket("B3", { createdAt: DAY_START, slaDueMinutes: 0, status: "New" })] },
    });
    await expect(buildHelpdeskSlaReport(badSla, { companyId: COMPANY, asOf: AS_OF })).rejects.toBeInstanceOf(DataError);

    await expect(buildHelpdeskSlaReport(badSla, { companyId: "wrong", asOf: AS_OF })).rejects.toMatchObject({ code: "validation" });
    await expect(buildHelpdeskSlaReport(badSla, { companyId: COMPANY, asOf: "not-a-date" })).rejects.toBeInstanceOf(DataError);
  });

  it("classifies breach status by resolution and consumption thresholds", () => {
    expect(classifyBreach({ resolved: true, elapsedMinutes: 240, slaDueMinutes: 240 })).toBe("Met");
    expect(classifyBreach({ resolved: true, elapsedMinutes: 241, slaDueMinutes: 240 })).toBe("Breached");
    expect(classifyBreach({ resolved: false, elapsedMinutes: 100, slaDueMinutes: 240 })).toBe("On Track");
    expect(classifyBreach({ resolved: false, elapsedMinutes: 192, slaDueMinutes: 240 })).toBe("At Risk");
    expect(classifyBreach({ resolved: false, elapsedMinutes: 240, slaDueMinutes: 240 })).toBe("Breached");
  });
});

function ticket(id: string, fields: Record<string, unknown>): Record<string, unknown> {
  return {
    id,
    companyId: COMPANY,
    subject: `Subject ${id}`,
    customerName: `Customer ${id}`,
    priority: "High",
    ...fields,
  };
}
