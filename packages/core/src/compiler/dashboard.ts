/**
 * Public dashboard recipe — free of demo, company, and host-specific code.
 *
 * Extracted from `packages/templates/src/domain/generators/buildWorkspacePage.ts`
 * but typed against public `DashboardPageMeta` / `HostCapabilities`.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import type { DashboardKpi, DashboardPageMeta, HostCapabilities, RoutePolicy, UiPolicy } from "./types.js";

export interface CompileDashboardOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const TEXT_SECONDARY = "{primitives.color.text-secondary}";
const BORDER_COLOR = "{primitives.color.border}";

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "dashboard-header",
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: "dashboard-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "dashboard-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}

interface KpiCell {
  label: string;
  /** Text for a literal; the binding itself for a bound value, resolved by the runtime. */
  value: unknown;
  format?: string;
}

function kpiRow(id: string, cells: KpiCell[]): UIDLNode {
  return {
    id,
    type: "GridView",
    props: { style: { display: "grid", gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` } },
    style: { borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: cells.map((cell, idx) => ({
      id: `${id}-kpi-${idx}`,
      type: "Column",
      style: { padding: "p-4", gap: "gap-1", ...(idx < cells.length - 1 ? { borderWidth: "border-e", borderColor: BORDER_COLOR } : {}) },
      children: [
        { id: `${id}-kpi-${idx}-label`, type: "Text", props: { value: cell.label }, style: { fontSize: "text-sm", color: TEXT_SECONDARY } },
        {
          id: `${id}-kpi-${idx}-value`,
          type: "Text",
          props: { value: cell.value, ...(cell.format ? { format: cell.format } : {}) },
          style: { fontSize: "text-xl", fontWeight: 600 },
        },
      ],
    })),
  };
}

/** A binding passes through for the runtime to resolve; a literal becomes text, as before. */
function kpiValue(value: DashboardKpi["value"]): unknown {
  return value !== null && typeof value === "object" ? value : String(value);
}

function dashboardSection(id: string, content: UIDLNode[], opts: { border?: boolean; grid?: boolean } = {}): UIDLNode {
  return {
    id,
    type: opts.grid ? "GridView" : "Column",
    props: opts.grid ? { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" } } : undefined,
    style: { padding: "p-4", gap: "gap-4", ...(opts.border ? { borderWidth: "border-b", borderColor: BORDER_COLOR } : {}) },
    children: content,
  };
}

function textNode(id: string, value: string, style: Record<string, unknown> = {}): UIDLNode {
  return { id, type: "Text", props: { value }, style };
}

export function compileDashboardPage(meta: DashboardPageMeta, options: CompileDashboardOptions): UIDLDocument {
  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `dashboard-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  const children: UIDLNode[] = [];
  if (options.extraHeaderActions && options.extraHeaderActions.length > 0) {
    children.push(pageHeader(title, options.extraHeaderActions));
  }

  if (meta.kpis && meta.kpis.length > 0) {
    const cells: KpiCell[] = meta.kpis.map((kpi) => ({
      label: kpi.label[lang] ?? "",
      value: kpiValue(kpi.value),
      ...(kpi.format ? { format: kpi.format } : {}),
    }));
    children.push(kpiRow("dashboard-kpis", cells));
  }

  if (meta.shortcuts && meta.shortcuts.length > 0) {
    const shortcutNodes: UIDLNode[] = meta.shortcuts.map((sc, idx) => {
      const targetRoute = sc.route ?? `${options.routePolicy?.listBase ?? "/app/list"}/${sc.doctype}`.replace("//", "/");
      const label = sc.label[lang] ?? sc.doctype;
      return {
        id: `shortcut-${idx}`,
        type: "Container",
        props: { className: "flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-875 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer shadow-sm transition-colors" },
        events: { onClick: [{ navigate: { route: targetRoute } }] },
        children: [
          { id: `shortcut-${idx}-title`, type: "Text", props: { value: label }, style: { fontSize: "text-base", fontWeight: 600 } },
          ...(sc.description
            ? [{ id: `shortcut-${idx}-desc`, type: "Text", props: { value: sc.description[lang] ?? "" }, style: { fontSize: "text-sm", color: TEXT_SECONDARY, marginTop: "mt-1" } } as UIDLNode]
            : []),
        ],
      };
    });

    children.push(
      dashboardSection(
        "shortcuts-section",
        [
          textNode("shortcuts-title", lang === "id" ? "Akses Cepat Modul" : "Quick Navigation", { fontSize: "text-base", fontWeight: 600 }),
          {
            id: "shortcuts-grid",
            type: "GridView",
            props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" } },
            style: { gap: "gap-4" },
            children: shortcutNodes,
          },
        ],
        { border: true },
      ),
    );
  }

  if (meta.charts && meta.charts.length > 0) {
    const chartNodes: UIDLNode[] = meta.charts.map((chart) => ({
      id: `chart-${chart.id}`,
      type: "Chart",
      props: {
        title: chart.title[lang] ?? chart.id,
        chartType: chart.type,
        xKey: chart.xKey,
        yKey: chart.yKey,
        dataSource: typeof chart.dataSource === "string" ? chart.dataSource : undefined,
        rows: Array.isArray(chart.dataSource) ? chart.dataSource : undefined,
      },
      style: chart.style ?? { width: "w-full" },
    }));

    const [primaryChart, ...secondaryCharts] = chartNodes;

    if (primaryChart) {
      children.push(dashboardSection("cashflow-section", [primaryChart], { border: true }));
    }

    if (secondaryCharts.length > 0) {
      children.push(dashboardSection("pnl-expenses-section", secondaryCharts, { border: true, grid: true }));
    }
  }

  const dataSources: Record<string, unknown> = { ...(meta.dataSources ?? {}) };
  for (const chart of meta.charts ?? []) {
    if (Array.isArray(chart.dataSource)) dataSources[`chart_${chart.id}`] = chart.dataSource;
  }

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    dataSources: Object.keys(dataSources).length > 0 ? dataSources : undefined,
    root: { id: "page", type: "Column", style: { gap: "gap-0", fontSize: "text-base", width: "w-full" }, children },
  };
}
