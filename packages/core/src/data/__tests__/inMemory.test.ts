import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "../adapters/inMemory";
import { DataError } from "../errors";

function seedInvoices() {
  return {
    SalesInvoice: [
      { id: "SINV-001", customer: "Andalan", status: "Overdue", total: 1000, dueDate: "2026-08-01" },
      { id: "SINV-002", customer: "Sinar Jaya", status: "Unpaid", total: 2000, dueDate: "2026-08-15" },
      { id: "SINV-003", customer: "Andalan", status: "Paid", total: 500, dueDate: "2026-07-01" },
      { id: "SINV-004", customer: "Walk-in", status: "Unpaid", total: 750, dueDate: "2026-09-01" },
    ],
  };
}

describe("InMemoryAdapter · query", () => {
  it("returns every row with no filters", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({ collection: "SalesInvoice" });
    expect(result.rows).toHaveLength(4);
    expect(result.total).toBe(4);
  });

  it("filters with eq", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "status", op: "eq", value: "Paid" }],
    });
    expect(result.rows.map((r) => r.id)).toEqual(["SINV-003"]);
  });

  it("filters with in, including an empty array matching nothing", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const some = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "status", op: "in", value: ["Unpaid", "Overdue"] }],
    });
    expect(some.total).toBe(3);

    const none = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "status", op: "in", value: [] }],
    });
    expect(none.total).toBe(0);
    expect(none.rows).toEqual([]);
  });

  it("filters with gt/gte/lt/lte on numbers", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const gt = await adapter.query({ collection: "SalesInvoice", filters: [{ field: "total", op: "gt", value: 1000 }] });
    expect(gt.rows.map((r) => r.id)).toEqual(["SINV-002"]);
    const gte = await adapter.query({ collection: "SalesInvoice", filters: [{ field: "total", op: "gte", value: 1000 }] });
    expect(gte.rows.map((r) => r.id).sort()).toEqual(["SINV-001", "SINV-002"]);
    const lt = await adapter.query({ collection: "SalesInvoice", filters: [{ field: "total", op: "lt", value: 750 }] });
    expect(lt.rows.map((r) => r.id)).toEqual(["SINV-003"]);
  });

  it("filters with like (case-insensitive substring)", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "customer", op: "like", value: "andal" }],
    });
    expect(result.rows.map((r) => r.id).sort()).toEqual(["SINV-001", "SINV-003"]);
  });

  it("filters with between on numbers and on strings (dates)", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const numeric = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "total", op: "between", value: [700, 2000] }],
    });
    expect(numeric.rows.map((r) => r.id).sort()).toEqual(["SINV-001", "SINV-002", "SINV-004"]);

    const dates = await adapter.query({
      collection: "SalesInvoice",
      filters: [{ field: "dueDate", op: "between", value: ["2026-08-01", "2026-08-31"] }],
    });
    expect(dates.rows.map((r) => r.id).sort()).toEqual(["SINV-001", "SINV-002"]);
  });

  it("searches across string fields case-insensitively", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({ collection: "SalesInvoice", search: "sinar" });
    expect(result.rows.map((r) => r.id)).toEqual(["SINV-002"]);
  });

  it("sorts by a single field ascending and descending", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const asc = await adapter.query({ collection: "SalesInvoice", sort: [{ field: "total", dir: "asc" }] });
    expect(asc.rows.map((r) => r.id)).toEqual(["SINV-003", "SINV-004", "SINV-001", "SINV-002"]);
    const desc = await adapter.query({ collection: "SalesInvoice", sort: [{ field: "total", dir: "desc" }] });
    expect(desc.rows.map((r) => r.id)).toEqual(["SINV-002", "SINV-001", "SINV-004", "SINV-003"]);
  });

  it("sorts by multiple fields, primary first", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({
      collection: "SalesInvoice",
      sort: [
        { field: "customer", dir: "asc" },
        { field: "total", dir: "desc" },
      ],
    });
    // Andalan (1000, then 500), Sinar Jaya (2000), Walk-in (750)
    expect(result.rows.map((r) => r.id)).toEqual(["SINV-001", "SINV-003", "SINV-002", "SINV-004"]);
  });

  it("paginates and returns an empty array when the page is past the end", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const page1 = await adapter.query({ collection: "SalesInvoice", page: { number: 1, size: 2 } });
    expect(page1.rows).toHaveLength(2);
    expect(page1.total).toBe(4);

    const page3 = await adapter.query({ collection: "SalesInvoice", page: { number: 3, size: 2 } });
    expect(page3.rows).toEqual([]);
    expect(page3.total).toBe(4); // total reflects the full result set, not the empty page
  });

  it("projects only requested fields", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({ collection: "SalesInvoice", fields: ["id", "status"] });
    expect(Object.keys(result.rows[0]).sort()).toEqual(["id", "status"]);
  });

  it("returns empty rows for an unknown collection instead of throwing", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.query({ collection: "NoSuchThing" });
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 50 });
    const controller = new AbortController();
    controller.abort();
    await expect(adapter.query({ collection: "SalesInvoice" }, controller.signal)).rejects.toThrow();
  });

  it("aborts an in-flight latency wait", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 200 });
    const controller = new AbortController();
    const promise = adapter.query({ collection: "SalesInvoice" }, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await expect(promise).rejects.toThrow();
  });
});

