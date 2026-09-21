/*
 * Page-level UIDL document builders for the Meridian reference.
 *
 * Layout primitives live in ./meridianLayout.ts; this file only composes them into the four page
 * shapes Meridian actually has:
 *
 *   list     ListView   PageHeader (the app shell's) + List, full-bleed, no card
 *   form     CommonForm     a `w-form` card on the gray-25 page, TwoColumnForm rows inside
 *   invoice  CommonForm     the same, at full width because of the line-item table
 *   report   Report     a `grid-cols-5 gap-4 p-4 border-b` filter strip + ListReport
 *
 * Note what is *not* here any more: a page title inside the document. Meridian shows the title
 * once, in PageHeader — which the reference shell renders — so repeating it in the body was a
 * duplication the real app never has.
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import {
  meridianFormPage,
  meridianFormShell,
  meridianFormRow,
  meridianList,
  meridianPageHeader,
  button,
  text,
  type ListColumn,
  type ListRecord,
} from "./meridianLayout";

export { text, button, transitionButton } from "./meridianLayout";
export type { ListColumn, ListRecord } from "./meridianLayout";

/**
 * The "+ New" action lives at the shell level (`PageRegistryEntry.newRoute` in
 * `packages/templates/src/meridian/pages.ts`, rendered by `MeridianShell`'s navbar): a list page
 * puts it in the page header's end slot, never in the table body.
 */
export function buildListDocument(params: {
  docId: string;
  title: string;
  columns: ListColumn[];
  records: ListRecord[];
}): UIDLDocument {
  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [meridianList("list", params.columns, params.records)],
    },
  };
}

export interface QueryListColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

/**
 * List document that reads its rows through the seam (`dataSources: { rows: { "$query": ... } }`
 * — see src/state/dataSources.ts and .notes/plan/01-arsitektur-target.md §3) instead of baking
 * records into the JSON at build time the way `buildListDocument` above does. First doctype on
 * this path is SalesInvoice; the rest of Meridian migrates in P1/P3, and P1's
 * `buildListPage(meta)` eventually supersedes this hand-written version with a full filter bar,
 * sort, and pagination driven by DoctypeMeta.
 *
 * Requires `<UIDocumentRenderer dataAdapter={...} />` (not `renderUIDocument`, which has no way
 * to react to the query settling) — same requirement as showDialog/showSnackbar.
 */
export function buildQueryListDocument(params: {
  docId: string;
  title: string;
  collection: string;
  columns: QueryListColumn[];
  statusFilter?: { initial: string; options: FormFieldOption[] };
  sort?: Array<{ field: string; dir: "asc" | "desc" }>;
}): UIDLDocument {
  const filters = params.statusFilter ? [{ field: "status", op: "eq", value: { $bind: "state.statusFilter" } }] : undefined;

  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    state: { statusFilter: params.statusFilter?.initial ?? null },
    dataSources: {
      rows: {
        $query: {
          collection: params.collection,
          ...(params.sort ? { sort: params.sort } : {}),
          ...(filters ? { filters } : {}),
        },
      },
    },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [
        ...(params.statusFilter
          ? [
              {
                id: "status-filter",
                type: "Select",
                style: { width: "w-56", padding: "p-4" },
                props: {
                  label: "Status",
                  value: { $bind: "state.statusFilter" },
                  options: params.statusFilter.options,
                },
                events: { onChange: [{ setState: { path: "statusFilter", value: null } }] },
              } satisfies UIDLNode,
            ]
          : []),
        {
          id: "loading",
          type: "Text",
          props: { value: "Memuat data…" },
          style: { padding: "p-4", color: "{primitives.color.textSecondary}" },
          visibility: { condition: { "==": [{ path: "state.$data.rows.status" }, { literal: "loading" }] } },
        },
        {
          id: "load-error",
          type: "Text",
          props: { value: "Gagal memuat data. Coba muat ulang halaman." },
          style: { padding: "p-4", color: "{primitives.color.error}" },
          visibility: { condition: { "==": [{ path: "state.$data.rows.status" }, { literal: "error" }] } },
        },
        {
          id: "table",
          type: "DataTable",
          style: { width: "w-full" },
          props: {
            title: params.title,
            dataSource: "rows",
            columns: params.columns,
            rowActions: [{ label: "Open", event: "onOpen" }],
          },
          events: {
            onOpen: [{ navigate: { route: { $bind: "event.route" } } }],
          },
        },
      ],
    },
  };
}

