import { describe, expect, it, vi } from "vitest";
import { runTransition } from "../documentService";
import { postDocument } from "../postingService";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/errors";
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
      values: ["Draft", "Submitted", "Cancelled"],
      initial: "Draft",
      transitions: [
        { name: "submit", label: { id: "Submit", en: "Submit" }, from: ["Draft"], to: "Submitted", posting: true },
        { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Submitted"], to: "Cancelled" },
        {
          name: "forceCancel",
          label: { id: "Batalkan Paksa", en: "Force Cancel" },
          from: ["Draft", "Submitted"],
          to: "Cancelled",
          permission: "accounts.forceCancel",
        },
        {
          name: "submitIfNonZero",
          label: { id: "Submit Jika Tidak Nol", en: "Submit If Nonzero" },
          from: ["Draft"],
          to: "Submitted",
          guard: { "!=": [{ path: "state.total" }, { literal: 0 }] },
        },
      ],
    },
    permissions: { Everyone: { read: true, write: true, submit: true, delete: true } },
  };
}

function seedAdapter(status = "Draft", extra: Record<string, unknown> = {}) {
  return createInMemoryAdapter({ seed: { SalesInvoice: [{ id: "SINV-001", customer: "Andalan", status, ...extra }] } });
}

describe("runTransition · happy path", () => {
  it("applies the transition's `to` status and returns the updated record", async () => {
    const adapter = seedAdapter("Draft");
    const meta = invoiceMeta();
    const { record } = await runTransition(meta, adapter, "SINV-001", "submit");
    expect(record.status).toBe("Submitted");

    const persisted = await adapter.get("SalesInvoice", "SINV-001");
    expect(persisted?.record.status).toBe("Submitted");
  });

  it("calls onPosting only for a transition marked posting: true", async () => {
    const adapter = seedAdapter("Draft");
    const meta = invoiceMeta();
    const onPosting = vi.fn();
    const onAudit = vi.fn();

    await runTransition(meta, adapter, "SINV-001", "submit", { onPosting, onAudit });
    expect(onPosting).toHaveBeenCalledTimes(1);
    expect(onAudit).toHaveBeenCalledTimes(1);

    await adapter.update({ collection: "SalesInvoice", id: "SINV-001", data: { status: "Submitted" } }); // no-op setup
    onPosting.mockClear();
    onAudit.mockClear();
    await runTransition(meta, adapter, "SINV-001", "cancel", { onPosting, onAudit }); // cancel has no posting: true
    expect(onPosting).not.toHaveBeenCalled();
    expect(onAudit).toHaveBeenCalledTimes(1);
  });
});

describe("runTransition · a transition not valid from the current status is rejected without mutating anything", () => {
  it("throws DataError('validation') and never calls adapter.update", async () => {
    const adapter = seedAdapter("Draft"); // "cancel" requires from: ["Submitted"]
    const updateSpy = vi.spyOn(adapter, "update");
    const meta = invoiceMeta();

    let caught: unknown;
    try {
      await runTransition(meta, adapter, "SINV-001", "cancel");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DataError);
    expect((caught as DataError).code).toBe("validation");
    expect(updateSpy).not.toHaveBeenCalled();

    const persisted = await adapter.get("SalesInvoice", "SINV-001");
    expect(persisted?.record.status).toBe("Draft"); // unchanged
  });
});

describe("runTransition · a failing guard is rejected without mutating anything", () => {
  it("throws DataError('validation') and leaves the record untouched", async () => {
    const adapter = seedAdapter("Draft", { total: 0 }); // guard requires total != 0
    const updateSpy = vi.spyOn(adapter, "update");
    const meta = invoiceMeta();

    let caught: unknown;
    try {
      await runTransition(meta, adapter, "SINV-001", "submitIfNonZero");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DataError);
    expect((caught as DataError).code).toBe("validation");
    expect(updateSpy).not.toHaveBeenCalled();

    const persisted = await adapter.get("SalesInvoice", "SINV-001");
    expect(persisted?.record.status).toBe("Draft");
  });

  it("succeeds once the guard condition is met", async () => {
    const adapter = seedAdapter("Draft", { total: 500000 });
    const meta = invoiceMeta();
    const { record } = await runTransition(meta, adapter, "SINV-001", "submitIfNonZero");
    expect(record.status).toBe("Submitted");
  });
});

