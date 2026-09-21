import { describe, expect, it, vi } from "vitest";
import type { CompanyDemo, PageSpec } from "../../../console/types";
import {
  createConsoleRecord,
  deleteConsoleRecord,
  exportConsoleRecords,
  importConsoleRecords,
  resetConsoleCommand,
  resetConsoleDataset,
  transitionConsoleRecord,
  updateConsoleRecord,
  type LegacyConsoleStore,
} from "../legacyConsoleMutationService";

function page(rows: Array<Record<string, unknown>>): PageSpec {
  return {
    title: "POS",
    module: "Kasir",
    actions: [],
    kpis: [],
    chartTitle: "Chart",
    chartType: "bar",
    chartRows: [],
    tables: [
      {
        title: "Rows",
        columns: [{ key: "id", label: "ID" }, { key: "status", label: "Status" }],
        rows,
      },
    ],
  };
}

function dataset(rows: Array<Record<string, unknown>> = [{ id: "POS-1", status: "Unpaid", total: 1000 }]): CompanyDemo[] {
  return [
    {
      id: "shoe-company",
      company: "Shoe Company",
      title: "Shoe Company",
      subtitle: "Retail",
      source: "test",
      patterns: [],
      nav: [],
      pages: { pos: page(rows) },
    },
  ];
}

function store(): LegacyConsoleStore {
  return {
    create: vi.fn((_collection, record) => ({ id: record.id ?? "NEW-1", ...record })),
    update: vi.fn((_collection, id, patch) => ({ id, ...patch })),
    remove: vi.fn(() => true),
    resetAll: vi.fn(),
  };
}

