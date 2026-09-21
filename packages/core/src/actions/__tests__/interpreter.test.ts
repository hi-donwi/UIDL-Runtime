import { describe, it, expect, vi } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createDocumentState } from "../../state/createDocumentState";
import { createEventBus } from "../eventBus";

describe("action interpreter", () => {
  it("executes setState action", () => {
    const store = createDocumentState({ count: 0 });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({
      setState: { path: "count", value: 5 },
    });

    expect(store.getState().state.count).toBe(5);
  });

  it("executes setState with nested path", () => {
    const store = createDocumentState({ user: { name: "Alice" } });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({
      setState: { path: "user.name", value: "Bob" },
    });

    expect((store.getState().state.user as Record<string, string>).name).toBe("Bob");
  });

  it("rejects document setState targeting the reserved $data envelope", () => {
    const store = createDocumentState({ count: 0 });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    const report = interpreter.run({
      setState: { path: "$data.invoices.status", value: "success" },
    });

    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("INVALID_STATE");
    expect(store.getState().state.$data).toBeUndefined();
    expect(store.getState().state.count).toBe(0);
  });

  it("rejects document setState targeting $data even with a state. prefix", () => {
    const store = createDocumentState({});
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    const report = interpreter.run({
      setState: { path: "state.$data.rows", value: [] },
    });

    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("INVALID_STATE");
    expect(store.getState().state.$data).toBeUndefined();
  });

  it("still allows the runtime store to write $data for the query runner", () => {
    const store = createDocumentState({});
    store.getState().setState("$data.invoices.status", "loading");
    expect(store.getState().getValue("$data.invoices.status")).toBe("loading");
  });

  it("executes sequence of actions", () => {
    const store = createDocumentState({ a: 1, b: 2 });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({
      sequence: [
        { setState: { path: "a", value: 10 } },
        { setState: { path: "b", value: 20 } },
      ],
    });

    expect(store.getState().state.a).toBe(10);
    expect(store.getState().state.b).toBe(20);
  });

  it("executes if-then-else", () => {
    const store = createDocumentState({ flag: true, value: 0 });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({
      if: {
        condition: { "==": [{ path: "state.flag" }, true] },
        then: { setState: { path: "value", value: "yes" } },
        else: { setState: { path: "value", value: "no" } },
      },
    });

    expect(store.getState().state.value).toBe("yes");
  });

  it("executes else branch when condition is false", () => {
    const store = createDocumentState({ flag: false, value: 0 });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({
      if: {
        condition: { "==": [{ path: "state.flag" }, true] },
        then: { setState: { path: "value", value: "yes" } },
        else: { setState: { path: "value", value: "no" } },
      },
    });

    expect(store.getState().state.value).toBe("no");
  });

  it("emits snackbar event", () => {
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });
    const listener = vi.fn();
    bus.on("snackbar", listener);

    interpreter.execute({
      showSnackbar: { message: "Hello", duration: 1000 },
    });

    expect(listener).toHaveBeenCalledWith({ message: "Hello", duration: 1000 });
  });

  it("emits dialog event", () => {
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });
    const listener = vi.fn();
    bus.on("dialog", listener);

    interpreter.execute({
      showDialog: { title: "Title", content: "Content" },
    });

    expect(listener).toHaveBeenCalledWith({ title: "Title", content: "Content" });
  });

  it("emits route-change event", () => {
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });
    const listener = vi.fn();
    bus.on("route-change", listener);

    interpreter.execute({
      navigate: { route: "/home" },
    });

    expect(listener).toHaveBeenCalledWith("/home");
  });

  it("handles empty action without throwing", () => {
    const store = createDocumentState({});
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    expect(() => interpreter.execute({} as never)).not.toThrow();
  });

  it("passes eventValue to setState when value is the null placeholder (the documented two-way-binding convention)", () => {
    const store = createDocumentState({ text: "" });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({ setState: { path: "text", value: null } }, "new-value");

    expect(store.getState().state.text).toBe("new-value");
  });

  it("a literal or $expr value wins over eventValue when value isn't the null placeholder", () => {
    // Regression test: an earlier version let eventValue override *any* value whenever it was
    // defined, not just the documented `value: null` placeholder — found while wiring
    // DataTable row actions, where eventValue (the whole clicked row) is always defined, and a
    // row action's own literal setState value (e.g. `"archived"`) must not be silently discarded.
    const store = createDocumentState({ text: "" });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({ setState: { path: "text", value: { $expr: { literal: "__EVENT__" } } } }, "new-value");

    expect(store.getState().state.text).toBe("__EVENT__");
  });

  it("setState value: {\"$bind\": \"event\"} uses the whole eventValue regardless of its shape", () => {
    const store = createDocumentState({ selected: null });
    const interpreter = new ActionInterpreter({ stateStore: store.getState() });

    interpreter.execute({ setState: { path: "selected", value: { $bind: "event" } } }, { id: "row-1" });

    expect(store.getState().state.selected).toEqual({ id: "row-1" });
  });

  it("navigate route: {\"$bind\": \"event.<path>\"} resolves a field from eventValue", () => {
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });
    const listener = vi.fn();
    bus.on("route-change", listener);

    interpreter.execute({ navigate: { route: { $bind: "event.route" } } }, { route: "/edit/1", id: "1" });

    expect(listener).toHaveBeenCalledWith("/edit/1");
  });

  it("navigate route: {\"$bind\": \"event.<path>\"} does not emit route-change when the path is missing", () => {
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });
    const listener = vi.fn();
    bus.on("route-change", listener);

    interpreter.execute({ navigate: { route: { $bind: "event.route" } } }, { id: "1" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("executes host command actions through an explicit handler", async () => {
    const bus = createEventBus();
    const store = createDocumentState({ status: "idle" });
    const commandHandler = vi.fn().mockResolvedValue({ saved: true });
    const responses: unknown[] = [];
    bus.on("command-response", (payload) => responses.push(payload));
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      stateStore: store.getState(),
      commandHandler,
    });

    interpreter.execute(
      {
        command: {
          name: "workspace.schema.save",
          payload: { id: { $bind: "event.id" } },
          resultPath: "lastCommand",
          statusPath: "status",
        },
      },
      { id: "schema-1" },
    );

    await vi.waitFor(() => expect(commandHandler).toHaveBeenCalledTimes(1));
    expect(commandHandler).toHaveBeenCalledWith({
      name: "workspace.schema.save",
      payload: { id: "schema-1" },
    });
    expect(store.getState().state.status).toBe("success");
    expect(store.getState().state.lastCommand).toEqual({ saved: true });
    expect(responses).toEqual([
      {
        success: true,
        request: { name: "workspace.schema.save", payload: { id: "schema-1" } },
        data: { saved: true },
      },
    ]);
  });

  it("fails closed when command actions have no handler", async () => {
    const bus = createEventBus();
    const store = createDocumentState({ status: "idle" });
    const responses: unknown[] = [];
    const snackbars: unknown[] = [];
    bus.on("command-response", (payload) => responses.push(payload));
    bus.on("snackbar", (payload) => snackbars.push(payload));
    const interpreter = new ActionInterpreter({ eventBus: bus, stateStore: store.getState() });

    interpreter.execute({
      command: {
        name: "workspace.schema.save",
        errorPath: "error",
        statusPath: "status",
      },
    });

    await vi.waitFor(() => expect(responses).toHaveLength(1));
    expect(store.getState().state.status).toBe("error");
    expect(store.getState().state.error).toContain('"command" actions are disabled by default');
    expect(responses[0]).toMatchObject({
      success: false,
      request: { name: "workspace.schema.save" },
    });
    expect(snackbars[0]).toMatchObject({ duration: 5000 });
  });

  describe("run() reports", () => {
    it("returns { ok: true } for a recognised action", () => {
      const store = createDocumentState({ count: 0 });
      const interpreter = new ActionInterpreter({ stateStore: store.getState() });

      const report = interpreter.run({ setState: { path: "count", value: 1 } });

      expect(report).toEqual({ ok: true, action: { setState: { path: "count", value: 1 } } });
      expect(store.getState().state.count).toBe(1);
    });

    it("returns { ok: false, code: UNKNOWN_ACTION } for an unrecognised action type", () => {
      const interpreter = new ActionInterpreter();
      const action = { type: "teleport", to: "void" } as never;

      const report = interpreter.run(action);

      expect(report.ok).toBe(false);
      expect(report.error).toMatchObject({ code: "UNKNOWN_ACTION" });
      expect(report.error?.message).toContain("no handler for");
      expect(report.error?.message).toContain('"teleport"');
    });

    it("execute() still swallows an unknown action instead of throwing", () => {
      const interpreter = new ActionInterpreter();
      expect(() => interpreter.execute({ type: "teleport", to: "void" } as never)).not.toThrow();
    });
  });
});
