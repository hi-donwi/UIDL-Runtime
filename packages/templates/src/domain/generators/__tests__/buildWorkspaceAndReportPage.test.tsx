import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { buildWorkspacePage, type WorkspaceSpec } from "../buildWorkspacePage";
import { buildReportPage, type ReportSpec } from "../buildReportPage";

const SAMPLE_WORKSPACE_SPEC: WorkspaceSpec = {
  name: "SalesWorkspace",
  label: { id: "Penjualan & Pendapatan", en: "Sales & Revenue" },
  kpis: [
    { label: { id: "Omset Bulan Ini", en: "Monthly Revenue" }, value: "Rp 128.500.000" },
    { label: { id: "Faktur Jatuh Tempo", en: "Overdue Invoices" }, value: 4 },
  ],
  shortcuts: [
    {
      doctype: "SalesInvoice",
      label: { id: "Faktur Penjualan", en: "Sales Invoices" },
      description: { id: "Kelola faktur dan status pembayaran", en: "Manage invoices and payment status" },
    },
    {
      doctype: "Customer",
      label: { id: "Pelanggan", en: "Customers" },
      description: { id: "Daftar dan profil pelanggan", en: "Customer directory and profiles" },
    },
  ],
  charts: [
    {
      id: "revenue_trend",
      title: { id: "Tren Pendapatan", en: "Revenue Trend" },
      type: "bar",
      xKey: "month",
      yKey: "amount",
      dataSource: [
        { month: "Jan", amount: 45000000 },
        { month: "Feb", amount: 52000000 },
        { month: "Mar", amount: 61000000 },
      ],
    },
  ],
};

const SAMPLE_REPORT_SPEC: ReportSpec = {
  name: "GeneralLedger",
  label: { id: "Buku Besar", en: "General Ledger" },
  columns: [
    { key: "date", label: { id: "Tanggal", en: "Date" }, width: "w-32" },
    { key: "account", label: { id: "Akun", en: "Account" } },
    { key: "debit", label: { id: "Debit", en: "Debit" }, align: "right" },
    { key: "credit", label: { id: "Kredit", en: "Credit" }, align: "right" },
  ],
  filters: [
    {
      field: "account",
      label: { id: "Akun", en: "Account" },
      widget: "Select",
      options: [
        { value: "1110", label: "1110 - Kas Utama" },
        { value: "1120", label: "1120 - Bank Operasional" },
      ],
    },
  ],
  summaries: [
    { label: { id: "Total Debit", en: "Total Debit" }, value: "Rp 50.000.000" },
    { label: { id: "Total Kredit", en: "Total Credit" }, value: "Rp 50.000.000" },
  ],
  dataSource: [
    { date: "2026-08-01", account: "1110 - Kas Utama", debit: "Rp 10.000.000", credit: "Rp 0" },
    { date: "2026-08-02", account: "1120 - Bank Operasional", debit: "Rp 0", credit: "Rp 10.000.000" },
  ],
};

