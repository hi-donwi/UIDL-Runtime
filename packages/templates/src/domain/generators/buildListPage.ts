/**
 * `buildListPage(meta, options)` — DoctypeMeta-driven list page generator.
 *
 * Replaces hand-coded list pages across company consoles with a single declaration-driven
 * generator. Produces a valid `UIDLDocument` driven by `$query` data sources (`dataSources.rows`),
 * connecting to any `DataAdapter` via `<UIDocumentRenderer dataAdapter={adapter} />`.
 *
 * Includes:
 *   - Search input bound to `state.search` (resets `page` to 1)
 *   - Filter bar generated from `meta.listView.filters` (Select / TextField / DateRange)
 *   - Sort per column bound to `state.sortField` & `state.sortDir` (default from `meta.listView.defaultSort`)
 *   - Pagination bound to `state.page` & `state.pageSize`
 *   - Summaries section from `meta.listView.summaries`
 *   - DataTable with mapped columns, alignments, and `onOpen` row navigation
 *   - URL query parameter synchronization helpers (`parseListQueryParams` & `serializeListQueryParams`)
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import type { Language } from "~/utils/i18n";
import type { DoctypeMeta, ListViewColumn, ListViewSummary } from "../doctypes/types";
import { parseDoctypeMeta } from "../doctypes/types";

export interface DataTableAction {
  label: string;
  event?: string;
}

export interface BuildListPageOptions {
  /** Company / tenant identifier (e.g. "shoe-company" or "meridian"). */
  company?: string;
  /** Language for labels and placeholders ("id" | "en"). Defaults to "id". */
  lang?: Language;
  /** Custom document ID. Defaults to `list-${meta.name.toLowerCase()}`. */
  docId?: string;
  /** Route for "+ New" action. Defaults to `/app/${company}/edit/${meta.name}/new` or `/meridian/edit/${meta.name}/new`. */
  newRoute?: string | ((meta: DoctypeMeta) => string);
  /** Route pattern for row open/edit navigation. Defaults to `/app/${company}/edit/${meta.name}/:id`. */
  editRoute?: string | ((meta: DoctypeMeta, record: Record<string, unknown>) => string);
  /** Initial state overrides (e.g. parsed from URL query parameters). */
  initialState?: Record<string, unknown>;
  /** Custom row actions for DataTable. Defaults to `[{ label: "Open", event: "onOpen" }]`. */
  rowActions?: DataTableAction[];
  /** Additional header action buttons. */
  extraHeaderActions?: UIDLNode[];
  /** Additional filter bar controls. */
  extraFilterActions?: UIDLNode[];
}

const BORDER_COLOR = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/**
 * Builds a `UIDLDocument` for a list view of `meta`.
 */
