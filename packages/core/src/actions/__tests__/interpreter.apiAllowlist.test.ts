import { describe, it, expect, vi, afterEach } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createEventBus } from "../eventBus";

function waitForApiResponse(bus: ReturnType<typeof createEventBus>) {
  return new Promise<{ success: boolean; data?: unknown; error?: string }>((resolve) => {
    bus.on("api-response", (payload) => resolve(payload as never));
  });
}

describe("ActionInterpreter — apiAllowlist (fail-closed by default)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses to call fetch at all when no apiAllowlist is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled by default");
  });

  it("refuses a host that isn't in the configured allowlist", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["allowed.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://not-allowed.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain("not-allowed.example.com");
    expect(result.error).toContain("apiAllowlist");
  });

  it("allows an exact host match", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ hello: "world" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["api.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ hello: "world" });
  });

  it("allows a subdomain via a *.example.com wildcard entry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["*.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("does not let a *.example.com wildcard match an unrelated host", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["*.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://example.com.evil.test/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("supports a predicate function instead of a string list", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      apiAllowlist: (url) => url.hostname.endsWith(".example.com"),
    });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("still rejects non-http(s) schemes even with an allowlist configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: () => true });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "javascript:alert(1)", method: "GET" } });
    const result = await resultPromise;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
