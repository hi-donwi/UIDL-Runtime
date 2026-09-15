import { describe, it, expect } from "vitest";
import { resolvePath, isBindPath, RENDER_SCOPE_PREFIXES } from "../bindings";

const scope = {
  local: { item: "a", nested: { enabled: true } },
  state: { count: 3, user: { name: "Alice", role: "admin" } },
  session: { locale: "id-ID" },
  route: { id: "42" },
  data: { rows: [{ total: 5 }] },
};

describe("resolvePath", () => {
  it("resolves every render-scope prefix", () => {
    expect(resolvePath("state.count", scope)).toBe(3);
    expect(resolvePath("local.item", scope)).toBe("a");
    expect(resolvePath("session.locale", scope)).toBe("id-ID");
    expect(resolvePath("route.id", scope)).toBe("42");
    expect(Array.isArray(resolvePath("data.rows", scope))).toBe(true);
  });

  it("resolves nested dotted paths", () => {
    expect(resolvePath("state.user.name", scope)).toBe("Alice");
    expect(resolvePath("local.nested.enabled", scope)).toBe(true);
  });

  it("returns undefined for missing keys, missing scopes, and unknown prefixes", () => {
    expect(resolvePath("state.absent", scope)).toBeUndefined();
    expect(resolvePath("missing.x", scope)).toBeUndefined();
    expect(resolvePath("unknown.x", scope)).toBeUndefined();
    expect(resolvePath("event.value", scope)).toBeUndefined();
  });

  it("never throws on malformed input", () => {
    expect(resolvePath("", scope)).toBeUndefined();
    expect(resolvePath("state", scope)).toBeUndefined();
    expect(resolvePath("state.", scope)).toBeUndefined();
    expect(resolvePath(undefined as never, scope)).toBeUndefined();
  });
});

describe("isBindPath", () => {
  it("accepts scope-prefixed bindings", () => {
    expect(isBindPath("state.user.name")).toBe(true);
    expect(isBindPath("local.item")).toBe(true);
    for (const prefix of RENDER_SCOPE_PREFIXES) {
      expect(isBindPath(`${prefix}.x`)).toBe(true);
    }
  });

  it("rejects event scope and bare paths", () => {
    expect(isBindPath("event.value")).toBe(false);
    expect(isBindPath("user.name")).toBe(false);
    expect(isBindPath("")).toBe(false);
  });
});