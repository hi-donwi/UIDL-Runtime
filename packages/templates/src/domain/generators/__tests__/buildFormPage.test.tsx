import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentSchema } from "~/schemas/document";
import { createDocumentState } from "~/state/createDocumentState";
import { UIDocumentRenderer } from "~/renderer/UIDocumentRenderer";
import { createInMemoryAdapter } from "~/data";
import type { DoctypeMeta } from "../../doctypes/types";
import { createAdapterMutationHandler } from "../../services/mutationHandler";
import { buildFormPage } from "../buildFormPage";

const SAMPLE_INVOICE_META: DoctypeMeta = {
  name: "SalesInvoice",
  label: { id: "Faktur Penjualan", en: "Sales Invoice" },
  module: "Penjualan",
  naming: "SINV-.YYYY.-.#####",
  titleField: "customer",
  fields: [
    { key: "id", label: { id: "Nomor Faktur", en: "Invoice No" }, widget: "TextField", readOnly: true },
    { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true, section: "Informasi Utama" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      section: "Informasi Utama",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Paid", label: "Paid" },
        { value: "Overdue", label: "Overdue" },
      ],
    },
    { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency", required: true, section: "Finansial" },
    { key: "dueDate", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date", section: "Finansial" },
    { key: "isTaxable", label: { id: "Kena PPN", en: "Taxable" }, widget: "Checkbox", section: "Finansial" },
    { key: "items", label: { id: "Daftar Item", en: "Line Items" }, widget: "Table" },
    { key: "notes", label: { id: "Catatan", en: "Notes" }, widget: "Textarea", section: "Lainnya" },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "customer" },
      { field: "status", align: "center" },
      { field: "total", align: "right" },
    ],
    defaultSort: { field: "dueDate", dir: "desc" },
    pageSize: 10,
    statusField: "status",
  },
  childTables: [{ field: "items", doctype: "SalesInvoiceItem" }],
  states: {
    field: "status",
    values: ["Draft", "Unpaid", "Paid", "Overdue"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Kirim Faktur", en: "Submit Invoice" }, from: ["Draft"], to: "Unpaid", posting: true },
      { name: "pay", label: { id: "Bayar", en: "Pay" }, from: ["Unpaid", "Overdue"], to: "Paid", posting: true },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

describe("buildFormPage · generator", () => {
  it("produces a valid UIDL document in create mode (id='new') passing DocumentSchema.parse", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const parsed = DocumentSchema.parse(doc);
    expect(parsed.id).toBe("form-salesinvoice-new");
    expect(parsed.name).toBe("Buat Faktur Penjualan");
    expect(doc.state!.status).toBe("Draft");
    expect(doc.state!.total).toBe(0);
    expect(doc.state!.isTaxable).toBe(false);
  });

  it("produces a valid UIDL document in edit mode with initialData", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "SINV-001", {
      company: "shoe-company",
      initialVersion: 1,
      initialData: {
        id: "SINV-001",
        customer: "PT Andalan",
        status: "Draft",
        total: 1500000,
        dueDate: "2026-08-30",
        isTaxable: true,
      },
    });
    const parsed = DocumentSchema.parse(doc);
    expect(parsed.id).toBe("form-salesinvoice-sinv-001");
    expect(doc.state!.customer).toBe("PT Andalan");
    expect(doc.state!.total).toBe(1500000);
    expect(doc.state!.isTaxable).toBe(true);
    expect(doc.state!._meta).toEqual({ version: 1 });
  });

  it("keeps state.id set to the route id in edit mode even without initialData", () => {
    // This is the shape moduleRuntime.ts actually calls buildFormPage with today: it never
    // fetches the record, so initialData is always undefined for edit routes. Before this fix,
    // the "populate field values" loop iterated over every FieldMeta including the doctype's own
    // `id` field and fell through to the else-branch default (""), clobbering the correct id set
    // earlier — which made every Save/transition mutate action fail with `"mutate.id" must
    // resolve to a non-empty string or number` for every existing record, in every vertical.
    const doc = buildFormPage(SAMPLE_INVOICE_META, "SINV-001", { company: "shoe-company" });
    expect(doc.state!.id).toBe("SINV-001");
  });

  it("supports English localization and custom listRoute", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", {
      lang: "en",
      listRoute: "/custom/sales-invoices",
    });
    expect(doc.name).toBe("New Sales Invoice");
  });
});

