/**
 * Runtime messages: every user-visible string the runtime renders on its own, as opposed to
 * text a document supplies through node props.
 *
 * This module is React-free so compilers (the `uidl-runtime/recipes` entry) can share the
 * same catalogs as the React components. The React provider lives in
 * `RuntimeMessagesProvider.tsx`.
 *
 * Templates use `{name}` placeholders filled by `formatMessage`, so a catalog stays plain,
 * serialisable data a host can load from JSON.
 */

export interface RuntimeMessages {
  /** Dialog footer button that dismisses the dialog. */
  close: string;
  /** Accessible name of the Drawer header close button. */
  closeDrawer: string;
  /** Accessible name of a DataTable without a title. */
  dataTable: string;
  /** Accessible name of a titled DataTable's scroll region. Placeholder: `{title}`. */
  dataTableRegion: string;
  /** Accessible name of an untitled DataTable's scroll region. */
  dataTableRegionUntitled: string;
  /** DataTable empty state. */
  dataTableEmpty: string;
  /** Accessible name of the row-open button. Placeholder: `{row}`. */
  openRow: string;
  /** Accessible name of the row-actions column header and menu trigger. */
  rowActions: string;
  /** Visible text of the row-actions menu trigger. */
  rowActionsTrigger: string;
  /** Accessible name of the row-actions menu. Placeholder: `{label}`. */
  rowActionsMenu: string;
  /** Accessible name of the pagination landmark. */
  pagination: string;
  previousPage: string;
  nextPage: string;
  /** Pagination status. Placeholders: `{page}`, `{pages}`. */
  pageStatus: string;
  /** Accessible name of the page-size selector. */
  itemsPerPage: string;
  /** Page-size option that shows every row. */
  pageSizeAll: string;
  /** Chart empty state. */
  chartEmpty: string;
  /** Label of the total shown by charts and the donut centre. */
  chartTotal: string;
  barChart: string;
  lineChart: string;
  donutChart: string;
  /** KanbanBoard empty state. */
  kanbanEmpty: string;
  /** TreeView empty state. */
  treeEmpty: string;
  /** Text of a `check` (boolean) table cell. */
  booleanTrue: string;
  booleanFalse: string;
  /** Accessible names of generated codes. Placeholder: `{value}`. */
  qrCode: string;
  barcode: string;
  dataMatrix: string;
  /** Compiler-emitted lookup states. */
  loading: string;
  optionsLoadFailed: string;
  optionsEmpty: string;
  /** Compiler-emitted lookup placeholder. Placeholder: `{label}`. */
  selectPlaceholder: string;
}

export type RuntimeMessageKey = keyof RuntimeMessages;

/** English: the default catalog. Its strings match what the runtime rendered before catalogs existed. */
export const runtimeMessagesEn: Readonly<RuntimeMessages> = Object.freeze({
  close: "Close",
  closeDrawer: "Close drawer",
  dataTable: "Data table",
  dataTableRegion: "{title} rows",
  dataTableRegionUntitled: "Data table rows",
  dataTableEmpty: "No entries found",
  openRow: "Open row {row}",
  rowActions: "Row actions",
  rowActionsTrigger: "Actions",
  rowActionsMenu: "{label} menu",
  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  pageStatus: "Page {page} of {pages}",
  itemsPerPage: "Items per page",
  pageSizeAll: "All",
  chartEmpty: "No transactions yet",
  chartTotal: "Total",
  barChart: "bar chart",
  lineChart: "line chart",
  donutChart: "donut chart",
  kanbanEmpty: "No items in this board",
  treeEmpty: "No tree data",
  booleanTrue: "True",
  booleanFalse: "False",
  qrCode: "QR Code for {value}",
  barcode: "Barcode for {value}",
  dataMatrix: "UDI DataMatrix for {value}",
  loading: "Loading…",
  optionsLoadFailed: "Failed to load options",
  optionsEmpty: "No options",
  selectPlaceholder: "Select {label}",
});

/** Indonesian. */
export const runtimeMessagesId: Readonly<RuntimeMessages> = Object.freeze({
  close: "Tutup",
  closeDrawer: "Tutup panel",
  dataTable: "Tabel data",
  dataTableRegion: "Baris {title}",
  dataTableRegionUntitled: "Baris tabel data",
  dataTableEmpty: "Tidak ada data",
  openRow: "Buka baris {row}",
  rowActions: "Aksi baris",
  rowActionsTrigger: "Aksi",
  rowActionsMenu: "Menu {label}",
  pagination: "Navigasi halaman",
  previousPage: "Halaman sebelumnya",
  nextPage: "Halaman berikutnya",
  pageStatus: "Halaman {page} dari {pages}",
  itemsPerPage: "Jumlah per halaman",
  pageSizeAll: "Semua",
  chartEmpty: "Belum ada data",
  chartTotal: "Total",
  barChart: "grafik batang",
  lineChart: "grafik garis",
  donutChart: "grafik donat",
  kanbanEmpty: "Tidak ada item di papan ini",
  treeEmpty: "Tidak ada data pohon",
  booleanTrue: "Ya",
  booleanFalse: "Tidak",
  qrCode: "Kode QR untuk {value}",
  barcode: "Barcode untuk {value}",
  dataMatrix: "UDI DataMatrix untuk {value}",
  loading: "Memuat…",
  optionsLoadFailed: "Gagal memuat pilihan",
  optionsEmpty: "Tidak ada pilihan",
  selectPlaceholder: "Pilih {label}",
});

/**
 * Built-in catalogs keyed by primary language subtag. A host with another language passes a
 * full catalog (or overrides) through `RenderOptions.messages` instead of registering here.
 */
export const runtimeMessageCatalogs: Readonly<Record<string, Readonly<RuntimeMessages>>> = Object.freeze({
  en: runtimeMessagesEn,
  id: runtimeMessagesId,
});

/**
 * The built-in catalog for a BCP 47 tag, matched on the exact tag first and then on its primary
 * language subtag (`id-ID` -> `id`). Returns `undefined` for a language without a catalog.
 */
export function findRuntimeMessageCatalog(locale: string | undefined): Readonly<RuntimeMessages> | undefined {
  if (!locale) return undefined;
  const normalized = locale.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return undefined;
  return runtimeMessageCatalogs[normalized] ?? runtimeMessageCatalogs[normalized.split("-")[0]];
}

/**
 * Resolves the messages to render with: the catalog for `locale` (or `base` when the locale has
 * no catalog or is unset), with `overrides` applied on top. Non-string and empty overrides are
 * ignored, so a partial or loosely typed host object cannot blank a label.
 */
export function resolveRuntimeMessages(
  locale?: string,
  overrides?: Partial<RuntimeMessages> | null,
  base: Readonly<RuntimeMessages> = runtimeMessagesEn,
): RuntimeMessages {
  const resolved: RuntimeMessages = { ...(findRuntimeMessageCatalog(locale) ?? base) };
  if (overrides) {
    for (const key of Object.keys(resolved) as RuntimeMessageKey[]) {
      const value = overrides[key];
      if (typeof value === "string" && value.length > 0) resolved[key] = value;
    }
  }
  return resolved;
}

/**
 * Fills `{name}` placeholders from `values`. A placeholder without a value is left as written,
 * which keeps a missing argument visible instead of silently rendering "undefined".
 */
export function formatMessage(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}
