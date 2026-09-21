import { describe, expect, it } from "vitest";
import { createTransitionAuditHook, listAuditLog, recordAudit } from "../auditService";
import { runTransition } from "../documentService";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import type { DoctypeMeta } from "../../doctypes/types";

function invoiceMeta(): DoctypeMeta {
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
      transitions: [{ name: "submit", label: { id: "Submit", en: "Submit" }, from: ["Draft"], to: "Submitted" }],
    },
    permissions: { Everyone: { read: true, write: true, submit: true, delete: true } },
  };
}

describe("recordAudit / listAuditLog", () => {
  it("a recorded event is readable back, newest first", async () => {
    const adapter = createInMemoryAdapter({ seed: { AuditLog: [] } });
    await recordAudit(adapter, { doctype: "SalesInvoice", recordId: "SINV-001", action: "create" }, "AuditLog");
    await recordAudit(adapter, { doctype: "SalesInvoice", recordId: "SINV-001", action: "update" }, "AuditLog");

    const events = await listAuditLog(adapter, { recordId: "SINV-001" });
    expect(events).toHaveLength(2);
    expect(events[0].action).toBe("update"); // most recent first
    expect(events[1].action).toBe("create");
  });

  it("filters by doctype and recordId independently", async () => {
    const adapter = createInMemoryAdapter({ seed: { AuditLog: [] } });
    await recordAudit(adapter, { doctype: "SalesInvoice", recordId: "SINV-001", action: "create" });
    await recordAudit(adapter, { doctype: "PurchaseInvoice", recordId: "PINV-001", action: "create" });

    const salesOnly = await listAuditLog(adapter, { doctype: "SalesInvoice" });
    expect(salesOnly).toHaveLength(1);
    expect(salesOnly[0].doctype).toBe("SalesInvoice");
  });

  it("the log grows on each subsequent mutation, rather than being replaced", async () => {
    const adapter = createInMemoryAdapter({ seed: { AuditLog: [] } });
    for (let i = 0; i < 5; i++) {
      await recordAudit(adapter, { doctype: "SalesInvoice", recordId: "SINV-001", action: "update" });
    }
    const events = await listAuditLog(adapter, { recordId: "SINV-001" });
    expect(events).toHaveLength(5);
  });
});

describe("createTransitionAuditHook · wired into runTransition", () => {
  it("a real transition appends a real audit entry naming the transition and record", async () => {
    const adapter = createInMemoryAdapter({
      seed: { SalesInvoice: [{ id: "SINV-001", customer: "Andalan", status: "Draft" }], AuditLog: [] },
    });
    const meta = invoiceMeta();

    await runTransition(meta, adapter, "SINV-001", "submit", { onAudit: createTransitionAuditHook(adapter, "usr_demo") });

    const events = await listAuditLog(adapter, { recordId: "SINV-001" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ doctype: "SalesInvoice", recordId: "SINV-001", action: "transition", detail: "submit", user: "usr_demo" });
  });

  it("each successive transition appends its own audit entry", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "Andalan", status: "Draft" }],
        AuditLog: [],
      },
    });
    const meta: DoctypeMeta = {
      ...invoiceMeta(),
      states: {
        field: "status",
        values: ["Draft", "Submitted", "Cancelled"],
        initial: "Draft",
        transitions: [
          { name: "submit", label: { id: "Submit", en: "Submit" }, from: ["Draft"], to: "Submitted" },
          { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Submitted"], to: "Cancelled" },
        ],
      },
    };
    const hook = createTransitionAuditHook(adapter);

    await runTransition(meta, adapter, "SINV-001", "submit", { onAudit: hook });
    await runTransition(meta, adapter, "SINV-001", "cancel", { onAudit: hook });

    const events = await listAuditLog(adapter, { recordId: "SINV-001" });
    expect(events.map((e) => e.detail)).toEqual(["cancel", "submit"]); // newest first
  });
});