describe("buildFormPage · integration with UIDocumentRenderer", () => {
  it("renders form fields, section headers, and child table correctly", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const store = createDocumentState(doc.state).getState();

    render(<UIDocumentRenderer document={doc} stateStore={store} />);

    // Section headers
    expect(screen.getByText("Informasi Utama")).toBeInTheDocument();
    expect(screen.getByText("Finansial")).toBeInTheDocument();
    expect(screen.getByText("Lainnya")).toBeInTheDocument();

    // Field labels
    expect(screen.getByText(/Pelanggan/)).toBeInTheDocument();
    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText(/Jatuh Tempo/)).toBeInTheDocument();

    // Buttons
    expect(screen.getByText("Simpan")).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeInTheDocument();

    // Child table
    expect(screen.getByText("Daftar Item")).toBeInTheDocument();
  });

  it("updates state when form fields change", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const store = createDocumentState(doc.state).getState();

    render(<UIDocumentRenderer document={doc} stateStore={store} />);

    store.setState("customer", "CV Sinar Abadi");
    expect(store.getValue("customer")).toBe("CV Sinar Abadi");

    store.setState("total", 2500000);
    expect(store.getValue("total")).toBe(2500000);
  });

  it("renders state machine transition buttons in edit mode and persists through mutationHandler", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [{ id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1500000 }],
      },
    });
    const directTransition = vi.spyOn(adapter, "transition");
    const doc = buildFormPage(SAMPLE_INVOICE_META, "SINV-001", {
      company: "shoe-company",
      initialVersion: 1,
      initialData: {
        id: "SINV-001",
        customer: "PT Andalan",
        status: "Draft",
        total: 1500000,
      },
    });
    const store = createDocumentState(doc.state).getState();

    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={store}
        mutationHandler={createAdapterMutationHandler({
          adapter,
          doctypes: [SAMPLE_INVOICE_META],
        })}
      />,
    );

    // Submit transition button should be visible when status is Draft
    const submitBtn = screen.getByText("Kirim Faktur");
    expect(submitBtn).toBeInTheDocument();

    fireEvent.click(submitBtn);

    await waitFor(() => expect(store.getValue("formStatus")).toBe("success"));
    expect(store.getValue("status")).toBe("Unpaid");
    expect(store.getValue("_meta.version")).toBe(2);
    expect(directTransition).not.toHaveBeenCalled();

    const persisted = await adapter.get("SalesInvoice", "SINV-001");
    expect(persisted).toMatchObject({
      record: { status: "Unpaid" },
      meta: { version: 2 },
    });
  });

  it("navigates back to list route when Cancel is clicked", () => {
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const store = createDocumentState(doc.state).getState();
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={store}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    fireEvent.click(screen.getByText("Batal"));
    expect(routeChanges).toContain("/app/shoe-company/list/SalesInvoice");
  });

  it("creates a record through mutationHandler, then navigates back to list route", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] }, now: () => 1, random: () => 0 });
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const store = createDocumentState(doc.state).getState();
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={store}
        mutationHandler={createAdapterMutationHandler({
          adapter,
          doctypes: [SAMPLE_INVOICE_META],
        })}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    store.setState("customer", "CV Sinar Abadi");
    store.setState("total", 2500000);
    fireEvent.click(screen.getByText("Simpan"));

    await waitFor(() => expect(routeChanges).toContain("/app/shoe-company/list/SalesInvoice"));
    const rows = await adapter.query({ collection: "SalesInvoice" });
    expect(rows.rows).toEqual([
      expect.objectContaining({
        customer: "CV Sinar Abadi",
        total: 2500000,
        status: "Draft",
      }),
    ]);
    expect(store.getValue("formStatus")).toBe("success");
  });

  it("updates an existing record through mutationHandler with the current version", async () => {
    const adapter = createInMemoryAdapter({
      seed: {
        SalesInvoice: [
          { id: "SINV-001", customer: "PT Andalan", status: "Draft", total: 1500000 },
        ],
      },
    });
    const doc = buildFormPage(SAMPLE_INVOICE_META, "SINV-001", {
      company: "shoe-company",
      initialVersion: 1,
      initialData: {
        id: "SINV-001",
        customer: "PT Andalan",
        status: "Draft",
        total: 1500000,
      },
    });
    const store = createDocumentState(doc.state).getState();
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={store}
        mutationHandler={createAdapterMutationHandler({
          adapter,
          doctypes: [SAMPLE_INVOICE_META],
        })}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    store.setState("customer", "PT Andalan Updated");
    fireEvent.click(screen.getByText("Simpan"));

    await waitFor(() => expect(routeChanges).toContain("/app/shoe-company/list/SalesInvoice"));
    const saved = await adapter.get("SalesInvoice", "SINV-001");
    expect(saved?.record.customer).toBe("PT Andalan Updated");
    expect(saved?.meta.version).toBe(2);
  });

  it("surfaces adapter validation field errors without navigating", async () => {
    const adapter = createInMemoryAdapter({ seed: { SalesInvoice: [] } });
    const doc = buildFormPage(SAMPLE_INVOICE_META, "new", { company: "shoe-company" });
    const store = createDocumentState(doc.state).getState();
    const routeChanges: string[] = [];

    render(
      <UIDocumentRenderer
        document={doc}
        stateStore={store}
        mutationHandler={createAdapterMutationHandler({
          adapter,
          doctypes: [SAMPLE_INVOICE_META],
        })}
        onRouteChange={(route) => routeChanges.push(String(route))}
      />,
    );

    store.setState("customer", "");
    fireEvent.click(screen.getByText("Simpan"));

    expect(await screen.findByText("Pelanggan wajib diisi")).toBeInTheDocument();
    expect(store.getValue("formStatus")).toBe("error");
    expect(store.getValue("formErrors")).toEqual({ customer: "Pelanggan wajib diisi" });
    expect(routeChanges).toEqual([]);
  });
});
