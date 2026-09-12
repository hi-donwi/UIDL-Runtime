import { describe, expect, it } from "vitest";
import { mockApi } from "../../../../packages/templates/src/meridian/mockApiController";

describe("mockApiController", () => {
  it("lists initial seeded collections with records for all 11 industry verticals", () => {
    // 1. Retail Shoe Company
    const shoes = mockApi.list("shoesInventory");
    expect(shoes.length).toBeGreaterThanOrEqual(4);
    expect(shoes.some((s) => s.item === "Sneakers Prime Classic")).toBe(true);

    // 2. School ABC
    const spp = mockApi.list("schoolSpp");
    expect(spp.length).toBeGreaterThanOrEqual(4);
    expect(spp.some((s) => s.namaSiswa === "Ahmad Rizky")).toBe(true);

    // 3. Factory ABC
    const wo = mockApi.list("manufacturingWO");
    expect(wo.length).toBeGreaterThanOrEqual(4);
    expect(wo.some((w) => w.item === "Gear Housing A")).toBe(true);

    // 4. Food Roasters
    const roast = mockApi.list("roastBatches");
    expect(roast.length).toBeGreaterThanOrEqual(4);
    expect(roast.some((r) => r.bean === "Arabica Aceh Gayo")).toBe(true);

    // 5. EPC Contractor
    const epc = mockApi.list("epcMilestones");
    expect(epc.length).toBeGreaterThanOrEqual(4);
    expect(epc.some((e) => e.wbs?.toString().includes("Piping"))).toBe(true);

    // 6. CRM Pipeline
    const deals = mockApi.list("crmDeals");
    expect(deals.length).toBeGreaterThanOrEqual(4);
    expect(deals.some((d) => d.org === "PT Digital Solusi Nusantara")).toBe(true);

    // 7. Koperasi BMT
    const bmt = mockApi.list("murabahahContracts");
    expect(bmt.length).toBeGreaterThanOrEqual(4);
    expect(bmt.some((m) => m.member === "H. Abdullah")).toBe(true);

    // 8. Hospital Medika EMR
    const patients = mockApi.list("patients");
    expect(patients.length).toBeGreaterThanOrEqual(4);
    expect(patients.some((p) => p.nama === "Budi Santoso")).toBe(true);

    // 9. Medical Device ISO 13485
    const devices = mockApi.list("medicalDevices");
    expect(devices.length).toBeGreaterThanOrEqual(4);
    expect(devices.some((d) => d.batchSteril === "ETO-LOT-2027-44")).toBe(true);

    // 10. Omnichannel Distribution
    const orders = mockApi.list("omniOrders");
    expect(orders.length).toBeGreaterThanOrEqual(4);
    expect(orders.some((o) => o.channel === "Lapakku Mall")).toBe(true);

    // 11. Helpdesk
    const tickets = mockApi.list("helpdeskTickets");
    expect(tickets.length).toBeGreaterThanOrEqual(4);
    expect(tickets.some((t) => t.priority === "Urgent")).toBe(true);
  });

  it("supports getting by id, creating new records, and updating status", () => {
    // 1. Get
    const patient = mockApi.get("patients", "RM-2027-0412");
    expect(patient).toBeDefined();
    expect(patient?.nama).toBe("Budi Santoso");

    // 2. Create
    const newTicket = mockApi.create("helpdeskTickets", {
      customer: "PT Maju Terus",
      subject: "Integrasi API POS Kasir",
      priority: "High",
      channel: "WhatsApp",
      slaCountdown: "45 Menit",
      assignee: "Aditya",
      status: "Open",
    });
    expect(newTicket.id).toBeDefined();
    expect(mockApi.get("helpdeskTickets", newTicket.id)?.customer).toBe("PT Maju Terus");

    // 3. Status Transition
    const updated = mockApi.transitionStatus("helpdeskTickets", newTicket.id, "Resolved");
    expect(updated?.status).toBe("Resolved");
    expect(mockApi.get("helpdeskTickets", newTicket.id)?.status).toBe("Resolved");
  });

  it("supports deleting records and resetting mock database", () => {
    const tempWo = mockApi.create("manufacturingWO", {
      item: "Temporary Test Item",
      qty: "100 Pcs",
      status: "Draft",
    });
    expect(mockApi.get("manufacturingWO", tempWo.id)).toBeDefined();

    const deleted = mockApi.delete("manufacturingWO", tempWo.id);
    expect(deleted).toBe(true);
    expect(mockApi.get("manufacturingWO", tempWo.id)).toBeUndefined();

    // Reset All restores baseline
    mockApi.resetAll();
    expect(mockApi.list("manufacturingWO").length).toBeGreaterThanOrEqual(4);
  });

  it("supports full-text keyword search across records", () => {
    const results = mockApi.search("patients", "Jantung");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].nama).toBe("Drs. Ahmad Fauzi");

    const emptyResults = mockApi.search("patients", "NonExistentTerm999");
    expect(emptyResults.length).toBe(0);
  });
});
