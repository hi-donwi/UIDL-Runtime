/**
 * Helpdesk SLA timeline seed enrichment.
 *
 * Adds a deterministic lifecycle timeline — intake, first response, clock-stopped
 * pause windows, escalation, and resolution — to the already-seeded `SupportTicket`
 * rows. It performs no PRNG draws and adds no rows, so the seed stream and row
 * order for every tenant stay byte-identical.
 *
 * Open tickets are re-based to a recent intake time relative to
 * `HELPDESK_SLA_AS_OF` so their elapsed clock is realistic; resolved/closed
 * tickets keep their historical intake date and gain a resolution timestamp.
 * The spread of delays is deliberately uneven so the SLA report has genuine
 * Met / On Track / At Risk / Breached outcomes and real paused time to net out.
 */

export const HELPDESK_SLA_AS_OF = "2026-08-28T09:00:00+07:00";

const HELPDESK_COMPANY_ID = "helpdesk";
const MS_PER_MINUTE = 60_000;
const AS_OF_MS = Date.parse(HELPDESK_SLA_AS_OF);

export function enrichHelpdeskSlaTimeline(
  tickets: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return tickets.map((ticket, position) => {
    if (ticket.companyId !== HELPDESK_COMPANY_ID) return ticket;

    const index = position + 1;
    const status = String(ticket.status ?? "New");
    const slaDueMinutes = Number(ticket.slaDueMinutes ?? 1440);
    const load = ((index * 37) % 100) / 100; // deterministic pseudo-uniform 0..0.99
    const frTarget = Math.min(60, Math.round(slaDueMinutes / 4));
    const firstResponseMinutes = Math.round(frTarget * (0.25 + load * 1.1));

    const resolved = status === "Resolved" || status === "Closed";
    const waitingOnCustomer = status === "Waiting on Customer";
    const hasFirstResponse = status !== "New";

    const enriched: Record<string, unknown> = { ...ticket };

    // 1. Intake time.
    let createdMs: number;
    if (resolved) {
      createdMs = Date.parse(String(ticket.createdAt ?? `${ticket.createdDate}T08:00:00+07:00`));
      if (!Number.isFinite(createdMs)) return ticket;
    } else {
      // Age an open ticket by 15%..125% of its SLA so the live clock is realistic.
      const ageMinutes = Math.round(slaDueMinutes * (0.15 + load * 1.1));
      createdMs = AS_OF_MS - ageMinutes * MS_PER_MINUTE;
      enriched.createdAt = iso(createdMs);
      enriched.createdDate = iso(createdMs).slice(0, 10);
    }

    // 2. Pause windows (clock stops for "Waiting on Customer").
    const pauses: Array<{ pausedAt: string; resumedAt: string | null }> = [];
    if (index % 3 === 0) {
      const pauseStart = firstResponseMinutes + Math.round(slaDueMinutes * 0.1);
      const pauseLength = Math.round(slaDueMinutes * 0.2 * (1 + load));
      pauses.push({
        pausedAt: addMinutes(createdMs, pauseStart),
        resumedAt: addMinutes(createdMs, pauseStart + pauseLength),
      });
    }
    if (waitingOnCustomer) {
      pauses.push({ pausedAt: addMinutes(createdMs, firstResponseMinutes + 30), resumedAt: null });
    }
    if (pauses.length > 0) enriched.pauses = pauses;

    // 3. First response.
    if (hasFirstResponse) {
      enriched.firstResponseAt = addMinutes(createdMs, firstResponseMinutes);
    }

    // 4. Escalation — every fourth non-new ticket went to L2.
    if (hasFirstResponse && index % 4 === 0) {
      enriched.escalationLevel = "Level 2";
      enriched.escalatedTo = "Engineering";
      enriched.escalatedAt = addMinutes(createdMs, firstResponseMinutes + Math.round(slaDueMinutes * 0.3));
    }

    // 5. Resolution — spread 40%..200% of SLA plus any paused time.
    if (resolved) {
      const pausedMinutes = pauses.reduce((sum, pause) => {
        if (pause.resumedAt == null) return sum;
        return sum + Math.round((Date.parse(pause.resumedAt) - Date.parse(pause.pausedAt)) / MS_PER_MINUTE);
      }, 0);
      const workedMinutes = Math.round(slaDueMinutes * (0.35 + load * 0.85));
      const closedAt = addMinutes(createdMs, workedMinutes + pausedMinutes);
      enriched.resolvedAt = closedAt;
      if (status === "Closed") enriched.closedAt = closedAt;
    }

    return enriched;
  });
}

function addMinutes(baseMs: number, minutes: number): string {
  return iso(baseMs + minutes * MS_PER_MINUTE);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}