describe("buildWorkspacePage · generator", () => {
  it("produces a valid UIDL document passing DocumentSchema.parse with KPIs and shortcuts", () => {
    const doc = buildWorkspacePage(SAMPLE_WORKSPACE_SPEC, { company: "shoe-company" });
    const parsed = DocumentSchema.parse(doc);
    expect(parsed.id).toBe("workspace-salesworkspace");
    expect(parsed.name).toBe("Penjualan & Pendapatan");
  });

  it("renders with UIDocumentRenderer, displays KPI headline figures and handles shortcut clicks", () => {
    const doc = buildWorkspacePage(SAMPLE_WORKSPACE_SPEC, { company: "shoe-company" });
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    // KPI verification
    expect(screen.getByText("Omset Bulan Ini")).toBeInTheDocument();
    expect(screen.getByText("Rp 128.500.000")).toBeInTheDocument();

    // Shortcut verification
    const invoiceShortcut = screen.getByText("Faktur Penjualan");
    expect(invoiceShortcut).toBeInTheDocument();
    expect(screen.getByText("Kelola faktur dan status pembayaran")).toBeInTheDocument();

    fireEvent.click(invoiceShortcut);
    expect(routeChanges).toContain("/app/shoe-company/list/SalesInvoice");
  });

  it("passes a literal-array chart dataSource through to Chart as `rows`, not the unread `data` prop", () => {
    // Regression for the 2026-08-25 demo-quality audit: this generator used to emit `type` and
    // `data` props, but Chart (src/components/primitives.tsx) reads `chartType` and `rows` — so
    // every workspace chart backed by a literal array (as opposed to a named $query dataSource)
    // silently rendered its "No transactions yet" empty state regardless of the data, and any
    // non-bar `type` (donut, in factory-abc/koperasi-bmt) was silently ignored in favor of the
    // "bar" default. This asserts against the rendered UI, not just the generated node's props,
    // so it fails the same way a user would actually observe it.
    const doc = buildWorkspacePage(SAMPLE_WORKSPACE_SPEC, { company: "shoe-company" });
    render(<UIDocumentRenderer document={doc} />);

    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
    expect(screen.getByText("Tren Pendapatan")).toBeInTheDocument();
  });

  it("honors a declared donut chart type instead of always defaulting to bar", () => {
    const donutSpec: WorkspaceSpec = {
      ...SAMPLE_WORKSPACE_SPEC,
      charts: [{ ...SAMPLE_WORKSPACE_SPEC.charts![0], type: "donut" }],
    };
    const doc = buildWorkspacePage(donutSpec, { company: "koperasi-bmt" });
    render(<UIDocumentRenderer document={doc} />);

    // The donut branch renders a left-side legend list of xKey/yKey pairs that the bar branch
    // does not (see primitives.tsx's `isDonut` conditional) — its presence proves chartType
    // actually reached the component as "donut", not the "bar" default.
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("45000000")).toBeInTheDocument();
  });
});

describe("buildReportPage · generator", () => {
  it("produces a valid UIDL document passing DocumentSchema.parse with filters and summaries", () => {
    const doc = buildReportPage(SAMPLE_REPORT_SPEC, { company: "shoe-company" });
    const parsed = DocumentSchema.parse(doc);
    expect(parsed.id).toBe("report-generalledger");
    expect(parsed.name).toBe("Buku Besar");
  });

  it("renders with UIDocumentRenderer, displays filters, summaries, and table data", () => {
    const doc = buildReportPage(SAMPLE_REPORT_SPEC, { company: "shoe-company" });
    const store = createDocumentState(doc.state ?? {}).getState();

    render(<UIDocumentRenderer document={doc} stateStore={store} />);

    // Report Header & Summaries
    expect(screen.getAllByText("Buku Besar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Total Debit")).toBeInTheDocument();
    expect(screen.getAllByText("Rp 50.000.000").length).toBeGreaterThanOrEqual(1);

    // Table Data
    expect(screen.getAllByText("1110 - Kas Utama").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1120 - Bank Operasional").length).toBeGreaterThanOrEqual(1);
  });

  it("binds $query dataSource and filter states in buildReportPage", () => {
    const queryReportSpec: ReportSpec = {
      name: "DynamicStockReport",
      label: { id: "Laporan Stok Dinamis", en: "Dynamic Stock Report" },
      columns: [
        { key: "itemCode", label: "Kode Item" },
        { key: "warehouse", label: "Gudang" },
      ],
      filters: [
        { field: "warehouse", label: { id: "Gudang", en: "Warehouse" }, widget: "Select" },
      ],
      dataSource: {
        $query: {
          collection: "StockLedgerEntry",
        },
      },
    };

    const doc = buildReportPage(queryReportSpec);
    expect(doc.dataSources?.rows).toBeDefined();
    const query = (doc.dataSources?.rows as { $query: { collection: string; filters: Array<{ field: string }> } }).$query;
    expect(query.collection).toBe("StockLedgerEntry");
    expect(query.filters?.[0]?.field).toBe("warehouse");
  });
});
