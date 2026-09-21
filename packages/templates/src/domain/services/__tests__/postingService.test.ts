import { describe, expect, it } from "vitest";
import { buildPostingLines, postDocument, trialBalance } from "../postingService";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import type { DoctypeMeta } from "../../doctypes/types";

function invoiceMetaWithPosting(): DoctypeMeta {
  return {
    name: "SalesInvoice",
    label: { id: "Faktur Penjualan", en: "Sales Invoice" },
    module: "Penjualan",
    naming: "SINV-.YYYY.-.#####",
    titleField: "customer",
    fields: [{ key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" }],
    listView: { columns: [{ field: "id" }], defaultSort: { field: "id", dir: "asc" }, pageSize: 20 },
    states: {
      field: "status",
      values: ["Draft", "Submitted"],
      initial: "Draft",
      transitions: [{ name: "submit", label: { id: "Submit", en: "Submit" }, from: ["Draft"], to: "Submitted", posting: true }],
    },
    posting: {
      onTransition: "submit",
      lines: [
        { account: "accounts-receivable", side: "debit", amount: { path: "state.total" } },
        { account: "sales", side: "credit", amount: { path: "state.subtotal" } },
        { account: "tax-payable-output", side: "credit", amount: { path: "state.tax" } },
      ],
    },
    permissions: { Everyone: { read: true, write: true, submit: true, delete: true } },
  };
}

describe("buildPostingLines · a balanced meta produces balanced lines", () => {
  it("debit total equals sum of credit lines", () => {
    const meta = invoiceMetaWithPosting();
    const record = { id: "SINV-2027-00001", date: "2027-07-02", subtotal: 30750000, tax: 3382500, total: 34132500 };
    const lines = buildPostingLines(meta, record);

    expect(lines).toHaveLength(3);
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(34132500);
  });

  it("carries the record's own date, id (as voucher), and doctype name", () => {
    const meta = invoiceMetaWithPosting();
    const record = { id: "SINV-2027-00002", date: "2027-08-01", subtotal: 100, tax: 11, total: 111 };
    const [line] = buildPostingLines(meta, record);
    expect(line.date).toBe("2027-08-01");
    expect(line.voucher).toBe("SINV-2027-00002");
    expect(line.doctype).toBe("SalesInvoice");
  });

  it("returns [] for a doctype with no posting rule", () => {
    const meta = { ...invoiceMetaWithPosting() };
    delete (meta as { posting?: unknown }).posting;
    expect(buildPostingLines(meta, { id: "X" })).toEqual([]);
  });
});

describe("buildPostingLines · an unbalanced result throws instead of silently posting", () => {
  it("throws when the record's own numbers don't add up (subtotal + tax != total)", () => {
    const meta = invoiceMetaWithPosting();
    // Deliberately inconsistent source data: total doesn't equal subtotal + tax.
    const record = { id: "SINV-BAD", date: "2027-07-02", subtotal: 100, tax: 11, total: 999 };
    expect(() => buildPostingLines(meta, record)).toThrow(/unbalanced/i);
  });
});

describe("postDocument · persists lines and they round-trip through the adapter", () => {
  it("writes one Posting record per line, and they're readable back", async () => {
    const adapter = createInMemoryAdapter({ seed: { Posting: [] } });
    const meta = invoiceMetaWithPosting();
    const record = { id: "SINV-2027-00003", date: "2027-07-05", subtotal: 200, tax: 22, total: 222 };

    const written = await postDocument(meta, record, adapter);
    expect(written).toHaveLength(3);

    const stored = await adapter.query({ collection: "Posting", filters: [{ field: "voucher", op: "eq", value: "SINV-2027-00003" }] });
    expect(stored.rows).toHaveLength(3);
  });
});

describe("trialBalance · aggregates postings per account", () => {
  it("sums debit and credit independently per account across multiple documents", () => {
    const meta = invoiceMetaWithPosting();
    const lines1 = buildPostingLines(meta, { id: "SINV-001", date: "2027-01-01", subtotal: 100, tax: 11, total: 111 });
    const lines2 = buildPostingLines(meta, { id: "SINV-002", date: "2027-01-02", subtotal: 50, tax: 5.5, total: 55.5 });

    const rows = trialBalance([...lines1, ...lines2]);
    const ar = rows.find((r) => r.account === "accounts-receivable")!;
    const sales = rows.find((r) => r.account === "sales")!;
    expect(ar.debit).toBeCloseTo(166.5);
    expect(ar.credit).toBe(0);
    expect(sales.credit).toBeCloseTo(150);
    expect(sales.debit).toBe(0);
  });
});
