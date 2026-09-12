import { describe, it, expect } from "vitest";
import { evaluate } from "../evaluate";

const scope = {
  state: { count: 3, name: "hello", flag: false, empty: undefined, nul: null },
  route: { id: "42" },
  data: { items: [1, 2, 3] },
  local: { item: "a" },
};

describe("evaluate", () => {
  it("returns literal values", () => {
    expect(evaluate({ literal: 42 }, scope)).toBe(42);
    expect(evaluate({ literal: "hello" }, scope)).toBe("hello");
    expect(evaluate({ literal: true }, scope)).toBe(true);
    expect(evaluate({ literal: null }, scope)).toBeNull();
  });

  it("resolves paths across scopes", () => {
    expect(evaluate({ path: "state.count" }, scope)).toBe(3);
    expect(evaluate({ path: "state.name" }, scope)).toBe("hello");
    expect(evaluate({ path: "route.id" }, scope)).toBe("42");
    const dataItems = evaluate({ path: "data.items" }, scope);
    expect(Array.isArray(dataItems)).toBe(true);
    expect((dataItems as unknown[]).length).toBe(3);
    expect(evaluate({ path: "local.item" }, scope)).toBe("a");
  });

  it("resolves nested paths", () => {
    const deepScope = { state: { user: { name: "Alice" } } };
    expect(evaluate({ path: "state.user.name" }, deepScope)).toBe("Alice");
  });

  it("returns undefined for unknown paths", () => {
    expect(evaluate({ path: "state.missing" }, scope)).toBeUndefined();
    expect(evaluate({ path: "unknown.x" }, scope)).toBeUndefined();
  });

  it("evaluates equality", () => {
    expect(evaluate({ "==": [{ path: "state.count" }, 3] }, scope)).toBe(true);
    expect(evaluate({ "==": [{ path: "state.count" }, 4] }, scope)).toBe(false);
    expect(evaluate({ "==": [{ path: "state.name" }, "hello" ] }, scope)).toBe(true);
  });

  it("evaluates inequality", () => {
    expect(evaluate({ "!=": [{ path: "state.count" }, 4] }, scope)).toBe(true);
    expect(evaluate({ "!=": [{ path: "state.name" }, "hello" ] }, scope)).toBe(false);
  });

  it("evaluates logical operators", () => {
    expect(evaluate({ and: [{ "==": [{ path: "state.count" }, 3] }, { "==": [{ path: "state.name" }, "hello" ] }] }, scope)).toBe(true);
    expect(evaluate({ and: [{ "==": [{ path: "state.count" }, 3] }, { "==": [{ path: "state.name" }, "world" ] }] }, scope)).toBe(false);
    expect(evaluate({ or: [{ "==": [{ path: "state.count" }, 4] }, { "==": [{ path: "state.name" }, "hello" ] }] }, scope)).toBe(true);
    expect(evaluate({ or: [{ "==": [{ path: "state.count" }, 4] }, { "==": [{ path: "state.name" }, "world" ] }] }, scope)).toBe(false);
    expect(evaluate({ not: { "==": [{ path: "state.count" }, 4] } }, scope)).toBe(true);
    expect(evaluate({ not: { "==": [{ path: "state.count" }, 3] } }, scope)).toBe(false);
  });

  it("evaluates ternary", () => {
    expect(evaluate({ if: [{ "==": [{ path: "state.count" }, 3] }, "yes", "no" ] }, scope)).toBe("yes");
    expect(evaluate({ if: [{ "==": [{ path: "state.count" }, 4] }, "yes", "no" ] }, scope)).toBe("no");
  });

  it("evaluates nullish coalescing", () => {
    expect(evaluate({ "??": [{ path: "state.empty" }, "fallback" ] }, scope)).toBe("fallback");
    expect(evaluate({ "??": [{ path: "state.count" }, "fallback" ] }, scope)).toBe(3);
    expect(evaluate({ "??": [{ path: "state.nul" }, "fallback" ] }, scope)).toBe("fallback");
    expect(evaluate({ "??": [{ path: "state.flag" }, true ] }, scope)).toBe(false);
  });

  it("returns undefined for non-object expressions", () => {
    expect(evaluate(undefined, scope)).toBeUndefined();
    expect(evaluate("string", scope)).toBe("string");
    expect(evaluate(123, scope)).toBe(123);
  });

  it("returns undefined for unrecognized object shapes", () => {
    expect(evaluate({ unknown: true } as never, scope)).toBeUndefined();
  });
});

describe("agg", () => {
  const scope = {
    data: {
      rows: [
        { debitTotal: 25_000_000, label: "a" },
        { debitTotal: 11_250_000, label: "b" },
        { debitTotal: null, label: "c" },
      ],
    },
  };

  it("sums a numeric field across the loaded rows", () => {
    expect(evaluate({ agg: "sum", over: "data.rows", field: "debitTotal" }, scope)).toBe(36_250_000);
  });

  it("counts rows without needing a field", () => {
    expect(evaluate({ agg: "count", over: "data.rows" }, scope)).toBe(3);
  });

  it("averages only the numeric values, ignoring blanks", () => {
    expect(evaluate({ agg: "avg", over: "data.rows", field: "debitTotal" }, scope)).toBe(18_125_000);
  });

  it("coerces numeric strings but never yields NaN from junk", () => {
    const messy = { data: { rows: [{ n: "1500" }, { n: "not a number" }, { n: 500 }] } };
    expect(evaluate({ agg: "sum", over: "data.rows", field: "n" }, messy)).toBe(2000);
  });

  it("returns 0 when the collection is missing rather than throwing", () => {
    expect(evaluate({ agg: "sum", over: "data.absent", field: "x" }, scope)).toBe(0);
  });
});
