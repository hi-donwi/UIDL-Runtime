/**
 * Public list recipe — free of demo, company, and host-specific code.
 *
 * Extracted from `packages/templates/src/domain/generators/buildListPage.ts`
 * but now typed against the public `ListPageMeta` / `HostCapabilities`
 * contracts from `./types.ts` instead of `DoctypeMeta`.
 *
 * No demo dataset, company fixture, or host `ErpModuleSpec` is imported.
 */

import type { UIDLDocument, UIDLNode } from "../types";
import type { Language } from "../utils/i18n";
import type { CellFormat } from "../utils/listCell";
import {
  semanticListNodeIds,
  validateHostCapabilities,
  type FieldWidget,
  type HostCapabilities,
  type ListPageMeta,
  type RoutePolicy,
  type UiPolicy,
} from "./types.js";

export interface CompileListOptions {
  hostCapabilities: HostCapabilities;
  uiPolicy?: UiPolicy;
  routePolicy?: RoutePolicy;
  docId?: string;
  initialState?: Record<string, unknown>;
  rowActions?: Array<{ label: string; event?: string }>;
  createNewActions?: Array<Record<string, unknown>>;
  rowOpenActions?: Array<Record<string, unknown>>;
  extraHeaderActions?: UIDLNode[];
  extraFilterActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/**
 * Maps a field's editor widget to how its value is *printed* in a list — the split Meridian
 * makes between a Control and `the column format rule`. `statusField` wins over the widget because a status
 * is authored as a Select but rendered as a StatusPill.
 */
function cellFormatFor(
  field: string,
  fieldMeta: { widget?: FieldWidget; format?: CellFormat } | undefined,
  statusField: string | undefined,
): CellFormat {
  if (statusField && field === statusField) return "status";
  // An explicit format wins: only the host knows whether a number box holds money or a rate.
  if (fieldMeta?.format) return fieldMeta.format;
  const widget = fieldMeta?.widget;
  if (widget === "Currency") return "currency";
  if (widget === "Date") return "date";
  if (widget === "Checkbox" || widget === "Switch") return "check";
  return "text";
}

/**
 * The print format for a summary figure, taken from the field it aggregates. A summed money
 * column stays money; anything else is a plain number, never a raw integer string.
 */
function summaryFormat(field: string, meta: ListPageMeta): { format: CellFormat } {
  const fieldMeta = meta.fields.find((item) => item.key === field);
  if (fieldMeta?.format) return { format: fieldMeta.format === "integer" ? "integer" : fieldMeta.format };
  return { format: fieldMeta?.widget === "Currency" ? "currency" : "number" };
}

export function compileListPage(
  meta: ListPageMeta,
  options: CompileListOptions,
): UIDLDocument {
  // Fail-closed host gate — matches validateHostCapabilities
  const gateInput = {
    recipe: "list" as const,
    meta,
    hostCapabilities: options.hostCapabilities,
  };
  const issues = validateHostCapabilities(gateInput);
  if (issues.length > 0) {
    throw new Error(
      `compileListPage: hostCapabilities rejected: ${issues.map((i) => i.message).join("; ")}`,
    );
  }

  const lang: Language = options.uiPolicy?.lang ?? "id";
  const docId = options.docId ?? `list-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;
  const ids = semanticListNodeIds(meta.name);

  const listBase = options.routePolicy?.listBase ?? "/app/list";
  const formBase = options.routePolicy?.formBase ?? "/app/edit";
  const newRoute = options.routePolicy?.resolveListRoute
    ? options.routePolicy.resolveListRoute(meta)
    : `${listBase}/${meta.name}/new`.replace("//", "/");
  // editRoute pattern — the table's onOpen navigates to event.route
  // which core renderer resolves via adapter, but we keep a deterministic default
  const editRoutePattern = options.routePolicy?.resolveFormRoute
    ? options.routePolicy.resolveFormRoute(meta, ":id")
    : `${formBase}/${meta.name}/:id`.replace("//", "/");

  void editRoutePattern; // kept for future rowAction target derivation

  const defaultPageSize = meta.pageSize ?? 20;
  const defaultSortField = meta.defaultSort.field;
  const defaultSortDir = meta.defaultSort.dir;

  const state: Record<string, unknown> = {
    page: 1,
    pageSize: defaultPageSize,
    sortField: defaultSortField,
    sortDir: defaultSortDir,
    search: "",
    filterOpen: false,
  };

  for (const filter of meta.filters ?? []) {
    state[`filter_${filter.field}`] = "";
  }

  if (options.initialState) {
    Object.assign(state, options.initialState);
  }

  const queryFilters = (meta.filters ?? []).map((f) => ({
    field: f.field,
    op: f.widget === "DateRange" ? "between" : "eq",
    value: { $bind: `state.filter_${f.field}` },
  }));

  const dataSources: Record<string, unknown> = {
    rows: {
      $query: {
        collection: meta.name,
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        sort: [{ field: { $bind: "state.sortField" }, dir: { $bind: "state.sortDir" } }],
        page: { number: { $bind: "state.page" }, size: { $bind: "state.pageSize" } },
        search: { $bind: "state.search" },
      },
    },
  };

  const filterControls: UIDLNode[] = [];

  // 1. Search — must reset page to 1
  filterControls.push({
    id: ids.search,
    type: "TextField",
    style: { width: "w-64" },
    props: {
      // Labelled like every other control in the strip: without one it was the only field
      // with no label row above it, so it sat a label's height higher than its neighbours —
      // and its name reached assistive tech only as a placeholder, which is not a name.
      label: lang === "id" ? "Cari" : "Search",
      placeholder: lang === "id" ? `Cari ${title}…` : `Search ${title}…`,
      value: { $bind: "state.search" },
    },
    events: {
      onChange: [
        { setState: { path: "search", value: null } },
        { setState: { path: "page", value: 1 } },
      ],
    },
  });

  // 2. Filters
  for (const filter of meta.filters ?? []) {
    const fieldMeta = meta.fields.find((f) => f.key === filter.field);
    const filterLabel = fieldMeta?.label[lang] ?? filter.label?.[lang] ?? filter.field;

    if (filter.widget === "Select") {
      let optionsList: Array<{ value: string; label: string }>;

      if (filter.options && Array.isArray(filter.options)) {
        optionsList = [
          { value: "", label: lang === "id" ? `Semua ${filterLabel}` : `All ${filterLabel}` },
          ...filter.options,
        ];
      } else if (fieldMeta?.options && Array.isArray(fieldMeta.options)) {
        optionsList = [
          { value: "", label: lang === "id" ? `Semua ${filterLabel}` : `All ${filterLabel}` },
          ...fieldMeta.options,
        ];
      } else {
        optionsList = [{ value: "", label: lang === "id" ? `Semua ${filterLabel}` : `All ${filterLabel}` }];
      }

      filterControls.push({
        id: `filter-${filter.field}`,
        type: "Select",
        style: { width: "w-52" },
        props: {
          label: filterLabel,
          value: { $bind: `state.filter_${filter.field}` },
          options: optionsList,
        },
        events: {
          onChange: [
            { setState: { path: `filter_${filter.field}`, value: null } },
            { setState: { path: "page", value: 1 } },
          ],
        },
      });
    } else if (filter.widget === "TextField") {
      filterControls.push({
        id: `filter-${filter.field}`,
        type: "TextField",
        style: { width: "w-48" },
        props: {
          label: filterLabel,
          placeholder: lang === "id" ? `Cari ${filterLabel}…` : `Search ${filterLabel}…`,
          value: { $bind: `state.filter_${filter.field}` },
        },
        events: {
          onChange: [
            { setState: { path: `filter_${filter.field}`, value: null } },
            { setState: { path: "page", value: 1 } },
          ],
        },
      });
    } else if (filter.widget === "DateRange") {
      filterControls.push({
        id: `filter-${filter.field}`,
        type: "TextField",
        style: { width: "w-56" },
        props: {
          label: filterLabel,
          placeholder: lang === "id" ? "Rentang Tanggal" : "Date Range",
          value: { $bind: `state.filter_${filter.field}` },
        },
        events: {
          onChange: [
            { setState: { path: `filter_${filter.field}`, value: null } },
            { setState: { path: "page", value: 1 } },
          ],
        },
      });
    }
  }

  // 3. Reset button — clears search + all filters + page
  const resetActions = [
    { setState: { path: "search", value: "" } },
    { setState: { path: "page", value: 1 } },
    ...(meta.filters ?? []).map((f) => ({ setState: { path: `filter_${f.field}`, value: "" } })),
  ];

  filterControls.push({
    id: "reset-filters-btn",
    type: "Button",
    props: {
      label: lang === "id" ? "Reset" : "Reset",
      variant: "secondary",
    },
    events: { onClick: resetActions },
  });

  if (options.extraFilterActions) {
    filterControls.push(...options.extraFilterActions);
  }

  const tableColumns = meta.columns.map((col) => {
    const fieldMeta = meta.fields.find((f) => f.key === col.field);
    const colLabel = fieldMeta?.label[lang] ?? col.field;
    const format = cellFormatFor(col.field, fieldMeta, meta.statusField);
    return {
      key: col.field,
      label: colLabel,
      width: col.width,
      format,
      // Numeric alignment is the widget's own rule now; only an explicit meta override
      // has to be carried across.
      ...(col.align ? { align: col.align } : {}),
    };
  });

  const createNewActions = options.createNewActions ?? [{ navigate: { route: newRoute } }];

  // ListView puts the list's controls in its PageHeader — a Filter button that opens a
  // popover, then the create action — not in a strip above the rows. The strip this replaces
  // also pushed the first row a filter-bar's height down the page on every one of these
  // screens.
  //
  // What Meridian's FilterDropdown additionally offers, and this does not, is choosing the field
  // and condition per filter row. That is a dynamic, growable list of filters, and a `$query`
  // in this runtime binds a fixed filter array — there is no array-state or repeat construct
  // for a document to grow one. So the fields the doctype declares are what the popover holds;
  // the affordance and its placement match, the field picker does not.
  const filterPopover: UIDLNode = {
    id: "filter-popover-anchor",
    type: "Container",
    // The popover positions itself against this element rather than being portalled.
    style: { position: "relative", display: "flex", alignItems: "center" },
    children: [
      {
        id: "filter-toggle-btn",
        type: "Button",
        props: { label: lang === "id" ? "Filter" : "Filter", variant: "secondary", iconName: "filter" },
        events: { onClick: [{ setState: { path: "filterOpen", value: true } }] },
      },
      {
        id: "filter-popover",
        type: "Popover",
        props: { open: { $bind: "state.filterOpen" }, align: "end" },
        style: { width: "w-80" },
        events: { onClose: [{ setState: { path: "filterOpen", value: false } }] },
        children: [
          {
            id: "filter-bar",
            type: "Column",
            style: { display: "flex", flexDirection: "column", gap: "gap-3", padding: "p-4" },
            children: filterControls,
          },
        ],
      },
    ],
  };

  const headerActions: UIDLNode[] = [
    ...(options.extraHeaderActions ?? []),
    filterPopover,
    {
      id: "create-new-btn",
      type: "Button",
      props: {
        label: lang === "id" ? `+ ${meta.label.id}` : `+ New ${meta.label.en}`,
        variant: "primary",
      },
      events: { onClick: createNewActions },
    },
  ];

  const summaryNodes: UIDLNode[] = [];
  if (meta.summaries && meta.summaries.length > 0) {
    const summaries = meta.summaries;
    summaryNodes.push({
      id: "list-summaries",
      type: "GridView",
      props: {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${summaries.length}, minmax(0, 1fr))`,
        },
      },
      style: { borderWidth: "border-b", borderColor: BORDER_COLOR },
      children: summaries.map((summary, idx) => ({
        id: `summary-${idx}`,
        type: "Column",
        style: {
          padding: "p-4",
          gap: "gap-1",
          ...(idx < summaries.length - 1 ? { borderWidth: "border-e", borderColor: BORDER_COLOR } : {}),
        },
        children: [
          {
            id: `summary-${idx}-label`,
            type: "Text",
            props: { value: summary.label[lang] ?? summary.field },
            style: { fontSize: "text-sm", color: TEXT_SECONDARY },
          },
          {
            id: `summary-${idx}-agg`,
            type: "Text",
            // Aggregates the rows currently loaded into the `rows` datasource, which is the
            // page the query returned — not a server-side total over the whole collection.
            // It used to emit the literal string "SUM(field)", which rendered as that text.
            props: {
              value: {
                $expr: {
                  agg: summary.agg,
                  over: "data.rows",
                  ...(summary.agg === "count" ? {} : { field: summary.field }),
                },
              },
              // A total of a money column is money, and has to read like the column it totals.
              ...(summary.agg === "count"
                ? { format: "integer" }
                : summaryFormat(summary.field, meta)),
              locale: lang === "id" ? "id-ID" : "en-US",
              ...(options.uiPolicy?.currency ? { currency: options.uiPolicy.currency } : {}),
            },
            style: { fontSize: "text-xl", fontWeight: 600 },
          },
        ],
      })),
    });
  }

  // A Meridian list has no per-row action column — the row itself is the affordance, which the
  // widget honours via `onOpen`. A caller that wants explicit verbs can still pass `rowActions`.
  const rowActions = options.rowActions ?? [];
  const rowOpenActions = options.rowOpenActions ?? [{ navigate: { route: { $bind: "event.route" } } }];

  const document: UIDLDocument = {
    version: "1.0.0",
    id: docId,
    name: title,
    state,
    dataSources,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base", width: "w-full" },
      children: [
        {
          id: "list-header",
          type: "Navbar",
          style: {
            justifyContent: "space-between",
            alignItems: "center",
            padding: "px-4",
            height: "h-row-large",
            borderWidth: "border-b",
            borderColor: BORDER_COLOR,
          },
          children: [
            {
              id: "list-header-title",
              type: "Text",
              props: { value: title, heading: 1 },
              style: { fontSize: "text-xl", fontWeight: 600 },
            },
            {
              id: "list-header-actions",
              type: "Toolbar",
              style: { display: "flex", alignItems: "center", gap: "gap-2" },
              children: headerActions,
            },
          ],
        },
        ...summaryNodes,

        {
          id: "list-loading",
          type: "Text",
          props: { value: lang === "id" ? "Memuat data…" : "Loading data…" },
          style: { padding: "p-4", color: TEXT_SECONDARY },
          visibility: { condition: { "==": [{ path: "state.$data.rows.status" }, { literal: "loading" }] } },
        },
        {
          id: "list-error",
          type: "Text",
          props: {
            value: lang === "id" ? "Gagal memuat data. Coba muat ulang halaman." : "Failed to load data. Please refresh.",
          },
          style: { padding: "p-4", color: "{primitives.color.error}" },
          visibility: { condition: { "==": [{ path: "state.$data.rows.status" }, { literal: "error" }] } },
        },
        {
          id: ids.table,
          type: "DataTable",
          style: { width: "w-full" },
          props: {
            // No `title`: the page header above already names the list, and Meridian shows a
            // list's name exactly once (PageHeader) — repeating it as a section heading was a
            // duplication the real app never has.
            dataSource: "rows",
            columns: tableColumns,
            rowActions,
            showIndex: true,
            paginate: false,
            locale: lang === "id" ? "id-ID" : "en-US",
            ...(options.uiPolicy?.currency ? { currency: options.uiPolicy.currency } : {}),
          },
          events: {
            onOpen: rowOpenActions,
          },
        },
        // Meridian closes a list with Paginator: the range, a page stepper and the page-size
        // selector. What stood here was a fixed "Displaying records" caption beside Previous
        // and Next buttons that set the page to a hardcoded 1 and 2 — they could not reach
        // page 3, and the caption never counted anything.
        {
          id: ids.page,
          type: "PageBar",
          style: { borderWidth: "border-t", borderColor: BORDER_COLOR },
          props: {
            total: { $bind: "state.$data.rows.total" },
            page: { $bind: "state.page" },
            pageSize: { $bind: "state.pageSize" },
          },
          events: {
            onPageChange: [{ setState: { path: "page", value: null } }],
            onPageSizeChange: [{ setState: { path: "pageSize", value: null } }],
          },
        },
      ],
    },
  };

  return document;
}

