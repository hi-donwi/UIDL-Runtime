import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentSchema } from "~/schemas/document";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createDocumentState } from "~/state/createDocumentState";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import type { DoctypeMeta } from "../../doctypes/types";
import { buildListPage, parseListQueryParams, serializeListQueryParams } from "../buildListPage";

const SAMPLE_INVOICE_META: DoctypeMeta = {
  name: "SalesInvoice",
  label: { id: "Faktur Penjualan", en: "Sales Invoice" },
  module: "Penjualan",
  naming: "SINV-.YYYY.-.#####",
  titleField: "customer",
  fields: [
    { key: "id", label: { id: "Nomor Faktur", en: "Invoice No" }, widget: "TextField" },
    { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Paid", label: "Paid" },
        { value: "Overdue", label: "Overdue" },
      ],
    },
    { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency", required: true },
    { key: "dueDate", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date" },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "customer" },
      { field: "status", align: "center" },
      { field: "total", align: "right" },
    ],
    filters: [
      { field: "status", widget: "Select" },
      { field: "customer", widget: "TextField" },
    ],
    defaultSort: { field: "dueDate", dir: "desc" },
    pageSize: 10,
    statusField: "status",
    summaries: [
      { label: { id: "Total Faktur", en: "Total Invoices" }, agg: "count", field: "id" },
      { label: { id: "Total Nilai", en: "Total Amount" }, agg: "sum", field: "total" },
    ],
  },
  states: {
    field: "status",
    values: ["Draft", "Unpaid", "Paid", "Overdue"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Kirim", en: "Submit" }, from: ["Draft"], to: "Unpaid" },
      { name: "pay", label: { id: "Bayar", en: "Pay" }, from: ["Unpaid", "Overdue"], to: "Paid" },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

function seedInvoices() {
  return {
    SalesInvoice: [
      { id: "SINV-001", customer: "PT Andalan", status: "Overdue", total: 1500000, dueDate: "2026-08-01", route: "/app/shoe/edit/SalesInvoice/SINV-001" },
      { id: "SINV-002", customer: "CV Sinar Jaya", status: "Unpaid", total: 3000000, dueDate: "2026-08-15", route: "/app/shoe/edit/SalesInvoice/SINV-002" },
      { id: "SINV-003", customer: "PT Andalan", status: "Paid", total: 500000, dueDate: "2026-07-20", route: "/app/shoe/edit/SalesInvoice/SINV-003" },
      { id: "SINV-004", customer: "Toko Makmur", status: "Draft", total: 800000, dueDate: "2026-08-25", route: "/app/shoe/edit/SalesInvoice/SINV-004" },
    ],
  };
}

describe("buildListPage · generator", () => {
  it("produces a valid UIDL document passing DocumentSchema.parse", () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const parsed = DocumentSchema.parse(doc);
    expect(parsed.id).toBe("list-salesinvoice");
    expect(parsed.name).toBe("Faktur Penjualan");
    expect(parsed.dataSources).toBeDefined();
    expect(parsed.dataSources?.rows).toBeDefined();
  });

  it("supports English localization and custom docId", () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { lang: "en", docId: "custom-invoice-list" });
    expect(doc.id).toBe("custom-invoice-list");
    expect(doc.name).toBe("Sales Invoice");
  });

  it("configures $query data source with collection, filters, sort, page, and search", () => {
    const doc = buildListPage(SAMPLE_INVOICE_META);
    const querySource = doc.dataSources?.rows as { $query: Record<string, unknown> };
    expect(querySource.$query.collection).toBe("SalesInvoice");
    expect(querySource.$query.filters).toHaveLength(2);
    expect(querySource.$query.sort).toEqual([{ field: { $bind: "state.sortField" }, dir: { $bind: "state.sortDir" } }]);
    expect(querySource.$query.page).toEqual({ number: { $bind: "state.page" }, size: { $bind: "state.pageSize" } });
    expect(querySource.$query.search).toEqual({ $bind: "state.search" });
  });

  it("includes summaries KPI section when meta.listView.summaries is declared", () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { lang: "id" });
    const rootChildren = (doc.root as { children: Array<{ id: string }> }).children;
    const summaryNode = rootChildren.find((c) => c.id === "list-summaries");
    expect(summaryNode).toBeDefined();
  });
});

