import { describe, expect, it } from "vitest";
import { DoctypeMetaSchema, parseDoctypeMeta } from "../types";

function validMeta() {
  return {
    name: "SalesInvoice",
    label: { id: "Faktur Penjualan", en: "Sales Invoice" },
    module: "Penjualan",
    naming: "SINV-.YYYY.-.#####",
    titleField: "customer",
    fields: [
      { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "Link", options: { doctype: "Customer" } },
      { key: "date", label: { id: "Tanggal", en: "Date" }, widget: "Date" },
      { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", options: [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
        { value: "Cancelled", label: "Cancelled" },
      ] },
      { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency" },
    ],
    listView: {
      columns: [
        { field: "id" },
        { field: "customer" },
        { field: "date" },
        { field: "status" },
        { field: "total", align: "right" },
      ],
      defaultSort: { field: "date", dir: "desc" },
      pageSize: 20,
    },
    states: {
      field: "status",
      values: ["Draft", "Submitted", "Cancelled"],
      initial: "Draft",
      transitions: [
        { name: "submit", label: { id: "Submit", en: "Submit" }, from: ["Draft"], to: "Submitted", posting: true },
        { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Submitted"], to: "Cancelled" },
      ],
    },
    posting: {
      onTransition: "submit",
      lines: [
        { account: "Accounts Receivable", side: "debit", amount: { path: "total" } },
        { account: "Sales", side: "credit", amount: { path: "total" } },
      ],
    },
    permissions: {
      "Finance Manager": { read: true, write: true, submit: true, delete: true },
      Cashier: { read: true, write: false, submit: false, delete: false },
    },
  };
}

describe("DoctypeMetaSchema · a well-formed meta", () => {
  it("parses without issue", () => {
    expect(() => parseDoctypeMeta(validMeta())).not.toThrow();
  });
});

describe("DoctypeMetaSchema · dangling references are rejected at parse time", () => {
  it("rejects a listView column naming a field that doesn't exist, and names the field in the message", () => {
    const meta = validMeta();
    meta.listView.columns.push({ field: "nonexistentField" });
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("nonexistentField");
    expect(message).toContain("listView.columns");
  });

  it("rejects a titleField that doesn't exist among fields", () => {
    const meta = { ...validMeta(), titleField: "ghostField" };
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("ghostField");
  });

  it("rejects a transition whose `to` names a state not in states.values", () => {
    const meta = validMeta();
    meta.states.transitions.push({
      name: "amend",
      label: { id: "Amandemen", en: "Amend" },
      from: ["Submitted"],
      to: "Amended", // not declared in states.values
    });
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("Amended");
    expect(message).toContain("amend");
  });

  it("rejects a transition whose `from` names a state not in states.values", () => {
    const meta = validMeta();
    meta.states.transitions[0].from.push("Nonexistent");
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("Nonexistent");
  });

  it("rejects states.initial when it isn't one of states.values", () => {
    const meta = validMeta();
    meta.states.initial = "NotAState";
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("NotAState");
  });

  it("rejects posting.onTransition when it doesn't name a declared transition", () => {
    const meta = validMeta();
    meta.posting.onTransition = "noSuchTransition";
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("noSuchTransition");
  });

  it("rejects posting.onTransition naming a transition that isn't marked posting: true", () => {
    const meta = validMeta();
    meta.posting.onTransition = "cancel"; // exists, but posting: true was never set on it
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("cancel");
    expect(message).toContain("posting: true");
  });

  it("rejects posting.lines with no debit or no credit side", () => {
    const meta = validMeta();
    meta.posting.lines = [
      { account: "Accounts Receivable", side: "debit", amount: { path: "total" } },
      { account: "Sales", side: "debit", amount: { path: "total" } },
    ];
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("debit");
    expect(message).toContain("credit");
  });

  it("rejects a childTables entry referencing a field that doesn't exist", () => {
    const meta = { ...validMeta(), childTables: [{ field: "ghostChildField", doctype: "SalesInvoiceLine" }] };
    const result = DoctypeMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((i) => i.message).join("\n");
    expect(message).toContain("ghostChildField");
  });

  it("parseDoctypeMeta throws (not returns) on an invalid meta", () => {
    const meta = { ...validMeta(), titleField: "ghostField" };
    expect(() => parseDoctypeMeta(meta)).toThrow();
  });
});

describe("DoctypeMetaSchema · a doctype with no state machine is valid", () => {
  it("accepts a meta with no `states` and no `posting` (e.g. a pure master like Customer)", () => {
    const meta = validMeta();
    delete (meta as { states?: unknown }).states;
    delete (meta as { posting?: unknown }).posting;
    expect(() => parseDoctypeMeta(meta)).not.toThrow();
  });
});
