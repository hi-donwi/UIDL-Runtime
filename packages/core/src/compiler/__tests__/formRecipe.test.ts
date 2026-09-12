import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileFormPage } from "../form.js";
import { DocumentSchema } from "../../schemas/document.js";
import type { FormPageMeta, HostCapabilities } from "../types.js";

function sampleMeta(): FormPageMeta {
  return {
    name: "invoices",
    label: { id: "Faktur", en: "Invoices" },
    titleField: "customer",
    fields: [
      { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true },
      { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency", required: true },
      { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", options: [{ value: "draft", label: "Draft" }, { value: "paid", label: "Paid" }] },
      { key: "supplier", label: { id: "Pemasok", en: "Supplier" }, widget: "Link", options: { doctype: "suppliers" } },
      { key: "due_date", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date" },
      { key: "notes", label: { id: "Catatan", en: "Notes" }, widget: "Textarea" },
      { key: "is_paid", label: { id: "Lunas", en: "Paid" }, widget: "Checkbox" },
      { key: "items", label: { id: "Barang", en: "Items" }, widget: "Table" },
    ],
    states: {
      field: "status",
      values: ["draft", "submitted", "cancelled"],
      initial: "draft",
      transitions: [
        { name: "submit", label: { id: "Kirim", en: "Submit" }, from: ["draft"], to: "submitted" },
        { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["submitted"], to: "cancelled" },
      ],
    },
    childTables: [{ field: "items", doctype: "invoice_items" }],
  };
}

function caps(): HostCapabilities {
  return { collections: ["invoices", "suppliers", "invoice_items"], commands: [] };
}

function collectNodes(node: unknown, predicate: (n: { type: string; id?: string; props?: Record<string, unknown>; events?: Record<string, unknown>; visibility?: unknown }) => boolean, out: unknown[] = []) {
  const n = node as { type: string; id?: string; props?: Record<string, unknown>; events?: Record<string, unknown>; visibility?: unknown; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (predicate(n as never)) out.push(n);
  n.children?.forEach((c) => collectNodes(c, predicate, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectNodes(c, predicate, out)));
  return out;
}

function walkTypes(node: unknown, out: Set<string>) {
  const n = node as { type?: string; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (n.type) out.add(n.type);
  n.children?.forEach((c) => walkTypes(c, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => walkTypes(c, out)));
}

describe("Form/detail recipe — fields/links/children/validation/lifecycle", () => {
  it("is host-and-company-free (no forbidden imports)", () => {
    const candidates = [
      resolve(import.meta.dirname ?? ".", "../form.ts"),
      resolve(process.cwd(), "packages/core/src/compiler/form.ts"),
    ];
    let content = "";
    for (const p of candidates) {
      try {
        content = readFileSync(p, "utf-8");
        if (content.includes("compileFormPage")) break;
      } catch {
        // Not this candidate; try the next one.
      }
    }
    expect(content).toContain("compileFormPage");
    const importLines = content.split("\n").filter((l) => l.trim().startsWith("import "));
    const importsText = importLines.join("\n");
    for (const needle of ["@host-app", "templates", "ShoeCompany", "koperasi", "ErpModuleSpec"]) {
      expect(importsText).not.toContain(needle);
    }
    const fromSpecifiers = Array.from(importsText.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);
    for (const spec of fromSpecifiers) {
      expect(spec).toMatch(/^(\.\.\/types|\.\.\/utils\/i18n|\.\/types(\.js)?)$/);
    }
  });

  it("produces a schema-valid UIDLDocument for new and edit modes", () => {
    const meta = sampleMeta();
    const createDoc = compileFormPage(meta, "new", { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(createDoc).success).toBe(true);
    const editDoc = compileFormPage(meta, "INV-001", { hostCapabilities: caps(), initialData: { customer: "Acme", amount: 1000 } });
    expect(DocumentSchema.safeParse(editDoc).success).toBe(true);
    expect(editDoc.state).toMatchObject({ id: "INV-001", customer: "Acme" });
    expect(createDoc.state).toMatchObject({ id: "" });
  });

  it("renders fields per widget (TextField, Currency, Select, Link, Date, Textarea, Checkbox) with stable semantic IDs", () => {
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    // stable IDs
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-customer")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-amount")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-notes")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-is_paid")).toHaveLength(1);

    const types = new Set<string>();
    walkTypes(doc.root, types);
    expect(types.has("TextField")).toBe(true);
    expect(types.has("Textarea")).toBe(true);
    expect(types.has("Checkbox")).toBe(true);
    expect(types.has("Select")).toBe(true);

    // Link field rendered as scoped lookup Column with Select + loading/error/empty
    const linkWrapper = collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier")[0] as { type: string; children: unknown[] };
    expect(linkWrapper.type).toBe("Column");
    const linkSelect = collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier-select")[0] as { type: string; props: Record<string, unknown> };
    expect(linkSelect.type).toBe("Select");
    expect(linkSelect.props.value).toEqual({ $bind: "state.supplier" });
    // dataSource for link should exist
    expect((doc as unknown as { dataSources?: Record<string, unknown> }).dataSources).toHaveProperty("link_supplier");
  });

  it("links: Link widget binds to state and has scoped lookup options", () => {
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    const linkSelect = collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier-select")[0] as { props: Record<string, unknown> };
    expect(linkSelect.props.value).toEqual({ $bind: "state.supplier" });
    // options is now a bind to the lookup dataSource rows, not a static array
    expect(linkSelect.props.options).toEqual({ $bind: "state.$data.link_supplier.rows" });
    // loading/error/empty states exist
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier-loading")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier-error")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "form-invoices-field-supplier-empty")).toHaveLength(1);
  });

  it("children: renders DataTable for childTables with correct dataSource", () => {
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    const child = collectNodes(doc.root, (n) => n.id === "child-table-items")[0] as { type: string; props: Record<string, unknown> };
    expect(child).toBeDefined();
    expect(child.type).toBe("DataTable");
    expect(child.props.dataSource).toBe("items");
    expect(child.props.paginate).toBe(false);
  });

  it("children: form without childTables still valid and not full-width", () => {
    const meta: FormPageMeta = { ...sampleMeta(), childTables: [], fields: sampleMeta().fields.filter((f) => f.key !== "items") };
    const doc = compileFormPage(meta, "new", { hostCapabilities: caps() });
    expect(collectNodes(doc.root, (n) => n.id === "child-table-items")).toHaveLength(0);
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("validation: each non-checkbox field binds error to state.formErrors.*", () => {
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    const customer = collectNodes(doc.root, (n) => n.id === "form-invoices-field-customer")[0] as { props: Record<string, unknown> };
    expect(customer.props.error).toEqual({ $bind: "state.formErrors.customer" });
    const isPaid = collectNodes(doc.root, (n) => n.id === "form-invoices-field-is_paid")[0] as { props: Record<string, unknown> };
    expect(isPaid.props.error).toBeUndefined(); // checkbox has no error prop
    // root has formError alert
    const err = collectNodes(doc.root, (n) => n.id === "form-error")[0] as { props: Record<string, unknown> };
    expect(err.props.value).toEqual({ $bind: "state.formError" });
  });

  it("lifecycle: transition buttons exist only in edit mode with correct visibility conditions", () => {
    const newDoc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    expect(collectNodes(newDoc.root, (n) => n.id === "transition-submit")).toHaveLength(0);
    expect(collectNodes(newDoc.root, (n) => n.id === "transition-cancel")).toHaveLength(0);

    const editDoc = compileFormPage(sampleMeta(), "INV-001", { hostCapabilities: caps() });
    const submit = collectNodes(editDoc.root, (n) => n.id === "transition-submit")[0] as { visibility: { condition: unknown }; events: Record<string, unknown> };
    expect(submit).toBeDefined();
    expect(submit.visibility.condition).toEqual({ "==": [{ path: "state.status" }, { literal: "draft" }] });
    const cancel = collectNodes(editDoc.root, (n) => n.id === "transition-cancel")[0] as { visibility: { condition: unknown } };
    expect(cancel.visibility.condition).toEqual({ "==": [{ path: "state.status" }, { literal: "submitted" }] });

    // transition mutate has correct collection/transition/version
    const submitEvents = submit.events.onClick as Array<{ mutate: { collection: string; transition: string; version: unknown } }>;
    expect(submitEvents[0].mutate.collection).toBe("invoices");
    expect(submitEvents[0].mutate.transition).toBe("submit");
    expect(submitEvents[0].mutate.version).toEqual({ $expr: { path: "state._meta.version" } });
  });

  it("Save button mutates create vs update with appropriate payload and version", () => {
    const createDoc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    const saveNew = collectNodes(createDoc.root, (n) => n.id === "save-btn")[0] as { events: Record<string, unknown> };
    const newMutate = (saveNew.events.onClick as Array<{ mutate: { operation: string; id?: unknown; payload: Record<string, unknown> } }>)[0].mutate;
    expect(newMutate.operation).toBe("create");
    expect(newMutate.id).toBeUndefined();
    expect(newMutate.payload).toHaveProperty("customer");

    const editDoc = compileFormPage(sampleMeta(), "INV-001", { hostCapabilities: caps() });
    const saveEdit = collectNodes(editDoc.root, (n) => n.id === "save-btn")[0] as { events: Record<string, unknown> };
    const editMutate = (saveEdit.events.onClick as Array<{ mutate: { operation: string; id: unknown } }>)[0].mutate;
    expect(editMutate.operation).toBe("update");
    expect(editMutate.id).toEqual({ $expr: { path: "state.id" } });
  });

  it("fail-closed when collection not allowlisted", () => {
    expect(() =>
      compileFormPage(sampleMeta(), "new", { hostCapabilities: { collections: ["other"], commands: [] } }),
    ).toThrow(/hostCapabilities rejected/);
  });

  it("required marker * appears on label for required fields", () => {
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    // labels live in Row's first child Text — check row label texts
    const rowLabels = collectNodes(doc.root, (n) => (n.id?.startsWith("row-") ?? false) && n.type === "Row")
      .map((n) => (n as { children: Array<{ props?: Record<string, unknown> }> }).children[0] as { props: Record<string, unknown> })
      .map((c) => c.props?.value as string);
    expect(rowLabels.some((l) => l.includes("Pelanggan") && l.includes("*"))).toBe(true);
  });

  it("initialData and initialVersion seed state correctly", () => {
    const doc = compileFormPage(sampleMeta(), "INV-001", {
      hostCapabilities: caps(),
      initialData: { customer: "PT Maju", amount: 5000, status: "submitted" },
      initialVersion: 7,
    });
    expect(doc.state).toMatchObject({ customer: "PT Maju", amount: 5000, status: "submitted", _meta: { version: 7 } });
  });

  it("names every control for assistive tech, since the visible label is a sibling node", () => {
    // TwoColumnForm prints the label in the row's start column, so the control printed no
    // label of its own and reached axe as an unnamed input (`label` / `select-name`, critical).
    const doc = compileFormPage(sampleMeta(), "new", { hostCapabilities: caps() });
    const controls = (collectNodes(
      doc.root,
      (n) => typeof n.id === "string" && n.id.startsWith("form-") && n.id !== "form-header",
    ) as Array<{ id: string; type: string; props?: Record<string, unknown> }>).filter((n) =>
      ["TextField", "Select", "Textarea", "RadioGroup"].includes(n.type),
    );

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const props = (control.props ?? {}) as Record<string, unknown>;
      expect(props["aria-label"] ?? props.label).toBeTruthy();
    }
  });

  it("emits no `size` on a checkbox, which has no such prop", () => {
    // A host that validates props before rendering rejected the whole document over this, so
    // every doctype with a boolean field showed an error box instead of its editor.
    const meta = sampleMeta();
    meta.fields.push({ key: "isActive", label: { id: "Aktif", en: "Active" }, widget: "Checkbox" });
    const doc = compileFormPage(meta, "new", { hostCapabilities: caps() });
    const checkbox = collectNodes(doc.root, (n) => n.type === "Checkbox")[0] as { props: Record<string, unknown> };

    expect(checkbox).toBeDefined();
    expect(checkbox.props).not.toHaveProperty("size");
    // The other controls still get Meridian's small density.
    const textField = collectNodes(doc.root, (n) => n.type === "TextField")[0] as { props: Record<string, unknown> };
    expect(textField.props.size).toBe("small");
  });
});
