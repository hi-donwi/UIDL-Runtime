/**
 * `buildWorkspacePage(spec, options)` — Workspace page generator.
 *
 * Generates Meridian-styled workspace module pages with KPI metrics, charts,
 * and quick navigation shortcuts to doctype lists.
 *
 * Enforces the architectural rule: workspaces display headline metrics and shortcuts,
 * never duplicating the full data tables from list pages (closing anti-pattern P-C).
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import type { Language } from "~/utils/i18n";
import { meridianDashboardSection, meridianKpiRow, meridianPageHeader, text } from "../../meridian/meridianLayout";

export interface WorkspaceKpi {
  label: { id: string; en: string };
  value: string | number;
  change?: string;
}

export interface WorkspaceChart {
  id: string;
  title: { id: string; en: string };
  type: "bar" | "line" | "donut";
  xKey: string;
  yKey: string;
  dataSource: string | Array<Record<string, unknown>>;
  style?: Record<string, unknown>;
}

export interface WorkspaceShortcut {
  doctype: string;
  label: { id: string; en: string };
  route?: string;
  iconName?: string;
  description?: { id: string; en: string };
}

export interface WorkspaceSpec {
  name: string;
  label: { id: string; en: string };
  module?: string;
  kpis?: WorkspaceKpi[];
  charts?: WorkspaceChart[];
  shortcuts?: WorkspaceShortcut[];
  dataSources?: Record<string, unknown>;
}

export interface BuildWorkspacePageOptions {
  company?: string;
  lang?: Language;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/**
 * Builds a `UIDLDocument` for a workspace dashboard.
 */
export function buildWorkspacePage(
  spec: WorkspaceSpec,
  options: BuildWorkspacePageOptions = {},
): UIDLDocument {
  const lang = options.lang ?? "id";
  const docId = options.docId ?? `workspace-${spec.name.toLowerCase()}`;
  const title = spec.label[lang] ?? spec.name;

  const children: UIDLNode[] = [];

  // 1. Page Header Navbar
  children.push(
    meridianPageHeader(title, options.extraHeaderActions ?? [], "workspace-header"),
  );

  // 2. Headline KPI row
  if (spec.kpis && spec.kpis.length > 0) {
    const kpiPairs: Array<[string, string]> = spec.kpis.map((kpi) => [
      kpi.label[lang] ?? "",
      String(kpi.value),
    ]);
    children.push(meridianKpiRow("workspace-kpis", kpiPairs));
  }

  // 3. Shortcuts / Quick Access to Doctype Lists
  if (spec.shortcuts && spec.shortcuts.length > 0) {
    const shortcutNodes: UIDLNode[] = spec.shortcuts.map((sc, idx) => {
      const targetRoute =
        sc.route ?? (options.company ? `/app/${options.company}/list/${sc.doctype}` : `/meridian/list/${sc.doctype}`);
      const scLabel = sc.label[lang] ?? sc.doctype;

      return {
        id: `shortcut-${idx}`,
        type: "Container",
        props: {
          className:
            "flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-875 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer shadow-sm transition-colors",
        },
        events: {
          onClick: [{ navigate: { route: targetRoute } }],
        },
        children: [
          {
            id: `shortcut-${idx}-title`,
            type: "Text",
            props: { value: scLabel },
            style: { fontSize: "text-base", fontWeight: 600 },
          },
          ...(sc.description
            ? [
                {
                  id: `shortcut-${idx}-desc`,
                  type: "Text",
                  props: { value: sc.description[lang] ?? "" },
                  style: { fontSize: "text-sm", color: TEXT_SECONDARY, marginTop: "mt-1" },
                } satisfies UIDLNode,
              ]
            : []),
        ],
      };
    });

    children.push(
      meridianDashboardSection(
        "shortcuts-section",
        [
          text("shortcuts-title", lang === "id" ? "Akses Cepat Modul" : "Quick Navigation", {
            fontSize: "text-base",
            fontWeight: 600,
          }),
          {
            id: "shortcuts-grid",
            type: "GridView",
            props: {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              },
            },
            style: { gap: "gap-4" },
            children: shortcutNodes,
          },
        ],
        { border: true },
      ),
    );
  }

  // 4. Charts
  if (spec.charts && spec.charts.length > 0) {
    const chartNodes: UIDLNode[] = spec.charts.map((chart) => ({
      id: `chart-${chart.id}`,
      type: "Chart",
      props: {
        title: chart.title[lang] ?? chart.id,
        // `Chart` (src/components/primitives.tsx) reads `chartType`/`rows`, not `type`/`data` —
        // those two literal props were silent no-ops (spread onto the DOM node, never read),
        // which made every literal-array workspace chart render as an empty default bar chart
        // regardless of its declared `type`. Found during the 2026-08-25 demo-quality audit:
        // factory-abc and koperasi-bmt both declare `type: "donut"` and both rendered empty bars.
        chartType: chart.type,
        xKey: chart.xKey,
        yKey: chart.yKey,
        dataSource: typeof chart.dataSource === "string" ? chart.dataSource : undefined,
        rows: Array.isArray(chart.dataSource) ? chart.dataSource : undefined,
      },
      style: chart.style ?? { width: "w-full" },
    }));

    children.push(
      meridianDashboardSection(
        "charts-section",
        [
          text("charts-title", lang === "id" ? "Analitik & Tren" : "Analytics & Trends", {
            fontSize: "text-base",
            fontWeight: 600,
          }),
          {
            id: "charts-grid",
            type: "GridView",
            props: {
              style: {
                display: "grid",
                gridTemplateColumns: spec.charts.length === 1 ? "1fr" : "repeat(auto-fit, minmax(360px, 1fr))",
              },
            },
            style: { gap: "gap-4" },
            children: chartNodes,
          },
        ],
        { border: false },
      ),
    );
  }

  // Extract inline data sources if charts passed arrays
  const dataSources: Record<string, unknown> = {
    ...(spec.dataSources ?? {}),
  };

  for (const chart of spec.charts ?? []) {
    if (typeof chart.dataSource === "string" && !dataSources[chart.dataSource]) {
      // Named data source referenced
    } else if (Array.isArray(chart.dataSource)) {
      dataSources[`chart_${chart.id}`] = chart.dataSource;
    }
  }

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    dataSources: Object.keys(dataSources).length > 0 ? dataSources : undefined,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children,
    },
  };
}
