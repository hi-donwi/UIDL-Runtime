/*
 * The component gallery: every registered widget, rendered through the real JSON pipeline and
 * dressed in Meridian's UI language.
 *
 * One UIDLDocument per registry category. Each specimen is a `meridianDashboardSection` — a `p-4`
 * region closed by a rule, headed by SectionHeader's `text-base font-semibold` title with a
 * one-line note on the end edge, which is exactly how Dashboard stacks Cashflow / Unpaid
 * Invoices / Profit and Loss down the page. Nothing here is a floating card, because nothing in
 * Meridian is.
 *
 * These are documents, not hand-written React: what the gallery shows is what a JSON author
 * gets from the same widgets.
 */

import type { UIDLDocument, UIDLNode } from "~/types";
import { meridianDashboardSection, meridianFormRow, meridianList, text } from "@uidl-runtime/templates/meridian/meridianLayout";

export type GalleryCategory = "layout" | "base" | "form" | "data" | "navigation" | "overlay";

const BORDER = "{primitives.color.border}";
const TEXT_SECONDARY = "{primitives.color.text-secondary}";

/** SectionHeader, with the description in the `#action` slot on the end edge. */
function specimen(id: string, title: string, note: string, children: UIDLNode[]): UIDLNode {
  return meridianDashboardSection(id, [
    {
      id: `${id}-header`,
      type: "Row",
      style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "gap-4" },
      children: [
        text(`${id}-title`, title, { fontSize: "text-base", fontWeight: 600 }, undefined, 2),
        text(`${id}-note`, note, { fontSize: "text-sm", color: TEXT_SECONDARY }),
      ],
    },
    ...children,
  ]);
}

/** Base's field label above a control that has none of its own. */
function labelled(id: string, label: string, control: UIDLNode): UIDLNode {
  return {
    id,
    type: "Column",
    style: { display: "flex", flexDirection: "column", gap: "gap-1" },
    children: [text(`${id}-label`, label, { fontSize: "text-sm", color: TEXT_SECONDARY }), control],
  };
}

/** A neutral block used to make layout containers visible without inventing new styling. */
function swatch(id: string, label: string): UIDLNode {
  return text(id, label, {
    padding: "px-3 py-2",
    background: "{primitives.color.surface}",
    borderWidth: "border",
    borderColor: BORDER,
    borderRadius: "{primitives.radius.md}",
    fontSize: "text-base",
  });
}

function galleryDocument(id: string, name: string, sections: UIDLNode[], extras: Partial<UIDLDocument> = {}): UIDLDocument {
  return {
    version: "1.0.0",
    id,
    name,
    ...extras,
    root: {
      id: "page",
      type: "Column",
      style: { fontSize: "text-base" },
      children: sections,
    },
  };
}

function layoutDocument(): UIDLDocument {
  return galleryDocument("gallery-layout", "Layout", [
    specimen("row", "Row", "Horizontal flow with a gap-4 rhythm", [
      {
        id: "row-demo",
        type: "Row",
        style: { display: "flex", gap: "gap-4", alignItems: "center" },
        children: [swatch("row-a", "One"), swatch("row-b", "Two"), swatch("row-c", "Three")],
      },
    ]),
    specimen("column", "Column", "Vertical stack, gap-2", [
      {
        id: "column-demo",
        type: "Column",
        style: { display: "flex", flexDirection: "column", gap: "gap-2", maxWidth: "max-w-sm" },
        children: [swatch("col-a", "First"), swatch("col-b", "Second"), swatch("col-c", "Third")],
      },
    ]),
    specimen("stack", "Stack + Spacer", "Spacer pushes the trailing item to the end edge", [
      {
        id: "stack-demo",
        type: "Stack",
        style: { display: "flex", alignItems: "center", gap: "gap-2", width: "w-full" },
        children: [
          swatch("stack-a", "Start"),
          { id: "stack-spacer", type: "Spacer" },
          swatch("stack-b", "End"),
        ],
      },
    ]),
    specimen("container", "Container + Divider", "The 1px gray-200 rule that separates every Meridian row", [
      {
        id: "container-demo",
        type: "Container",
        style: { display: "flex", flexDirection: "column", gap: "gap-3", maxWidth: "max-w-md" },
        children: [
          text("container-a", "Above the rule"),
          { id: "container-divider", type: "Divider", style: { borderColor: BORDER } },
          text("container-b", "Below the rule"),
        ],
      },
    ]),
    specimen("grid", "GridView", "Auto-fit grid, minmax(200px, 1fr), gap-4", [
      {
        id: "grid-demo",
        type: "GridView",
        props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" } },
        style: { gap: "gap-4" },
        children: [swatch("grid-a", "Cell one"), swatch("grid-b", "Cell two"), swatch("grid-c", "Cell three")],
      },
    ]),
  ]);
}

