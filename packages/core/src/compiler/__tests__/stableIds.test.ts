import { describe, expect, it } from "vitest";
import { compileListPage } from "../list.js";
import { compileFormPage } from "../form.js";
import { compileReportPage } from "../report.js";
import { compileDashboardPage } from "../dashboard.js";
import { compileSettingsPage } from "../settings.js";
import { compileTreePage } from "../tree.js";
import { compileWizardPage } from "../wizard.js";
import { semanticNodeId, semanticListNodeIds } from "../types.js";
import type { HostCapabilities } from "../types.js";

function caps(collections: string[] = ["test", "invoices", "settings_demo", "accounts", "onboarding", "trial_balance", "sales-overview"]): HostCapabilities {
  return { collections, commands: ["workspace.settings.save"] };
}

function collectIds(node: unknown, out: Set<string> = new Set<string>()): Set<string> {
  const n = node as { id?: string; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (n.id) out.add(n.id);
  if (n.children) n.children.forEach((c) => collectIds(c, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectIds(c, out)));
  return out;
}

describe("Stable semantic node IDs — unchanged elements keep ID after patch", () => {
  it("semantic helpers are deterministic", () => {
    expect(semanticNodeId("form", "invoices", "customer")).toBe("form-invoices-field-customer");
    expect(semanticNodeId("form", "invoices", "customer")).toBe(semanticNodeId("form", "invoices", "customer"));
    expect(semanticListNodeIds("invoices")).toEqual({ search: "list-invoices-search", table: "list-invoices-table", page: "list-invoices-page" });
    expect(semanticNodeId("list", "invoices", "status")).not.toBe(semanticNodeId("form", "invoices", "status"));
  });

  it("list: same meta compiled twice yields identical IDs; adding a field keeps existing IDs", () => {
    const base = {
      name: "invoices",
      label: { id: "Faktur", en: "Invoices" },
      titleField: "customer",
      fields: [
        { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" as const },
        { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency" as const },
      ],
      columns: [{ field: "customer" }, { field: "amount" }],
      defaultSort: { field: "customer", dir: "asc" as const },
    };
    const doc1 = compileListPage(base, { hostCapabilities: caps(["invoices"]) });
    const doc2 = compileListPage(base, { hostCapabilities: caps(["invoices"]) });
    expect(collectIds(doc1.root)).toEqual(collectIds(doc2.root));

    const patched = { ...base, fields: [...base.fields, { key: "status", label: { id: "Status", en: "Status" }, widget: "Select" as const, options: [] }], columns: [...base.columns, { field: "status" }] };
    const docPatched = compileListPage(patched, { hostCapabilities: caps(["invoices"]) });
    const ids1 = collectIds(doc1.root);
    const idsPatched = collectIds(docPatched.root);
    // existing semantic IDs must still exist
    expect(idsPatched.has("list-invoices-search")).toBe(true);
    expect(idsPatched.has("list-invoices-table")).toBe(true);
    for (const id of ids1) if (id.startsWith("filter-") || id.startsWith("list-")) expect(idsPatched.has(id)).toBe(true);
  });

  it("form: field IDs stable; adding a field does not shift existing field IDs", () => {
    const base = {
      name: "invoices",
      label: { id: "Faktur", en: "Invoices" },
      titleField: "customer",
      fields: [
        { key: "customer", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField" as const },
        { key: "amount", label: { id: "Nominal", en: "Amount" }, widget: "Currency" as const },
      ],
    };
    const doc1 = compileFormPage(base, "new", { hostCapabilities: caps(["invoices"]) });
    const patched = { ...base, fields: [...base.fields, { key: "notes", label: { id: "Catatan", en: "Notes" }, widget: "Textarea" as const }] };
    const doc2 = compileFormPage(patched, "new", { hostCapabilities: caps(["invoices"]) });
    expect(collectIds(doc1.root).has("form-invoices-field-customer")).toBe(true);
    expect(collectIds(doc2.root).has("form-invoices-field-customer")).toBe(true);
    expect(collectIds(doc2.root).has("form-invoices-field-notes")).toBe(true);
    // customer ID unchanged
    expect(semanticNodeId("form", "invoices", "customer")).toBe("form-invoices-field-customer");
  });

  it("report: recompile with same meta yields same table/filter IDs", () => {
    const meta = {
      name: "trial_balance",
      label: { id: "Neraca", en: "Trial" },
      columns: [{ key: "account", label: { id: "Akun", en: "Account" } }],
      dataSource: { $query: { collection: "trial_balance" } } as const,
      filters: [{ field: "period", label: { id: "Periode", en: "Period" }, widget: "Select" as const }],
      summaries: [{ label: { id: "Total", en: "Total" }, value: 100 }],
    };
    const d1 = compileReportPage(meta, { hostCapabilities: caps(["trial_balance"]) });
    const d2 = compileReportPage(meta, { hostCapabilities: caps(["trial_balance"]) });
    expect(collectIds(d1.root)).toEqual(collectIds(d2.root));
    expect(collectIds(d1.root).has("filter-period")).toBe(true);
    expect(collectIds(d1.root).has("report-table")).toBe(true);
  });

  it("dashboard: kpi and chart IDs stable across recompiles", () => {
    const meta = {
      name: "sales-overview",
      label: { id: "Ringkasan", en: "Overview" },
      kpis: [{ label: { id: "Total", en: "Total" }, value: 100 }],
      charts: [{ id: "trend", title: { id: "Tren", en: "Trend" }, type: "bar" as const, xKey: "m", yKey: "v", dataSource: [] as Array<Record<string, unknown>> }],
      shortcuts: [{ doctype: "invoices", label: { id: "Faktur", en: "Invoices" } }],
    };
    const d1 = compileDashboardPage(meta, { hostCapabilities: caps() });
    const d2 = compileDashboardPage(meta, { hostCapabilities: caps() });
    expect(collectIds(d1.root)).toEqual(collectIds(d2.root));
    expect(collectIds(d1.root).has("dashboard-kpis")).toBe(true);
    expect(collectIds(d1.root).has("chart-trend")).toBe(true);
  });

  it("settings: section/field IDs stable after adding a section", () => {
    const base = {
      name: "settings_demo",
      label: { id: "Pengaturan", en: "Settings" },
      sections: [{ id: "general", label: { id: "Umum", en: "General" }, fields: [{ key: "site_name", label: { id: "Nama", en: "Name" }, widget: "TextField" as const }] }],
    };
    const d1 = compileSettingsPage(base, { hostCapabilities: caps() });
    const patched = { ...base, sections: [...base.sections, { id: "mail", label: { id: "Mail", en: "Mail" }, fields: [{ key: "smtp", label: { id: "SMTP", en: "SMTP" }, widget: "TextField" as const }] }] };
    const d2 = compileSettingsPage(patched, { hostCapabilities: caps() });
    expect(collectIds(d1.root).has("settings-settings_demo-field-site_name")).toBe(true);
    expect(collectIds(d2.root).has("settings-settings_demo-field-site_name")).toBe(true);
    expect(collectIds(d2.root).has("settings-settings_demo-field-smtp")).toBe(true);
  });

  it("wizard: step panel IDs stable and step order preserves IDs", () => {
    const base = {
      name: "onboarding",
      label: { id: "Onboarding", en: "Onboarding" },
      steps: [
        { id: "s1", label: { id: "S1", en: "S1" }, fields: [{ key: "f1", label: { id: "F1", en: "F1" }, widget: "TextField" as const }] },
        { id: "s2", label: { id: "S2", en: "S2" }, fields: [{ key: "f2", label: { id: "F2", en: "F2" }, widget: "TextField" as const }] },
      ],
    };
    const d1 = compileWizardPage(base, { hostCapabilities: caps() });
    const patched = { ...base, steps: [...base.steps, { id: "s3", label: { id: "S3", en: "S3" }, fields: [{ key: "f3", label: { id: "F3", en: "F3" }, widget: "TextField" as const }] }] };
    const d2 = compileWizardPage(patched, { hostCapabilities: caps() });
    expect(collectIds(d1.root).has("wizard-panel-s1")).toBe(true);
    expect(collectIds(d2.root).has("wizard-panel-s1")).toBe(true);
    expect(collectIds(d2.root).has("wizard-panel-s3")).toBe(true);
    expect(collectIds(d1.root).has("wizard-onboarding-field-f1")).toBe(true);
    expect(collectIds(d2.root).has("wizard-onboarding-field-f1")).toBe(true);
  });

  it("tree: hierarchical node keys remain stable", () => {
    const base = {
      name: "accounts",
      label: { id: "Akun", en: "Accounts" },
      titleField: "name",
      fields: [{ key: "name", label: { id: "Nama", en: "Name" }, widget: "TextField" as const }],
      nodes: [{ key: "1000", label: { id: "Aset", en: "Assets" } }],
    };
    const d1 = compileTreePage(base, { hostCapabilities: caps() });
    const patched = { ...base, nodes: [...base.nodes, { key: "2000", label: { id: "Kewajiban", en: "Liabilities" } }] };
    const d2 = compileTreePage(patched, { hostCapabilities: caps() });
    // tree-view ID stable
    expect(collectIds(d1.root).has("tree-view")).toBe(true);
    expect(collectIds(d2.root).has("tree-view")).toBe(true);
    // dataSources nodes count reflects patch but IDs stable
    expect((d1.dataSources as Record<string, unknown>).nodes).toHaveLength(1);
    expect((d2.dataSources as Record<string, unknown>).nodes).toHaveLength(2);
  });
});
