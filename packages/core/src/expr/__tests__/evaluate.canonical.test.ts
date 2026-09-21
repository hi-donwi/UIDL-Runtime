import { describe, it, expect } from "vitest";
import { evaluate, MAX_EXPR_DEPTH } from "../evaluate";

const scope = {
  state: { total: 1_200_000, count: 3, name: "hello world", flag: false, nul: null, order: { id: 7 } },
  session: { user: { name: "Alice" } },
  route: { id: "42" },
  data: { items: [1, 2, 3], tags: ["a", "b"] },
  local: { item: "x" },
};

describe("evaluate: canonical op form", () => {
  it("eq / neq mirror the == / != semantics", () => {
    expect(evaluate({ op: "eq", left: { $bind: "state.count" }, right: 3 }, scope)).toBe(true);
    expect(evaluate({ op: "eq", left: { $bind: "state.count" }, right: 4 }, scope)).toBe(false);
    expect(evaluate({ op: "neq", left: { $bind: "state.count" }, right: 4 }, scope)).toBe(true);
    expect(evaluate({ op: "equiv", left: 1, right: 1 } as never, scope)).toBeUndefined();
  });

  it("gt / gte / lt / lte compare numerically and bind their operands", () => {
    expect(evaluate({ op: "gt", left: { $bind: "state.total" }, right: 1_000_000 }, scope)).toBe(true);
    expect(evaluate({ op: "gt", left: { $bind: "state.total" }, right: 1_200_000 }, scope)).toBe(false);
    expect(evaluate({ op: "gte", left: { $bind: "state.total" }, right: 1_200_000 }, scope)).toBe(true);
    expect(evaluate({ op: "lt", left: { op: "multiply", left: 2, right: 2 }, right: 5 }, scope)).toBe(true);
    expect(evaluate({ op: "lte", left: { $bind: "state.count" }, right: 3 }, scope)).toBe(true);
  });

  it("comparison returns null when either operand is not a finite number", () => {
    expect(evaluate({ op: "gt", left: { $bind: "state.name" }, right: 5 }, scope)).toBeNull();
  });

  it("and / or / not behave like the legacy keyed forms", () => {
    const truthy = { op: "eq", left: { $bind: "state.count" }, right: 3 };
    const falsy = { op: "eq", left: { $bind: "state.count" }, right: 9 };
    expect(evaluate({ op: "and", left: truthy, right: truthy }, scope)).toBe(true);
    expect(evaluate({ op: "and", left: truthy, right: falsy }, scope)).toBe(false);
    expect(evaluate({ op: "or", left: falsy, right: truthy }, scope)).toBe(true);
    expect(evaluate({ op: "not", v: falsy }, scope)).toBe(true);
  });

  it("add / subtract / multiply / divide are deterministic and never throw", () => {
    expect(evaluate({ op: "add", left: 2, right: 3 }, scope)).toBe(5);
    expect(evaluate({ op: "subtract", left: 10, right: 4 }, scope)).toBe(6);
    expect(evaluate({ op: "multiply", left: { $bind: "state.count" }, right: 2 }, scope)).toBe(6);
    expect(evaluate({ op: "divide", left: 10, right: 4 }, scope)).toBe(2.5);
    expect(evaluate({ op: "divide", left: 10, right: 0 }, scope)).toBeNull();
    expect(evaluate({ op: "add", left: { $bind: "state.name" }, right: 1 }, scope)).toBeNull();
  });

  it("coalesce uses the canonical operands", () => {
    expect(evaluate({ op: "coalesce", left: { $bind: "state.nul" }, right: "fallback" }, scope)).toBe("fallback");
    expect(evaluate({ op: "coalesce", left: { $bind: "state.total" }, right: "fallback" }, scope)).toBe(1_200_000);
  });

  it("contains works on arrays and strings", () => {
    expect(evaluate({ op: "contains", left: { $bind: "data.tags" }, right: "a" }, scope)).toBe(true);
    expect(evaluate({ op: "contains", left: { $bind: "data.tags" }, right: "zz" }, scope)).toBe(false);
    expect(evaluate({ op: "contains", left: { $bind: "state.name" }, right: "world" }, scope)).toBe(true);
  });

  it("startsWith matches string prefixes only", () => {
    expect(evaluate({ op: "startsWith", left: { $bind: "state.name" }, right: "hello" }, scope)).toBe(true);
    expect(evaluate({ op: "startsWith", left: { $bind: "state.name" }, right: "world" }, scope)).toBe(false);
    expect(evaluate({ op: "startsWith", left: { $bind: "data.tags" }, right: "a" }, scope)).toBeNull();
  });

  it("if evaluates only the chosen branch", () => {
    expect(
      evaluate({ op: "if", test: { op: "eq", left: { $bind: "state.count" }, right: 3 }, then: "yes", else: "no" }, scope),
    ).toBe("yes");
    expect(
      evaluate({ op: "if", test: { op: "eq", left: { $bind: "state.count" }, right: 9 }, then: "yes", else: "no" }, scope),
    ).toBe("no");
  });

  it("$bind leaves resolve directly inside an expression tree", () => {
    expect(evaluate({ $bind: "session.user.name" }, scope)).toBe("Alice");
    expect(evaluate({ $bind: "route.id" }, scope)).toBe("42");
    expect(evaluate({ $bind: "state.missing" }, scope)).toBeUndefined();
  });

  it("$expr-wrapped values evaluate to their inner expression", () => {
    expect(evaluate({ $expr: { op: "multiply", left: 6, right: 7 } }, scope)).toBe(42);
  });

  it("legacy keyed shapes still work unchanged", () => {
    expect(evaluate({ "==": [{ path: "state.count" }, 3] }, scope)).toBe(true);
    expect(evaluate({ and: [{ "==": [{ path: "state.count" }, 3] }, true] }, scope)).toBe(true);
    expect(evaluate({ "??": [{ path: "state.nul" }, "fb" ] }, scope)).toBe("fb");
  });
});

describe("evaluate: bounded complexity", () => {
  it("aborts evaluation beyond the maximum depth instead of recursing forever", () => {
    let deep: unknown = { op: "not", v: true };
    for (let i = 0; i < MAX_EXPR_DEPTH + 4; i++) {
      deep = { op: "not", v: deep };
    }
    expect(deep).toBeDefined();
    expect(evaluate(deep, scope)).toBeUndefined();
  });
});