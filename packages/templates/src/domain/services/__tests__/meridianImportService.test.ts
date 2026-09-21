import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { parseCsv, previewImport, runImport } from "../meridianImportService";

function adapter(customers: Array<Record<string, unknown>> = []) {
  return createInMemoryAdapter({ seed: { Customer: customers, Supplier: [], MeridianItem: [] } });
}

describe("parseCsv", () => {
  it("parses quoted fields, embedded commas, and escaped quotes", () => {
    const parsed = parseCsv('id,name\r\nC-1,"Acme, Inc."\nC-2,"He said ""hi"""\n');
    expect(parsed.headers).toEqual(["id", "name"]);
    expect(parsed.rows).toEqual([
      ["C-1", "Acme, Inc."],
      ["C-2", 'He said "hi"'],
    ]);
  });

  it("ignores blank lines", () => {
    expect(parseCsv("id,name\n\nC-1,Acme\n\n").rows).toEqual([["C-1", "Acme"]]);
  });
});

describe("meridian import wizard", () => {
  const csv = [
    "id,name,email",
    "CUST-IMP-01,PT Andalan,ap@andalan.co.id",
    "CUST-IMP-02,Toko Baru,",
    "CUST-IMP-03,,no-name@x.co", // missing name
    "CUST-IMP-01,Dup Id,", // duplicate in file
  ].join("\n");

  it("previews per-row validity without writing anything", async () => {
    const a = adapter();
    const preview = await previewImport(a, { target: "Customer", csv });

    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(2);
    expect(preview.rows[2].error).toMatch(/Missing name/);
    expect(preview.rows[3].error).toMatch(/Duplicate id/);
    expect((await a.query({ collection: "Customer" })).rows).toHaveLength(0);
  });

  it("creates only the valid rows and reports the rest", async () => {
    const a = adapter();
    const result = await runImport(a, { target: "Customer", csv });

    expect(result.created).toEqual(["CUST-IMP-01", "CUST-IMP-02"]);
    expect(result.skipped.map((s) => s.reason)).toEqual([
      expect.stringMatching(/Missing name/),
      expect.stringMatching(/Duplicate id/),
    ]);
    const rows = (await a.query<Record<string, unknown>>({ collection: "Customer" })).rows;
    expect(rows.map((r) => r.id).sort()).toEqual(["CUST-IMP-01", "CUST-IMP-02"]);
    expect(rows.find((r) => r.id === "CUST-IMP-02")).toMatchObject({ customerGroup: "Retail", territory: "Indonesia" });
  });

  it("rejects a row whose id collides with an existing record", async () => {
    const a = adapter([{ id: "CUST-IMP-01", name: "Existing" }]);
    const result = await runImport(a, { target: "Customer", csv: "id,name\nCUST-IMP-01,New\nCUST-IMP-09,Fresh" });

    expect(result.created).toEqual(["CUST-IMP-09"]);
    expect(result.skipped[0].reason).toMatch(/already exists/);
  });

  it("throws when the CSV is missing a required column or the target is unknown", async () => {
    const a = adapter();
    await expect(previewImport(a, { target: "Customer", csv: "name\nAcme" })).rejects.toBeInstanceOf(DataError);
    await expect(previewImport(a, { target: "Nope", csv: "id\nX" })).rejects.toMatchObject({ code: "validation" });
  });
});
