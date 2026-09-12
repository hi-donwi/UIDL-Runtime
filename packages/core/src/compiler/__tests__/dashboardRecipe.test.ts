import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileDashboardPage } from "../dashboard.js";
import { DocumentSchema } from "../../schemas/document.js";
import type { DashboardPageMeta, HostCapabilities } from "../types.js";

function sampleMeta(): DashboardPageMeta {
  return {
    name: "sales-overview",
    label: { id: "Ringkasan Penjualan", en: "Sales Overview" },
    kpis: [
      { label: { id: "Total Penjualan", en: "Total Sales" }, value: "Rp 120M" },
      { label: { id: "Pesanan", en: "Orders" }, value: 342 },
    ],
    charts: [
      { id: "sales-trend", title: { id: "Tren Penjualan", en: "Sales Trend" }, type: "bar", xKey: "month", yKey: "amount", dataSource: [{ month: "Jan", amount: 30 }, { month: "Feb", amount: 40 }] },
      { id: "sales-pie", title: { id: "Kategori", en: "Category" }, type: "donut", xKey: "category", yKey: "value", dataSource: "sales_by_category" },
    ],
    shortcuts: [
      { doctype: "invoices", label: { id: "Faktur", en: "Invoices" }, description: { id: "Kelola faktur", en: "Manage invoices" } },
      { doctype: "customers", label: { id: "Pelanggan", en: "Customers" } },
    ],
    dataSources: { sales_by_category: [{ category: "Retail", value: 70 }, { category: "Wholesale", value: 30 }] },
  };
}

function caps(): HostCapabilities { return { collections: ["invoices", "customers"], commands: [] }; }

function collectNodes(node: unknown, predicate: (n: { id?: string; type: string; props?: Record<string, unknown>; children?: unknown[] }) => boolean, out: unknown[] = []) {
  const n = node as { id?: string; type: string; props?: Record<string, unknown>; children?: unknown[]; slots?: Record<string, unknown[]> };
  if (predicate(n)) out.push(n);
  if (n.children) n.children.forEach((c) => collectNodes(c, predicate, out));
  if (n.slots) Object.values(n.slots).forEach((arr) => arr.forEach((c) => collectNodes(c, predicate, out)));
  return out;
}

describe("Dashboard recipe — metrics/filter/summary/chart states", () => {
  it("is host-and-company-free", () => {
    const p = resolve(import.meta.dirname ?? ".", "../dashboard.ts");
    const content = readFileSync(p, "utf-8");
    const imports = content.split("\n").filter((l) => l.trim().startsWith("import ")).join("\n");
    for (const needle of ["@host-app", "templates", "ShoeCompany"]) expect(imports).not.toContain(needle);
  });

  it("produces schema-valid document", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("metrics: KPI row renders per kpis", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    const kpiRow = collectNodes(doc.root, (n) => n.id === "dashboard-kpis")[0];
    expect(kpiRow).toBeDefined();
    expect(collectNodes(doc.root, (n) => !!n.id && /^dashboard-kpis-kpi-\d+$/.test(n.id))).toHaveLength(2);
  });

  it("charts: renders Chart per charts with correct chartType/xKey/yKey and dataSource handling", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    const charts = collectNodes(doc.root, (n) => n.type === "Chart");
    expect(charts).toHaveLength(2);
    const bar = charts.find((n) => (n as { id: string }).id === "chart-sales-trend") as { props: Record<string, unknown> };
    expect(bar.props.chartType).toBe("bar");
    expect(bar.props.xKey).toBe("month");
    expect(bar.props.rows).toEqual([{ month: "Jan", amount: 30 }, { month: "Feb", amount: 40 }]);
    const donut = charts.find((n) => (n as { id: string }).id === "chart-sales-pie") as { props: Record<string, unknown> };
    expect(donut.props.dataSource).toBe("sales_by_category");
  });

  it("uses the Meridian dashboard rhythm for generated dashboard UIDL", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    expect(collectNodes(doc.root, (n) => n.id === "dashboard-header")).toHaveLength(0);
    expect(collectNodes(doc.root, (n) => n.id === "dashboard-kpis")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "cashflow-section")).toHaveLength(1);
    expect(collectNodes(doc.root, (n) => n.id === "pnl-expenses-section")).toHaveLength(1);
    expect(doc.root.style).toMatchObject({ gap: "gap-0" });
  });

  it("shortcuts: grid renders per shortcuts with navigate route", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    const shortcuts = collectNodes(doc.root, (n) => (n.id?.startsWith("shortcut-") ?? false) && n.type === "Container");
    expect(shortcuts).toHaveLength(2);
    const first = shortcuts[0] as { events: Record<string, unknown> };
    const nav = (first.events.onClick as Array<{ navigate: { route: string } }>)[0];
    expect(nav.navigate.route).toContain("invoices");
  });

  it("summary state not polluted — dashboard is read-only metrics", () => {
    const doc = compileDashboardPage(sampleMeta(), { hostCapabilities: caps() });
    expect(doc.state).toBeUndefined();
  });

  it("lang policy affects title", () => {
    const en = compileDashboardPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "en" } });
    expect(en.name).toBe("Sales Overview");
    const id = compileDashboardPage(sampleMeta(), { hostCapabilities: caps(), uiPolicy: { lang: "id" } });
    expect(id.name).toBe("Ringkasan Penjualan");
  });
});