describe("InMemoryAdapter · get/create/update/remove", () => {
  it("get returns the record and its version", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.get("SalesInvoice", "SINV-001");
    expect(result?.record.customer).toBe("Andalan");
    expect(result?.meta.version).toBe(1);
  });

  it("get returns undefined for a missing id", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const result = await adapter.get("SalesInvoice", "NOPE");
    expect(result).toBeUndefined();
  });

  it("create assigns an id when none is given and starts at version 1", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] } });
    const { record, meta } = await adapter.create({ collection: "SalesInvoice", data: { customer: "New Co" } });
    expect(record.id).toBeTruthy();
    expect(meta.version).toBe(1);
  });

  it("create rejects a duplicate id with a conflict DataError", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    await expect(adapter.create({ collection: "SalesInvoice", data: { id: "SINV-001" } })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("update merges fields and increments version", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const { record, meta } = await adapter.update({
      collection: "SalesInvoice",
      id: "SINV-001",
      data: { status: "Paid" },
    });
    expect(record.status).toBe("Paid");
    expect(record.customer).toBe("Andalan"); // unrelated field preserved
    expect(meta.version).toBe(2);
  });

  it("update on a missing record raises not_found", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    await expect(adapter.update({ collection: "SalesInvoice", id: "NOPE", data: {} })).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("update with a stale version raises conflict and does not apply", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    await adapter.update({ collection: "SalesInvoice", id: "SINV-001", data: { status: "Paid" } }); // now version 2
    await expect(
      adapter.update({ collection: "SalesInvoice", id: "SINV-001", data: { status: "Cancelled" }, version: 1 }),
    ).rejects.toMatchObject({ code: "conflict" });
    const current = await adapter.get("SalesInvoice", "SINV-001");
    expect(current?.record.status).toBe("Paid"); // the rejected write left no trace
  });

  it("remove deletes the record; a second remove raises not_found", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    await adapter.remove("SalesInvoice", "SINV-001");
    expect(await adapter.get("SalesInvoice", "SINV-001")).toBeUndefined();
    await expect(adapter.remove("SalesInvoice", "SINV-001")).rejects.toMatchObject({ code: "not_found" });
  });

  it("transition applies the transition name as the new status", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    const { record } = await adapter.transition({ collection: "SalesInvoice", id: "SINV-002", transition: "Paid" });
    expect(record.status).toBe("Paid");
  });
});

describe("InMemoryAdapter · latency and failure injection", () => {
  it("latencyMs delays resolution by roughly the configured amount", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), latencyMs: 40 });
    const start = Date.now();
    await adapter.query({ collection: "SalesInvoice" });
    expect(Date.now() - start).toBeGreaterThanOrEqual(35);
  });

  it("failureRate: 1 makes every call raise a server DataError", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), failureRate: 1 });
    await expect(adapter.query({ collection: "SalesInvoice" })).rejects.toMatchObject({ code: "server" });
  });

  it("failureRate: 0 (default) never injects a failure", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices(), failureRate: 0 });
    await expect(adapter.query({ collection: "SalesInvoice" })).resolves.toBeTruthy();
  });
});

describe("InMemoryAdapter · persistence", () => {
  it("localStorage persistence survives reconstruction with the same storageKey", async () => {
    const key = "vb-test-adapter-persist";
    window.localStorage.removeItem(key);
    const first = createInMemoryAdapter({ seed: seedInvoices(), persist: "localStorage", storageKey: key });
    await first.update({ collection: "SalesInvoice", id: "SINV-001", data: { status: "Paid" } });

    const second = createInMemoryAdapter({ persist: "localStorage", storageKey: key });
    const record = await second.get("SalesInvoice", "SINV-001");
    expect(record?.record.status).toBe("Paid");
    window.localStorage.removeItem(key);
  });

  it("reset() reseeds the store, discarding prior mutations", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    await adapter.remove("SalesInvoice", "SINV-001");
    adapter.reset(seedInvoices());
    const result = await adapter.get("SalesInvoice", "SINV-001");
    expect(result).toBeTruthy();
  });
});

describe("InMemoryAdapter · errors are real DataError instances", () => {
  it("not_found from update carries a DataError instance", async () => {
    const adapter = createInMemoryAdapter({ seed: seedInvoices() });
    let caught: unknown;
    try {
      await adapter.update({ collection: "SalesInvoice", id: "NOPE", data: {} });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DataError);
    expect((caught as DataError).code).toBe("not_found");
  });
});
