import { describe, expect, it, vi } from "vitest";
import { createDocumentState } from "../createDocumentState";
import { isQueryDataSource, resolveQueryDescriptor, runDataSources, serializeResolvedQueries } from "../dataSources";
import { createInMemoryAdapter } from "../../data/adapters/inMemory";
import { DataError } from "../../data/errors";

function seedInvoices() {
  return {
    SalesInvoice: [
      { id: "SINV-001", status: "Overdue", total: 1000 },
      { id: "SINV-002", status: "Unpaid", total: 2000 },
      { id: "SINV-003", status: "Paid", total: 500 },
    ],
  };
}

describe("isQueryDataSource", () => {
  it("recognizes a $query descriptor and rejects arrays / plain objects", () => {
    expect(isQueryDataSource({ $query: { collection: "X" } })).toBe(true);
    expect(isQueryDataSource([1, 2, 3])).toBe(false);
    expect(isQueryDataSource({ collection: "X" })).toBe(false);
    expect(isQueryDataSource(null)).toBe(false);
  });
});

describe("resolveQueryDescriptor", () => {
  it("passes literal filter values through untouched", () => {
    const query = resolveQueryDescriptor(
      { $query: { collection: "SalesInvoice", filters: [{ field: "status", op: "eq", value: "Paid" }] } },
      {},
    );
    expect(query).toEqual({ collection: "SalesInvoice", filters: [{ field: "status", op: "eq", value: "Paid" }] });
  });

  it("resolves $bind against state and session", () => {
    const query = resolveQueryDescriptor(
      {
        $query: {
          collection: "SalesInvoice",
          filters: [{ field: "outlet", op: "eq", value: { $bind: "session.outlet" } }],
          page: { number: { $bind: "state.page" }, size: 20 },
        },
      },
      { state: { page: 3 }, session: { outlet: "Jakarta" } },
    );
    expect(query.page).toEqual({ number: 3, size: 20 });
    expect(query.filters?.[0].value).toBe("Jakarta");
  });

  it("resolves an unreachable $bind path to undefined rather than throwing", () => {
    const query = resolveQueryDescriptor(
      { $query: { collection: "X", search: { $bind: "state.nonexistent.path" } } },
      { state: {} },
    );
    expect(query.search).toBeUndefined();
  });
});

describe("runDataSources", () => {
  it("writes loading then success with rows/total, leaving inline arrays untouched", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState({}).getState();
    const statuses: unknown[] = [];
    store.subscribe(() => statuses.push(store.getValue("$data.invoices.status")));

    await runDataSources(
      { invoices: { $query: { collection: "SalesInvoice" } }, chart: [{ label: "W1", value: 1 }] },
      { adapter, stateStore: store },
    );

    expect(statuses).toContain("loading");
    expect(store.getValue("$data.invoices.status")).toBe("success");
    expect(store.getValue("$data.invoices.total")).toBe(3);
    expect((store.getValue("$data.invoices.rows") as unknown[]).length).toBe(3);
    expect(store.getValue("$data.invoices.error")).toBeNull();
  });

  it("writes error with a DataError code when the adapter rejects", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), failureRate: 1 });
    const store = createDocumentState({}).getState();

    await runDataSources({ invoices: { $query: { collection: "SalesInvoice" } } }, { adapter, stateStore: store });

    expect(store.getValue("$data.invoices.status")).toBe("error");
    expect(store.getValue("$data.invoices.error")).toMatchObject({ code: "server" });
  });

  it("normalizes a non-DataError throw to a server DataError", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    vi.spyOn(adapter, "query").mockRejectedValueOnce(new TypeError("boom"));
    const store = createDocumentState({}).getState();

    await runDataSources({ invoices: { $query: { collection: "SalesInvoice" } } }, { adapter, stateStore: store });

    expect(store.getValue("$data.invoices.status")).toBe("error");
    expect((store.getValue("$data.invoices.error") as { code: string }).code).toBe("server");
  });

  it("treats an AbortError as superseded, not a failure — leaves status untouched", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    vi.spyOn(adapter, "query").mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    const store = createDocumentState({}).getState();

    await runDataSources({ invoices: { $query: { collection: "SalesInvoice" } } }, { adapter, stateStore: store });

    // Only "loading" was ever written for this entry — the abort path writes nothing further.
    expect(store.getValue("$data.invoices.status")).toBe("loading");
    expect(store.getValue("$data.invoices.error")).toBeUndefined();
  });

  it("does nothing when there are no $query entries", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState({}).getState();
    const spy = vi.spyOn(adapter, "query");

    await runDataSources({ chart: [1, 2, 3] }, { adapter, stateStore: store });

    expect(spy).not.toHaveBeenCalled();
  });

  it("resolves $bind filters against live state at call time", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const store = createDocumentState({ statusFilter: "Paid" }).getState();

    await runDataSources(
      {
        invoices: {
          $query: { collection: "SalesInvoice", filters: [{ field: "status", op: "eq", value: { $bind: "state.statusFilter" } }] },
        },
      },
      { adapter, stateStore: store },
    );

    const rows = store.getValue("$data.invoices.rows") as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toEqual(["SINV-003"]);
  });

  it("propagates DataError instances through directly (not double-wrapped)", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    vi.spyOn(adapter, "query").mockRejectedValueOnce(new DataError("nope", "forbidden"));
    const store = createDocumentState({}).getState();

    await runDataSources({ invoices: { $query: { collection: "SalesInvoice" } } }, { adapter, stateStore: store });

    expect(store.getValue("$data.invoices.error")).toEqual({ code: "forbidden", message: "nope" });
  });
});

describe("serializeResolvedQueries", () => {
  it("changes when a $bind input changes, and is stable when it doesn't", () => {
    const descriptor = { $query: { collection: "SalesInvoice", page: { number: { $bind: "state.page" } } } };
    const a = serializeResolvedQueries({ invoices: descriptor }, { state: { page: 1 } });
    const b = serializeResolvedQueries({ invoices: descriptor }, { state: { page: 1 } });
    const c = serializeResolvedQueries({ invoices: descriptor }, { state: { page: 2 } });

    expect(a.invoices).toBe(b.invoices);
    expect(a.invoices).not.toBe(c.invoices);
  });

  it("only includes $query entries, not inline arrays", () => {
    const result = serializeResolvedQueries({ invoices: { $query: { collection: "X" } }, chart: [1, 2] }, {});
    expect(Object.keys(result)).toEqual(["invoices"]);
  });
});
