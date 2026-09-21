import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { renderUIDocument } from "../renderDocument";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createInMemoryAdapter } from "../../data/adapters/inMemory";
import { createDocumentState } from "../../state/createDocumentState";
import { getPageRegistryEntry, listDoctypes } from "../../../../../packages/templates/src/meridian/pages";
import {
  accountingDimensions,
  couponCodes,
  customers,
  items,
  journalEntries,
  leads,
  loyaltyPrograms,
  manufacturingPlans,
  payments,
  pricingRules,
  priceLists,
  procurementTracker,
  projectSummaries,
  printTemplates,
  purchaseInvoices,
  purchaseReceipts,
  qualityInspections,
  salesInvoices,
  salesLifecycleTracker,
  salesQuotes,
  shipments,
  stockMovements,
  supplierScorecards,
  suppliers,
  supportTickets,
  taxTemplates,
  boms,
  deliveryNotes,
  jobCards,
  materialRequests,
  purchaseOrders,
  rfqs,
  salesOrders,
  supplierQuotations,
  workOrders,
  itemGroups,
  unitsOfMeasure,
  addresses,
  locations,
  batches,
  serialNumbers,
  paymentMethods,
  posProfiles,
} from "../../../../../packages/templates/src/meridian/mockData";

/** Every mock record id that some doctype's list document links to via an "Open" route. */
const recordIdsByDoctype: Record<string, string[]> = {
  Customer: customers.map((c) => c.id),
  Supplier: suppliers.map((s) => s.id),
  Item: items.map((i) => i.id),
  SalesItem: items.filter((i) => i.for !== "Purchases").map((i) => i.id),
  PurchaseItem: items.filter((i) => i.for !== "Sales").map((i) => i.id),
  SalesInvoice: salesInvoices.map((i) => i.id),
  PurchaseInvoice: purchaseInvoices.map((i) => i.id),
  SalesQuote: salesQuotes.map((q) => q.id),
  SalesLifecycleTracker: salesLifecycleTracker.map((q) => q.id),
  SalesPayment: payments.filter((p) => p.type === "Receive").map((p) => p.id),
  PurchasePayment: payments.filter((p) => p.type === "Pay").map((p) => p.id),
  ProcurementTracker: procurementTracker.map((p) => p.id),
  SupplierScorecard: supplierScorecards.map((s) => s.id),
  JournalEntry: journalEntries.map((e) => e.id),
  PriceList: priceLists.map((p) => p.id),
  LoyaltyProgram: loyaltyPrograms.map((p) => p.id),
  Lead: leads.map((l) => l.id),
  PricingRule: pricingRules.map((r) => r.id),
  CouponCode: couponCodes.map((c) => c.id),
  Party: [],
  StockMovement: stockMovements.map((s) => s.id),
  Shipment: shipments.map((s) => s.id),
  PurchaseReceipt: purchaseReceipts.map((r) => r.id),
  ManufacturingPlan: manufacturingPlans.map((p) => p.id),
  Tax: taxTemplates.map((t) => t.id),
  AccountingDimension: accountingDimensions.map((d) => d.id),
  PrintTemplate: printTemplates.map((t) => t.id),
  QualityInspection: qualityInspections.map((q) => q.id),
  SupportTicket: supportTickets.map((t) => t.id),
  ProjectSummary: projectSummaries.map((p) => p.id),
  Project: projectSummaries.map((p) => p.id),
  MaterialRequest: materialRequests.map((m) => m.id),
  RequestForQuotation: rfqs.map((r) => r.id),
  SupplierQuotation: supplierQuotations.map((s) => s.id),
  PurchaseOrder: purchaseOrders.map((p) => p.id),
  SalesOrder: salesOrders.map((s) => s.id),
  DeliveryNote: deliveryNotes.map((d) => d.id),
  BillOfMaterials: boms.map((b) => b.id),
  WorkOrder: workOrders.map((w) => w.id),
  JobCard: jobCards.map((j) => j.id),
  ItemGroup: itemGroups.map((g) => g.id),
  UOM: unitsOfMeasure.map((u) => u.id),
  Address: addresses.map((a) => a.id),
  Location: locations.map((l) => l.id),
  Batch: batches.map((b) => b.id),
  SerialNumber: serialNumbers.map((s) => s.id),
  PaymentMethod: paymentMethods.map((p) => p.id),
  POSProfile: posProfiles.map((p) => p.id),
};

