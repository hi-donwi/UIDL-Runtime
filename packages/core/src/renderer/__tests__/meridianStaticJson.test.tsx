import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { renderUIDocument } from "../renderDocument";
import customerListDocument from "../../../../../packages/templates/src/documents/meridian-customer-list.json";
import salesInvoiceFormDocument from "../../../../../packages/templates/src/documents/meridian-sales-invoice-form.json";
import dashboardDocument from "../../../../../packages/templates/src/documents/meridian-erp-dashboard.json";

/**
 * These three files are committed, plain JSON — generated once from the same builders the live
 * demo uses (`npm run validate:examples` covers them too), proving the generic list/form/
 * dashboard pattern is genuinely portable JSON, not something that only works when produced
 * on-the-fly by a TypeScript function. AI agents or other host projects can load these directly.
 */
describe("meridian demo — representative static JSON documents", () => {
  it("customer list: validates and renders every customer with a working Open route", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = DocumentSchema.parse(customerListDocument);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("sales invoice form: validates and renders real pre-filled line items and totals", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = DocumentSchema.parse(salesInvoiceFormDocument);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
    expect(screen.getByText("Sales Invoice: SINV-2027-00001")).toBeInTheDocument();
    expect(screen.getByText("Total: Rp 34.132.500")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("dashboard: validates and renders real KPIs derived from the ledger", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = DocumentSchema.parse(dashboardDocument);
    render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
    expect(screen.getByText("Total Receivables")).toBeInTheDocument();
    expect(screen.getByText("Total Payables")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