describe("buildListPage · integration with UIDocumentRenderer", () => {
  it("renders rows from the adapter in DataTable", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());
    expect(screen.getByText("CV Sinar Jaya")).toBeInTheDocument();
    expect(screen.getByText("Toko Makmur")).toBeInTheDocument();
  });

  it("filters table rows when a Select filter changes in state", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());

    // Filter by status Paid
    store.setState("filter_status", "Paid");

    await waitFor(() => expect(screen.getByText("SINV-003")).toBeInTheDocument());
    expect(screen.queryByText("SINV-001")).not.toBeInTheDocument();
    expect(screen.queryByText("SINV-002")).not.toBeInTheDocument();
    expect(screen.queryByText("SINV-004")).not.toBeInTheDocument();
  });

  it("filters table rows when search input changes", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => expect(screen.getByText("CV Sinar Jaya")).toBeInTheDocument());

    // Search for Sinar
    store.setState("search", "Sinar");

    await waitFor(() => expect(screen.getByText("CV Sinar Jaya")).toBeInTheDocument());
    expect(screen.queryByText("PT Andalan")).not.toBeInTheDocument();
    expect(screen.queryByText("Toko Makmur")).not.toBeInTheDocument();
  });

  it("handles sorting by field and direction", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());

    // Sort by total ascending
    store.setState("sortField", "total");
    store.setState("sortDir", "asc");

    await waitFor(() => {
      const rows = store.getValue("$data.rows.rows") as Array<{ id: string }>;
      expect(rows.map((r) => r.id)).toEqual(["SINV-003", "SINV-004", "SINV-001", "SINV-002"]);
    });
  });

  it("handles pagination through page state", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company", initialState: { pageSize: 2 } });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => {
      const rows = store.getValue("$data.rows.rows") as Array<{ id: string }>;
      expect(rows).toHaveLength(2);
    });

    // Go to page 2
    store.setState("page", 2);

    await waitFor(() => {
      const rows = store.getValue("$data.rows.rows") as Array<{ id: string }>;
      expect(rows).toHaveLength(2);
      expect(store.getValue("$data.rows.total")).toBe(4);
    });
  });

  it("fires route-change event when row action 'Buka'/'Open' is clicked", async () => {
    const doc = buildListPage(SAMPLE_INVOICE_META, { company: "shoe-company" });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    await waitFor(() => expect(screen.getAllByText("Buka")).toHaveLength(4));

    fireEvent.click(screen.getAllByText("Buka")[1]);
    expect(routeChanges).toContain("/app/shoe/edit/SalesInvoice/SINV-002");
  });
});

describe("Query Parameter Synchronization", () => {
  it("parseListQueryParams extracts page, pageSize, sort, q, and filter values", () => {
    const params = new URLSearchParams("page=3&pageSize=50&sort=-total&q=Andalan&status=Unpaid&customer=PT");
    const parsed = parseListQueryParams(params, SAMPLE_INVOICE_META);

    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.sortField).toBe("total");
    expect(parsed.sortDir).toBe("desc");
    expect(parsed.search).toBe("Andalan");
    expect(parsed.filter_status).toBe("Unpaid");
    expect(parsed.filter_customer).toBe("PT");
  });

  it("serializeListQueryParams serializes state to URLSearchParams omitting defaults", () => {
    const state = {
      page: 2,
      pageSize: 20,
      sortField: "dueDate",
      sortDir: "desc", // matches defaultSort
      search: "Acme",
      filter_status: "Paid",
      filter_customer: "",
    };

    const params = serializeListQueryParams(state, SAMPLE_INVOICE_META);
    expect(params.get("page")).toBe("2");
    expect(params.get("q")).toBe("Acme");
    expect(params.get("status")).toBe("Paid");
    expect(params.has("customer")).toBe(false);
    expect(params.has("sort")).toBe(false); // default sort omitted
  });

  it("serializeListQueryParams includes non-default sort", () => {
    const state = {
      sortField: "total",
      sortDir: "asc",
    };
    const params = serializeListQueryParams(state, SAMPLE_INVOICE_META);
    expect(params.get("sort")).toBe("total");
  });

  it("prioritizes filter.options declared on meta.listView.filters over fieldMeta.options", () => {
    const customMeta: DoctypeMeta = {
      ...SAMPLE_INVOICE_META,
      listView: {
        ...SAMPLE_INVOICE_META.listView,
        filters: [
          {
            field: "status",
            widget: "Select",
            options: [
              { value: "Draft", label: "Draft Only" },
              { value: "Paid", label: "Paid Only" },
            ],
          },
        ],
      },
    };

    const doc = buildListPage(customMeta);
    const filterNode = JSON.stringify(doc);
    expect(filterNode).toContain("Draft Only");
    expect(filterNode).toContain("Paid Only");
  });

  it("filters rows immediately when initialState contains filter_status from URL params", async () => {
    const parsedState = parseListQueryParams("filter_status=Paid", SAMPLE_INVOICE_META);
    const doc = buildListPage(SAMPLE_INVOICE_META, {
      company: "shoe-company",
      initialState: parsedState,
    });
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        dataSources={doc.dataSources}
        dataAdapter={adapter}
        stateStore={store}
      />,
    );

    await waitFor(() => {
      const rows = store.getValue("$data.rows.rows") as Array<{ id: string; status: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("SINV-003");
      expect(rows[0].status).toBe("Paid");
    });
  });
});
