import { describe, expect, it, vi } from "vitest";
import { createInMemoryAdapter, DataError } from "~/data";
import type { DoctypeMeta } from "../../doctypes/types";
import { createAdapterMutationHandler } from "../mutationHandler";

const INVOICE_META: DoctypeMeta = {
  name: "SalesInvoice",
  label: { id: "Faktur Penjualan", en: "Sales Invoice" },
  module: "Penjualan",
  naming: "SINV-.YYYY.-.#####",
  titleField: "customer",
  fields: [
    { key: "id", label: { id: "Nomor", en: "No" }, widget: "TextField", readOnly: true },
    { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select" },
    { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency", required: true },
  ],
  listView: {
    columns: [{ field: "id" }, { field: "customer" }, { field: "status" }, { field: "total" }],
    defaultSort: { field: "id", dir: "asc" },
    pageSize: 10,
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

const TRANSITION_INVOICE_META: DoctypeMeta = {
  ...INVOICE_META,
  states: {
    field: "status",
    values: ["Draft", "Unpaid", "Cancelled"],
    initial: "Draft",
    transitions: [
      {
        name: "submit",
        label: { id: "Submit", en: "Submit" },
        from: ["Draft"],
        to: "Unpaid",
        permission: "accounts.submit",
        posting: true,
      },
      { name: "cancel", label: { id: "Cancel", en: "Cancel" }, from: ["Unpaid"], to: "Cancelled" },
    ],
  },
  posting: {
    onTransition: "submit",
    lines: [
      { account: "accounts-receivable", side: "debit", amount: { path: "state.total" } },
      { account: "sales", side: "credit", amount: { path: "state.total" } },
    ],
  },
};

describe("createAdapterMutationHandler", () => {
  it("creates a record through the adapter with auto-generated naming series from meta.naming", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] }, now: () => 1, random: () => 0 });
    const handler = createAdapterMutationHandler({ adapter, doctypes: [INVOICE_META] });

    const result = await handler({
      operation: "create",
      collection: "SalesInvoice",
      payload: { id: "", customer: "PT Andalan", status: "Draft", total: 1000 },
    });

    expect(result).toMatchObject({
      record: {
        id: "SINV-2026-00001",
        customer: "PT Andalan",
        total: 1000,
      },
      meta: { version: 1 },
    });
  });

  it("strips blank create ids and falls back to adapter default id when meta naming series is empty", async () => {
    const metaWithoutNaming: DoctypeMeta = { ...INVOICE_META, naming: "" };
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] }, now: () => 1, random: () => 0 });
    const handler = createAdapterMutationHandler({ adapter, doctypes: [metaWithoutNaming] });

    const result = await handler({
      operation: "create",
      collection: "SalesInvoice",
      payload: { id: "", customer: "PT Andalan", status: "Draft", total: 1000 },
    });

    expect(result).toMatchObject({
      record: {
        id: "SAL-1-0",
        customer: "PT Andalan",
        total: 1000,
      },
      meta: { version: 1 },
    });
  });

  it("updates a record through the adapter with optimistic version", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1000 }],
      },
    });
    const handler = createAdapterMutationHandler({ adapter, doctypes: [INVOICE_META] });

    const result = await handler({
      operation: "update",
      collection: "SalesInvoice",
      id: "SINV-001",
      version: 1,
      payload: { customer: "PT Andalan Updated", status: "Draft", total: 1000 },
    });

    expect(result).toMatchObject({
      record: { id: "SINV-001", customer: "PT Andalan Updated" },
      meta: { version: 2 },
    });
  });

  it("throws DataError validation fields before adapter mutation when meta validation fails", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] } });
    const handler = createAdapterMutationHandler({ adapter, doctypes: [INVOICE_META] });

    await expect(
      handler({
        operation: "create",
        collection: "SalesInvoice",
        payload: { customer: "", status: "Draft", total: 1000 },
      }),
    ).rejects.toMatchObject({
      code: "validation",
      fields: { customer: "Pelanggan wajib diisi" },
    });
    await expect(adapter.query({ collection: "SalesInvoice" })).resolves.toMatchObject({ total: 0 });
  });

  it("deletes a record through the adapter", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1000 }],
      },
    });
    const handler = createAdapterMutationHandler({ adapter, doctypes: [INVOICE_META] });

    await expect(handler({ operation: "delete", collection: "SalesInvoice", id: "SINV-001" })).resolves.toEqual({
      id: "SINV-001",
    });
    await expect(adapter.get("SalesInvoice", "SINV-001")).resolves.toBeUndefined();
  });

  it("rejects update without an id with a validation DataError", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] } });
    const handler = createAdapterMutationHandler({ adapter });

    await expect(handler({ operation: "update", collection: "SalesInvoice" })).rejects.toBeInstanceOf(DataError);
    await expect(handler({ operation: "update", collection: "SalesInvoice" })).rejects.toMatchObject({
      code: "validation",
    });
  });

  it("runs transition mutations through documentService hooks instead of adapter.transition", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1000 }],
      },
    });
    const directTransition = vi.spyOn(adapter, "transition");
    const onPosting = vi.fn();
    const onAudit = vi.fn();
    const handler = createAdapterMutationHandler({
      adapter,
      doctypes: [TRANSITION_INVOICE_META],
      session: { permissions: { "accounts.submit": true } },
      onPosting,
      onAudit,
    });

    const result = await handler({
      operation: "transition",
      collection: "SalesInvoice",
      id: "SINV-001",
      transition: "submit",
    });

    expect(result).toMatchObject({
      record: { id: "SINV-001", status: "Unpaid" },
      meta: { version: 2 },
    });
    expect(directTransition).not.toHaveBeenCalled();
    expect(onPosting).toHaveBeenCalledWith({
      meta: TRANSITION_INVOICE_META,
      transition: TRANSITION_INVOICE_META.states!.transitions[0],
      record: expect.objectContaining({ id: "SINV-001", status: "Unpaid" }),
    });
    expect(onAudit).toHaveBeenCalledWith({
      meta: TRANSITION_INVOICE_META,
      transition: TRANSITION_INVOICE_META.states!.transitions[0],
      record: expect.objectContaining({ id: "SINV-001", status: "Unpaid" }),
    });
  });

  it("rejects invalid transition state without mutating the adapter", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1000 }],
      },
    });
    const updateSpy = vi.spyOn(adapter, "update");
    const handler = createAdapterMutationHandler({ adapter, doctypes: [TRANSITION_INVOICE_META] });

    await expect(
      handler({
        operation: "transition",
        collection: "SalesInvoice",
        id: "SINV-001",
        transition: "cancel",
      }),
    ).rejects.toMatchObject({
      code: "validation",
      fields: { status: 'Cannot cancel from "Draft"' },
    });
    expect(updateSpy).not.toHaveBeenCalled();
    await expect(adapter.get("SalesInvoice", "SINV-001")).resolves.toMatchObject({
      record: { status: "Draft" },
      meta: { version: 1 },
    });
  });
});