export function buildListPage(metaInput: DoctypeMeta, options: BuildListPageOptions = {}): UIDLDocument {
  const meta = parseDoctypeMeta(metaInput);
  const lang = options.lang ?? "id";
  const docId = options.docId ?? `list-${meta.name.toLowerCase()}`;
  const title = meta.label[lang] ?? meta.name;

  const newRoute =
    typeof options.newRoute === "function"
      ? options.newRoute(meta)
      : options.newRoute ?? (options.company ? `/app/${options.company}/edit/${meta.name}/new` : `/meridian/edit/${meta.name}/new`);

  // Initial state setup
  const defaultPageSize = meta.listView.pageSize ?? 20;
  const defaultSortField = meta.listView.defaultSort.field;
  const defaultSortDir = meta.listView.defaultSort.dir;

  const state: Record<string, unknown> = {
    page: 1,
    pageSize: defaultPageSize,
    sortField: defaultSortField,
    sortDir: defaultSortDir,
    search: "",
  };

  // Populate initial state for each declared filter
  for (const filter of meta.listView.filters ?? []) {
    state[`filter_${filter.field}`] = "";
  }

  // Merge any initialState overrides (e.g. from URL query string)
  if (options.initialState) {
    Object.assign(state, options.initialState);
  }

  // DataSources: $query with filters, sort, page, and search
  const queryFilters = (meta.listView.filters ?? []).map((f) => ({
    field: f.field,
    op: f.widget === "DateRange" ? "between" : "eq",
    value: { $bind: `state.filter_${f.field}` },
  }));

  const dataSources: Record<string, unknown> = {
    rows: {
      $query: {
        collection: meta.name,
        filters: queryFilters.length > 0 ? queryFilters : undefined,
        sort: [
          {
            field: { $bind: "state.sortField" },
            dir: { $bind: "state.sortDir" },
          },
        ],
        page: {
          number: { $bind: "state.page" },
          size: { $bind: "state.pageSize" },
        },
        search: { $bind: "state.search" },
      },
    },
  };

  // Build filter controls
  const filterControls: UIDLNode[] = [];

  // 1. Search input
  filterControls.push({
    id: "search-input",
    type: "TextField",
    style: { width: "w-64" },
    props: {
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

  // 2. Filters from meta.listView.filters
  for (const filter of meta.listView.filters ?? []) {
    const fieldMeta = meta.fields.find((f) => f.key === filter.field);
    const filterLabel = fieldMeta?.label[lang] ?? filter.field;

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
      } else if (meta.states && filter.field === meta.states.field) {
        optionsList = [
          { value: "", label: lang === "id" ? "Semua Status" : "All Status" },
          ...meta.states.values.map((v) => ({ value: v, label: v })),
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

  // 3. Reset filters button
  const resetActions = [
    { setState: { path: "search", value: "" } },
    { setState: { path: "page", value: 1 } },
    ...(meta.listView.filters ?? []).map((f) => ({
      setState: { path: `filter_${f.field}`, value: "" },
    })),
  ];

  filterControls.push({
    id: "reset-filters-btn",
    type: "Button",
    props: {
      label: lang === "id" ? "Reset" : "Reset",
      variant: "secondary",
    },
    events: {
      onClick: resetActions,
    },
  });

  if (options.extraFilterActions) {
    filterControls.push(...options.extraFilterActions);
  }

  // Build DataTable columns
  const tableColumns = meta.listView.columns.map((col: ListViewColumn) => {
    const fieldMeta = meta.fields.find((f) => f.key === col.field);
    const colLabel = fieldMeta?.label[lang] ?? col.field;
    const isCurrency = fieldMeta?.widget === "Currency";

    return {
      key: col.field,
      label: colLabel,
      width: col.width,
      align: col.align ?? (isCurrency ? "right" : undefined),
    };
  });

  // Header actions: "+ New" button + optional extra header actions
  const headerActions: UIDLNode[] = [
    ...(options.extraHeaderActions ?? []),
    {
      id: "create-new-btn",
      type: "Button",
      props: {
        label: lang === "id" ? `+ ${meta.label.id}` : `+ New ${meta.label.en}`,
        variant: "primary",
      },
      events: {
        onClick: [{ navigate: { route: newRoute } }],
      },
    },
  ];

  // Summaries section if declared
  const summaryNodes: UIDLNode[] = [];
  if (meta.listView.summaries && meta.listView.summaries.length > 0) {
    summaryNodes.push({
      id: "list-summaries",
      type: "GridView",
      props: {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${meta.listView.summaries.length}, minmax(0, 1fr))`,
        },
      },
      style: { borderWidth: "border-b", borderColor: BORDER_COLOR },
      children: meta.listView.summaries.map((summary: ListViewSummary, idx: number) => ({
        id: `summary-${idx}`,
        type: "Column",
        style: {
          padding: "p-4",
          gap: "gap-1",
          ...(idx < meta.listView.summaries!.length - 1 ? { borderWidth: "border-e", borderColor: BORDER_COLOR } : {}),
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
            props: { value: `${summary.agg.toUpperCase()}(${summary.field})` },
            style: { fontSize: "text-xl", fontWeight: 600 },
          },
        ],
      })),
    });
  }

  // Row navigation action
  const editRouteTarget =
    typeof options.editRoute === "string"
      ? options.editRoute
      : { $bind: "event.route" };

  const rowActions: DataTableAction[] = options.rowActions ?? [
    { label: lang === "id" ? "Buka" : "Open", event: "onOpen" },
  ];

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
        // 1. Page Header Navbar
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

        // 2. Summaries (if any)
        ...summaryNodes,

        // 3. Filter Bar
        {
          id: "filter-bar",
          type: "Toolbar",
          style: {
            display: "flex",
            alignItems: "center",
            gap: "gap-3",
            padding: "p-4",
            borderWidth: "border-b",
            borderColor: BORDER_COLOR,
          },
          children: filterControls,
        },

        // 4. Loading & Error States
        {
          id: "list-loading",
          type: "Text",
          props: { value: lang === "id" ? "Memuat data…" : "Loading data…" },
          style: { padding: "p-4", color: TEXT_SECONDARY },
          visibility: {
            condition: {
              "==": [{ path: "state.$data.rows.status" }, { literal: "loading" }],
            },
          },
        },
        {
          id: "list-error",
          type: "Text",
          props: {
            value: lang === "id" ? "Gagal memuat data. Coba muat ulang halaman." : "Failed to load data. Please refresh.",
          },
          style: { padding: "p-4", color: "{primitives.color.error}" },
          visibility: {
            condition: {
              "==": [{ path: "state.$data.rows.status" }, { literal: "error" }],
            },
          },
        },

        // 5. DataTable
        {
          id: "list-table",
          type: "DataTable",
          style: { width: "w-full" },
          props: {
            title,
            dataSource: "rows",
            columns: tableColumns,
            rowActions,
            showIndex: true,
            paginate: false,
          },
          events: {
            onOpen: [{ navigate: { route: editRouteTarget } }],
          },
        },

        // 6. Pagination Footer Controls
        {
          id: "list-pagination",
          type: "Toolbar",
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "p-4",
            borderWidth: "border-t",
            borderColor: BORDER_COLOR,
          },
          children: [
            {
              id: "page-info",
              type: "Text",
              props: {
                value: lang === "id" ? "Menampilkan data" : "Displaying records",
              },
              style: { color: TEXT_SECONDARY, fontSize: "text-sm" },
            },
            {
              id: "pagination-buttons",
              type: "Toolbar",
              style: { display: "flex", gap: "gap-2" },
              children: [
                {
                  id: "prev-page-btn",
                  type: "Button",
                  props: {
                    label: lang === "id" ? "Sebelumnya" : "Previous",
                    variant: "secondary",
                  },
                  events: {
                    onClick: [{ setState: { path: "page", value: 1 } }],
                  },
                },
                {
                  id: "next-page-btn",
                  type: "Button",
                  props: {
                    label: lang === "id" ? "Selanjutnya" : "Next",
                    variant: "secondary",
                  },
                  events: {
                    onClick: [{ setState: { path: "page", value: 2 } }],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  };

  return document;
}

/**
 * Parses query parameters from a URL or query string into a state object suitable
 * for `initialState` in `buildListPage`.
 */
export function parseListQueryParams(
  searchParams: URLSearchParams | string,
  meta: DoctypeMeta,
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

  for (const filter of meta.listView.filters ?? []) {
    const val = params.get(filter.field) ?? params.get(`filter_${filter.field}`);
    if (val !== null && val !== undefined) {
      state[`filter_${filter.field}`] = val;
    }
  }

  return state;
}

/**
 * Serializes the active list page state (filters, search, pagination, sort) into `URLSearchParams`.
 */
export function serializeListQueryParams(
  state: Record<string, unknown>,
  meta: DoctypeMeta,
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
    state.pageSize !== (meta.listView.pageSize ?? 20)
  ) {
    params.set("pageSize", String(state.pageSize));
  }

  if (state.sortField && typeof state.sortField === "string") {
    const isDesc = state.sortDir === "desc";
    const defaultIsDesc = meta.listView.defaultSort.dir === "desc";
    if (state.sortField !== meta.listView.defaultSort.field || isDesc !== defaultIsDesc) {
      params.set("sort", `${isDesc ? "-" : ""}${state.sortField}`);
    }
  }

  for (const filter of meta.listView.filters ?? []) {
    const val = state[`filter_${filter.field}`];
    if (val !== undefined && val !== null && val !== "") {
      params.set(filter.field, String(val));
    }
  }

  return params;
}
