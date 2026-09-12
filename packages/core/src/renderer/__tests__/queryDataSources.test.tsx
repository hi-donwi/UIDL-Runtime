import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createDocumentState } from "../../state/createDocumentState";
import { createInMemoryAdapter } from "../../data/adapters/inMemory";
import type { UIDLDocument } from "../../types";
import { UIDocumentRenderer } from "../UIDocumentRenderer";
import { renderUIDocument } from "../renderDocument";

function seedInvoices() {
  return {
    SalesInvoice: [
      { id: "SINV-001", customer: "Andalan", status: "Overdue" },
      { id: "SINV-002", customer: "Sinar Jaya", status: "Unpaid" },
      { id: "SINV-003", customer: "Walk-in", status: "Paid" },
    ],
  };
}

function invoiceListDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "invoice-list",
    name: "Invoices",
    state: { statusFilter: "Overdue" },
    dataSources: {
      invoices: {
        $query: {
          collection: "SalesInvoice",
          filters: [{ field: "status", op: "eq", value: { $bind: "state.statusFilter" } }],
        },
      },
    },
    root: {
      id: "root",
      type: "Column",
      children: [
        {
          id: "status-loading",
          type: "Text",
          props: { value: "Memuat…" },
          visibility: { condition: { "==": [{ path: "state.$data.invoices.status" }, { literal: "loading" }] } },
        },
        {
          id: "table",
          type: "DataTable",
          props: {
            title: "Invoices",
            dataSource: "invoices",
            columns: [{ key: "id", label: "Invoice" }, { key: "customer", label: "Customer" }],
          },
        },
      ],
    },
  };
}

describe("UIDocumentRenderer · $query dataSources", () => {
  it("resolves rows through the adapter and renders them in the DataTable", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();

    render(
      <UIDocumentRenderer document={invoiceListDocument()} stateStore={store} dataSources={invoiceListDocument().dataSources} dataAdapter={adapter} />,
    );

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());
    expect(screen.queryByText("SINV-002")).not.toBeInTheDocument();
  });

  it("refetches when the $bind filter input changes, and reflects the new rows", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();
    const doc = invoiceListDocument();

    render(<UIDocumentRenderer document={doc} stateStore={store} dataSources={doc.dataSources} dataAdapter={adapter} />);
    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());

    store.setState("statusFilter", "Paid");

    await waitFor(() => expect(screen.getByText("SINV-003")).toBeInTheDocument());
    expect(screen.queryByText("SINV-001")).not.toBeInTheDocument();
  });

  it("does not abort an in-flight fetch when an unrelated state field changes", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 30 });
    const querySpy = vi.spyOn(adapter, "query");
    const store = createDocumentState({ statusFilter: "Overdue", unrelatedCounter: 0 }).getState();
    const doc = invoiceListDocument();

    render(<UIDocumentRenderer document={doc} stateStore={store} dataSources={doc.dataSources} dataAdapter={adapter} />);

    // Mutate an unrelated field while the first query is still in flight.
    store.setState("unrelatedCounter", 1);

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());

    // Exactly one query was issued — the unrelated mutation did not trigger a second one, and
    // the first was not aborted (its result is what's on screen).
    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it("still resolves rows under React.StrictMode's mount/cleanup/remount cycle with a real-latency adapter", async () => {
    // Reproduces the Playwright finding against the real HTTP adapter: StrictMode's
    // dev-mode double-invoke aborts the first effect's in-flight fetch during cleanup, then
    // reruns the effect. If the "already resolved" fingerprint survives that cleanup, the
    // rerun sees an unchanged fingerprint and skips refetching — leaving the query stuck on
    // an aborted request forever. InMemoryAdapter's default 0ms latency masked this in every
    // other test here; a non-trivial latency (matching real network round-trips) reproduces it.
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 20 });
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();
    const doc = invoiceListDocument();

    render(
      <StrictMode>
        <UIDocumentRenderer document={doc} stateStore={store} dataSources={doc.dataSources} dataAdapter={adapter} />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());
    expect(screen.queryByText("Memuat…")).not.toBeInTheDocument();
  });

  it("shows the loading placeholder before rows resolve", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 40 });
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();
    const doc = invoiceListDocument();

    render(<UIDocumentRenderer document={doc} stateStore={store} dataSources={doc.dataSources} dataAdapter={adapter} />);

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("SINV-001")).toBeInTheDocument());
    expect(screen.queryByText("Memuat…")).not.toBeInTheDocument();
  });

  it("surfaces a failed query as state.$data.<name>.error with a DataError code", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), failureRate: 1 });
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();
    const doc = invoiceListDocument();

    render(<UIDocumentRenderer document={doc} stateStore={store} dataSources={doc.dataSources} dataAdapter={adapter} />);

    await waitFor(() => expect(store.getValue("$data.invoices.status")).toBe("error"));
    expect((store.getValue("$data.invoices.error") as { code: string }).code).toBe("server");
  });
});

describe("renderUIDocument · $query without an adapter", () => {
  it("warns once and renders the loading placeholder that never resolves", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createDocumentState({ statusFilter: "Overdue" }).getState();
    const doc = invoiceListDocument();

    const first = renderUIDocument(doc, { stateStore: store, dataSources: doc.dataSources });
    renderUIDocument(doc, { stateStore: store, dataSources: doc.dataSources }); // second call: no repeat warning

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("$query");
    expect(first).toBeTruthy();
    warnSpy.mockRestore();
  });
});