export type FormFieldWidget = "TextField" | "Select" | "Textarea" | "RadioGroup" | "Checkbox";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  widget: FormFieldWidget;
  value: unknown;
  options?: FormFieldOption[];
}

/**
 * Controls inside a Meridian form row are borderless and `size="small"` (Controls/Base:
 * `px-2 py-1`, no box) — the row's own `border-b` is what separates one field from the next.
 * Only the label column carries padding; the control sits flush in the second column.
 */
function formControlNode(field: FormField): UIDLNode {
  const isCheckbox = field.widget === "Checkbox";
  return {
    id: `field-${field.key}`,
    type: field.widget,
    props: {
      // The label lives in the row's start column, so the control must not print it again —
      // but it still has to reach assistive tech, hence the aria-label. (Meridian's
      // TwoColumnForm leaves its label div unassociated; that part is not worth copying.)
      "aria-label": field.label,
      ...(isCheckbox ? {} : { border: false, size: "small" }),
      // Checkbox's controlled prop is `checked` (boolean), not `value` — every other form
      // widget in this SDK uses `value`.
      ...(isCheckbox ? { checked: { $bind: `state.${field.key}` } } : { value: { $bind: `state.${field.key}` } }),
      ...(field.widget === "Select" || field.widget === "RadioGroup" ? { options: field.options ?? [] } : {}),
    },
    events: { onChange: [{ setState: { path: field.key, value: null } }] },
  };
}

function formRows(fields: FormField[]): UIDLNode[] {
  return fields.map((field) => meridianFormRow(`row-${field.key}`, field.label, formControlNode(field)));
}

/** CommonForm's footer: actions right-aligned in a `p-4` strip below the last field row. */
function formActions(id: string, actions: UIDLNode[]): UIDLNode {
  return {
    id,
    type: "Toolbar",
    style: { display: "flex", justifyContent: "end", alignItems: "center", gap: "gap-2", padding: "p-4" },
    children: actions,
  };
}

/** A generic, doctype-agnostic edit form for flat entities (Customer/Supplier/Item/etc). */
export function buildFlatFormDocument(params: {
  docId: string;
  title: string;
  fields: FormField[];
  listRoute: string;
  headerActions?: UIDLNode[];
  extraActions?: UIDLNode[];
}): UIDLDocument {
  const state: Record<string, unknown> = {};
  for (const field of params.fields) state[field.key] = field.value;

  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    state,
    root: meridianFormPage([
      meridianFormShell("form", [
        meridianPageHeader(params.title, params.headerActions ?? [], "form-header"),
        ...formRows(params.fields),
        formActions("form-actions", [
          button("cancel-btn", "Cancel", params.listRoute),
          ...(params.extraActions ?? []),
          button("save-btn", "Save", params.listRoute, "primary"),
        ]),
      ]),
    ]),
  };
}

