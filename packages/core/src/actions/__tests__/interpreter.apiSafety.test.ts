import { describe, it, expect, vi, afterEach } from "vitest";
import { ActionInterpreter } from "../interpreter";
import { createEventBus } from "../eventBus";

function waitForApiResponse(bus: ReturnType<typeof createEventBus>) {
  return new Promise<{ success: boolean; data?: unknown; error?: string }>((resolve) => {
    bus.on("api-response", (payload) => resolve(payload as never));
  });
}

describe("ActionInterpreter — api response size and content-type hardening", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a response whose declared Content-Length exceeds apiMaxResponseBytes without reading the body", async () => {
    const textSpy = vi.fn();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json", "Content-Length": "1000" }),
      text: textSpy,
    });
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      apiAllowlist: ["api.example.com"],
      apiMaxResponseBytes: 100,
    });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain("too large");
    // the declared-Content-Length check happens before the body is ever read
    expect(textSpy).not.toHaveBeenCalled();
  });

  it("rejects an actually-oversized body even when Content-Length is missing (streamed/chunked response)", async () => {
    const oversizedBody = "x".repeat(200);
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(oversizedBody, { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      apiAllowlist: ["api.example.com"],
      apiMaxResponseBytes: 100,
    });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("allows a response within apiMaxResponseBytes", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      apiAllowlist: ["api.example.com"],
      apiMaxResponseBytes: 1000,
    });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
  });

  it("rejects a non-JSON Content-Type", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("<html>not json</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["api.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toContain("not JSON");
  });

  it("allows a JSON Content-Type with a charset suffix", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["api.example.com"] });

    const resultPromise = waitForApiResponse(bus);
    interpreter.execute({ api: { url: "https://api.example.com/data", method: "GET" } });
    const result = await resultPromise;

    expect(result.success).toBe(true);
  });
});

describe("ActionInterpreter — apiMaxConcurrentCalls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails fast (without calling fetch) once the in-flight limit is reached, and recovers once a call finishes", async () => {
    const pending: Array<(response: Response) => void> = [];
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve);
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({
      eventBus: bus,
      apiAllowlist: ["api.example.com"],
      apiMaxConcurrentCalls: 2,
    });

    const responses: Array<{ success: boolean; error?: string }> = [];
    bus.on("api-response", (payload) => responses.push(payload as never));

    // Fire 3 calls back-to-back, synchronously, before any of the first two resolve.
    interpreter.execute({ api: { url: "https://api.example.com/a", method: "GET" } });
    interpreter.execute({ api: { url: "https://api.example.com/b", method: "GET" } });
    interpreter.execute({ api: { url: "https://api.example.com/c", method: "GET" } });

    // The 3rd call must fail immediately without ever reaching fetch — no need to await anything
    // for it, which is itself the proof it didn't queue behind the other two.
    await vi.waitFor(() => expect(responses).toHaveLength(1));
    expect(responses[0].success).toBe(false);
    expect(responses[0].error).toContain("Too many concurrent");
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Resolving one in-flight call frees a slot for a new one.
    pending[0](new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    await vi.waitFor(() => expect(responses).toHaveLength(2));

    interpreter.execute({ api: { url: "https://api.example.com/d", method: "GET" } });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("defaults to allowing 6 concurrent calls", async () => {
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchSpy);
    const bus = createEventBus();
    const interpreter = new ActionInterpreter({ eventBus: bus, apiAllowlist: ["api.example.com"] });
    const responses: Array<{ success: boolean; error?: string }> = [];
    bus.on("api-response", (payload) => responses.push(payload as never));

    for (let i = 0; i < 7; i++) {
      interpreter.execute({ api: { url: `https://api.example.com/${i}`, method: "GET" } });
    }

    await vi.waitFor(() => expect(responses).toHaveLength(1));
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(responses[0].error).toContain("Too many concurrent");
  });
});