function baseDocument(): UIDLDocument {
  const statusColors: Array<[string, string]> = [
    ["Paid", "green"],
    ["Unpaid", "red"],
    ["Partly Paid", "yellow"],
    ["Submitted", "blue"],
    ["Outstanding", "orange"],
    ["Draft", "gray"],
  ];

  return galleryDocument("gallery-base", "Typography & Base", [
    specimen("type-scale", "Type scale", "11 / 12 / 13 / 14 / 18 / 20 / 24 / 28px — tailwind.config.js", [
      {
        id: "type-demo",
        type: "Column",
        style: { display: "flex", flexDirection: "column", gap: "gap-2" },
        children: [
          text("type-4xl", "text-4xl · 28px · page display", { fontSize: "text-4xl", fontWeight: 600 }),
          text("type-2xl", "text-2xl · 20px · search input", { fontSize: "text-2xl", fontWeight: 600 }),
          text("type-xl", "text-xl · 18px · page and form header", { fontSize: "text-xl", fontWeight: 600 }),
          text("type-lg", "text-lg · 14px · sidebar group label"),
          text("type-base", "text-base · 13px · body, list rows, form controls"),
          text("type-sm", "text-sm · 12px · buttons, paginator, field labels", { color: TEXT_SECONDARY }),
          text("type-xs", "text-xs · 11px · status pills", { color: TEXT_SECONDARY, fontSize: "text-xs" }),
        ],
      },
    ]),
    specimen("buttons", "Button", "Button — h-8, rounded-md, text-sm, px-6", [
      {
        id: "buttons-demo",
        type: "Toolbar",
        style: { display: "flex", alignItems: "center", gap: "gap-2" },
        children: [
          { id: "btn-primary", type: "Button", props: { label: "Save", variant: "primary" } },
          { id: "btn-secondary", type: "Button", props: { label: "Cancel" } },
          { id: "btn-icon", type: "Button", props: { label: "+", icon: true } },
          { id: "btn-disabled", type: "Button", props: { label: "Submitted", disabled: true } },
        ],
      },
    ]),
    specimen("status", "Badge & StatusPill", "getBgTextColorClass — bg-{color}-200 / text-{color}-700", [
      {
        id: "status-pills",
        type: "Row",
        props: { style: { flexWrap: "wrap" } },
        style: { display: "flex", alignItems: "center", gap: "gap-2" },
        children: statusColors.map(([label, color], index) => ({
          id: `pill-${index}`,
          type: "Badge",
          props: { label, color, variant: "pill" },
        })),
      },
      {
        id: "status-badges",
        type: "Row",
        props: { style: { flexWrap: "wrap" } },
        style: { display: "flex", alignItems: "center", gap: "gap-2" },
        children: statusColors.map(([label, color], index) => ({
          id: `badge-${index}`,
          type: "Badge",
          props: { label, color },
        })),
      },
    ]),
    specimen("codes", "QRCode · Barcode · DataMatrix", "Vector codes for faktur pajak and label printing", [
      {
        id: "codes-demo",
        type: "Row",
        props: { style: { flexWrap: "wrap" } },
        style: { display: "flex", alignItems: "center", gap: "gap-8" },
        children: [
          { id: "code-qr", type: "QRCode", props: { value: "https://uidl-runtime.dev/verify", size: 96 } },
          { id: "code-barcode", type: "Barcode", props: { value: "8991234567890", height: 64 } },
          { id: "code-dm", type: "DataMatrix", props: { value: "SINV-2027-00001", size: 96 } },
        ],
      },
    ]),
  ]);
}

