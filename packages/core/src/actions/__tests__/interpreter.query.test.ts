import { describe, expect, it } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createEventBus } from "../eventBus";
import { createDocumentState } from "../../state/createDocumentState";
import { createInMemoryAdapter } from "../../data";
import type { QueryResponse } from "../../types/actions";

function seedInvoices() {
  return {
    SalesInvoice: [
      { id: "SINV-001", customer: "Andalan", status: "Overdue", total: 1000 },
      { id: "SINV-002", customer: "Sinar Jaya", status: "Unpaid", total: 2000 },
    ],
  };
}

function waitForQueryResponse(bus: ReturnType<typeof createEventBus>) {
  return new Promise<QueryResponse>((resolve) => {
    bus.on("query-response", (payload) => resolve(payload as QueryResponse));
  });
}

describe("ActionInterpreter - query", () => {
  it("re-runs the target $query source through the shared runner and updates $data.<target>", async () => {
    const store = createDocumentState({});
    const bus = createEventBus();
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      dataSources: {
        invoices: { $query: { collection: "SalesInvoice" } },
      },
      dataAdapter: adapter,
    });

    const responsePromise = waitForQueryResponse(bus);
    interpreter.execute({ query: { target: "invoices" } });

    const response = await responsePromise;
    expect(response).toEqual({ success: true, target: "invoices" });
    const dataStore = store.getState().state as Record<string, unknown>;
    const invoices = ((dataStore.$data ?? {}) as Record<string, unknown>).invoices as Record<string, unknown>;
    expect(invoices).toMatchObject({
      status: "success",
      total: 2,
      error: null,
    });
    expect(invoices.rows).toHaveLength(2);
  });

  it("re-resolves $bind params against current state on each run", async () => {
    const store = createDocumentState({ filter: "Overdue" });
    const bus = createEventBus();
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      dataSources: {
        invoices: {
          $query: {
            collection: "SalesInvoice",
            filters: [{ field: "status", op: "eq", value: { $bind: "state.filter" } }],
          },
        },
      },
      dataAdapter: adapter,
    });

    interpreter.execute({ query: { target: "invoices" } });
    await waitForQueryResponse(bus);

    const invoices2 = ((store.getState().state as Record<string, unknown>).$data ?? {}) as Record<string, unknown>;
    expect(invoices2.invoices).toMatchObject({
      rows: [
        { id: "SINV-001", customer: "Andalan", status: "Overdue", total: 1000 },
      ],
    });
  });

  it("is fail-closed without a dataAdapter: reports an error, never a silent no-op", async () => {
    const store = createDocumentState({});
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      dataSources: { invoices: { $query: { collection: "SalesInvoice" } } },
    });

    const responsePromise = waitForQueryResponse(bus);
    const snackbars: { message: string; duration: number }[] = [];
    bus.on("snackbar", (payload) => snackbars.push(payload as { message: string; duration: number }));

    interpreter.execute({ query: { target: "invoices" } });

    const response = await responsePromise;
    expect(response).toMatchObject({ success: false, target: "invoices" });
    expect(response.error).toContain("disabled by default");
    expect(snackbars[0]).toMatchObject({ duration: 5000 });
  });

  it("rejects a target that is not a declared $query source", async () => {
    const store = createDocumentState({});
    const bus = createEventBus();
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      dataSources: { inline: [{ a: 1 }] },
      dataAdapter: adapter,
    });

    const responsePromise = waitForQueryResponse(bus);
    interpreter.execute({ query: { target: "inline" } });

    const response = await responsePromise;
    expect(response.success).toBe(false);
    expect(response.error).toContain('"inline"');
  });

  it("chains onSuccess after the target resolves", async () => {
    const store = createDocumentState({});
    const bus = createEventBus();
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      dataSources: { invoices: { $query: { collection: "SalesInvoice" } } },
      dataAdapter: adapter,
    });

    interpreter.execute({
      query: {
        target: "invoices",
        onSuccess: { setState: { path: "refreshed", value: true } },
      },
    });
    await waitForQueryResponse(bus);

    expect(store.getState().state.refreshed).toBe(true);
  });
});