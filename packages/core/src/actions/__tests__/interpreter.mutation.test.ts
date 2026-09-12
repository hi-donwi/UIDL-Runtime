import { describe, expect, it, vi } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createEventBus } from "../eventBus";
import { createDocumentState } from "../../state/createDocumentState";
import { DataError } from "../../data/errors";
import type { MutationResponse } from "../../types/actions";

function waitForMutationResponse(bus: ReturnType<typeof createEventBus>) {
  return new Promise<MutationResponse>((resolve) => {
    bus.on("mutation-response", (payload) => resolve(payload as MutationResponse));
  });
}

describe("ActionInterpreter - mutate", () => {
  it("calls the host mutationHandler with event-resolved values and writes status/result", async () => {
    const store = createDocumentState({ mutation: {} });
    const bus = createEventBus();
    const mutationHandler = vi.fn().mockResolvedValue({
      record: { id: "SINV-001", status: "Submitted" },
      meta: { version: 2 },
    });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      mutationHandler,
    });

    const responsePromise = waitForMutationResponse(bus);
    interpreter.execute(
      {
        mutate: {
          operation: "transition",
          collection: "SalesInvoice",
          id: { $bind: "event.id" },
          payload: { $bind: "event.patch" },
          transition: { $bind: "event.transition" },
          version: { $bind: "event.version" },
          statusPath: "mutation.status",
          resultPath: "mutation.result",
          errorPath: "mutation.error",
          fieldErrorsPath: "mutation.fieldErrors",
        },
      },
      {
        id: "SINV-001",
        patch: { approvedBy: "user-1" },
        transition: "submit",
        version: 1,
      },
    );

    expect(store.getState().state.mutation).toMatchObject({ status: "loading" });

    const response = await responsePromise;
    const request = {
      operation: "transition" as const,
      collection: "SalesInvoice",
      id: "SINV-001",
      payload: { approvedBy: "user-1" },
      transition: "submit",
      version: 1,
    };
    const result = {
      record: { id: "SINV-001", status: "Submitted" },
      meta: { version: 2 },
    };

    expect(mutationHandler).toHaveBeenCalledWith(request);
    expect(response).toEqual({ success: true, request, data: result });
    expect(store.getState().state.mutation).toEqual({
      status: "success",
      result,
      error: undefined,
      fieldErrors: {},
    });
  });

  it("fails closed when no mutationHandler is configured", async () => {
    const store = createDocumentState({ mutation: {} });
    const bus = createEventBus();
    const snackbarListener = vi.fn();
    bus.on("snackbar", snackbarListener);
    const interpreter = new ActionInterpreter({ stateStore: store.getState(), eventBus: bus });

    const responsePromise = waitForMutationResponse(bus);
    interpreter.execute({
      mutate: {
        operation: "create",
        collection: "SalesInvoice",
        payload: { customer: "Andalan" },
        statusPath: "mutation.status",
        errorPath: "mutation.error",
      },
    });

    const response = await responsePromise;

    expect(response.success).toBe(false);
    expect(response.error).toContain("mutationHandler");
    expect(store.getState().state.mutation).toMatchObject({
      status: "error",
      error: expect.stringContaining("mutationHandler"),
    });
    expect(snackbarListener).toHaveBeenCalledWith({
      message: expect.stringContaining("mutationHandler"),
      duration: 5000,
    });
  });

  it("maps DataError fields to fieldErrorsPath", async () => {
    const store = createDocumentState({ mutation: {} });
    const bus = createEventBus();
    const mutationHandler = vi.fn().mockRejectedValue(
      new DataError("Customer is required", "validation", {
        customer: "Customer is required",
      }),
    );
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      mutationHandler,
    });

    const responsePromise = waitForMutationResponse(bus);
    interpreter.execute({
      mutate: {
        operation: "create",
        collection: "SalesInvoice",
        payload: { total: 1000 },
        statusPath: "mutation.status",
        errorPath: "mutation.error",
        fieldErrorsPath: "mutation.fieldErrors",
      },
    });

    const response = await responsePromise;

    expect(response).toMatchObject({
      success: false,
      error: "Customer is required",
      code: "validation",
      fields: { customer: "Customer is required" },
    });
    expect(store.getState().state.mutation).toMatchObject({
      status: "error",
      error: "Customer is required",
      fieldErrors: { customer: "Customer is required" },
    });
  });

  it("resolves nested payload expressions and runs onSuccess only after the handler resolves", async () => {
    const store = createDocumentState({
      customer: "PT Andalan",
      total: 1250000,
      mutation: {},
    });
    const bus = createEventBus();
    const routeListener = vi.fn();
    bus.on("route-change", routeListener);
    const mutationHandler = vi.fn().mockResolvedValue({ record: { id: "SINV-001" } });
    const interpreter = new ActionInterpreter({
      stateStore: store.getState(),
      eventBus: bus,
      mutationHandler,
    });

    const responsePromise = waitForMutationResponse(bus);
    interpreter.execute({
      mutate: {
        operation: "create",
        collection: "SalesInvoice",
        payload: {
          customer: { $expr: { path: "state.customer" } },
          total: { $expr: { path: "state.total" } },
        },
        statusPath: "mutation.status",
        onSuccess: { navigate: { route: "/app/shoe-company/list/SalesInvoice" } },
      },
    } as never);

    expect(routeListener).not.toHaveBeenCalled();

    await responsePromise;

    expect(mutationHandler).toHaveBeenCalledWith({
      operation: "create",
      collection: "SalesInvoice",
      payload: {
        customer: "PT Andalan",
        total: 1250000,
      },
    });
    expect(routeListener).toHaveBeenCalledWith("/app/shoe-company/list/SalesInvoice");
  });
});