function formDocument(): UIDLDocument {
  return galleryDocument(
    "gallery-form",
    "Form Controls",
    [
      specimen("controls-standalone", "Controls with a box", "Base with `border` — px-3 py-2, gray-25 fill", [
        {
          id: "controls-grid",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" } },
          style: { gap: "gap-4" },
          children: [
            {
              id: "ctl-text",
              type: "TextField",
              props: { label: "Customer", value: { $bind: "state.customer" }, placeholder: "Party name" },
              events: { onChange: [{ setState: { path: "customer", value: null } }] },
            },
            {
              id: "ctl-select",
              type: "Select",
              props: {
                label: "Status",
                value: { $bind: "state.status" },
                options: [
                  { value: "Draft", label: "Draft" },
                  { value: "Submitted", label: "Submitted" },
                  { value: "Paid", label: "Paid" },
                ],
              },
              events: { onChange: [{ setState: { path: "status", value: null } }] },
            },
            {
              id: "ctl-textarea",
              type: "Textarea",
              props: { label: "Terms", value: { $bind: "state.terms" }, rows: 3 },
              events: { onChange: [{ setState: { path: "terms", value: null } }] },
            },
          ],
        },
      ]),
      specimen("controls-row", "Controls in a form row", "TwoColumnForm — h-row-mid, border-b, borderless control", [
        meridianFormRow("gallery-row-party", "Party", {
          id: "row-party-control",
          type: "TextField",
          props: { value: { $bind: "state.customer" }, border: false, size: "small", "aria-label": "Party" },
          events: { onChange: [{ setState: { path: "customer", value: null } }] },
        }),
        meridianFormRow("gallery-row-status", "Status", {
          id: "row-status-control",
          type: "Select",
          props: {
            value: { $bind: "state.status" },
            border: false,
            size: "small",
            "aria-label": "Status",
            options: [
              { value: "Draft", label: "Draft" },
              { value: "Submitted", label: "Submitted" },
              { value: "Paid", label: "Paid" },
            ],
          },
          events: { onChange: [{ setState: { path: "status", value: null } }] },
        }),
        meridianFormRow("gallery-row-taxable", "Kena PPN", {
          id: "row-taxable-control",
          type: "Checkbox",
          props: { checked: { $bind: "state.taxable" }, "aria-label": "Kena PPN" },
          events: { onChange: [{ setState: { path: "taxable", value: null } }] },
        }),
      ]),
      specimen("toggles", "Checkbox · Switch · Slider · RadioGroup", "14px controls on Meridian's #A1ABB4 accent", [
        {
          id: "toggles-demo",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "start" } },
          style: { gap: "gap-4" },
          children: [
            labelled("tg-check-wrap", "Checkbox", {
              id: "tg-check",
              type: "Checkbox",
              props: { label: "Include in reports", checked: { $bind: "state.taxable" } },
              events: { onChange: [{ setState: { path: "taxable", value: null } }] },
            }),
            labelled("tg-switch-wrap", "Switch", { id: "tg-switch", type: "Switch", props: { checked: true } }),
            labelled("tg-slider-wrap", "Slider", { id: "tg-slider", type: "Slider", props: { value: 40, readOnly: true } }),
            {
              id: "tg-radio",
              type: "RadioGroup",
              props: {
                label: "Payment method",
                value: { $bind: "state.method" },
                options: [
                  { value: "cash", label: "Cash" },
                  { value: "transfer", label: "Bank transfer" },
                ],
              },
              events: { onChange: [{ setState: { path: "method", value: null } }] },
            },
          ],
        },
      ]),
    ],
    {
      state: { customer: "PT Sinar Abadi Jaya", status: "Submitted", terms: "Pembayaran 30 hari.", taxable: true, method: "transfer" },
    },
  );
}