export interface InvoiceLineDisplay {
  item: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

/**
 * Sales/Purchase Invoice form. FormContainer switches to `useFullWidth` (`w-full` with a
 * `border-t` instead of the floating card) for documents with a line-item table, which is
 * what an invoice is.
 */
export function buildInvoiceFormDocument(params: {
  docId: string;
  title: string;
  headerFields: FormField[];
  lines: InvoiceLineDisplay[];
  subtotal: number;
  tax: number;
  total: number;
  formatMoney: (amount: number) => string;
  listRoute: string;
  headerActions?: UIDLNode[];
  extraActions?: UIDLNode[];
}): UIDLDocument {
  const state: Record<string, unknown> = {};
  for (const field of params.headerFields) state[field.key] = field.value;

  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    state,
    dataSources: {
      lineItems: params.lines.map((line) => ({
        item: line.item,
        description: line.description,
        quantity: String(line.quantity),
        rate: params.formatMoney(line.rate),
        amount: params.formatMoney(line.amount),
      })),
    },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [
        meridianPageHeader(params.title, params.headerActions ?? [], "form-header"),
        ...formRows(params.headerFields),
        {
          id: "lines",
          type: "DataTable",
          props: {
            title: "Items",
            dataSource: "lineItems",
            paginate: false,
            columns: [
              { key: "item", label: "Item" },
              { key: "description", label: "Description" },
              { key: "quantity", label: "Quantity", align: "right" },
              { key: "rate", label: "Rate", align: "right" },
              { key: "amount", label: "Amount", align: "right" },
            ],
          },
          style: { width: "w-full", borderWidth: "border-b", borderColor: "{primitives.color.border}" },
        },
        // Invoice totals sit in a right-aligned block under the items table, at the same
        // `p-4` rhythm as everything else on the page.
        {
          id: "totals",
          type: "Column",
          style: {
            display: "flex",
            flexDirection: "column",
            padding: "p-4",
            gap: "gap-2",
            alignItems: "end",
            borderWidth: "border-b",
            borderColor: "{primitives.color.border}",
          },
          children: [
            text("subtotal", `Subtotal ${params.formatMoney(params.subtotal)}`, {
              color: "{primitives.color.text-secondary}",
            }),
            text("tax", `PPN 11% ${params.formatMoney(params.tax)}`, { color: "{primitives.color.text-secondary}" }),
            text("total", `Grand Total ${params.formatMoney(params.total)}`, { fontSize: "text-xl", fontWeight: 600 }),
          ],
        },
        formActions("form-actions", [
          button("cancel-btn", "Cancel", params.listRoute),
          ...(params.extraActions ?? []),
          button("save-btn", "Save", params.listRoute, "primary"),
        ]),
      ],
    },
  };
}

export interface JournalLineDisplay {
  account: string;
  debit: string;
  credit: string;
}

/** Journal Entry form — header fields + a read-only debit/credit line table. */
export function buildJournalEntryFormDocument(params: {
  docId: string;
  title: string;
  headerFields: FormField[];
  lines: JournalLineDisplay[];
  listRoute: string;
}): UIDLDocument {
  const state: Record<string, unknown> = {};
  for (const field of params.headerFields) state[field.key] = field.value;

  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    state,
    dataSources: { lines: params.lines },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [
        meridianPageHeader(params.title, [], "form-header"),
        ...formRows(params.headerFields),
        {
          id: "je-lines",
          type: "DataTable",
          props: {
            title: "Account Entries",
            dataSource: "lines",
            paginate: false,
            columns: [
              { key: "account", label: "Account" },
              { key: "debit", label: "Debit", align: "right" },
              { key: "credit", label: "Credit", align: "right" },
            ],
          },
          style: { width: "w-full", borderWidth: "border-b", borderColor: "{primitives.color.border}" },
        },
        formActions("form-actions", [
          button("cancel-btn", "Cancel", params.listRoute),
          button("save-btn", "Save", params.listRoute, "primary"),
        ]),
      ],
    },
  };
}

/** A read-only report page (General Ledger, Trial Balance, P&L, Balance Sheet, GSTR1/2, Bank Reconciliation). */
export function buildReportDocument(params: {
  docId: string;
  title: string;
  headerActions?: UIDLNode[];
  summary?: UIDLNode[];
  columns: ListColumn[];
  rows: Array<Record<string, string>>;
}): UIDLDocument {
  return {
    version: "1.0.0",
    id: params.docId,
    name: params.title,
    dataSources: { rows: params.rows },
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: [
        meridianPageHeader(params.title, params.headerActions ?? [], "report-header"),
        // Report's filter strip: `grid grid-cols-5 gap-4 p-4 border-b`. The demo reports
        // have no interactive filters, so the same strip carries their summary figures.
        ...(params.summary && params.summary.length > 0
          ? [
              {
                id: "report-summary",
                type: "GridView",
                props: {
                  style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" },
                },
                style: {
                  gap: "gap-4",
                  padding: "p-4",
                  borderWidth: "border-b",
                  borderColor: "{primitives.color.border}",
                },
                children: params.summary,
              } satisfies UIDLNode,
            ]
          : []),
        {
          id: "report-table",
          type: "DataTable",
          props: { dataSource: "rows", columns: params.columns },
          style: { width: "w-full" },
        },
      ],
    },
  };
}

export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