// URL query helpers — pure, testable, company-agnostic

export function parseListQueryParams(
  searchParams: URLSearchParams | string,
  meta: ListPageMeta,
): Record<string, unknown> {
  const params = typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  const state: Record<string, unknown> = {};

  const page = params.get("page");
  if (page && !isNaN(Number(page))) state.page = Number(page);

  const pageSize = params.get("pageSize") || params.get("limit");
  if (pageSize && !isNaN(Number(pageSize))) state.pageSize = Number(pageSize);

  const sort = params.get("sort");
  if (sort) {
    if (sort.startsWith("-")) {
      state.sortField = sort.slice(1);
      state.sortDir = "desc";
    } else {
      state.sortField = sort;
      state.sortDir = "asc";
    }
  }

  const q = params.get("q") || params.get("search");
  if (q) state.search = q;

  for (const filter of meta.filters ?? []) {
    const val = params.get(filter.field) ?? params.get(`filter_${filter.field}`);
    if (val !== null && val !== undefined) state[`filter_${filter.field}`] = val;
  }

  return state;
}

export function serializeListQueryParams(
  state: Record<string, unknown>,
  meta: ListPageMeta,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.search && typeof state.search === "string" && state.search.trim()) {
    params.set("q", state.search.trim());
  }

  if (state.page && typeof state.page === "number" && state.page > 1) {
    params.set("page", String(state.page));
  }

  if (
    state.pageSize &&
    typeof state.pageSize === "number" &&
    state.pageSize !== (meta.pageSize ?? 20)
  ) {
    params.set("pageSize", String(state.pageSize));
  }

  if (state.sortField && typeof state.sortField === "string") {
    const isDesc = state.sortDir === "desc";
    const defaultIsDesc = meta.defaultSort.dir === "desc";
    if (state.sortField !== meta.defaultSort.field || isDesc !== defaultIsDesc) {
      params.set("sort", `${isDesc ? "-" : ""}${state.sortField}`);
    }
  }

  for (const filter of meta.filters ?? []) {
    const val = state[`filter_${filter.field}`];
    if (val !== undefined && val !== null && val !== "") params.set(filter.field, String(val));
  }

  return params;
}