function dataDocument(): UIDLDocument {
  const invoices = [
    { invoice: "SINV-2027-00001", customer: "PT Sinar Abadi Jaya", date: "2027-07-02", status: "Paid", total: "Rp 34.132.500" },
    { invoice: "SINV-2027-00002", customer: "CV Mitra Sejahtera", date: "2027-07-05", status: "Unpaid", total: "Rp 9.546.000" },
    { invoice: "SINV-2027-00003", customer: "Toko Berkah Makmur", date: "2027-07-09", status: "Draft", total: "Rp 1.942.500" },
  ];

  return galleryDocument(
    "gallery-data",
    "Data Display",
    [
      specimen("datatable", "DataTable", "List — h-row-mid rows, 1rem grid gap, index gutter, paginator", [
        {
          id: "datatable-demo",
          type: "DataTable",
          props: {
            dataSource: "invoices",
            columns: [
              { key: "invoice", label: "Invoice" },
              { key: "customer", label: "Customer" },
              { key: "date", label: "Date" },
              { key: "status", label: "Status" },
              { key: "total", label: "Total", align: "right" },
            ],
          },
          style: { width: "w-full" },
        },
      ]),
      specimen("list-rows", "Clickable list rows", "The same list with per-row navigation and status pills", [
        meridianList(
          "gallery-list",
          [
            { key: "invoice", label: "Invoice" },
            { key: "customer", label: "Customer" },
            { key: "status", label: "Status" },
            { key: "total", label: "Total", align: "right" },
          ],
          invoices.map((row) => ({
            route: `/meridian/edit/SalesInvoice/${row.invoice}`,
            cells: { invoice: row.invoice, customer: row.customer, status: row.status, total: row.total },
          })),
        ),
      ]),
      specimen("chart-bar", "Chart · bar", "BarChart — 28-unit bars, 4 grid divisions, no axis", [
        {
          id: "chart-bar-demo",
          type: "Chart",
          props: { chartType: "bar", dataSource: "monthly", xKey: "label", yKey: "value" },
          style: { width: "w-full" },
        },
      ]),
      specimen("chart-line", "Chart · line", "LineChart — two series with the gradient wash", [
        {
          id: "chart-line-demo",
          type: "Chart",
          props: {
            chartType: "line",
            dataSource: "cashflow",
            xKey: "label",
            series: [
              { key: "inflow", label: "Inflow" },
              { key: "outflow", label: "Outflow" },
            ],
          },
          style: { width: "w-full" },
        },
      ]),
      specimen("chart-donut", "Chart · donut", "Expenses — legend at half width, donut at the other half", [
        {
          id: "chart-donut-demo",
          type: "Chart",
          props: { chartType: "donut", dataSource: "expenses", xKey: "label", yKey: "value", totalLabel: "Total Spending" },
          style: { width: "w-full" },
        },
      ]),
      specimen("tree", "TreeView", "ChartOfAccounts — 2rem indent per level, one rule per row", [
        {
          id: "tree-demo",
          type: "TreeView",
          props: {
            items: [
              {
                id: "assets",
                label: "Assets",
                value: "Rp 412.900.000",
                children: [
                  { id: "cash", label: "Cash", value: "Rp 79.959.700" },
                  { id: "debtors", label: "Debtors", value: "Rp 76.628.850", badge: "Receivable" },
                ],
              },
              {
                id: "income",
                label: "Income",
                value: "Rp 114.300.000",
                children: [{ id: "sales", label: "Sales", value: "Rp 114.300.000" }],
              },
            ],
          },
          style: { width: "w-full" },
        },
      ]),
      specimen("kanban", "KanbanBoard", "Pipeline columns on gray-25 with hairline dividers", [
        {
          id: "kanban-demo",
          type: "KanbanBoard",
          props: {
            columns: [
              { id: "lead", title: "Lead", color: "#33a1ff" },
              { id: "quote", title: "Quotation", color: "#edba13" },
              { id: "won", title: "Won", color: "#30a66d" },
            ],
            rows: [
              { id: "d1", columnId: "lead", title: "PT Cahaya Nusantara", subtitle: "Inbound form", value: "Rp 47.000.000" },
              { id: "d2", columnId: "quote", title: "CV Karya Utama", subtitle: "Quote sent", value: "Rp 10.500.000", badge: "Follow up" },
              { id: "d3", columnId: "won", title: "UD Sumber Rejeki", subtitle: "Signed", value: "Rp 2.664.000" },
            ],
          },
          style: { width: "w-full" },
        },
      ]),
    ],
    {
      dataSources: {
        invoices,
        monthly: [
          { label: "Apr", value: 68000000 },
          { label: "May", value: 92000000 },
          { label: "Jun", value: 74000000 },
          { label: "Jul", value: 114300000 },
        ],
        cashflow: [
          { label: "Apr", inflow: 68000000, outflow: 41000000 },
          { label: "May", inflow: 92000000, outflow: 55000000 },
          { label: "Jun", inflow: 74000000, outflow: 62000000 },
          { label: "Jul", inflow: 114300000, outflow: 78000000 },
        ],
        expenses: [
          { label: "Cost of Goods Sold", value: 47000000 },
          { label: "Salaries Expense", value: 35000000 },
          { label: "Rent Expense", value: 12000000 },
          { label: "Utilities Expense", value: 4200000 },
        ],
      },
    },
  );
}

