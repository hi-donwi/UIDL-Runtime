import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  closeWonOpportunity,
  createOpportunityLead,
  moveOpportunityStage,
  qualifyOpportunity,
  sendOpportunityQuote,
} from "../crmPipelineService";

describe("CRM pipeline service workflow", () => {
  it("runs lead -> qualification -> quote -> kanban move -> closed won with forecast rows", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const lead = await createOpportunityLead(adapter, {
      companyId: "crm-pipeline",
      title: "AI customer service suite - PT Sinar Jaya Abadi",
      customer: "PT Sinar Jaya Abadi",
      source: "Inbound Website",
      leadScore: 86,
      owner: "Sarah Sales",
      dealValue: 450000000,
      expectedCloseDate: "2026-09-30",
      createdAt: "2026-08-24T09:00:00+07:00",
    });

    expect(lead).toMatchObject({
      id: "OPP-0066",
      companyId: "crm-pipeline",
      stage: "Lead Baru",
      probability: 20,
      weightedValue: 90000000,
    });

    const qualified = await qualifyOpportunity(adapter, {
      opportunityId: String(lead.id),
      qualifiedAt: "2026-08-24T10:00:00+07:00",
      qualificationNotes: "Budget approved and buying committee identified",
    });
    expect(qualified).toMatchObject({
      stage: "Kualifikasi",
      probability: 35,
      weightedValue: 157500000,
      qualificationStatus: "Qualified",
    });

    const quoteResult = await sendOpportunityQuote(adapter, {
      opportunityId: String(lead.id),
      packageName: "Enterprise CRM + SLA Gold",
      quotedAmount: 450000000,
      discountPercent: 10,
      sentAt: "2026-08-24T11:00:00+07:00",
    });
    expect(quoteResult.opportunity).toMatchObject({
      stage: "Proposal",
      probability: 55,
      quoteId: "CRM-QUO-2026-0001",
      weightedValue: 247500000,
    });
    expect(quoteResult.quote).toMatchObject({
      id: "CRM-QUO-2026-0001",
      opportunityId: lead.id,
      netAmount: 405000000,
      status: "Sent",
    });

    const negotiated = await moveOpportunityStage(adapter, {
      opportunityId: String(lead.id),
      stage: "Negosiasi",
      movedAt: "2026-08-24T14:00:00+07:00",
      reason: "Commercial review started",
    });
    expect(negotiated).toMatchObject({
      stage: "Negosiasi",
      probability: 75,
      weightedValue: 337500000,
    });

    const won = await closeWonOpportunity(adapter, {
      opportunityId: String(lead.id),
      closedAt: "2026-08-24T16:00:00+07:00",
      contractNo: "CTR-CRM-2026-0001",
    });
    expect(won.opportunity).toMatchObject({
      stage: "Won",
      probability: 100,
      weightedValue: 450000000,
      forecastCategory: "Closed Won",
      contractNo: "CTR-CRM-2026-0001",
    });
    expect(won.forecast).toMatchObject({
      id: "CRM-FCST-2026-0001",
      opportunityId: lead.id,
      stage: "Won",
      weightedValue: 450000000,
    });

    const forecast = await adapter.query({
      collection: "CRMForecast",
      filters: [{ field: "opportunityId", op: "eq", value: lead.id }],
    });
    expect(forecast.rows).toEqual(expect.arrayContaining([expect.objectContaining({ stage: "Won", weightedValue: 450000000 })]));
  });
});
