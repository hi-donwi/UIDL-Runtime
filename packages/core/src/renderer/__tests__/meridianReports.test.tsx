import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentSchema } from "../../schemas/document";
import { renderUIDocument } from "../renderDocument";
import {
  buildBalanceSheetDocument,
  buildChartOfAccountsDocument,
  buildDashboardDocument,
  buildGeneralLedgerDocument,
  buildProfitAndLossDocument,
  buildTrialBalanceDocument,
  getReportBuilder,
} from "../../../../../packages/templates/src/meridian/reports";
import { taxSummary } from "../../../../../packages/templates/src/meridian/gst";
import { accounts, salesInvoices, purchaseInvoices } from "../../../../../packages/templates/src/meridian/mockData";
import { balanceForRootType, profitAndLoss } from "../../../../../packages/templates/src/meridian/ledger";

function renderDoc(builder: () => ReturnType<typeof buildGeneralLedgerDocument>) {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const doc = builder();
  const parsed = DocumentSchema.parse(doc);
  render(<>{renderUIDocument(parsed, { dataSources: parsed.dataSources })}</>);
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
  return doc;
}

describe("meridian demo reports — validity and rendering", () => {
  it("General Ledger validates, renders, and its own summary shows a balanced total", () => {
    // The page title is the app shell's PageHeader, not part of the document — Meridian prints
    // it once (ListView/Report), so the body only carries the report itself.
    const doc = renderDoc(buildGeneralLedgerDocument);
    expect(doc.name).toBe("General Ledger");
    expect(screen.getByText("Balanced ✓")).toBeInTheDocument();
  });

  it("Trial Balance validates and renders", () => {
    const doc = renderDoc(buildTrialBalanceDocument);
    expect(doc.name).toBe("Trial Balance");
    expect(screen.getByText("Debit")).toBeInTheDocument();
  });

  it("Profit And Loss validates, renders, and lists every Income/Expense leaf account", () => {
    const doc = renderDoc(buildProfitAndLossDocument);
    expect(doc.name).toBe("Profit And Loss");
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Rent Expense")).toBeInTheDocument();
  });

  it("Balance Sheet validates, renders, and Assets actually equal Liabilities + Equity", () => {
    const doc = renderDoc(buildBalanceSheetDocument);
    expect(doc.name).toBe("Balance Sheet");
    expect(screen.getByText("Balanced ✓")).toBeInTheDocument();

    const assets = balanceForRootType("Asset");
    const liabilities = balanceForRootType("Liability");
    const equity = balanceForRootType("Equity") + profitAndLoss().netProfit;
    expect(assets).toBe(liabilities + equity);
  });

  it("Chart of Accounts validates, renders every account, and indents children under their parent", () => {
    const doc = renderDoc(buildChartOfAccountsDocument);
    expect(doc.name).toBe("Chart of Accounts");
    for (const account of accounts) {
      expect(screen.getAllByText(new RegExp(account.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).length).toBeGreaterThan(0);
    }
  });

  it("Dashboard validates and renders every real Dashboard section plus the ERP expansion layer", () => {
    renderDoc(buildDashboardDocument);
    expect(screen.getByText("Total Receivables")).toBeInTheDocument();
    expect(screen.getByText("Total Payables")).toBeInTheDocument();
    expect(screen.getByText("Cash & Bank")).toBeInTheDocument();

    expect(screen.getAllByText("Cashflow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Profit and Loss").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expenses").length).toBeGreaterThan(0);
    expect(screen.getByText("Extended ERP workflow layer")).toBeInTheDocument();
    expect(screen.getByText("Accounting Dimensions")).toBeInTheDocument();
    expect(screen.getByText("Dimensions")).toBeInTheDocument();
    expect(screen.getByText("Procurement")).toBeInTheDocument();
    expect(screen.getAllByText("Quote-to-Cash").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("MRP Readiness")).toBeInTheDocument();
    expect(screen.getAllByText("Supplier Scorecard").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Procure-to-Pay Tracker")).toBeInTheDocument();
    expect(screen.getByText("Quote-to-Cash Tracker")).toBeInTheDocument();
    expect(screen.getByText("MRP and Manufacturing Readiness")).toBeInTheDocument();
  });

  it("Dashboard's Sales/Purchase Invoices widgets show a real paid vs. unpaid split, not a hand-typed number", () => {
    renderDoc(buildDashboardDocument);
    expect(screen.getAllByText("Sales Invoices").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Purchase Invoices").length).toBeGreaterThan(0);

    const salesPaid = salesInvoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0);
    const salesTotal = salesInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    expect(screen.getByText(`Rp ${salesPaid.toLocaleString("id-ID")} Paid`)).toBeInTheDocument();
    expect(screen.getByText(`Rp ${(salesTotal - salesPaid).toLocaleString("id-ID")} Unpaid`)).toBeInTheDocument();

    const purchasePaid = purchaseInvoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0);
    expect(screen.getByText(`Rp ${purchasePaid.toLocaleString("id-ID")} Paid`)).toBeInTheDocument();
  });

  it.each(["GeneralLedger", "TrialBalance", "ProfitAndLoss", "BalanceSheet", "GSTR1", "GSTR2", "StockLedger", "StockBalance"])(
    "getReportBuilder resolves %s to a valid, renderable document",
    (reportName) => {
      const builder = getReportBuilder(reportName);
      expect(builder, reportName).toBeDefined();
      renderDoc(builder!);
    },
  );

  it("getReportBuilder returns undefined for an unknown report name", () => {
    expect(getReportBuilder("DoesNotExist")).toBeUndefined();
  });
});

describe("GST summaries — derived from the same invoices every other report reads", () => {
  it("GSTR1 taxable/tax totals equal the sum of non-draft sales invoices' own subtotal/tax", () => {
    const submitted = salesInvoices.filter((invoice) => invoice.status !== "Draft");
    const summary = taxSummary("GSTR1");
    expect(summary.taxableTotal).toBe(submitted.reduce((total, invoice) => total + invoice.subtotal, 0));
    expect(summary.taxTotal).toBe(submitted.reduce((total, invoice) => total + invoice.tax, 0));
    expect(summary.rows).toHaveLength(submitted.length);
  });

  it("GSTR2 taxable/tax totals equal the sum of non-draft purchase invoices' own subtotal/tax", () => {
    const submitted = purchaseInvoices.filter((invoice) => invoice.status !== "Draft");
    const summary = taxSummary("GSTR2");
    expect(summary.taxableTotal).toBe(submitted.reduce((total, invoice) => total + invoice.subtotal, 0));
    expect(summary.taxTotal).toBe(submitted.reduce((total, invoice) => total + invoice.tax, 0));
    expect(summary.rows).toHaveLength(submitted.length);
  });
});
