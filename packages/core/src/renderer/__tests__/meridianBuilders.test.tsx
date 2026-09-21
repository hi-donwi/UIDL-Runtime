import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { renderUIDocument } from "../renderDocument";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { createDocumentState } from "../../state/createDocumentState";
import { accountingDimensions, customers, manufacturingPlans, procurementTracker, salesLifecycleTracker, supplierScorecards } from "../../../../../packages/templates/src/meridian/mockData";
import { buildListDocument, buildFlatFormDocument, formatIDR } from "../../../../../packages/templates/src/meridian/buildDocument";
import { customerOutstanding } from "../../../../../packages/templates/src/meridian/ledger";
import { getPageRegistryEntry } from "../../../../../packages/templates/src/meridian/pages";

describe("meridian demo generic list builder", () => {
  it("builds a valid, renderable list document with real per-row navigation", () => {
    const doc = buildListDocument({
      docId: "meridian-customer-list",
      title: "Customers",
      columns: [
        { key: "name", label: "Customer" },
        { key: "city", label: "City" },
        { key: "outstanding", label: "Outstanding", align: "right" },
      ],
      records: customers.map((customer) => ({
        route: `/meridian/edit/Customer/${customer.id}`,
        cells: {
          name: customer.name,
          city: customer.city,
          outstanding: formatIDR(customerOutstanding(customer.id)),
        },
      })),
    });

    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    // Meridian's list carries no title and no record-count line of its own — PageHeader (the app
    // shell) prints the title, and the row count is the index gutter, which numbers each row.
    expect(doc.name).toBe("Customers");
    for (const [index, customer] of customers.entries()) {
      expect(screen.getByText(customer.name)).toBeInTheDocument();
      expect(screen.getAllByText(String(index + 1)).length).toBeGreaterThan(0);
    }
  });

  it("rows carry a real, distinct navigate route per record (List navigates on row click)", () => {
    const doc = buildListDocument({
      docId: "meridian-customer-list-2",
      title: "Customers",
      columns: [{ key: "name", label: "Customer" }],
      records: customers.slice(0, 2).map((customer) => ({
        route: `/meridian/edit/Customer/${customer.id}`,
        cells: { name: customer.name },
      })),
    });

    const parsed = DocumentSchema.parse(doc);
    const routeChanges: unknown[] = [];
    render(<UIDocumentRenderer document={parsed} onRouteChange={(route) => routeChanges.push(route)} />);

    // The whole row is the click target, exactly as in List.
    const secondRow = screen.getByText(customers[1].name).closest("[data-node-id='list-row-1']");
    expect(secondRow).not.toBeNull();
    fireEvent.click(secondRow as HTMLElement);
    expect(routeChanges).toEqual([`/meridian/edit/Customer/${customers[1].id}`]);
  });
});