describe("runTransition · permission", () => {
  it("throws DataError('forbidden') and does not mutate when the session lacks the permission", async () => {
    const adapter = seedAdapter("Draft");
    const updateSpy = vi.spyOn(adapter, "update");
    const meta = invoiceMeta();

    let caught: unknown;
    try {
      await runTransition(meta, adapter, "SINV-001", "forceCancel", { session: { permissions: {} } });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DataError);
    expect((caught as DataError).code).toBe("forbidden");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("succeeds when the session has the permission", async () => {
    const adapter = seedAdapter("Draft");
    const meta = invoiceMeta();
    const { record } = await runTransition(meta, adapter, "SINV-001", "forceCancel", {
      session: { permissions: { "accounts.forceCancel": true } },
    });
    expect(record.status).toBe("Cancelled");
  });
});

describe("runTransition · unknown transition or record", () => {
  it("throws DataError('validation') for a transition name the doctype doesn't declare", async () => {
    const adapter = seedAdapter("Draft");
    const meta = invoiceMeta();
    let caught: unknown;
    try {
      await runTransition(meta, adapter, "SINV-001", "noSuchTransition");
    } catch (error) {
      caught = error;
    }
    expect((caught as DataError).code).toBe("validation");
  });

  it("throws DataError('not_found') for a record id that doesn't exist", async () => {
    const adapter = seedAdapter("Draft");
    const meta = invoiceMeta();
    let caught: unknown;
    try {
      await runTransition(meta, adapter, "NOPE", "submit");
    } catch (error) {
      caught = error;
    }
    expect((caught as DataError).code).toBe("not_found");
  });
});

describe("runTransition · wired to postingService.postDocument as its onPosting hook", () => {
  it("submitting produces a balanced set of Posting records for that exact document", async () => {
    const meta: DoctypeMeta = {
      ...invoiceMeta(),
      posting: {
        onTransition: "submit",
        lines: [
          { account: "accounts-receivable", side: "debit", amount: { path: "state.total" } },
          { account: "sales", side: "credit", amount: { path: "state.subtotal" } },
          { account: "tax-payable-output", side: "credit", amount: { path: "state.tax" } },
        ],
      },
    };
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "Andalan", status: "Draft", subtotal: 100, tax: 11, total: 111 }],
        Posting: [],
      },
    });

    await runTransition(meta, adapter, "SINV-001", "submit", {
      onPosting: ({ record }) => postDocument(meta, record, adapter),
    });

    const stored = await adapter.query({ collection: "Posting", filters: [{ field: "voucher", op: "eq", value: "SINV-001" }] });
    expect(stored.rows).toHaveLength(3);
    const totalDebit = stored.rows.reduce((sum, r) => sum + (r as { debit: number }).debit, 0);
    const totalCredit = stored.rows.reduce((sum, r) => sum + (r as { credit: number }).credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(111);
  });
});

describe("amendDocument", () => {
  it("creates a new Draft record with -1 suffix from a Cancelled document", async () => {
    const meta = invoiceMeta();
    const adapter = seedAdapter("Cancelled");

    const { record } = await (await import("../documentService")).amendDocument(meta, adapter, "SINV-001");

    expect(record.id).toBe("SINV-001-1");
    expect(record.status).toBe("Draft");
    expect(record.customer).toBe("Andalan");
    expect(record.amendedFrom).toBe("SINV-001");

    // Second amendment on the cancelled revision increments suffix to -2
    await adapter.update({ collection: "SalesInvoice", id: "SINV-001-1", data: { status: "Cancelled" } });
    const { record: secondAmend } = await (await import("../documentService")).amendDocument(meta, adapter, "SINV-001-1");
    expect(secondAmend.id).toBe("SINV-001-2");
  });
});

describe("deleteDraft", () => {
  it("successfully deletes a document in Draft status", async () => {
    const meta = invoiceMeta();
    const adapter = seedAdapter("Draft");

    const { deleteDraft } = await import("../documentService");
    await deleteDraft(meta, adapter, "SINV-001");

    const check = await adapter.get("SalesInvoice", "SINV-001");
    expect(check).toBeUndefined();
  });

  it("throws a validation error when attempting to delete a Submitted document", async () => {
    const meta = invoiceMeta();
    const adapter = seedAdapter("Submitted");

    const { deleteDraft } = await import("../documentService");
    await expect(deleteDraft(meta, adapter, "SINV-001")).rejects.toThrow(
      /Hanya dokumen dalam status Draft yang dapat dihapus/i,
    );

    // Document is still untouched in adapter
    const check = await adapter.get("SalesInvoice", "SINV-001");
    expect(check).not.toBeNull();
  });
});

