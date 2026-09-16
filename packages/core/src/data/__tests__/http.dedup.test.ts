import { describe, expect, it, vi } from "vitest";
import { createHttpAdapter } from "../adapters/http";
import { DataError } from "../errors";

describe("HttpAdapter in-flight query deduplication", () => {
  it("deduplicates concurrent identical query requests into a single network call", async () => {
    let fetchCount = 0;
    const mockData = { rows: [{ id: "INV-1" }], total: 1, page: 1, pageSize: 20 };

    const mockFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify(mockData), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const query = { collection: "invoices", sort: [{ field: "id", dir: "asc" as const }] };

    const [res1, res2, res3] = await Promise.all([
      adapter.query(query),
      adapter.query(query),
      adapter.query(query),
    ]);

    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(res3).toEqual(mockData);
    expect(fetchCount).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent identical get requests into a single network call", async () => {
    let fetchCount = 0;
    const recordPayload = { record: { id: "101", title: "Item 101" }, meta: { version: 1 } };

    const mockFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify(recordPayload), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const [res1, res2] = await Promise.all([
      adapter.get("items", "101"),
      adapter.get("items", "101"),
    ]);

    expect(res1).toEqual(recordPayload);
    expect(res2).toEqual(recordPayload);
    expect(fetchCount).toBe(1);
  });

  it("does not deduplicate sequential calls after in-flight completion", async () => {
    let fetchCount = 0;
    const mockData = { rows: [], total: 0 };

    const mockFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      return new Response(JSON.stringify(mockData), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const query = { collection: "invoices" };

    await adapter.query(query);
    await adapter.query(query);

    expect(fetchCount).toBe(2);
  });

  it("does not deduplicate queries with different parameters", async () => {
    let fetchCount = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ rows: [], total: 0 }), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await Promise.all([
      adapter.query({ collection: "invoices", page: { number: 1, size: 10 } }),
      adapter.query({ collection: "invoices", page: { number: 2, size: 10 } }),
      adapter.query({ collection: "orders" }),
    ]);

    expect(fetchCount).toBe(3);
  });

  it("allows one caller to abort without cancelling the underlying request for other callers", async () => {
    const mockData = { rows: [{ id: "A" }], total: 1 };

    const mockFetch = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return new Response(JSON.stringify(mockData), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const query = { collection: "items" };
    const abortCtrl = new AbortController();

    const promiseA = adapter.query(query, abortCtrl.signal);
    const promiseB = adapter.query(query);

    // Abort caller A after 10ms
    setTimeout(() => abortCtrl.abort(), 10);

    await expect(promiseA).rejects.toThrow(DataError);
    const resultB = await promiseB;
    expect(resultB).toEqual(mockData);
  });

  it("respects dedup: false option to disable in-flight deduplication", async () => {
    let fetchCount = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ rows: [], total: 0 }), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
      dedup: false,
    });

    const query = { collection: "invoices" };

    await Promise.all([
      adapter.query(query),
      adapter.query(query),
    ]);

    expect(fetchCount).toBe(2);
  });

  it("cleans up in-flight entry when fetch fails so subsequent retries can proceed", async () => {
    let shouldFail = true;

    const mockFetch = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        return new Response(JSON.stringify({ error: { message: "Internal Server Error" } }), { status: 500 });
      }
      return new Response(JSON.stringify({ rows: [], total: 0 }), { status: 200 });
    });

    const adapter = createHttpAdapter({
      baseUrl: "http://api.local",
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const query = { collection: "invoices" };

    await expect(adapter.query(query)).rejects.toThrow(DataError);

    shouldFail = false;
    const retryRes = await adapter.query(query);
    expect(retryRes).toEqual({ rows: [], total: 0 });
  });
});
