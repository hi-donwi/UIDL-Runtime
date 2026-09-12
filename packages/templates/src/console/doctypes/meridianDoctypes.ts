import type { DoctypeMeta } from "../../domain/doctypes/types";

/**
 * Meridian (core accounting) Sales Invoice metadata — enough for the state machine so the
 * Meridian invoice form's Submit button can drive a real `transition` mutation
 * (Draft → Unpaid, `posting: true`), routed to `meridianSalesInvoiceService.postSalesInvoiceVoucher`
 * by `transitionPostingDispatcher`.
 */
export const SALES_INVOICE_META: DoctypeMeta = {
  name: "SalesInvoice",
  label: { id: "Faktur Penjualan", en: "Sales Invoice" },
  module: "Accounts",
  naming: "SINV-.YYYY.-.#####",
  titleField: "customerName",
  fields: [
    { key: "id", label: { id: "Nomor Faktur", en: "Invoice No" }, widget: "TextField", readOnly: true },
    { key: "customerName", label: { id: "Pelanggan", en: "Customer" }, widget: "TextField", required: true },
    { key: "date", label: { id: "Tanggal", en: "Date" }, widget: "Date" },
    { key: "dueDate", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date" },
    { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency", required: true },
    { key: "subtotal", label: { id: "Subtotal", en: "Subtotal" }, widget: "Currency" },
    { key: "tax", label: { id: "PPN", en: "Tax" }, widget: "Currency" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Overdue", label: "Overdue" },
        { value: "Paid", label: "Paid" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-40" },
      { field: "customerName" },
      { field: "date" },
      { field: "total", align: "right" },
      { field: "status", align: "center" },
    ],
    defaultSort: { field: "date", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Unpaid", "Overdue", "Paid", "Cancelled"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Submit Faktur", en: "Submit" }, from: ["Draft"], to: "Unpaid", posting: true },
      { name: "cancel", label: { id: "Batalkan Faktur", en: "Cancel" }, from: ["Unpaid", "Overdue"], to: "Cancelled", posting: true },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

/**
 * Meridian Purchase Receipt metadata — the goods-in leg. `receive` (Draft → Submitted,
 * `posting: true`) is routed to `meridianPurchaseReceiptService.postPurchaseReceiptStock` by
 * `transitionPostingDispatcher`, which posts one 1140 / 2150 GRNI movement per line.
 */
export const PURCHASE_RECEIPT_META: DoctypeMeta = {
  name: "PurchaseReceipt",
  label: { id: "Penerimaan Barang", en: "Purchase Receipt" },
  module: "Stock",
  naming: "PREC-.YYYY.-.#####",
  titleField: "id",
  fields: [
    { key: "id", label: { id: "Nomor", en: "Receipt No" }, widget: "TextField", readOnly: true },
    { key: "purchaseInvoice", label: { id: "Faktur Pembelian", en: "Purchase Invoice" }, widget: "TextField" },
    { key: "supplierName", label: { id: "Pemasok", en: "Supplier" }, widget: "TextField" },
    { key: "date", label: { id: "Tanggal", en: "Date" }, widget: "Date" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
      ],
    },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-40" },
      { field: "purchaseInvoice" },
      { field: "supplierName" },
      { field: "date" },
      { field: "status", align: "center" },
    ],
    defaultSort: { field: "date", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Submitted"],
    initial: "Draft",
    transitions: [
      { name: "receive", label: { id: "Terima Barang", en: "Receive Stock" }, from: ["Draft"], to: "Submitted", posting: true },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

/**
 * Meridian Purchase Invoice metadata — the buy-side mirror of `SALES_INVOICE_META`. Submit
 * (Draft → Unpaid, `posting: true`) is routed to
 * `meridianPurchaseInvoiceService.postPurchaseInvoiceVoucher` by `transitionPostingDispatcher`.
 */
export const PURCHASE_INVOICE_META: DoctypeMeta = {
  name: "PurchaseInvoice",
  label: { id: "Faktur Pembelian", en: "Purchase Invoice" },
  module: "Accounts",
  naming: "PINV-.YYYY.-.#####",
  titleField: "supplierName",
  fields: [
    { key: "id", label: { id: "Nomor Faktur", en: "Invoice No" }, widget: "TextField", readOnly: true },
    { key: "supplierName", label: { id: "Pemasok", en: "Supplier" }, widget: "TextField", required: true },
    { key: "date", label: { id: "Tanggal", en: "Date" }, widget: "Date" },
    { key: "dueDate", label: { id: "Jatuh Tempo", en: "Due Date" }, widget: "Date" },
    { key: "total", label: { id: "Total", en: "Total" }, widget: "Currency", required: true },
    { key: "subtotal", label: { id: "Subtotal", en: "Subtotal" }, widget: "Currency" },
    { key: "tax", label: { id: "PPN", en: "Tax" }, widget: "Currency" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Overdue", label: "Overdue" },
        { value: "Paid", label: "Paid" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-40" },
      { field: "supplierName" },
      { field: "date" },
      { field: "total", align: "right" },
      { field: "status", align: "center" },
    ],
    defaultSort: { field: "date", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Unpaid", "Overdue", "Paid", "Cancelled"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Submit Faktur", en: "Submit" }, from: ["Draft"], to: "Unpaid", posting: true },
      { name: "cancel", label: { id: "Batalkan Faktur", en: "Cancel" }, from: ["Unpaid", "Overdue"], to: "Cancelled", posting: true },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};

/**
 * Meridian ad-hoc Journal Entry metadata. `submit` (Draft → Submitted) and `cancel`
 * (Submitted → Cancelled), both `posting: true`, routed to `meridianJournalEntryService`
 * by `transitionPostingDispatcher` — the service validates the double-entry and posts the
 * lines (or their mirror) to the `GeneralLedger`.
 */
export const JOURNAL_ENTRY_META: DoctypeMeta = {
  name: "JournalEntry",
  label: { id: "Jurnal Umum", en: "Journal Entry" },
  module: "Accounts",
  naming: "JV-.YYYY.-.#####",
  titleField: "narration",
  fields: [
    { key: "id", label: { id: "Nomor Voucher", en: "Voucher No" }, widget: "TextField", readOnly: true },
    { key: "date", label: { id: "Tanggal", en: "Date" }, widget: "Date" },
    { key: "entryType", label: { id: "Tipe", en: "Entry Type" }, widget: "TextField" },
    { key: "narration", label: { id: "Keterangan", en: "Narration" }, widget: "Textarea" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-40" },
      { field: "date" },
      { field: "entryType" },
      { field: "narration" },
      { field: "status", align: "center" },
    ],
    defaultSort: { field: "date", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Submitted", "Cancelled"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Submit Jurnal", en: "Submit" }, from: ["Draft"], to: "Submitted", posting: true },
      { name: "cancel", label: { id: "Batalkan Jurnal", en: "Cancel" }, from: ["Submitted"], to: "Cancelled", posting: true },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
  },
};
