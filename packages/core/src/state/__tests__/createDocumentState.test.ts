import { describe, it, expect } from "vitest";
import { createDocumentState, getByPath, setByPath } from "../createDocumentState";

describe("createDocumentState", () => {
  it("initializes with empty state by default", () => {
    const store = createDocumentState();
    expect(store.getState().state).toEqual({});
  });

  it("initializes with provided state", () => {
    const store = createDocumentState({ count: 5, name: "test" });
    expect(store.getState().state).toEqual({ count: 5, name: "test" });
  });

  it("getValue returns full state when called without path", () => {
    const store = createDocumentState({ a: 1 });
    expect(store.getState().getValue()).toEqual({ a: 1 });
  });

  it("getValue returns nested value by path", () => {
    const store = createDocumentState({ user: { name: "Alice" } });
    expect(store.getState().getValue("user.name")).toBe("Alice");
  });

  it("getValue returns undefined for missing path", () => {
    const store = createDocumentState({ a: 1 });
    expect(store.getState().getValue("missing")).toBeUndefined();
    expect(store.getState().getValue("a.b.c")).toBeUndefined();
  });

  it("setState sets value at top-level path", () => {
    const store = createDocumentState({ a: 1 });
    store.getState().setState("b", 2);
    expect(store.getState().state).toEqual({ a: 1, b: 2 });
  });

  it("setState sets value at nested path", () => {
    const store = createDocumentState({});
    store.getState().setState("user.name", "Alice");
    expect(store.getState().state).toEqual({ user: { name: "Alice" } });
  });

  it("setState overwrites existing nested values", () => {
    const store = createDocumentState({ user: { name: "Alice", age: 30 } });
    store.getState().setState("user.name", "Bob");
    expect(store.getState().state).toEqual({ user: { name: "Bob", age: 30 } });
  });

  it("resetState restores initial snapshot", () => {
    const store = createDocumentState({ count: 1 });
    store.getState().setState("count", 2);
    expect(store.getState().state.count).toBe(2);
    store.getState().resetState();
    expect(store.getState().state.count).toBe(1);
  });

  it("is isolated per store instance", () => {
    const storeA = createDocumentState({ a: 1 });
    const storeB = createDocumentState({ b: 2 });
    expect(storeA.getState().state).toEqual({ a: 1 });
    expect(storeB.getState().state).toEqual({ b: 2 });
  });
});

describe("getByPath", () => {
  it("returns top-level value", () => {
    expect(getByPath({ a: 1 }, "a")).toBe(1);
  });

  it("returns nested value", () => {
    expect(getByPath({ user: { name: "Alice" } }, "user.name")).toBe("Alice");
  });

  it("returns undefined for missing key", () => {
    expect(getByPath({ a: 1 }, "missing")).toBeUndefined();
  });

  it("returns undefined when intermediate is not an object", () => {
    expect(getByPath({ a: 1 }, "a.b")).toBeUndefined();
  });
});

describe("setByPath", () => {
  it("sets top-level value", () => {
    const obj: Record<string, unknown> = {};
    setByPath(obj, "a", 1);
    expect(obj).toEqual({ a: 1 });
  });

  it("sets nested value creating intermediate objects", () => {
    const obj: Record<string, unknown> = {};
    setByPath(obj, "user.name", "Alice");
    expect(obj).toEqual({ user: { name: "Alice" } });
  });

  it("overwrites existing nested value", () => {
    const obj: Record<string, unknown> = { user: { name: "Alice", age: 30 } };
    setByPath(obj, "user.name", "Bob");
    expect(obj).toEqual({ user: { name: "Bob", age: 30 } });
  });
});
