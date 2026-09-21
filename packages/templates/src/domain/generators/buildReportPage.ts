/**
 * `buildReportPage(spec, options)` — Report page generator.
 *
 * Generates Meridian-styled financial and operational report pages with
 * a filter strip, summary cards, and read-only structured data tables.
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import type { Language } from "~/utils/i18n";
import { meridianPageHeader, button } from "../../meridian/meridianLayout";

export interface ReportColumn {
  key: string;
  label: { id: string; en: string } | string;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface ReportFilter {
  field: string;
  label: { id: string; en: string };
  widget: "Select" | "TextField" | "DateRange";
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
}

export interface ReportSummaryItem {
  label: { id: string; en: string };
  value: string | number;
}

export interface ReportSpec {
  name: string;
  label: { id: string; en: string };
  columns: ReportColumn[];
  dataSource: string | Array<Record<string, unknown>> | { $query: unknown };
  filters?: ReportFilter[];
  summaries?: ReportSummaryItem[];
}

export interface BuildReportPageOptions {
  company?: string;
  lang?: Language;
  docId?: string;
  extraHeaderActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/**
 * Builds a `UIDLDocument` for a report view.
 */
export function buildReportPage(
  spec: ReportSpec,
  options: BuildReportPageOptions = {},
): UIDLDocument {
  const lang = options.lang ?? "id";
  const docId = options.docId ?? `report-${spec.name.toLowerCase()}`;
  const title = spec.label[lang] ?? spec.name;

  const state: Record<string, unknown> = {};

  // Setup initial filter state
  for (const filter of spec.filters ?? []) {
    state[`filter_${filter.field}`] = filter.default ?? "";
  }

  // Setup dataSources
  const dataSources: Record<string, unknown> = {};
  if (typeof spec.dataSource === "string") {
    // Reference by name
  } else if (Array.isArray(spec.dataSource)) {
    dataSources["rows"] = spec.dataSource;
  } else if (spec.dataSource && typeof spec.dataSource === "object" && "$query" in spec.dataSource) {
    const rawQuery = (spec.dataSource as { $query: Record<string, unknown> }).$query;
    const filterBinds = (spec.filters ?? []).map((f) => ({
      field: f.field,
      op: f.widget === "DateRange" ? "between" : "eq",
      value: { $bind: `state.filter_${f.field}` },
    }));

    dataSources["rows"] = {
      $query: {
        ...rawQuery,
        filters: filterBinds.length > 0 ? filterBinds : rawQuery.filters,
      },
    };
  } else if (spec.dataSource && typeof spec.dataSource === "object") {
    dataSources["rows"] = spec.dataSource;
  }

  const children: UIDLNode[] = [];

  // 1. Header Navbar
  const headerActions: UIDLNode[] = [
    ...(options.extraHeaderActions ?? []),
    button("export-report-btn", lang === "id" ? "Ekspor" : "Export", "#"),
  ];

  children.push(
    meridianPageHeader(title, headerActions, "report-header"),
  );

  // 2. Filter Strip
  if (spec.filters && spec.filters.length > 0) {
    const filterNodes: UIDLNode[] = spec.filters.map((filter) => {
      const label = filter.label[lang] ?? filter.field;

      if (filter.widget === "Select") {
        return {
          id: `filter-${filter.field}`,
          type: "Select",
          style: { width: "w-52" },
          props: {
            label,
            value: { $bind: `state.filter_${filter.field}` },
            options: [
              { value: "", label: lang === "id" ? `Semua ${label}` : `All ${label}` },
              ...(filter.options ?? []),
            ],
          },
          events: {
            onChange: [{ setState: { path: `filter_${filter.field}`, value: null } }],
          },
        };
      }

      return {
        id: `filter-${filter.field}`,
        type: "TextField",
        style: { width: "w-48" },
        props: {
          label,
          placeholder: label,
          value: { $bind: `state.filter_${filter.field}` },
        },
        events: {
          onChange: [{ setState: { path: `filter_${filter.field}`, value: null } }],
        },
      };
    });

    children.push({
      id: "report-filter-strip",
      type: "Toolbar",
      style: {
        display: "flex",
        alignItems: "center",
        gap: "gap-3",
        padding: "p-4",
        borderWidth: "border-b",
        borderColor: BORDER_COLOR,
      },
      children: filterNodes,
    });
  }

  // 3. Summaries Strip (Headline figures)
  if (spec.summaries && spec.summaries.length > 0) {
    children.push({
      id: "report-summary-strip",
      type: "GridView",
      props: {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${spec.summaries.length}, minmax(0, 1fr))`,
        },
      },
      style: { borderWidth: "border-b", borderColor: BORDER_COLOR },
      children: spec.summaries.map((summary, idx) => ({
        id: `summary-${idx}`,
        type: "Column",
        style: {
          padding: "p-4",
          gap: "gap-1",
          ...(idx < spec.summaries!.length - 1 ? { borderWidth: "border-e", borderColor: BORDER_COLOR } : {}),
        },
        children: [
          {
            id: `summary-${idx}-label`,
            type: "Text",
            props: { value: summary.label[lang] ?? "" },
            style: { fontSize: "text-sm", color: TEXT_SECONDARY },
          },
          {
            id: `summary-${idx}-value`,
            type: "Text",
            props: { value: String(summary.value) },
            style: { fontSize: "text-xl", fontWeight: 600 },
          },
        ],
      })),
    });
  }

  // 4. Report DataTable
  const tableColumns = spec.columns.map((col) => ({
    key: col.key,
    label: typeof col.label === "string" ? col.label : col.label[lang] ?? col.key,
    align: col.align,
    width: col.width,
  }));

  children.push({
    id: "report-table",
    type: "DataTable",
    props: {
      title,
      dataSource: typeof spec.dataSource === "string" ? spec.dataSource : "rows",
      columns: tableColumns,
      paginate: false,
    },
    style: { width: "w-full" },
  });

  return {
    version: "1.0.0",
    id: docId,
    name: title,
    state: Object.keys(state).length > 0 ? state : undefined,
    dataSources: Object.keys(dataSources).length > 0 ? dataSources : undefined,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children,
    },
  };
}
