/**
 * Public report recipe — free of demo, company, and host-specific code.
 *
 * Extracted from `packages/templates/src/domain/generators/buildReportPage.ts`
 * but typed against public `ReportPageMeta` / `HostCapabilities`.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import { validateHostCapabilities, type HostCapabilities, type ReportPageMeta, type RoutePolicy, type UiPolicy } from "./types.js";

export interface CompileReportOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

function pageHeader(title: string, actions: UIDLNode[]): UIDLNode {
  return {
    id: "report-header",
    type: "Navbar",
    style: { justifyContent: "space-between", alignItems: "center", padding: "px-4", height: "h-row-large", borderWidth: "border-b", borderColor: BORDER_COLOR },
    children: [
      { id: "report-header-title", type: "Text", props: { value: title, heading: 1 }, style: { fontSize: "text-xl", fontWeight: 600 } },
      { id: "report-header-actions", type: "Toolbar", style: { display: "flex", gap: "gap-2" }, children: actions },
    ],
  };
}

function buttonNode(id: string, label: string): UIDLNode {
  return { id, type: "Button", props: { label, variant: "secondary" } };
}

export function compileReportPage(meta: ReportPageMeta, options: CompileReportOptions): UIDLDocument {
  const gate = validateHostCapabilities({ recipe: "report", meta, hostCapabilities: options.hostCapabilities });
  if (gate.length > 0) throw new Error(`compileReportPage: hostCapabilities rejected: ${gate.map((i) => i.message).join("; ")}`);

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `report-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  const state: Record<string, unknown> = {};
  for (const filter of meta.filters ?? []) state[`filter_${filter.field}`] = filter.default ?? "";

  const dataSources: Record<string, unknown> = {};
  if (typeof meta.dataSource === "string") {
    // named reference — host will resolve; no dataSources needed unless host provides
  } else if (Array.isArray(meta.dataSource)) {
    dataSources["rows"] = meta.dataSource;
  } else if (meta.dataSource && typeof meta.dataSource === "object" && "$query" in meta.dataSource) {
    const rawQuery = (meta.dataSource as { $query: Record<string, unknown> }).$query;
    const filterBinds = (meta.filters ?? []).map((f) => ({
      field: f.field,
      op: f.widget === "DateRange" ? "between" : "eq",
      value: { $bind: `state.filter_${f.field}` },
    }));
    dataSources["rows"] = { $query: { ...rawQuery, filters: filterBinds.length > 0 ? filterBinds : rawQuery.filters } };
  } else if (meta.dataSource && typeof meta.dataSource === "object") {
    dataSources["rows"] = meta.dataSource;
  }

  const children: UIDLNode[] = [];

  const headerActions: UIDLNode[] = [
    ...(options.extraHeaderActions ?? []),
    buttonNode("export-report-btn", lang === "id" ? "Ekspor" : "Export"),
  ];
  children.push(pageHeader(title, headerActions));

  if (meta.filters && meta.filters.length > 0) {
    const filterNodes: UIDLNode[] = meta.filters.map((filter) => {
      const label = filter.label[lang] ?? filter.field;
      if (filter.widget === "Select") {
        return {
          id: `filter-${filter.field}`,
          type: "Select",
          style: { width: "w-52" },
          props: {
            label,
            value: { $bind: `state.filter_${filter.field}` },
            options: [{ value: "", label: lang === "id" ? `Semua ${label}` : `All ${label}` }, ...(filter.options ?? [])],
          },
          events: { onChange: [{ setState: { path: `filter_${filter.field}`, value: null } }] },
        };
      }
      return {
        id: `filter-${filter.field}`,
        type: "TextField",
        style: { width: "w-48" },
        props: { label, placeholder: label, value: { $bind: `state.filter_${filter.field}` } },
        events: { onChange: [{ setState: { path: `filter_${filter.field}`, value: null } }] },
      };
    });
    children.push({
      id: "report-filter-strip",
      type: "Toolbar",
      style: { display: "flex", alignItems: "center", gap: "gap-3", padding: "p-4", borderWidth: "border-b", borderColor: BORDER_COLOR },
      children: filterNodes,
    });
  }

  if (meta.summaries && meta.summaries.length > 0) {
    const summaries = meta.summaries;
    children.push({
      id: "report-summary-strip",
      type: "GridView",
      props: { style: { display: "grid", gridTemplateColumns: `repeat(${summaries.length}, minmax(0, 1fr))` } },
      style: { borderWidth: "border-b", borderColor: BORDER_COLOR },
      children: summaries.map((summary, idx) => ({
        id: `summary-${idx}`,
        type: "Column",
        style: { padding: "p-4", gap: "gap-1", ...(idx < summaries.length - 1 ? { borderWidth: "border-e", borderColor: BORDER_COLOR } : {}) },
        children: [
          { id: `summary-${idx}-label`, type: "Text", props: { value: summary.label[lang] ?? "" }, style: { fontSize: "text-sm", color: TEXT_SECONDARY } },
          {
            id: `summary-${idx}-value`,
            type: "Text",
            props: summary.agg
              ? {
                  value: {
                    $expr: {
                      agg: summary.agg,
                      over: "data.rows",
                      ...(summary.agg === "count" ? {} : { field: summary.field }),
                    },
                  },
                  ...(summary.agg === "count" ? { format: "integer" } : { format: summary.format ?? "number" }),
                  locale: lang === "id" ? "id-ID" : "en-US",
                  ...(options.uiPolicy?.currency ? { currency: options.uiPolicy.currency } : {}),
                }
              : { value: String(summary.value ?? "") },
            style: { fontSize: "text-xl", fontWeight: 600 },
          },
        ],
      })),
    });
  }

  const tableColumns = meta.columns.map((col) => ({
    key: col.key,
    label: typeof col.label === "string" ? col.label : col.label[lang] ?? col.key,
    ...(col.align ? { align: col.align } : {}),
    ...(col.width ? { width: col.width } : {}),
    ...(col.format ? { format: col.format } : {}),
  }));

  children.push({
    id: "report-table",
    type: "DataTable",
    props: {
      // No `title`: the report header above already names it, and Meridian prints a report's
      // name once. Repeating it as a section heading was a duplication the reference does
      // not have.
      dataSource: typeof meta.dataSource === "string" ? meta.dataSource : "rows",
      columns: tableColumns,
      paginate: false,
      locale: lang === "id" ? "id-ID" : "en-US",
      ...(options.uiPolicy?.currency ? { currency: options.uiPolicy.currency } : {}),
    },
    style: { width: "w-full" },
  });

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state: Object.keys(state).length > 0 ? state : undefined,
    dataSources: Object.keys(dataSources).length > 0 ? dataSources : undefined,
    root: { id: "page", type: "Column", style: { fontSize: "text-base", width: "w-full" }, children },
  };
}