describe("meridian demo page registry — every doctype", () => {
  const doctypes = listDoctypes();

  it("registers every doctype-backed sidebar destination", () => {
    expect(doctypes.sort()).toEqual(
      [
        "Customer",
        "Supplier",
        "Party",
        "Item",
        "SalesItem",
        "PurchaseItem",
        "SalesInvoice",
        "CreditNote",
        "PurchaseInvoice",
        "SalesQuote",
        "SalesLifecycleTracker",
        "SalesPayment",
        "PurchasePayment",
        "ProcurementTracker",
        "SupplierScorecard",
        "JournalEntry",
        "PriceList",
        "LoyaltyProgram",
        "Lead",
        "PricingRule",
        "CouponCode",
        "StockMovement",
        "Shipment",
        "PurchaseReceipt",
        "ManufacturingPlan",
        "Tax",
        "AccountingDimension",
        "NumberSeries",
        "PrintTemplate",
        "QualityInspection",
        "SupportTicket",
        "ProjectSummary",
        "Project",
        "MaterialRequest",
        "RequestForQuotation",
        "SupplierQuotation",
        "PurchaseOrder",
        "SalesOrder",
        "DeliveryNote",
        "BillOfMaterials",
        "WorkOrder",
        "JobCard",
        "ItemGroup",
        "UOM",
        "Address",
        "Location",
        "Batch",
        "SerialNumber",
        "PaymentMethod",
        "POSProfile",
      ].sort(),
    );
  });

  it.each(doctypes)("%s: list document validates and renders with no console errors", (doctype) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const entry = getPageRegistryEntry(doctype)!;
    const doc = entry.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
    expect(consoleError, doctype).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each(doctypes)("%s: every linked record's form validates and renders with no console errors", (doctype) => {
    const entry = getPageRegistryEntry(doctype)!;
    const ids = recordIdsByDoctype[doctype] ?? [];
    for (const id of ids) {
      const doc = entry.form(id);
      expect(doc, `${doctype}/${id} should have a form`).toBeDefined();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const parsed = DocumentSchema.parse(doc);
      render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
      expect(consoleError, `${doctype}/${id}`).not.toHaveBeenCalled();
      consoleError.mockRestore();
    }
  });

  it("an unknown record id returns undefined from form() instead of throwing", () => {
    const entry = getPageRegistryEntry("Customer")!;
    expect(entry.form("CUST-DOES-NOT-EXIST")).toBeUndefined();
  });
});

describe("meridian demo — one full list-to-form-to-list journey", () => {
  it("Sales Invoices list shows every invoice, and each invoice's form shows its own real line items and totals", async () => {
    // The list is a "$query" data source — it needs a real UIDocumentRenderer +
    // adapter to resolve, not the single-pass renderUIDocument used for the rest of this file.
    const listDoc = DocumentSchema.parse(getPageRegistryEntry("SalesInvoice")!.list());
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: salesInvoices.map((invoice) => ({ ...invoice })) } });
    const store = createDocumentState(listDoc.state ?? {}).getState();
    render(<UIDocumentRenderer document={listDoc} dataSources={listDoc.dataSources} dataAdapter={adapter} stateStore={store} />);
    // The title belongs to PageHeader (the app shell), not the list body — see List.
    expect(listDoc.name).toBe("Sales Invoices");
    for (const invoice of salesInvoices) {
      await waitFor(() => expect(screen.getByText(invoice.id)).toBeInTheDocument());
    }

    const invoice = salesInvoices[0];
    const formDoc = DocumentSchema.parse(getPageRegistryEntry("SalesInvoice")!.form(invoice.id)!);
    render(<>{renderUIDocument(formDoc, { dataSources: formDoc.dataSources })}</>);
    expect(screen.getByText(`Sales Invoice: ${invoice.id}`)).toBeInTheDocument();
    for (const line of invoice.lines) {
      expect(screen.getAllByText(line.item).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(`Grand Total Rp ${invoice.total.toLocaleString("id-ID")}`)).toBeInTheDocument();
  });
});
