import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpAdapter } from "../adapters/http";

// Node's fetch does not enforce the browser's WindowOrWorkerGlobalScope receiver check, so the
// contract suite (which runs HttpAdapter in Node) cannot catch a detached `this.fetchImpl = fetch`
// reference — real browsers throw "Illegal invocation" for that, as the Playwright proof
// against the mock HTTP server found. This test reproduces that receiver check without a browser.
function installStrictFetch() {
  const expectedReceiver = globalThis;
  const strictFetch = function (this: unknown) {
    if (this !== expectedReceiver) {
      throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
    }
    return Promise.resolve(new Response(JSON.stringify({ rows: [], total: 0, page: 1, pageSize: 20 }), { status: 200 }));
  };
  vi.stubGlobal("fetch", strictFetch);
}

describe("HttpAdapter default fetchImpl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps fetch bound to its required receiver when no fetchImpl override is given", async () => {
    installStrictFetch();
    const adapter = createHttpAdapter({ baseUrl: "http://127.0.0.1:8787/api" });

    await expect(adapter.query({ collection: "Thing" })).resolves.toMatchObject({ total: 0 });
  });
});