describe("meridian demo Accounting Dimensions doctype", () => {
  it("renders the Accounting Dimensions list from shared ERP mock data", () => {
    const entry = getPageRegistryEntry("AccountingDimension");
    expect(entry).toBeDefined();

    const doc = entry!.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    for (const dimension of accountingDimensions) {
      expect(screen.getAllByText(dimension.dimensionName).length).toBeGreaterThan(0);
      expect(screen.getAllByText(dimension.referenceDocType).length).toBeGreaterThan(0);
    }
  });

  it("renders an Accounting Dimension form prefilled from the selected dimension", () => {
    const entry = getPageRegistryEntry("AccountingDimension");
    const dimension = accountingDimensions[0];
    const doc = entry!.form(dimension.id);
    expect(doc).toBeDefined();

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByText(`Accounting Dimension: ${dimension.dimensionName}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Dimension Name")).toHaveValue(dimension.dimensionName);
    expect(screen.getByLabelText("Reference DocType")).toHaveValue(dimension.referenceDocType);
    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});

describe("meridian demo Procurement Tracker doctype", () => {
  it("renders the Procurement Tracker list from shared ERP mock data", () => {
    const entry = getPageRegistryEntry("ProcurementTracker");
    expect(entry).toBeDefined();

    const doc = entry!.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    for (const row of procurementTracker) {
      expect(screen.getByText(row.materialRequest)).toBeInTheDocument();
      expect(screen.getByText(row.purchaseOrder)).toBeInTheDocument();
    }
  });

  it("renders a Procurement Tracker form with the linked procure-to-pay documents", () => {
    const entry = getPageRegistryEntry("ProcurementTracker");
    const row = procurementTracker[0];
    const doc = entry!.form(row.id);
    expect(doc).toBeDefined();

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByText(`Procurement Tracker: ${row.id}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Material Request")).toHaveValue(row.materialRequest);
    expect(screen.getByLabelText("Request for Quotation")).toHaveValue(row.rfq);
    expect(screen.getByLabelText("Receipt Status")).toHaveValue(row.receiptStatus);
  });
});

describe("meridian demo Quote-to-Cash Tracker doctype", () => {
  it("renders the Quote-to-Cash Tracker list from shared ERP mock data", () => {
    const entry = getPageRegistryEntry("SalesLifecycleTracker");
    expect(entry).toBeDefined();

    const doc = entry!.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    for (const row of salesLifecycleTracker) {
      expect(screen.getByText(row.quotation)).toBeInTheDocument();
      expect(screen.getByText(row.salesOrder)).toBeInTheDocument();
    }
  });

  it("renders a Quote-to-Cash Tracker form with linked sales lifecycle documents", () => {
    const entry = getPageRegistryEntry("SalesLifecycleTracker");
    const row = salesLifecycleTracker[0];
    const doc = entry!.form(row.id);
    expect(doc).toBeDefined();

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByText(`Quote-to-Cash Tracker: ${row.id}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Quotation")).toHaveValue(row.quotation);
    expect(screen.getByLabelText("Sales Order")).toHaveValue(row.salesOrder);
    expect(screen.getByLabelText("Payment Reminder")).toHaveValue(row.paymentReminder);
  });
});

describe("meridian demo Manufacturing Plan doctype", () => {
  it("renders the MRP and Manufacturing Readiness list from shared ERP mock data", () => {
    const entry = getPageRegistryEntry("ManufacturingPlan");
    expect(entry).toBeDefined();

    const doc = entry!.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    for (const plan of manufacturingPlans) {
      expect(screen.getAllByText(plan.productionPlan).length).toBeGreaterThan(0);
      expect(screen.getByText(plan.item)).toBeInTheDocument();
    }
  });

  it("renders a Manufacturing Plan form with material and work-order readiness fields", () => {
    const entry = getPageRegistryEntry("ManufacturingPlan");
    const plan = manufacturingPlans[0];
    const doc = entry!.form(plan.id);
    expect(doc).toBeDefined();

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByText(`Manufacturing Plan: ${plan.id}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Production Plan")).toHaveValue(plan.productionPlan);
    expect(screen.getByLabelText("Material Request")).toHaveValue(plan.materialRequest);
    expect(screen.getByLabelText("Readiness Gate")).toHaveValue(plan.qcGate);
  });
});

describe("meridian demo Supplier Scorecard doctype", () => {
  it("renders the Supplier Scorecard list from shared ERP mock data", () => {
    const entry = getPageRegistryEntry("SupplierScorecard");
    expect(entry).toBeDefined();

    const doc = entry!.list();
    const parsed = DocumentSchema.parse(doc);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);

    for (const scorecard of supplierScorecards) {
      expect(screen.getByText(scorecard.supplier)).toBeInTheDocument();
      expect(screen.getByText(scorecard.standing)).toBeInTheDocument();
    }
  });

  it("renders a Supplier Scorecard form with vendor performance fields", () => {
    const entry = getPageRegistryEntry("SupplierScorecard");
    const scorecard = supplierScorecards[0];
    const doc = entry!.form(scorecard.id);
    expect(doc).toBeDefined();

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByText(`Supplier Scorecard: ${scorecard.supplier}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Supplier")).toHaveValue(scorecard.supplier);
    expect(screen.getByLabelText("On-Time Delivery Rate (%)")).toHaveValue(String(scorecard.onTimeDeliveryRate));
    expect(screen.getByLabelText("Standing")).toHaveValue(scorecard.standing);
  });
});

describe("meridian demo generic form builder", () => {
  it("builds a valid, renderable form pre-filled from record values, editable via two-way binding", () => {
    const customer = customers[0];
    const doc = buildFlatFormDocument({
      docId: "meridian-customer-form",
      title: `Customer: ${customer.name}`,
      fields: [
        { key: "name", label: "Customer Name", widget: "TextField", value: customer.name },
        { key: "city", label: "City", widget: "TextField", value: customer.city },
      ],
      listRoute: "/meridian/list/Customer",
    });

    const parsed = DocumentSchema.parse(doc);
    const stateStore = createDocumentState(parsed.state ?? {}).getState();
    render(<UIDocumentRenderer document={parsed} stateStore={stateStore} />);

    expect(screen.getByLabelText("Customer Name")).toHaveValue(customer.name);
    fireEvent.change(screen.getByLabelText("Customer Name"), { target: { value: "Updated Name Co." } });
    expect(screen.getByLabelText("Customer Name")).toHaveValue("Updated Name Co.");
    expect(stateStore.getValue("name")).toBe("Updated Name Co.");

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("Save and Cancel both navigate back to the list route", () => {
    const doc = buildFlatFormDocument({
      docId: "meridian-customer-form-2",
      title: "Customer",
      fields: [{ key: "name", label: "Name", widget: "TextField", value: "Test" }],
      listRoute: "/meridian/list/Customer",
    });
    const parsed = DocumentSchema.parse(doc);
    const routeChanges: unknown[] = [];
    render(<UIDocumentRenderer document={parsed} onRouteChange={(route) => routeChanges.push(route)} />);

    fireEvent.click(screen.getByText("Save"));
    expect(routeChanges).toEqual(["/meridian/list/Customer"]);
  });
});