function navigationDocument(): UIDLDocument {
  return galleryDocument("gallery-navigation", "Navigation", [
    specimen("navbar", "Navbar", "PageHeader — h-row-largest, px-4, gap-4 start / gap-2 end", [
      {
        id: "navbar-demo",
        type: "Navbar",
        style: { borderWidth: "border", borderColor: BORDER, borderRadius: "{primitives.radius.md}" },
        children: [
          text("navbar-title", "Sales Invoices", { fontSize: "text-xl", fontWeight: 600 }),
          {
            id: "navbar-actions",
            type: "Toolbar",
            style: { display: "flex", alignItems: "center", gap: "gap-2" },
            children: [
              { id: "navbar-export", type: "Button", props: { label: "Export" } },
              { id: "navbar-new", type: "Button", props: { label: "New", variant: "primary" } },
            ],
          },
        ],
      },
    ]),
    specimen("toolbar", "Toolbar", "A `flex items-center gap-2` action strip", [
      {
        id: "toolbar-demo",
        type: "Toolbar",
        children: [
          { id: "tb-filter", type: "Button", props: { label: "Filter" } },
          { id: "tb-sort", type: "Button", props: { label: "Sort" } },
          { id: "tb-print", type: "Button", props: { label: "Print" } },
        ],
      },
    ]),
    specimen("sidebar", "Sidebar", "Sidebar — w-sidebar (14rem), gray-25, h-10 rows, border-s-4 active bar", [
      {
        id: "sidebar-demo",
        type: "Sidebar",
        style: { borderWidth: "border", borderColor: BORDER, borderRadius: "{primitives.radius.md}" },
        children: [
          text("sidebar-company", "Meridian Trading Co.", { padding: "px-4", fontWeight: 600, marginBottom: "mb-4" }),
          {
            ...text("sidebar-item-1", "Dashboard", {
              display: "flex",
              alignItems: "center",
              height: "h-10",
              padding: "px-4",
              fontSize: "text-lg",
            }),
            // Sidebar's active row: gray-100 fill plus a 4px gray-800 bar on the start edge.
            props: { value: "Dashboard", className: "bg-gray-100 border-s-4 border-gray-800 dark:bg-gray-875 dark:border-gray-100" },
          },
          text("sidebar-item-2", "Sales", { display: "flex", alignItems: "center", height: "h-10", padding: "px-4", fontSize: "text-lg", color: TEXT_SECONDARY }),
          text("sidebar-item-3", "Purchases", { display: "flex", alignItems: "center", height: "h-10", padding: "px-4", fontSize: "text-lg", color: TEXT_SECONDARY }),
        ],
      },
    ]),
  ]);
}

