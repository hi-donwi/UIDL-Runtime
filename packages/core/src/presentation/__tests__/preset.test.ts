import { describe, expect, it } from "vitest";
import { DocumentSchema } from "../../schemas/document";
import { compileFormPage } from "../../compiler/form";
import { compileListPage } from "../../compiler/list";
import { compileReportPage } from "../../compiler/report";
import type { FormPageMeta, HostCapabilities, ListPageMeta, ReportPageMeta } from "../../compiler/types";
import {
  applyPresentationPreset,
  denseBusinessPreset,
  presentationPresetCatalog,
  validatePresentationPresetManifest,
} from "../index";

const capabilities: HostCapabilities = {
  collections: ["billing_records", "customers"],
  commands: ["document.print"],
};

const listMeta: ListPageMeta = {
  name: "billing_records",
  label: { id: "Catatan Tagihan", en: "Billing Records" },
  titleField: "customer",
  fields: [
    { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" },
    { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select" },
    { key: "issued_at", label: { id: "Tanggal Terbit", en: "Issued At" }, widget: "Date" },
  ],
  columns: [{ field: "customer" }, { field: "amount", align: "right" }, { field: "status" }],
  filters: [{ field: "status", widget: "Select" }, { field: "issued_at", widget: "DateRange" }],
  defaultSort: { field: "issued_at", dir: "desc" },
  pageSize: 20,
};

const formMeta: FormPageMeta = {
  name: "billing_records",
  label: { id: "Catatan Tagihan", en: "Billing Record" },
  titleField: "customer",
  fields: [
    { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "Link", options: { doctype: "customers" } },
    { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency", required: true },
    { key: "issued_at", label: { id: "Tanggal Terbit", en: "Issued At" }, widget: "Date" },
  ],
};

const reportMeta: ReportPageMeta = {
  name: "billing_summary",
  label: { id: "Ringkasan Tagihan", en: "Billing Summary" },
  columns: [
    { key: "customer", label: { id: "Pelanggan", en: "Customer" } },
    { key: "amount", label: { id: "Nominal", en: "Amount" }, align: "right", format: "currency" },
  ],
  dataSource: {
    $query: { collection: "billing_records" },
  },
  filters: [
    { field: "issued_at", label: { id: "Tanggal", en: "Date" }, widget: "DateRange" },
  ],
};

function collectNodes(node: unknown, out: Array<{ id: string; type: string }> = []) {
  const value = node as { id?: string; type?: string; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (value.id && value.type) out.push({ id: value.id, type: value.type });
  value.children?.forEach((child) => collectNodes(child, out));
  Object.values(value.slots ?? {}).forEach((children) => children.forEach((child) => collectNodes(child, out)));
  return out;
}

describe("presentation preset contract", () => {
  it("exposes the neutral dense-business manifest and both theme modes", () => {
    expect(denseBusinessPreset).toMatchObject({
      id: "dense-business",
      version: "0.1.0",
      kind: "presentation-preset",
      targets: ["react"],
      themes: ["light", "dark"],
      recipes: ["shell", "list", "form", "report", "print"],
      capabilities: ["data-adapter", "host-actions"],
    });
    expect(denseBusinessPreset.themePresets.light!.theme.mode).toBe("light");
    expect(denseBusinessPreset.themePresets.dark!.theme.mode).toBe("dark");
    expect(denseBusinessPreset.themePresets.light!.theme.semantics.color["focus-ring"]).toBe(
      "{primitives.color.accent}",
    );
  });

  it("rejects malformed manifests at the public boundary", () => {
    expect(() =>
      validatePresentationPresetManifest({
        id: "Pilot Theme",
        version: "0.1.0",
        kind: "presentation-preset",
        targets: ["react"],
        themes: ["light"],
        recipes: ["list"],
        requiredWidgets: [],
        capabilities: [],
        provenance: { source: "test" },
      }),
    ).toThrow();
  });

  it("catalogue lookup is deterministic and applies a supported theme to UIDL", () => {
    expect(presentationPresetCatalog.list()).toEqual([denseBusinessPreset]);
    expect(presentationPresetCatalog.get("dense-business")).toEqual(denseBusinessPreset);

    const doc = compileListPage(listMeta, { hostCapabilities: capabilities, uiPolicy: { lang: "en" } });
    const themed = applyPresentationPreset(doc, denseBusinessPreset, "dark");
    expect(themed.theme).toBe("theme-dense-business-dark");
    expect(themed.presentationPreset).toEqual({ id: "dense-business", version: "0.1.0" });
    expect(DocumentSchema.safeParse(themed).success).toBe(true);
  });

  it("covers the list, form, and report recipes with a schema-valid neutral fixture", () => {
    const list = compileListPage(listMeta, { hostCapabilities: capabilities });
    const form = compileFormPage(formMeta, "new", { hostCapabilities: capabilities });
    const report = compileReportPage(reportMeta, {
      hostCapabilities: capabilities,
      extraHeaderActions: [
        {
          id: "print-report",
          type: "Button",
          props: { label: "Print", variant: "secondary" },
          events: { onClick: [{ command: { name: "document.print" } }] },
        },
      ],
    });

    for (const document of [list, form, report]) {
      const themed = applyPresentationPreset(document, denseBusinessPreset);
      expect(DocumentSchema.safeParse(themed).success).toBe(true);
      expect(themed.theme).toBe("theme-dense-business-light");
    }

    expect(collectNodes(report.root)).toContainEqual({ id: "print-report", type: "Button" });
  });
});
