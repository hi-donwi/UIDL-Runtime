import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  closeSupportTicketWithCSAT,
  createSupportTicket,
  escalateSupportTicket,
  sendCannedReply,
} from "../helpdeskService";

describe("helpdesk service workflow", () => {
  it("runs ticket intake -> canned reply -> escalation -> close + CSAT through adapter records", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const ticket = await createSupportTicket(adapter, {
      companyId: "helpdesk",
      subject: "Portal pelanggan tidak bisa login",
      customerName: "PT Sinar Jaya Abadi",
      priority: "High",
      channel: "Portal",
      createdAt: "2026-08-24T09:00:00+07:00",
    });

    expect(ticket).toMatchObject({
      id: "HD-TICK-0066",
      status: "New",
      slaDueMinutes: 240,
      slaStatus: "On Track",
    });

    const replied = await sendCannedReply(adapter, {
      ticketId: String(ticket.id),
      responseCode: "LOGIN-RESET",
      agent: "Rani Support L2",
      respondedAt: "2026-08-24T09:12:00+07:00",
    });
    expect(replied).toMatchObject({
      id: ticket.id,
      status: "In Progress",
      firstResponseMinutes: 12,
      firstResponseSla: "Met",
      cannedResponseCode: "LOGIN-RESET",
    });

    const escalated = await escalateSupportTicket(adapter, {
      ticketId: String(ticket.id),
      escalatedTo: "Engineering",
      reason: "SSO provider rejects valid session token",
      escalatedAt: "2026-08-24T10:10:00+07:00",
    });
    expect(escalated).toMatchObject({
      status: "In Progress",
      escalationLevel: "Level 2",
      escalatedTo: "Engineering",
    });

    const result = await closeSupportTicketWithCSAT(adapter, {
      ticketId: String(ticket.id),
      resolution: "Reset SSO binding and refreshed customer role mapping",
      closedAt: "2026-08-24T11:20:00+07:00",
      csatRating: 5,
      csatComment: "Cepat dan jelas",
    });

    expect(result.ticket).toMatchObject({
      id: ticket.id,
      status: "Closed",
      resolutionMinutes: 140,
      resolutionSla: "Met",
      csatRating: 5,
    });
    expect(result.csat).toMatchObject({
      id: "CSAT-HD-2026-0001",
      ticketId: ticket.id,
      rating: 5,
      comment: "Cepat dan jelas",
    });
    await expect(adapter.get("SupportCSAT", String(result.csat.id))).resolves.toMatchObject({ record: result.csat });
  });
});