describe("legacy console mutation service", () => {
  it("creates a record through the store and inserts the saved record into the first table", () => {
    const fakeStore = store();

    const result = createConsoleRecord({
      dataset: dataset(),
      companyId: "shoe-company",
      pageId: "pos",
      moduleName: "Kasir",
      record: { customer: "Walk-in", status: "Draft" },
      store: fakeStore,
    });

    expect(fakeStore.create).toHaveBeenCalledWith("shoesInventory", { customer: "Walk-in", status: "Draft" });
    expect(result?.record).toMatchObject({ id: "NEW-1", customer: "Walk-in" });
    expect(result?.dataset[0].pages.pos.tables[0].rows[0]).toMatchObject({ id: "NEW-1", customer: "Walk-in" });
    expect(result?.toast).toContain("Kasir");
    expect(result?.audit).toMatchObject({ action: "create", collection: "shoesInventory", recordId: "NEW-1" });
  });

  it("transitions a row action by updating the store and the visible PageSpec table rows", () => {
    const fakeStore = store();

    const result = transitionConsoleRecord({
      dataset: dataset(),
      companyId: "shoe-company",
      pageId: "pos",
      actionName: "Pay",
      record: { id: "POS-1", status: "Unpaid" },
      store: fakeStore,
    });

    expect(fakeStore.update).toHaveBeenCalledWith("shoesInventory", "POS-1", { status: "Paid" });
    expect(result?.record).toMatchObject({ id: "POS-1", status: "Paid" });
    expect(result?.dataset[0].pages.pos.tables[0].rows[0]).toMatchObject({ id: "POS-1", status: "Paid" });
    expect(result?.toast).toContain("Status POS-1 diubah menjadi [Paid]");
    expect(result?.audit).toMatchObject({ action: "transition", collection: "shoesInventory", recordId: "POS-1", detail: "Pay" });
  });

  it("ignores unknown row actions without mutating the store", () => {
    const fakeStore = store();

    const result = transitionConsoleRecord({
      dataset: dataset(),
      companyId: "shoe-company",
      pageId: "pos",
      actionName: "Detail",
      record: { id: "POS-1", status: "Unpaid" },
      store: fakeStore,
    });

    expect(result).toBeUndefined();
    expect(fakeStore.update).not.toHaveBeenCalled();
  });

  it("updates drawer edits through the store and strips row action metadata", () => {
    const fakeStore = store();

    const result = updateConsoleRecord({
      dataset: dataset([{ id: "POS-1", status: "Unpaid", $action: "Detail" }]),
      companyId: "shoe-company",
      pageId: "pos",
      record: { id: "POS-1", status: "Unpaid", $action: "Detail" },
      patch: { status: "Paid" },
      store: fakeStore,
    });

    expect(fakeStore.update).toHaveBeenCalledWith("shoesInventory", "POS-1", { status: "Paid" });
    expect(result?.record).toEqual({ id: "POS-1", status: "Paid" });
    expect(result?.dataset[0].pages.pos.tables[0].rows[0]).toMatchObject({ id: "POS-1", status: "Paid" });
    expect(result?.audit).toMatchObject({ action: "update", collection: "shoesInventory", recordId: "POS-1" });
  });

  it("imports parsed records through the store and prepends the created records", () => {
    const fakeStore = store();

    const result = importConsoleRecords({
      dataset: dataset(),
      companyId: "shoe-company",
      pageId: "pos",
      records: [{ id: "IMP-1", status: "Draft" }],
      store: fakeStore,
    });

    expect(fakeStore.create).toHaveBeenCalledWith("shoesInventory", { id: "IMP-1", status: "Draft" });
    expect(result?.dataset[0].pages.pos.tables[0].rows[0]).toMatchObject({ id: "IMP-1", status: "Draft" });
    expect(result?.toast).toContain("Berhasil mengimpor 1 record");
    expect(result?.audit).toMatchObject({ action: "import", collection: "shoesInventory", detail: "1 records" });
  });

  it("resets the backing store and returns the initial dataset", () => {
    const fakeStore = store();
    const initial = dataset([{ id: "SEED-1", status: "Draft" }]);

    const result = resetConsoleDataset(fakeStore, initial);

    expect(fakeStore.resetAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(initial);
  });

  it("rejects empty imports without store side effects", () => {
    const fakeStore = store();

    expect(() =>
      importConsoleRecords({
        dataset: dataset(),
        companyId: "shoe-company",
        pageId: "pos",
        records: [],
        store: fakeStore,
      }),
    ).toThrow(/Import requires at least one record/i);
    expect(fakeStore.create).not.toHaveBeenCalled();
  });

  it("rejects oversized imports before creating any record", () => {
    const fakeStore = store();
    const records = Array.from({ length: 3 }, (_value, index) => ({ id: `IMP-${index}` }));

    expect(() =>
      importConsoleRecords({
        dataset: dataset(),
        companyId: "shoe-company",
        pageId: "pos",
        records,
        store: fakeStore,
        maxRecords: 2,
      }),
    ).toThrow(/Import is limited to 2 records/i);
    expect(fakeStore.create).not.toHaveBeenCalled();
  });

  it("exports table rows through a guarded service command", () => {
    const result = exportConsoleRecords({
      dataset: dataset([{ id: "POS-1", status: "Paid", $action: "Detail" }]),
      companyId: "shoe-company",
      pageId: "pos",
      format: "json",
    });

    expect(result.rows).toEqual([{ id: "POS-1", status: "Paid" }]);
    expect(result.filename).toBe("shoe-company-pos");
    expect(result.audit).toMatchObject({ action: "export", detail: "json:1 records" });
  });

  it("rejects empty exports", () => {
    expect(() =>
      exportConsoleRecords({
        dataset: dataset([]),
        companyId: "shoe-company",
        pageId: "pos",
        format: "csv",
      }),
    ).toThrow(/Export requires at least one row/i);
  });

  it("deletes a row through the store and visible dataset with an audit event", () => {
    const fakeStore = store();

    const result = deleteConsoleRecord({
      dataset: dataset([{ id: "POS-1", status: "Draft" }, { id: "POS-2", status: "Paid" }]),
      companyId: "shoe-company",
      pageId: "pos",
      record: { id: "POS-1", status: "Draft" },
      store: fakeStore,
    });

    expect(fakeStore.remove).toHaveBeenCalledWith("shoesInventory", "POS-1");
    expect(result?.dataset[0].pages.pos.tables[0].rows).toEqual([{ id: "POS-2", status: "Paid" }]);
    expect(result?.audit).toMatchObject({ action: "delete", recordId: "POS-1" });
  });

  it("guards reset with an explicit reason and returns an audit event", () => {
    const fakeStore = store();
    const initial = dataset([{ id: "SEED-1", status: "Draft" }]);

    expect(() => resetConsoleCommand({ store: fakeStore, initialDataset: initial, reason: "" })).toThrow(
      /Reset requires a reason/i,
    );
    expect(fakeStore.resetAll).not.toHaveBeenCalled();

    const result = resetConsoleCommand({
      store: fakeStore,
      initialDataset: initial,
      reason: "floating-tools-reset",
    });

    expect(fakeStore.resetAll).toHaveBeenCalledTimes(1);
    expect(result.dataset).toBe(initial);
    expect(result.audit).toMatchObject({ action: "reset", detail: "floating-tools-reset" });
  });
});
