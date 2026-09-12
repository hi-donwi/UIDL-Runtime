import { describe, it, expect, vi } from "vitest";
import { exportToCsv, exportToJson, parseCsvText, parseCsvFile } from "../../../../packages/templates/src/utils/exportImport";

describe("exportImport utils", () => {
  it("parses CSV text into key-value objects correctly", () => {
    const csv = `id,name,amount,status\n1,"Budi Santoso",150000,"Paid"\n2,"Siti Aminah",275000,"Unpaid"`;
    const rows = parseCsvText(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: "1",
      name: "Budi Santoso",
      amount: "150000",
      status: "Paid",
    });
    expect(rows[1]).toEqual({
      id: "2",
      name: "Siti Aminah",
      amount: "275000",
      status: "Unpaid",
    });
  });

  it("handles commas and escaped quotes within CSV fields", () => {
    const csv = `id,title,notes\n101,"PT Sumber Makmur, Tbk","Catatan ""Khusus"" Pembayaran"`;
    const rows = parseCsvText(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("PT Sumber Makmur, Tbk");
    expect(rows[0].notes).toBe('Catatan "Khusus" Pembayaran');
  });

  it("returns empty array for empty or single-line CSV", () => {
    expect(parseCsvText("")).toEqual([]);
    expect(parseCsvText("header1,header2")).toEqual([]);
  });

  it("parses CSV File using parseCsvFile", async () => {
    const blob = new Blob([`sku,qty\n"SKU-1",10\n"SKU-2",25`], { type: "text/csv" });
    const file = new File([blob], "test.csv", { type: "text/csv" });

    const rows = await parseCsvFile(file);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ sku: "SKU-1", qty: "10" });
    expect(rows[1]).toEqual({ sku: "SKU-2", qty: "25" });
  });

  it("exportToCsv triggers DOM download link without throwing", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    // mock URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test");
    globalThis.URL.revokeObjectURL = vi.fn();

    exportToCsv("test-export", [{ id: "1", name: "Alpha", amount: 100 }]);

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it("exportToJson triggers DOM download link without throwing", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test-json");
    globalThis.URL.revokeObjectURL = vi.fn();

    exportToJson("test-json-export", [{ key: "val" }]);

    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });
});