function overlayDocument(): UIDLDocument {
  return galleryDocument(
    "gallery-overlay",
    "Overlays",
    [
      specimen("dialog", "Dialog & Snackbar", "Modal's `.backdrop` (10% black + 2px blur) and Toast's w-toast card", [
        {
          id: "overlay-actions",
          type: "Toolbar",
          style: { display: "flex", alignItems: "center", gap: "gap-2" },
          children: [
            {
              id: "open-dialog",
              type: "Button",
              props: { label: "Show dialog", variant: "primary" },
              events: {
                onClick: [
                  { showDialog: { title: "Submit invoice?", content: "Submitted documents can no longer be edited." } },
                ],
              },
            },
            {
              id: "open-snackbar",
              type: "Button",
              props: { label: "Show snackbar" },
              events: { onClick: [{ showSnackbar: { message: "Invoice SINV-2027-00001 submitted." } }] },
            },
          ],
        },
      ]),
      specimen("drawer", "Drawer & Panel", "State-bound overlays: `open` is $bound to state.overlays.*", [
        {
          id: "drawer-actions",
          type: "Toolbar",
          style: { display: "flex", alignItems: "center", gap: "gap-2" },
          children: [
            {
              id: "open-drawer",
              type: "Button",
              props: { label: "Open drawer" },
              events: { onClick: [{ setState: { path: "overlays.detail", value: true } }] },
            },
            {
              id: "open-panel",
              type: "Button",
              props: { label: "Open panel" },
              events: { onClick: [{ setState: { path: "overlays.filters", value: true } }] },
            },
          ],
        },
        {
          id: "detail-drawer",
          type: "Drawer",
          props: { open: { $bind: "state.overlays.detail" }, title: "SINV-2027-00001", side: "right" },
          events: { onClose: [{ setState: { path: "overlays.detail", value: false } }] },
          children: [
            meridianFormRow("drawer-row-party", "Customer", text("drawer-party", "PT Sinar Abadi Jaya")),
            meridianFormRow("drawer-row-total", "Grand Total", text("drawer-total", "Rp 34.132.500")),
            meridianFormRow("drawer-row-status", "Status", {
              id: "drawer-status",
              type: "Badge",
              props: { label: "Paid", color: "green", variant: "pill" },
            }),
          ],
        },
        {
          id: "filter-panel",
          type: "Panel",
          props: { open: { $bind: "state.overlays.filters" } },
          events: { onClose: [{ setState: { path: "overlays.filters", value: false } }] },
          children: [
            {
              id: "filter-panel-card",
              type: "Column",
              style: {
                width: "w-form",
                maxWidth: "max-w-full",
                background: "{primitives.color.surface-elevated}",
                borderWidth: "border",
                borderColor: BORDER,
                borderRadius: "rounded-lg",
                shadow: "{primitives.shadow.lg}",
              },
              children: [
                text("filter-title", "Filters", {
                  display: "flex",
                  alignItems: "center",
                  height: "h-row-large",
                  padding: "px-4",
                  fontSize: "text-xl",
                  fontWeight: 600,
                  borderWidth: "border-b",
                  borderColor: BORDER,
                }),
                meridianFormRow("filter-row-status", "Status", {
                  id: "filter-status",
                  type: "Select",
                  props: {
                    border: false,
                    size: "small",
                    "aria-label": "Status filter",
                    value: { $bind: "state.filterStatus" },
                    options: [
                      { value: "Unpaid", label: "Unpaid" },
                      { value: "Paid", label: "Paid" },
                    ],
                  },
                  events: { onChange: [{ setState: { path: "filterStatus", value: null } }] },
                }),
                {
                  id: "filter-actions",
                  type: "Toolbar",
                  style: { display: "flex", justifyContent: "end", gap: "gap-2", padding: "p-4" },
                  children: [
                    {
                      id: "filter-close",
                      type: "Button",
                      props: { label: "Close" },
                      events: { onClick: [{ setState: { path: "overlays.filters", value: false } }] },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    ],
    { state: { overlays: { detail: false, filters: false }, filterStatus: "Unpaid" } },
  );
}

const BUILDERS: Record<GalleryCategory, () => UIDLDocument> = {
  layout: layoutDocument,
  base: baseDocument,
  form: formDocument,
  data: dataDocument,
  navigation: navigationDocument,
  overlay: overlayDocument,
};

export const GALLERY_SECTIONS: Array<{ id: GalleryCategory; label: string }> = [
  { id: "layout", label: "Layout" },
  { id: "base", label: "Typography & Base" },
  { id: "form", label: "Form Controls" },
  { id: "data", label: "Data Display" },
  { id: "navigation", label: "Navigation" },
  { id: "overlay", label: "Overlays" },
];

export function buildGalleryDocument(category: GalleryCategory): UIDLDocument {
  return BUILDERS[category]();
}

/** `/gallery/<category>` -> the category to render, defaulting to the first section. */
export function parseGalleryCategory(path: string): GalleryCategory {
  const segment = path.split("/").filter(Boolean)[1];
  return GALLERY_SECTIONS.find((section) => section.id === segment)?.id ?? "layout";
}
