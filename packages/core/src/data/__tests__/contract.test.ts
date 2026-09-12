import { describe, expect, it } from "vitest";
import { createHttpAdapter } from "../adapters/http";
import { createInMemoryAdapter } from "../adapters/inMemory";
import { DataError, type DataAdapter } from "../types";
import { startMockHttpServer } from "../testing/mockHttpServer";

const contractSeed = {
  Thing: [
    { id: "TH-001", name: "Alpha", amount: 10, category: "A", status: "Draft" },
    { id: "TH-002", name: "Beta", amount: 20, category: "B", status: "Draft" },
    { id: "TH-003", name: "Gamma", amount: 30, category: "A", status: "Submitted" },
  ],
};

type Harness = {
  name: string;
  makeAdapter: () => Promise<{ adapter: DataAdapter; cleanup?: () => Promise<void> }>;
};

const harnesses: Harness[] = [
  {
    name: "InMemoryAdapter",
    makeAdapter: async () => ({ adapter: createInMemoryAdapter({ seed: contractSeed }) }),
  },
  {
    name: "HttpAdapter",
    makeAdapter: async () => {
      const server = await startMockHttpServer({ seed: contractSeed });
      return {
        adapter: createHttpAdapter({ baseUrl: `${server.url}/api` }),
        cleanup: server.close,
      };
    },
  },
];

describe.each(harnesses)("$name contract", ({ makeAdapter }) => {
  it("queries with filters, sort, paging, search, and projection", async () => {
    const { adapter, cleanup } = await makeAdapter();
    try {
      const result = await adapter.query({
        collection: "Thing",
        filters: [{ field: "category", op: "eq", value: "A" }],
        search: "a",
        sort: [{ field: "amount", dir: "desc" }],
        page: { number: 1, size: 1 },
        fields: ["id", "amount"],
      });

      expect(result).toEqual({
        rows: [{ id: "TH-003", amount: 30 }],
        total: 2,
        page: 1,
        pageSize: 1,
      });
    } finally {
      await cleanup?.();
    }
  });

  it("gets records with version metadata and returns undefined for missing get", async () => {
    const { adapter, cleanup } = await makeAdapter();
    try {
      await expect(adapter.get("Thing", "missing")).resolves.toBeUndefined();
      await expect(adapter.get("Thing", "TH-001")).resolves.toEqual({
        record: { id: "TH-001", name: "Alpha", amount: 10, category: "A", status: "Draft" },
        meta: { version: 1 },
      });
    } finally {
      await cleanup?.();
    }
  });

  it("creates, updates with optimistic versioning, transitions, and removes records", async () => {
    const { adapter, cleanup } = await makeAdapter();
    try {
      const created = await adapter.create({
        collection: "Thing",
        data: { id: "TH-004", name: "Delta", amount: 40, category: "C", status: "Draft" },
      });
      expect(created.meta.version).toBe(1);

      const updated = await adapter.update({
        collection: "Thing",
        id: "TH-004",
        version: created.meta.version,
        data: { amount: 45 },
      });
      expect(updated.record).toMatchObject({ id: "TH-004", amount: 45 });
      expect(updated.meta.version).toBe(2);

      await expect(
        adapter.update({ collection: "Thing", id: "TH-004", version: 1, data: { amount: 46 } }),
      ).rejects.toMatchObject({ code: "conflict" });

      const transitioned = await adapter.transition({
        collection: "Thing",
        id: "TH-004",
        version: updated.meta.version,
        transition: "Submitted",
      });
      expect(transitioned.record).toMatchObject({ id: "TH-004", status: "Submitted" });

      await adapter.remove("Thing", "TH-004");
      await expect(adapter.get("Thing", "TH-004")).resolves.toBeUndefined();
    } finally {
      await cleanup?.();
    }
  });

  it("raises compatible DataError codes for duplicate create, missing update, and missing report", async () => {
    const { adapter, cleanup } = await makeAdapter();
    try {
      await expect(adapter.create({ collection: "Thing", data: { id: "TH-001" } })).rejects.toBeInstanceOf(DataError);
      await expect(adapter.create({ collection: "Thing", data: { id: "TH-001" } })).rejects.toMatchObject({ code: "conflict" });
      await expect(adapter.update({ collection: "Thing", id: "missing", data: { name: "Missing" } })).rejects.toMatchObject({
        code: "not_found",
      });
      await expect(adapter.report("MissingReport", {})).rejects.toMatchObject({ code: "not_found" });
    } finally {
      await cleanup?.();
    }
  });
});
