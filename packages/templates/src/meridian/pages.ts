import type { UIDLDocument } from "~/types";
import {
  buildFlatFormDocument,
  buildInvoiceFormDocument,
  buildJournalEntryFormDocument,
  buildListDocument,
  buildQueryListDocument,
  button,
  transitionButton,
  formatIDR,
  type FormField,
  type ListColumn,
} from "./buildDocument";
import {
  accountingDimensions,
  boms,
  couponCodes,
  creditNotes,
  customers,
  deliveryNotes,
  items,
  jobCards,
  journalEntries,
  leads,
  loyaltyPrograms,
  manufacturingPlans,
  materialRequests,
  payments,
  pricingRules,
  priceLists,
  procurementTracker,
  projectSummaries,
  purchaseInvoices,
  purchaseOrders,
  purchaseReceipts,
  qualityInspections,
  rfqs,
  salesInvoices,
  salesLifecycleTracker,
  salesOrders,
  salesQuotes,
  printTemplates,
  shipments,
  stockMovements,
  supplierQuotations,
  supplierScorecards,
  suppliers,
  supportTickets,
  taxTemplates,
  workOrders,
  numberSeries,
  itemGroups,
  unitsOfMeasure,
  addresses,
  locations,
  batches,
  serialNumbers,
  paymentMethods,
  posProfiles,
  type Customer,
  type Supplier,
} from "./mockData";
import { customerOutstanding, supplierOutstanding } from "./ledger";
import { MERIDIAN_JOURNAL_ENTRY_ROWS } from "../mock-data/generators/meridianJournalEntries";
import {
  createInMemoryCounterStore,
  createLocalStorageCounterStore,
  nextDocumentNumber,
} from "../domain/services/numberingService";

export interface PageRegistryEntry {
  list: () => UIDLDocument;
  form: (id: string) => UIDLDocument | undefined;
  /** Route for the doctype's "+ New" flow, shown as a shell-level navbar action — mirrors
   *  Meridian's PageHeader right slot (e.g. ListView's "+ New" button). Omitted for
   *  doctypes with no create flow, matching the doctypes that never passed `newRoute` to
   *  `buildListDocument` either. */
  newRoute?: string;
}

const registry: Record<string, PageRegistryEntry> = {};

const meridianNumberStore =
  typeof window !== "undefined"
    ? createLocalStorageCounterStore("meridian-number-series")
    : createInMemoryCounterStore();

export function getNextMeridianDocNumber(collection: string, defaultPattern: string): string {
  const matched = numberSeries.find((ns) => ns.id === collection || ns.prefix.toLowerCase().startsWith(collection.toLowerCase().slice(0, 3)));
  const pattern = matched ? `${matched.prefix}.#####` : defaultPattern;
  return nextDocumentNumber(collection, pattern, meridianNumberStore);
}

function statusOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

// ---------------------------------------------------------------------------
// Customer / Supplier (both views over Party in real Meridian)
// ---------------------------------------------------------------------------

function partyFields(party: Customer | Supplier): FormField[] {
  return [
    { key: "name", label: "Name", widget: "TextField", value: party.name },
    { key: "email", label: "Email", widget: "TextField", value: party.email },
    { key: "phone", label: "Phone", widget: "TextField", value: party.phone },
    { key: "city", label: "City", widget: "TextField", value: party.city },
  ];
}

registry.Customer = {
  list: () =>
    buildListDocument({
      docId: "meridian-customer-list",
      title: "Customers",
      columns: [
        { key: "name", label: "Customer" },
        { key: "email", label: "Email" },
        { key: "city", label: "City" },
        { key: "outstanding", label: "Outstanding", align: "right" },
      ],
      records: customers.map((customer) => ({
        route: `/meridian/edit/Customer/${customer.id}`,
        cells: {
          name: customer.name,
          email: customer.email,
          city: customer.city,
          outstanding: formatIDR(customerOutstanding(customer.id)),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-customer-new",
        title: "New Customer",
        fields: partyFields({ id: "", name: "", email: "", phone: "", city: "" }),
        listRoute: "/meridian/list/Customer",
      });
    }
    const customer = customers.find((candidate) => candidate.id === id);
    if (!customer) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-customer-${id}`,
      title: `Customer: ${customer.name}`,
      fields: partyFields(customer),
      listRoute: "/meridian/list/Customer",
    });
  },
  newRoute: "/meridian/edit/Customer/new",
};

registry.Supplier = {
  list: () =>
    buildListDocument({
      docId: "meridian-supplier-list",
      title: "Suppliers",
      columns: [
        { key: "name", label: "Supplier" },
        { key: "email", label: "Email" },
        { key: "city", label: "City" },
        { key: "outstanding", label: "Outstanding", align: "right" },
      ],
      records: suppliers.map((supplier) => ({
        route: `/meridian/edit/Supplier/${supplier.id}`,
        cells: {
          name: supplier.name,
          email: supplier.email,
          city: supplier.city,
          outstanding: formatIDR(supplierOutstanding(supplier.id)),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-supplier-new",
        title: "New Supplier",
        fields: partyFields({ id: "", name: "", email: "", phone: "", city: "" }),
        listRoute: "/meridian/list/Supplier",
      });
    }
    const supplier = suppliers.find((candidate) => candidate.id === id);
    if (!supplier) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-supplier-${id}`,
      title: `Supplier: ${supplier.name}`,
      fields: partyFields(supplier),
      listRoute: "/meridian/list/Supplier",
    });
  },
  newRoute: "/meridian/edit/Supplier/new",
};

// "Party" (Common group) lists both customers and suppliers together, like the real Meridian app.
registry.Party = {
  list: () =>
    buildListDocument({
      docId: "meridian-party-list",
      title: "Party",
      columns: [
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "city", label: "City" },
      ],
      records: [
        ...customers.map((customer) => ({ route: `/meridian/edit/Customer/${customer.id}`, cells: { name: customer.name, role: "Customer", city: customer.city } })),
        ...suppliers.map((supplier) => ({ route: `/meridian/edit/Supplier/${supplier.id}`, cells: { name: supplier.name, role: "Supplier", city: supplier.city } })),
      ],
    }),
  form: () => undefined,
};

// ---------------------------------------------------------------------------
// Item (Common), Sales Items, Purchase Items — three filtered views over Item
// ---------------------------------------------------------------------------

function itemColumns(): ListColumn[] {
  return [
    { key: "name", label: "Item" },
    { key: "group", label: "Group" },
    { key: "unit", label: "Unit" },
    { key: "rate", label: "Rate", align: "right" },
  ];
}

function itemFields(item: (typeof items)[number]): FormField[] {
  return [
    { key: "name", label: "Item Name", widget: "TextField", value: item.name },
    { key: "unit", label: "Unit", widget: "TextField", value: item.unit },
    { key: "rate", label: "Rate", widget: "TextField", value: String(item.rate) },
    { key: "for", label: "For", widget: "Select", value: item.for, options: statusOptions(["Sales", "Purchases", "Both"]) },
    { key: "group", label: "Item Group", widget: "TextField", value: item.group },
  ];
}

function buildItemListDocument(docId: string, title: string, filtered: typeof items) {
  return buildListDocument({
    docId,
    title,
    columns: itemColumns(),
    records: filtered.map((item) => ({
      route: `/meridian/edit/Item/${item.id}`,
      cells: { name: item.name, group: item.group, unit: item.unit, rate: formatIDR(item.rate) },
    })),
  });
}

function itemForm(id: string, listRoute: string) {
  if (id === "new") {
    return buildFlatFormDocument({
      docId: "meridian-item-new",
      title: "New Item",
      fields: itemFields({ id: "", name: "", unit: "Nos", rate: 0, for: "Both", group: "Products" }),
      listRoute,
    });
  }
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return undefined;
  return buildFlatFormDocument({
    docId: `meridian-item-${id}`,
    title: `Item: ${item.name}`,
    fields: itemFields(item),
    listRoute,
  });
}

registry.Item = {
  list: () => buildItemListDocument("meridian-item-list", "Items", items),
  form: (id) => itemForm(id, "/meridian/list/Item"),
  newRoute: "/meridian/edit/Item/new",
};
registry.SalesItem = {
  list: () => buildItemListDocument("meridian-sales-item-list", "Sales Items", items.filter((item) => item.for !== "Purchases")),
  form: (id) => itemForm(id, "/meridian/list/SalesItem"),
  newRoute: "/meridian/edit/Item/new",
};
registry.PurchaseItem = {
  list: () => buildItemListDocument("meridian-purchase-item-list", "Purchase Items", items.filter((item) => item.for !== "Sales")),
  form: (id) => itemForm(id, "/meridian/list/PurchaseItem"),
  newRoute: "/meridian/edit/Item/new",
};

// ---------------------------------------------------------------------------
// Sales Invoice / Purchase Invoice
// ---------------------------------------------------------------------------

registry.SalesInvoice = {
  // The first Meridian list migrated onto the $query data seam (see
  // buildQueryListDocument in buildDocument.ts) instead of baking `salesInvoices` into the
  // document at build time. Rows now come from the adapter configured in
  // packages/templates/src/config/data.config.ts — in-memory today, a real API later, with no change here.
  list: () =>
    buildQueryListDocument({
      docId: "meridian-sales-invoice-list",
      title: "Sales Invoices",
      collection: "SalesInvoice",
      columns: [
        { key: "id", label: "Invoice" },
        { key: "customerName", label: "Customer" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right" },
      ],
      sort: [{ field: "date", dir: "desc" }],
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("SalesInvoice", "SINV-.YYYY.-.#####");
      return buildInvoiceFormDocument({
        docId: "meridian-sales-invoice-new",
        title: "New Sales Invoice",
        headerActions: [],
        extraActions: [],
        headerFields: [
          { key: "id", label: "Invoice No.", widget: "TextField", value: newId },
          { key: "customer", label: "Customer", widget: "TextField", value: customers[0]?.name ?? "" },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
          { key: "dueDate", label: "Due Date", widget: "TextField", value: "2026-09-22" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Unpaid", "Paid", "Overdue"]) },
        ],
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        formatMoney: formatIDR,
        listRoute: "/meridian/list/SalesInvoice",
      });
    }
    const invoice = salesInvoices.find((candidate) => candidate.id === id);
    if (!invoice) return undefined;
    const customer = customers.find((candidate) => candidate.id === invoice.customer);
    return buildInvoiceFormDocument({
      docId: `meridian-sales-invoice-${id}`,
      title: `Sales Invoice: ${invoice.id}`,
      headerActions: [
        button("print-fp-btn", "Cetak Faktur Pajak", `/meridian/print/tax-invoice/SalesInvoice/${invoice.id}`, "primary", "printer"),
        button("print-std-btn", "Cetak Invoice", `/meridian/print/standard-invoice/SalesInvoice/${invoice.id}`, "secondary", "printer"),
      ],
      extraActions: [
        // Both lifecycle actions are always offered; the SalesInvoice state machine
        // (meridianDoctypes.ts) rejects an invalid one server-side and surfaces it as a form
        // error, because this sync form builder can't re-read the adapter's live status.
        transitionButton("submit-invoice-btn", "Submit", "SalesInvoice", "submit", "/meridian/list/SalesInvoice"),
        transitionButton("cancel-invoice-btn", "Cancel Invoice", "SalesInvoice", "cancel", "/meridian/list/SalesInvoice", "secondary"),
        button("pay-btn", "Catat Pembayaran (+ Payment)", `/meridian/edit/SalesPayment/new`, "primary"),
        button("cn-btn", "Buat Retur (Credit Note)", `/meridian/edit/CreditNote/new`),
        button("dn-btn", "Lihat Surat Jalan", `/meridian/list/DeliveryNote`),
      ],
      headerFields: [
        { key: "id", label: "Invoice No.", widget: "TextField", value: invoice.id },
        { key: "customer", label: "Customer", widget: "TextField", value: customer?.name ?? invoice.customer },
        { key: "date", label: "Date", widget: "TextField", value: invoice.date },
        { key: "dueDate", label: "Due Date", widget: "TextField", value: invoice.dueDate },
        { key: "status", label: "Status", widget: "Select", value: invoice.status, options: statusOptions(["Draft", "Unpaid", "Paid", "Overdue"]) },
      ],
      lines: invoice.lines.map((line) => ({ item: line.item, description: line.description, quantity: line.quantity, rate: line.rate, amount: line.amount })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      formatMoney: formatIDR,
      listRoute: "/meridian/list/SalesInvoice",
    });
  },
  newRoute: "/meridian/edit/SalesInvoice/new",
};

registry.CreditNote = {
  list: () =>
    buildListDocument({
      docId: "meridian-credit-note-list",
      title: "Credit Notes",
      columns: [
        { key: "id", label: "Credit Note" },
        { key: "invoice", label: "Invoice Ref" },
        { key: "customer", label: "Customer" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right" },
      ],
      records: creditNotes.map((cn) => ({
        route: `/meridian/edit/CreditNote/${cn.id}`,
        cells: {
          id: cn.id,
          invoice: cn.invoice,
          customer: customers.find((c) => c.id === cn.customer)?.name ?? cn.customer,
          date: cn.date,
          status: cn.status,
          total: formatIDR(cn.total),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("CreditNote", "CN-.YYYY.-.#####");
      return buildInvoiceFormDocument({
        docId: "meridian-credit-note-new",
        title: "New Credit Note",
        headerActions: [],
        extraActions: [],
        headerFields: [
          { key: "id", label: "Credit Note No.", widget: "TextField", value: newId },
          { key: "invoice", label: "Original Invoice", widget: "TextField", value: salesInvoices[0]?.id ?? "" },
          { key: "customer", label: "Customer", widget: "TextField", value: customers[0]?.name ?? "" },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
          { key: "reason", label: "Reason / Narration", widget: "TextField", value: "Customer return / quality adjustment" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Submitted", "Applied"]) },
        ],
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        formatMoney: formatIDR,
        listRoute: "/meridian/list/CreditNote",
      });
    }
    const cn = creditNotes.find((candidate) => candidate.id === id);
    if (!cn) return undefined;
    const customer = customers.find((candidate) => candidate.id === cn.customer);
    return buildInvoiceFormDocument({
      docId: `meridian-credit-note-${id}`,
      title: `Credit Note: ${cn.id}`,
      headerActions: [
        button("print-fp-btn", "Cetak Faktur Retur", `/meridian/print/tax-invoice/CreditNote/${cn.id}`, "primary", "printer"),
      ],
      extraActions: [
        button("view-si-btn", "Lihat Invoice Sumber", `/meridian/edit/SalesInvoice/${cn.invoice}`),
      ],
      headerFields: [
        { key: "id", label: "Credit Note No.", widget: "TextField", value: cn.id },
        { key: "invoice", label: "Original Invoice", widget: "TextField", value: cn.invoice },
        { key: "customer", label: "Customer", widget: "TextField", value: customer?.name ?? cn.customer },
        { key: "date", label: "Date", widget: "TextField", value: cn.date },
        { key: "reason", label: "Reason / Narration", widget: "TextField", value: cn.reason },
        { key: "status", label: "Status", widget: "Select", value: cn.status, options: statusOptions(["Draft", "Submitted", "Applied"]) },
      ],
      lines: cn.lines.map((line) => ({ item: line.item, description: line.description, quantity: line.quantity, rate: line.rate, amount: line.amount })),
      subtotal: cn.subtotal,
      tax: cn.tax,
      total: cn.total,
      formatMoney: formatIDR,
      listRoute: "/meridian/list/CreditNote",
    });
  },
  newRoute: "/meridian/edit/CreditNote/new",
};

registry.PurchaseInvoice = {
  list: () =>
    buildListDocument({
      docId: "meridian-purchase-invoice-list",
      title: "Purchase Invoices",
      columns: [
        { key: "id", label: "Invoice" },
        { key: "supplier", label: "Supplier" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right" },
      ],
      records: purchaseInvoices.map((invoice) => ({
        route: `/meridian/edit/PurchaseInvoice/${invoice.id}`,
        cells: {
          id: invoice.id,
          supplier: suppliers.find((s) => s.id === invoice.supplier)?.name ?? invoice.supplier,
          date: invoice.date,
          status: invoice.status,
          total: formatIDR(invoice.total),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("PurchaseInvoice", "PINV-.YYYY.-.#####");
      return buildInvoiceFormDocument({
        docId: "meridian-purchase-invoice-new",
        title: "New Purchase Invoice",
        headerActions: [],
        extraActions: [],
        headerFields: [
          { key: "id", label: "Invoice No.", widget: "TextField", value: newId },
          { key: "supplier", label: "Supplier", widget: "TextField", value: suppliers[0]?.name ?? "" },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
          { key: "dueDate", label: "Due Date", widget: "TextField", value: "2026-09-22" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Unpaid", "Paid", "Overdue"]) },
        ],
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        formatMoney: formatIDR,
        listRoute: "/meridian/list/PurchaseInvoice",
      });
    }
    const invoice = purchaseInvoices.find((candidate) => candidate.id === id);
    if (!invoice) return undefined;
    const supplier = suppliers.find((candidate) => candidate.id === invoice.supplier);
    return buildInvoiceFormDocument({
      docId: `meridian-purchase-invoice-${id}`,
      title: `Purchase Invoice: ${invoice.id}`,
      headerActions: [
        button("print-pi-btn", "Cetak Faktur", `/meridian/print/tax-invoice/PurchaseInvoice/${invoice.id}`, "primary", "printer"),
      ],
      extraActions: [
        // Both lifecycle actions are always offered; the PurchaseInvoice state machine
        // (meridianDoctypes.ts) rejects an invalid one server-side and surfaces it as a form
        // error, because this sync form builder can't re-read the adapter's live status.
        transitionButton("submit-pinv-btn", "Submit", "PurchaseInvoice", "submit", "/meridian/list/PurchaseInvoice"),
        transitionButton("cancel-pinv-btn", "Cancel Invoice", "PurchaseInvoice", "cancel", "/meridian/list/PurchaseInvoice", "secondary"),
        button("pay-btn", "Bayar Tagihan (+ Payment)", `/meridian/edit/PurchasePayment/new`, "primary"),
        button("pr-btn", "Lihat Penerimaan Barang", `/meridian/list/PurchaseReceipt`),
      ],
      headerFields: [
        { key: "id", label: "Invoice No.", widget: "TextField", value: invoice.id },
        { key: "supplier", label: "Supplier", widget: "TextField", value: supplier?.name ?? invoice.supplier },
        { key: "date", label: "Date", widget: "TextField", value: invoice.date },
        { key: "dueDate", label: "Due Date", widget: "TextField", value: invoice.dueDate },
        { key: "status", label: "Status", widget: "Select", value: invoice.status, options: statusOptions(["Draft", "Unpaid", "Paid", "Overdue"]) },
      ],
      lines: invoice.lines.map((line) => ({ item: line.item, description: line.description, quantity: line.quantity, rate: line.rate, amount: line.amount })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      formatMoney: formatIDR,
      listRoute: "/meridian/list/PurchaseInvoice",
    });
  },
  newRoute: "/meridian/edit/PurchaseInvoice/new",
};

// ---------------------------------------------------------------------------
// Sales Quote
// ---------------------------------------------------------------------------

registry.SalesQuote = {
  list: () =>
    buildListDocument({
      docId: "meridian-sales-quote-list",
      title: "Sales Quotes",
      columns: [
        { key: "id", label: "Quote" },
        { key: "customer", label: "Customer" },
        { key: "validTill", label: "Valid Till" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right" },
      ],
      records: salesQuotes.map((quote) => ({
        route: `/meridian/edit/SalesQuote/${quote.id}`,
        cells: {
          id: quote.id,
          customer: customers.find((c) => c.id === quote.customer)?.name ?? quote.customer,
          validTill: quote.validTill,
          status: quote.status,
          total: formatIDR(quote.total),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("SalesQuote", "SQ-.YYYY.-.#####");
      return buildInvoiceFormDocument({
        docId: "meridian-sales-quote-new",
        title: "New Sales Quote",
        headerActions: [],
        extraActions: [],
        headerFields: [
          { key: "id", label: "Quote No.", widget: "TextField", value: newId },
          { key: "customer", label: "Customer", widget: "TextField", value: customers[0]?.name ?? "" },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
          { key: "validTill", label: "Valid Till", widget: "TextField", value: "2026-09-22" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Submitted", "Expired"]) },
        ],
        lines: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        formatMoney: formatIDR,
        listRoute: "/meridian/list/SalesQuote",
      });
    }
    const quote = salesQuotes.find((candidate) => candidate.id === id);
    if (!quote) return undefined;
    const customer = customers.find((candidate) => candidate.id === quote.customer);
    return buildInvoiceFormDocument({
      docId: `meridian-sales-quote-${id}`,
      title: `Sales Quote: ${quote.id}`,
      headerActions: [
        button("print-sq-btn", "Cetak Penawaran", `/meridian/print/quotation/SalesQuote/${quote.id}`, "primary", "printer"),
      ],
      extraActions: [
        button("convert-si-btn", "Convert to Sales Invoice", `/meridian/edit/SalesInvoice/new`, "primary"),
        button("convert-so-btn", "Convert to Sales Order", `/meridian/edit/SalesOrder/new`),
      ],
      headerFields: [
        { key: "id", label: "Quote No.", widget: "TextField", value: quote.id },
        { key: "customer", label: "Customer", widget: "TextField", value: customer?.name ?? quote.customer },
        { key: "date", label: "Date", widget: "TextField", value: quote.date },
        { key: "validTill", label: "Valid Till", widget: "TextField", value: quote.validTill },
        { key: "status", label: "Status", widget: "Select", value: quote.status, options: statusOptions(["Draft", "Submitted", "Expired"]) },
      ],
      lines: quote.lines.map((line) => ({ item: line.item, description: line.description, quantity: line.quantity, rate: line.rate, amount: line.amount })),
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      formatMoney: formatIDR,
      listRoute: "/meridian/list/SalesQuote",
    });
  },
  newRoute: "/meridian/edit/SalesQuote/new",
};

registry.SalesLifecycleTracker = {
  list: () =>
    buildListDocument({
      docId: "meridian-sales-lifecycle-tracker-list",
      title: "Quote-to-Cash Tracker",
      columns: [
        { key: "quotation", label: "Quotation" },
        { key: "salesOrder", label: "Sales Order" },
        { key: "delivery", label: "Delivery" },
        { key: "invoice", label: "Invoice" },
        { key: "value", label: "Value", align: "right" },
      ],
      records: salesLifecycleTracker.map((row) => ({
        route: `/meridian/edit/SalesLifecycleTracker/${row.id}`,
        cells: {
          quotation: row.quotation,
          salesOrder: row.salesOrder,
          delivery: row.delivery,
          invoice: row.invoice,
          value: formatIDR(row.value),
        },
      })),
    }),
  form: (id) => {
    const row = salesLifecycleTracker.find((candidate) => candidate.id === id);
    if (!row) return undefined;

    return buildFlatFormDocument({
      docId: `meridian-sales-lifecycle-tracker-${id}`,
      title: `Quote-to-Cash Tracker: ${row.id}`,
      fields: [
        { key: "quotation", label: "Quotation", widget: "TextField", value: row.quotation },
        { key: "salesOrder", label: "Sales Order", widget: "TextField", value: row.salesOrder },
        { key: "delivery", label: "Delivery", widget: "Select", value: row.delivery, options: statusOptions(["Delivered", "Reserved Batch", "Material Request", "Pending Delivery"]) },
        { key: "invoice", label: "Invoice", widget: "TextField", value: row.invoice },
        { key: "paymentReminder", label: "Payment Reminder", widget: "Select", value: row.paymentReminder, options: statusOptions(["Email", "WhatsApp", "Telegram", "None"]) },
        { key: "value", label: "Lifecycle Value", widget: "TextField", value: formatIDR(row.value) },
      ],
      listRoute: "/meridian/list/SalesLifecycleTracker",
    });
  },
};

// ---------------------------------------------------------------------------
// Sales Payment / Purchase Payment (both views over Payment)
// ---------------------------------------------------------------------------

function paymentColumns(): ListColumn[] {
  return [
    { key: "id", label: "Payment" },
    { key: "party", label: "Party" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
    { key: "amount", label: "Amount", align: "right" },
  ];
}

function partyName(id: string, partyType: "Customer" | "Supplier"): string {
  if (partyType === "Customer") return customers.find((c) => c.id === id)?.name ?? id;
  return suppliers.find((s) => s.id === id)?.name ?? id;
}

function paymentForm(id: string, listRoute: string) {
  if (id === "new") {
    const newId = getNextMeridianDocNumber("Payment", "PAY-.YYYY.-.#####");
    return buildFlatFormDocument({
      docId: "meridian-payment-new",
      title: "New Payment",
      fields: [
        { key: "id", label: "Payment No.", widget: "TextField", value: newId },
        { key: "party", label: "Party", widget: "TextField", value: "" },
        { key: "type", label: "Type", widget: "Select", value: listRoute.includes("Sales") ? "Receive" : "Pay", options: statusOptions(["Receive", "Pay"]) },
        { key: "amount", label: "Amount", widget: "TextField", value: "0" },
        { key: "method", label: "Method", widget: "Select", value: "Bank Transfer", options: statusOptions(["Cash", "Bank Transfer", "Card"]) },
        { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
        { key: "reference", label: "Reference", widget: "TextField", value: "" },
      ],
      listRoute,
    });
  }
  const payment = payments.find((candidate) => candidate.id === id);
  if (!payment) return undefined;
  return buildFlatFormDocument({
    docId: `meridian-payment-${id}`,
    title: `Payment: ${payment.id}`,
    fields: [
      { key: "party", label: "Party", widget: "TextField", value: partyName(payment.party, payment.partyType) },
      { key: "type", label: "Type", widget: "Select", value: payment.type, options: statusOptions(["Receive", "Pay"]) },
      { key: "amount", label: "Amount", widget: "TextField", value: formatIDR(payment.amount) },
      { key: "method", label: "Method", widget: "Select", value: payment.method, options: statusOptions(["Cash", "Bank Transfer", "Card"]) },
      { key: "date", label: "Date", widget: "TextField", value: payment.date },
      { key: "reference", label: "Reference", widget: "TextField", value: payment.reference },
    ],
    listRoute,
  });
}

registry.SalesPayment = {
  list: () =>
    buildListDocument({
      docId: "meridian-sales-payment-list",
      title: "Sales Payments",
      columns: paymentColumns(),
      records: payments
        .filter((payment) => payment.type === "Receive")
        .map((payment) => ({
          route: `/meridian/edit/SalesPayment/${payment.id}`,
          cells: { id: payment.id, party: partyName(payment.party, payment.partyType), date: payment.date, method: payment.method, amount: formatIDR(payment.amount) },
        })),
    }),
  form: (id) => paymentForm(id, "/meridian/list/SalesPayment"),
  newRoute: "/meridian/edit/SalesPayment/new",
};

registry.PurchasePayment = {
  list: () =>
    buildListDocument({
      docId: "meridian-purchase-payment-list",
      title: "Purchase Payments",
      columns: paymentColumns(),
      records: payments
        .filter((payment) => payment.type === "Pay")
        .map((payment) => ({
          route: `/meridian/edit/PurchasePayment/${payment.id}`,
          cells: { id: payment.id, party: partyName(payment.party, payment.partyType), date: payment.date, method: payment.method, amount: formatIDR(payment.amount) },
        })),
    }),
  form: (id) => paymentForm(id, "/meridian/list/PurchasePayment"),
  newRoute: "/meridian/edit/PurchasePayment/new",
};

// ---------------------------------------------------------------------------
// Journal Entry
// ---------------------------------------------------------------------------

registry.JournalEntry = {
  list: () =>
    buildListDocument({
      docId: "meridian-journal-entry-list",
      title: "Journal Entry",
      columns: [
        { key: "id", label: "Entry" },
        { key: "date", label: "Date" },
        { key: "entryType", label: "Type" },
        { key: "narration", label: "Narration" },
      ],
      records: [
        // Behavioural ad-hoc entries (adapter-backed, real Submit/Cancel → GL). The `JE-NIMB-*`
        // form is rendered by MeridianJournalEntryForm in MeridianReferenceRoute, not this builder.
        ...MERIDIAN_JOURNAL_ENTRY_ROWS.map((entry) => ({
          route: `/meridian/edit/JournalEntry/${entry.id}`,
          cells: { id: entry.id, date: entry.date, entryType: entry.entryType, narration: entry.narration },
        })),
        ...journalEntries.map((entry) => ({
          route: `/meridian/edit/JournalEntry/${entry.id}`,
          cells: { id: entry.id, date: entry.date, entryType: entry.entryType, narration: entry.narration },
        })),
      ],
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("JournalEntry", "JV-.YYYY.-.#####");
      return buildJournalEntryFormDocument({
        docId: "meridian-journal-entry-new",
        title: "New Journal Entry",
        headerFields: [
          { key: "id", label: "Voucher No.", widget: "TextField", value: newId },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
          { key: "entryType", label: "Entry Type", widget: "TextField", value: "Journal Entry" },
          { key: "narration", label: "Narration", widget: "Textarea", value: "" },
        ],
        lines: [],
        listRoute: "/meridian/list/JournalEntry",
      });
    }
    const entry = journalEntries.find((candidate) => candidate.id === id);
    if (!entry) return undefined;
    return buildJournalEntryFormDocument({
      docId: `meridian-journal-entry-${id}`,
      title: `Journal Entry: ${entry.id}`,
      headerFields: [
        { key: "id", label: "Voucher No.", widget: "TextField", value: entry.id },
        { key: "date", label: "Date", widget: "TextField", value: entry.date },
        { key: "entryType", label: "Entry Type", widget: "TextField", value: entry.entryType },
        { key: "narration", label: "Narration", widget: "Textarea", value: entry.narration },
      ],
      lines: entry.lines.map((line) => ({ account: line.account, debit: line.debit ? formatIDR(line.debit) : "-", credit: line.credit ? formatIDR(line.credit) : "-" })),
      listRoute: "/meridian/list/JournalEntry",
    });
  },
  newRoute: "/meridian/edit/JournalEntry/new",
};

// ---------------------------------------------------------------------------
// Price List, Loyalty Program, Lead, Pricing Rule, Coupon Code
// ---------------------------------------------------------------------------

registry.PriceList = {
  list: () =>
    buildListDocument({
      docId: "meridian-price-list-list",
      title: "Price List",
      columns: [
        { key: "name", label: "Price List" },
        { key: "kind", label: "Kind" },
        { key: "entries", label: "Items" },
      ],
      records: priceLists.map((priceList) => ({
        route: `/meridian/edit/PriceList/${priceList.id}`,
        cells: { name: priceList.name, kind: priceList.kind, entries: String(priceList.entries.length) },
      })),
    }),
  form: (id) => {
    const priceList = priceLists.find((candidate) => candidate.id === id);
    if (!priceList) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-price-list-${id}`,
      title: `Price List: ${priceList.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: priceList.name },
        { key: "kind", label: "Kind", widget: "Select", value: priceList.kind, options: statusOptions(["Selling", "Buying"]) },
      ],
      listRoute: "/meridian/list/PriceList",
    });
  },
};

registry.LoyaltyProgram = {
  list: () =>
    buildListDocument({
      docId: "meridian-loyalty-program-list",
      title: "Loyalty Program",
      columns: [
        { key: "name", label: "Program" },
        { key: "pointsPerAmount", label: "Points / Rp" },
        { key: "redemptionRate", label: "Redemption Rate" },
      ],
      records: loyaltyPrograms.map((program) => ({
        route: `/meridian/edit/LoyaltyProgram/${program.id}`,
        cells: { name: program.name, pointsPerAmount: String(program.pointsPerAmount), redemptionRate: String(program.redemptionRate) },
      })),
    }),
  form: (id) => {
    const program = loyaltyPrograms.find((candidate) => candidate.id === id);
    if (!program) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-loyalty-${id}`,
      title: `Loyalty Program: ${program.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: program.name },
        { key: "pointsPerAmount", label: "Points per Amount", widget: "TextField", value: String(program.pointsPerAmount) },
        { key: "redemptionRate", label: "Redemption Rate", widget: "TextField", value: String(program.redemptionRate) },
      ],
      listRoute: "/meridian/list/LoyaltyProgram",
    });
  },
};

registry.Lead = {
  list: () =>
    buildListDocument({
      docId: "meridian-lead-list",
      title: "Lead",
      columns: [
        { key: "name", label: "Name" },
        { key: "company", label: "Company" },
        { key: "status", label: "Status" },
      ],
      records: leads.map((lead) => ({
        route: `/meridian/edit/Lead/${lead.id}`,
        cells: { name: lead.name, company: lead.company, status: lead.status },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-lead-new",
        title: "New Lead",
        fields: [
          { key: "name", label: "Name", widget: "TextField", value: "" },
          { key: "company", label: "Company", widget: "TextField", value: "" },
          { key: "status", label: "Status", widget: "Select", value: "New", options: statusOptions(["New", "Contacted", "Qualified", "Lost"]) },
        ],
        listRoute: "/meridian/list/Lead",
      });
    }
    const lead = leads.find((candidate) => candidate.id === id);
    if (!lead) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-lead-${id}`,
      title: `Lead: ${lead.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: lead.name },
        { key: "company", label: "Company", widget: "TextField", value: lead.company },
        { key: "status", label: "Status", widget: "Select", value: lead.status, options: statusOptions(["New", "Contacted", "Qualified", "Lost"]) },
      ],
      listRoute: "/meridian/list/Lead",
    });
  },
  newRoute: "/meridian/edit/Lead/new",
};

registry.PricingRule = {
  list: () =>
    buildListDocument({
      docId: "meridian-pricing-rule-list",
      title: "Pricing Rule",
      columns: [
        { key: "name", label: "Rule" },
        { key: "appliesTo", label: "Applies To" },
        { key: "discountPercent", label: "Discount", align: "right" },
      ],
      records: pricingRules.map((rule) => ({
        route: `/meridian/edit/PricingRule/${rule.id}`,
        cells: { name: rule.name, appliesTo: rule.appliesTo, discountPercent: `${rule.discountPercent}%` },
      })),
    }),
  form: (id) => {
    const rule = pricingRules.find((candidate) => candidate.id === id);
    if (!rule) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-pricing-rule-${id}`,
      title: `Pricing Rule: ${rule.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: rule.name },
        { key: "appliesTo", label: "Applies To", widget: "TextField", value: rule.appliesTo },
        { key: "discountPercent", label: "Discount Percent", widget: "TextField", value: String(rule.discountPercent) },
      ],
      listRoute: "/meridian/list/PricingRule",
    });
  },
};

registry.CouponCode = {
  list: () =>
    buildListDocument({
      docId: "meridian-coupon-code-list",
      title: "Coupon Code",
      columns: [
        { key: "code", label: "Code" },
        { key: "discountPercent", label: "Discount", align: "right" },
        { key: "used", label: "Used / Limit" },
      ],
      records: couponCodes.map((coupon) => ({
        route: `/meridian/edit/CouponCode/${coupon.id}`,
        cells: { code: coupon.code, discountPercent: `${coupon.discountPercent}%`, used: `${coupon.used} / ${coupon.limit}` },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-coupon-new",
        title: "New Coupon Code",
        fields: [
          { key: "code", label: "Code", widget: "TextField", value: "" },
          { key: "discountPercent", label: "Discount Percent", widget: "TextField", value: "10" },
          { key: "limit", label: "Usage Limit", widget: "TextField", value: "100" },
        ],
        listRoute: "/meridian/list/CouponCode",
      });
    }
    const coupon = couponCodes.find((candidate) => candidate.id === id);
    if (!coupon) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-coupon-${id}`,
      title: `Coupon Code: ${coupon.code}`,
      fields: [
        { key: "code", label: "Code", widget: "TextField", value: coupon.code },
        { key: "discountPercent", label: "Discount Percent", widget: "TextField", value: String(coupon.discountPercent) },
        { key: "limit", label: "Usage Limit", widget: "TextField", value: String(coupon.limit) },
      ],
      listRoute: "/meridian/list/CouponCode",
    });
  },
  newRoute: "/meridian/edit/CouponCode/new",
};

// ---------------------------------------------------------------------------
// Inventory: Stock Movement, Shipment, Purchase Receipt
// ---------------------------------------------------------------------------

registry.StockMovement = {
  list: () =>
    buildListDocument({
      docId: "meridian-stock-movement-list",
      title: "Stock Movement",
      columns: [
        { key: "id", label: "Entry" },
        { key: "item", label: "Item" },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "quantity", label: "Qty", align: "right" },
      ],
      records: stockMovements.map((entry) => ({
        route: `/meridian/edit/StockMovement/${entry.id}`,
        cells: {
          id: entry.id,
          item: items.find((i) => i.id === entry.item)?.name ?? entry.item,
          from: entry.warehouseFrom ?? "-",
          to: entry.warehouseTo ?? "-",
          quantity: String(entry.quantity),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-stock-movement-new",
        title: "New Stock Movement",
        fields: [
          { key: "item", label: "Item", widget: "TextField", value: items[0]?.name ?? "" },
          { key: "warehouseFrom", label: "From Warehouse", widget: "TextField", value: "Stores - NTC" },
          { key: "warehouseTo", label: "To Warehouse", widget: "TextField", value: "Finished Goods - NTC" },
          { key: "quantity", label: "Quantity", widget: "TextField", value: "1" },
          { key: "date", label: "Date", widget: "TextField", value: "2026-08-22" },
        ],
        listRoute: "/meridian/list/StockMovement",
      });
    }
    const entry = stockMovements.find((candidate) => candidate.id === id);
    if (!entry) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-stock-movement-${id}`,
      title: `Stock Movement: ${entry.id}`,
      fields: [
        { key: "item", label: "Item", widget: "TextField", value: items.find((i) => i.id === entry.item)?.name ?? entry.item },
        { key: "warehouseFrom", label: "From Warehouse", widget: "TextField", value: entry.warehouseFrom ?? "" },
        { key: "warehouseTo", label: "To Warehouse", widget: "TextField", value: entry.warehouseTo ?? "" },
        { key: "quantity", label: "Quantity", widget: "TextField", value: String(entry.quantity) },
        { key: "date", label: "Date", widget: "TextField", value: entry.date },
      ],
      listRoute: "/meridian/list/StockMovement",
    });
  },
  newRoute: "/meridian/edit/StockMovement/new",
};

registry.Shipment = {
  list: () =>
    buildListDocument({
      docId: "meridian-shipment-list",
      title: "Shipment",
      columns: [
        { key: "id", label: "Shipment" },
        { key: "salesInvoice", label: "Sales Invoice" },
        { key: "customer", label: "Customer" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
      ],
      records: shipments.map((shipment) => ({
        route: `/meridian/edit/Shipment/${shipment.id}`,
        cells: {
          id: shipment.id,
          salesInvoice: shipment.salesInvoice,
          customer: customers.find((c) => c.id === shipment.customer)?.name ?? shipment.customer,
          date: shipment.date,
          status: shipment.status,
        },
      })),
    }),
  form: (id) => {
    const shipment = shipments.find((candidate) => candidate.id === id);
    if (!shipment) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-shipment-${id}`,
      title: `Shipment: ${shipment.id}`,
      fields: [
        { key: "salesInvoice", label: "Sales Invoice", widget: "TextField", value: shipment.salesInvoice },
        { key: "customer", label: "Customer", widget: "TextField", value: customers.find((c) => c.id === shipment.customer)?.name ?? shipment.customer },
        { key: "date", label: "Date", widget: "TextField", value: shipment.date },
        { key: "status", label: "Status", widget: "Select", value: shipment.status, options: statusOptions(["Draft", "Submitted", "Delivered"]) },
      ],
      listRoute: "/meridian/list/Shipment",
    });
  },
};

registry.PurchaseReceipt = {
  list: () =>
    buildListDocument({
      docId: "meridian-purchase-receipt-list",
      title: "Purchase Receipt",
      columns: [
        { key: "id", label: "Receipt" },
        { key: "purchaseInvoice", label: "Purchase Invoice" },
        { key: "supplier", label: "Supplier" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
      ],
      records: purchaseReceipts.map((receipt) => ({
        route: `/meridian/edit/PurchaseReceipt/${receipt.id}`,
        cells: {
          id: receipt.id,
          purchaseInvoice: receipt.purchaseInvoice,
          supplier: suppliers.find((s) => s.id === receipt.supplier)?.name ?? receipt.supplier,
          date: receipt.date,
          status: receipt.status,
        },
      })),
    }),
  form: (id) => {
    const receipt = purchaseReceipts.find((candidate) => candidate.id === id);
    if (!receipt) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-purchase-receipt-${id}`,
      title: `Purchase Receipt: ${receipt.id}`,
      fields: [
        { key: "id", label: "Receipt No.", widget: "TextField", value: receipt.id },
        { key: "purchaseInvoice", label: "Purchase Invoice", widget: "TextField", value: receipt.purchaseInvoice },
        { key: "supplier", label: "Supplier", widget: "TextField", value: suppliers.find((s) => s.id === receipt.supplier)?.name ?? receipt.supplier },
        { key: "date", label: "Date", widget: "TextField", value: receipt.date },
        { key: "status", label: "Status", widget: "Select", value: receipt.status, options: statusOptions(["Draft", "Submitted"]) },
      ],
      extraActions: [
        // Draft-only server-side; the PurchaseReceipt state machine (meridianDoctypes.ts) rejects
        // a receive on an already-Submitted receipt and surfaces it as a form error.
        transitionButton("receive-prec-btn", "Receive Stock", "PurchaseReceipt", "receive", "/meridian/list/PurchaseReceipt"),
      ],
      listRoute: "/meridian/list/PurchaseReceipt",
    });
  },
};

registry.ManufacturingPlan = {
  list: () =>
    buildListDocument({
      docId: "meridian-manufacturing-plan-list",
      title: "MRP and Manufacturing Readiness",
      columns: [
        { key: "productionPlan", label: "Production Plan" },
        { key: "item", label: "Item" },
        { key: "projectedQty", label: "Projected Qty", align: "right" },
        { key: "shortfallQty", label: "Shortfall", align: "right" },
        { key: "qcGate", label: "Readiness Gate" },
      ],
      records: manufacturingPlans.map((plan) => ({
        route: `/meridian/edit/ManufacturingPlan/${plan.id}`,
        cells: {
          productionPlan: plan.productionPlan,
          item: plan.item,
          projectedQty: String(plan.projectedQty),
          shortfallQty: String(plan.shortfallQty),
          qcGate: plan.qcGate,
        },
      })),
    }),
  form: (id) => {
    const plan = manufacturingPlans.find((candidate) => candidate.id === id);
    if (!plan) return undefined;

    return buildFlatFormDocument({
      docId: `meridian-manufacturing-plan-${id}`,
      title: `Manufacturing Plan: ${plan.id}`,
      fields: [
        { key: "productionPlan", label: "Production Plan", widget: "TextField", value: plan.productionPlan },
        { key: "item", label: "Item", widget: "TextField", value: plan.item },
        { key: "projectedQty", label: "Projected Quantity", widget: "TextField", value: String(plan.projectedQty) },
        { key: "shortfallQty", label: "Shortfall Quantity", widget: "TextField", value: String(plan.shortfallQty) },
        { key: "materialRequest", label: "Material Request", widget: "TextField", value: plan.materialRequest },
        { key: "workOrder", label: "Work Order", widget: "TextField", value: plan.workOrder },
        { key: "qcGate", label: "Readiness Gate", widget: "Select", value: plan.qcGate, options: statusOptions(["BOM + Routing Ready", "Inspection Template", "Receipt Hold", "Capacity Review"]) },
      ],
      listRoute: "/meridian/list/ManufacturingPlan",
    });
  },
};

registry.ProcurementTracker = {
  list: () =>
    buildListDocument({
      docId: "meridian-procurement-tracker-list",
      title: "Procurement Tracker",
      columns: [
        { key: "materialRequest", label: "Material Request" },
        { key: "rfq", label: "RFQ" },
        { key: "purchaseOrder", label: "Purchase Order" },
        { key: "receiptStatus", label: "Receipt Status" },
        { key: "value", label: "Value", align: "right" },
      ],
      records: procurementTracker.map((row) => ({
        route: `/meridian/edit/ProcurementTracker/${row.id}`,
        cells: {
          materialRequest: row.materialRequest,
          rfq: row.rfq,
          purchaseOrder: row.purchaseOrder,
          receiptStatus: row.receiptStatus,
          value: formatIDR(row.value),
        },
      })),
    }),
  form: (id) => {
    const row = procurementTracker.find((candidate) => candidate.id === id);
    if (!row) return undefined;

    return buildFlatFormDocument({
      docId: `meridian-procurement-tracker-${id}`,
      title: `Procurement Tracker: ${row.id}`,
      fields: [
        { key: "materialRequest", label: "Material Request", widget: "TextField", value: row.materialRequest },
        { key: "rfq", label: "Request for Quotation", widget: "TextField", value: row.rfq },
        { key: "supplierQuotation", label: "Supplier Quotation", widget: "TextField", value: row.supplierQuotation },
        { key: "purchaseOrder", label: "Purchase Order", widget: "TextField", value: row.purchaseOrder },
        { key: "receiptStatus", label: "Receipt Status", widget: "Select", value: row.receiptStatus, options: statusOptions(["Not Received", "Quality Check", "Put Away", "Delayed"]) },
        { key: "paymentStatus", label: "Payment Status", widget: "Select", value: row.paymentStatus, options: statusOptions(["Not Due", "Pending Invoice", "Payment Order Draft", "Paid"]) },
        { key: "value", label: "Procurement Value", widget: "TextField", value: formatIDR(row.value) },
      ],
      listRoute: "/meridian/list/ProcurementTracker",
    });
  },
};

registry.SupplierScorecard = {
  list: () =>
    buildListDocument({
      docId: "meridian-supplier-scorecard-list",
      title: "Supplier Scorecard",
      columns: [
        { key: "supplier", label: "Supplier" },
        { key: "onTimeDeliveryRate", label: "On-Time Delivery", align: "right" },
        { key: "defectRate", label: "Defect Rate", align: "right" },
        { key: "responsivenessScore", label: "Responsiveness", align: "right" },
        { key: "standing", label: "Standing" },
      ],
      records: supplierScorecards.map((scorecard) => ({
        route: `/meridian/edit/SupplierScorecard/${scorecard.id}`,
        cells: {
          supplier: scorecard.supplier,
          onTimeDeliveryRate: `${scorecard.onTimeDeliveryRate}%`,
          defectRate: `${scorecard.defectRate}%`,
          responsivenessScore: String(scorecard.responsivenessScore),
          standing: scorecard.standing,
        },
      })),
    }),
  form: (id) => {
    const scorecard = supplierScorecards.find((candidate) => candidate.id === id);
    if (!scorecard) return undefined;

    return buildFlatFormDocument({
      docId: `meridian-supplier-scorecard-${id}`,
      title: `Supplier Scorecard: ${scorecard.supplier}`,
      fields: [
        { key: "supplier", label: "Supplier", widget: "TextField", value: scorecard.supplier },
        { key: "onTimeDeliveryRate", label: "On-Time Delivery Rate (%)", widget: "TextField", value: String(scorecard.onTimeDeliveryRate) },
        { key: "defectRate", label: "Defect Rate (%)", widget: "TextField", value: String(scorecard.defectRate) },
        { key: "responsivenessScore", label: "Responsiveness Score", widget: "TextField", value: String(scorecard.responsivenessScore) },
        { key: "standing", label: "Standing", widget: "Select", value: scorecard.standing, options: statusOptions(["Preferred", "Watch", "Restricted"]) },
      ],
      listRoute: "/meridian/list/SupplierScorecard",
    });
  },
};

registry.Tax = {
  list: () =>
    buildListDocument({
      docId: "meridian-tax-list",
      title: "Tax Templates",
      columns: [
        { key: "name", label: "Tax Template" },
        { key: "kind", label: "Kind" },
        { key: "rate", label: "Rate", align: "right" },
      ],
      records: taxTemplates.map((tax) => ({
        route: `/meridian/edit/Tax/${tax.id}`,
        cells: { name: tax.name, kind: tax.kind, rate: `${tax.rate}%` },
      })),
    }),
  form: (id) => {
    const tax = taxTemplates.find((candidate) => candidate.id === id);
    if (!tax) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-tax-${id}`,
      title: `Tax Template: ${tax.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: tax.name },
        { key: "kind", label: "Kind", widget: "Select", value: tax.kind, options: statusOptions(["Sales", "Purchase"]) },
        { key: "rate", label: "Rate (%)", widget: "TextField", value: String(tax.rate) },
      ],
      listRoute: "/meridian/list/Tax",
    });
  },
};

registry.NumberSeries = {
  list: () =>
    buildListDocument({
      docId: "meridian-number-series-list",
      title: "Number Series",
      columns: [
        { key: "id", label: "Document Type" },
        { key: "prefix", label: "Series Prefix" },
        { key: "current", label: "Current Sequence", align: "right" },
        { key: "example", label: "Next Sample Number", align: "right" },
      ],
      records: numberSeries.map((series) => ({
        route: `/meridian/edit/NumberSeries/${series.id.replace(/\s+/g, "")}`,
        cells: {
          id: series.id,
          prefix: series.prefix,
          current: String(series.current),
          example: `${series.prefix}${String(series.current + 1).padStart(5, "0")}`,
        },
      })),
    }),
  form: (id) => {
    const series = numberSeries.find((candidate) => candidate.id.replace(/\s+/g, "") === id || candidate.id === id);
    if (!series) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-number-series-${id}`,
      title: `Number Series: ${series.id}`,
      fields: [
        { key: "id", label: "Document Type", widget: "TextField", value: series.id },
        { key: "prefix", label: "Series Prefix", widget: "TextField", value: series.prefix },
        { key: "current", label: "Current Sequence", widget: "TextField", value: String(series.current) },
      ],
      listRoute: "/meridian/list/NumberSeries",
    });
  },
};

registry.AccountingDimension = {
  list: () =>
    buildListDocument({
      docId: "meridian-accounting-dimension-list",
      title: "Accounting Dimensions",
      columns: [
        { key: "dimensionName", label: "Dimension" },
        { key: "referenceDocType", label: "Reference DocType" },
        { key: "defaultDimension", label: "Default" },
        { key: "mandatoryFor", label: "Mandatory" },
        { key: "coveragePercent", label: "Coverage", align: "right" },
      ],
      records: accountingDimensions.map((dimension) => ({
        route: `/meridian/edit/AccountingDimension/${dimension.id}`,
        cells: {
          dimensionName: dimension.dimensionName,
          referenceDocType: dimension.referenceDocType,
          defaultDimension: dimension.defaultDimension,
          mandatoryFor: dimension.mandatoryFor,
          coveragePercent: `${dimension.coveragePercent}%`,
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-accounting-dimension-new",
        title: "New Accounting Dimension",
        fields: [
          { key: "dimensionName", label: "Dimension Name", widget: "TextField", value: "" },
          { key: "referenceDocType", label: "Reference DocType", widget: "Select", value: "Department", options: statusOptions(["Department", "Project", "Sales Channel", "Territory", "Branch"]) },
          { key: "defaultDimension", label: "Default Dimension", widget: "TextField", value: "" },
          { key: "mandatoryFor", label: "Mandatory For", widget: "Select", value: "P&L", options: statusOptions(["P&L", "Balance Sheet", "Both"]) },
          { key: "coveragePercent", label: "Tagged Transaction Coverage (%)", widget: "TextField", value: "0" },
        ],
        listRoute: "/meridian/list/AccountingDimension",
      });
    }
    const dimension = accountingDimensions.find((candidate) => candidate.id === id);
    if (!dimension) return undefined;

    return buildFlatFormDocument({
      docId: `meridian-accounting-dimension-${id}`,
      title: `Accounting Dimension: ${dimension.dimensionName}`,
      fields: [
        { key: "dimensionName", label: "Dimension Name", widget: "TextField", value: dimension.dimensionName },
        { key: "referenceDocType", label: "Reference DocType", widget: "Select", value: dimension.referenceDocType, options: statusOptions(["Department", "Project", "Sales Channel", "Territory", "Branch"]) },
        { key: "defaultDimension", label: "Default Dimension", widget: "TextField", value: dimension.defaultDimension },
        { key: "mandatoryFor", label: "Mandatory For", widget: "Select", value: dimension.mandatoryFor, options: statusOptions(["P&L", "Balance Sheet", "Both"]) },
        { key: "coveragePercent", label: "Tagged Transaction Coverage (%)", widget: "TextField", value: String(dimension.coveragePercent) },
      ],
      listRoute: "/meridian/list/AccountingDimension",
    });
  },
  newRoute: "/meridian/edit/AccountingDimension/new",
};

registry.PrintTemplate = {
  list: () =>
    buildListDocument({
      docId: "meridian-print-template-list",
      title: "Print Templates",
      columns: [
        { key: "name", label: "Template" },
        { key: "forDoctype", label: "For" },
        { key: "isDefault", label: "Default" },
      ],
      records: printTemplates.map((template) => ({
        route: `/meridian/edit/PrintTemplate/${template.id}`,
        cells: { name: template.name, forDoctype: template.forDoctype, isDefault: template.isDefault ? "Yes" : "No" },
      })),
    }),
  form: (id) => {
    const template = printTemplates.find((candidate) => candidate.id === id);
    if (!template) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-print-template-${id}`,
      title: `Print Template: ${template.name}`,
      fields: [
        { key: "name", label: "Name", widget: "TextField", value: template.name },
        { key: "forDoctype", label: "For Doctype", widget: "TextField", value: template.forDoctype },
        { key: "isDefault", label: "Default Template", widget: "Checkbox", value: template.isDefault },
      ],
      listRoute: "/meridian/list/PrintTemplate",
    });
  },
};

registry.QualityInspection = {
  list: () =>
    buildListDocument({
      docId: "meridian-quality-inspection-list",
      title: "Quality Inspections",
      columns: [
        { key: "id", label: "QC ID" },
        { key: "referenceType", label: "Ref Type" },
        { key: "referenceId", label: "Ref ID" },
        { key: "item", label: "Item" },
        { key: "status", label: "Status" },
        { key: "defects", label: "Defects", align: "right" },
      ],
      records: qualityInspections.map((qc) => ({
        route: `/meridian/edit/QualityInspection/${qc.id}`,
        cells: {
          id: qc.id,
          referenceType: qc.referenceType,
          referenceId: qc.referenceId,
          item: qc.item,
          status: qc.status,
          defects: `${qc.defectCount} / ${qc.sampleSize}`,
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-quality-inspection-new",
        title: "New Quality Inspection",
        extraActions: [],
        fields: [
          { key: "referenceType", label: "Reference Type", widget: "Select", value: "Purchase Receipt", options: statusOptions(["Purchase Receipt", "Delivery", "Job Card"]) },
          { key: "referenceId", label: "Reference Document ID", widget: "TextField", value: "" },
          { key: "item", label: "Item Inspected", widget: "TextField", value: items[0]?.name ?? "" },
          { key: "sampleSize", label: "Sample Size", widget: "TextField", value: "10" },
          { key: "defectCount", label: "Defect Count", widget: "TextField", value: "0" },
          { key: "status", label: "Inspection Status", widget: "Select", value: "Passed", options: statusOptions(["Passed", "Hold", "Rejected"]) },
          { key: "inspectedBy", label: "Inspector", widget: "TextField", value: "QC Lead" },
          { key: "date", label: "Inspection Date", widget: "TextField", value: "2026-08-22" },
        ],
        listRoute: "/meridian/list/QualityInspection",
      });
    }
    const qc = qualityInspections.find((candidate) => candidate.id === id);
    if (!qc) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-quality-inspection-${id}`,
      title: `Quality Inspection: ${qc.id}`,
      extraActions: [
        button("pass-qc-btn", "Release Batch (Pass Gate)", `/meridian/list/QualityInspection`, "primary"),
        button("hold-qc-btn", "Put on Hold", `/meridian/list/QualityInspection`),
      ],
      fields: [
        { key: "referenceType", label: "Reference Type", widget: "Select", value: qc.referenceType, options: statusOptions(["Purchase Receipt", "Delivery", "Job Card"]) },
        { key: "referenceId", label: "Reference Document ID", widget: "TextField", value: qc.referenceId },
        { key: "item", label: "Item Inspected", widget: "TextField", value: qc.item },
        { key: "sampleSize", label: "Sample Size", widget: "TextField", value: String(qc.sampleSize) },
        { key: "defectCount", label: "Defect Count", widget: "TextField", value: String(qc.defectCount) },
        { key: "status", label: "Inspection Status", widget: "Select", value: qc.status, options: statusOptions(["Passed", "Hold", "Rejected"]) },
        { key: "inspectedBy", label: "Inspector", widget: "TextField", value: qc.inspectedBy },
        { key: "date", label: "Inspection Date", widget: "TextField", value: qc.date },
      ],
      listRoute: "/meridian/list/QualityInspection",
    });
  },
  newRoute: "/meridian/edit/QualityInspection/new",
};

registry.SupportTicket = {
  list: () =>
    buildListDocument({
      docId: "meridian-support-ticket-list",
      title: "Support Tickets",
      columns: [
        { key: "id", label: "Ticket ID" },
        { key: "subject", label: "Subject" },
        { key: "customer", label: "Customer" },
        { key: "priority", label: "Priority" },
        { key: "slaDue", label: "SLA Status" },
        { key: "status", label: "Status" },
      ],
      records: supportTickets.map((ticket) => ({
        route: `/meridian/edit/SupportTicket/${ticket.id}`,
        cells: {
          id: ticket.id,
          subject: ticket.subject,
          customer: ticket.customer,
          priority: ticket.priority,
          slaDue: ticket.slaDue,
          status: ticket.status,
        },
      })),
    }),
  form: (id) => {
    const ticket = supportTickets.find((candidate) => candidate.id === id);
    if (!ticket) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-support-ticket-${id}`,
      title: `Support Ticket: ${ticket.id}`,
      fields: [
        { key: "subject", label: "Subject", widget: "TextField", value: ticket.subject },
        { key: "customer", label: "Customer", widget: "TextField", value: ticket.customer },
        { key: "priority", label: "Priority", widget: "Select", value: ticket.priority, options: statusOptions(["Low", "Medium", "High", "Urgent"]) },
        { key: "status", label: "Status", widget: "Select", value: ticket.status, options: statusOptions(["Open", "In Progress", "Resolved"]) },
        { key: "slaDue", label: "SLA Due / Status", widget: "TextField", value: ticket.slaDue },
        { key: "responseTimeMinutes", label: "First Response Time (mins)", widget: "TextField", value: String(ticket.responseTimeMinutes) },
      ],
      listRoute: "/meridian/list/SupportTicket",
    });
  },
};

registry.ProjectSummary = {
  list: () =>
    buildListDocument({
      docId: "meridian-project-summary-list",
      title: "Projects & Budget Utilization",
      columns: [
        { key: "name", label: "Project Name" },
        { key: "customer", label: "Customer" },
        { key: "budget", label: "Budget", align: "right" },
        { key: "actualSpend", label: "Actual Spend", align: "right" },
        { key: "progressPercent", label: "Progress", align: "right" },
        { key: "status", label: "Status" },
      ],
      records: projectSummaries.map((project) => ({
        route: `/meridian/edit/ProjectSummary/${project.id}`,
        cells: {
          name: project.name,
          customer: project.customer,
          budget: formatIDR(project.budget),
          actualSpend: formatIDR(project.actualSpend),
          progressPercent: `${project.progressPercent}%`,
          status: project.status,
        },
      })),
    }),
  form: (id) => {
    const project = projectSummaries.find((candidate) => candidate.id === id);
    if (!project) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-project-summary-${id}`,
      title: `Project: ${project.name}`,
      fields: [
        { key: "name", label: "Project Name", widget: "TextField", value: project.name },
        { key: "customer", label: "Customer / Entity", widget: "TextField", value: project.customer },
        { key: "budget", label: "Approved Budget", widget: "TextField", value: formatIDR(project.budget) },
        { key: "actualSpend", label: "Actual Spend", widget: "TextField", value: formatIDR(project.actualSpend) },
        { key: "progressPercent", label: "Progress (%)", widget: "TextField", value: String(project.progressPercent) },
        { key: "status", label: "Status", widget: "Select", value: project.status, options: statusOptions(["In Progress", "On Track", "Completed"]) },
      ],
      listRoute: "/meridian/list/ProjectSummary",
    });
  },
};

registry.Project = registry.ProjectSummary;

registry.MaterialRequest = {
  list: () =>
    buildListDocument({
      docId: "meridian-material-request-list",
      title: "Material Requests",
      columns: [
        { key: "id", label: "MR ID" },
        { key: "item", label: "Item Required" },
        { key: "quantity", label: "Qty", align: "right" },
        { key: "warehouse", label: "Target Warehouse" },
        { key: "requiredDate", label: "Required By" },
        { key: "purpose", label: "Purpose" },
        { key: "status", label: "Status" },
      ],
      records: materialRequests.map((mr) => ({
        route: `/meridian/edit/MaterialRequest/${mr.id}`,
        cells: {
          id: mr.id,
          item: mr.item,
          quantity: `${mr.quantity} units`,
          warehouse: mr.warehouse,
          requiredDate: mr.requiredDate,
          purpose: mr.purpose,
          status: mr.status,
        },
      })),
    }),
  form: (id) => {
    const mr = materialRequests.find((c) => c.id === id);
    if (!mr) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-material-request-${id}`,
      title: `Material Request: ${mr.id}`,
      extraActions: [
        button("gen-rfq-btn", "Generate RFQ", `/meridian/edit/RequestForQuotation/new`, "primary"),
      ],
      fields: [
        { key: "item", label: "Item Required", widget: "TextField", value: mr.item },
        { key: "quantity", label: "Quantity", widget: "TextField", value: String(mr.quantity) },
        { key: "warehouse", label: "Warehouse", widget: "TextField", value: mr.warehouse },
        { key: "requiredDate", label: "Required Date", widget: "TextField", value: mr.requiredDate },
        { key: "purpose", label: "Purpose", widget: "Select", value: mr.purpose, options: statusOptions(["Purchase", "Manufacture", "Auto Reorder"]) },
        { key: "status", label: "Status", widget: "Select", value: mr.status, options: statusOptions(["Draft", "Pending RFQ", "Ordered", "Fulfilled"]) },
      ],
      listRoute: "/meridian/list/MaterialRequest",
    });
  },
};

registry.RequestForQuotation = {
  list: () =>
    buildListDocument({
      docId: "meridian-rfq-list",
      title: "Requests for Quotation (RFQ)",
      columns: [
        { key: "id", label: "RFQ ID" },
        { key: "materialRequest", label: "Material Request" },
        { key: "item", label: "Item" },
        { key: "quantity", label: "Qty", align: "right" },
        { key: "date", label: "Date" },
        { key: "validTill", label: "Valid Till" },
        { key: "status", label: "Status" },
      ],
      records: rfqs.map((rfq) => ({
        route: `/meridian/edit/RequestForQuotation/${rfq.id}`,
        cells: {
          id: rfq.id,
          materialRequest: rfq.materialRequest,
          item: rfq.item,
          quantity: `${rfq.quantity} units`,
          date: rfq.date,
          validTill: rfq.validTill,
          status: rfq.status,
        },
      })),
    }),
  form: (id) => {
    const rfq = rfqs.find((c) => c.id === id);
    if (!rfq) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-rfq-${id}`,
      title: `Request for Quotation: ${rfq.id}`,
      extraActions: [
        button("rec-sq-btn", "Record Supplier Quotation", `/meridian/edit/SupplierQuotation/new`, "primary"),
      ],
      fields: [
        { key: "materialRequest", label: "Linked Material Request", widget: "TextField", value: rfq.materialRequest },
        { key: "item", label: "Item", widget: "TextField", value: rfq.item },
        { key: "quantity", label: "Quantity", widget: "TextField", value: String(rfq.quantity) },
        { key: "date", label: "RFQ Date", widget: "TextField", value: rfq.date },
        { key: "validTill", label: "Valid Till", widget: "TextField", value: rfq.validTill },
        { key: "status", label: "Status", widget: "Select", value: rfq.status, options: statusOptions(["Draft", "Sent", "Comparing", "Awarded"]) },
      ],
      listRoute: "/meridian/list/RequestForQuotation",
    });
  },
};

registry.SupplierQuotation = {
  list: () =>
    buildListDocument({
      docId: "meridian-supplier-quotation-list",
      title: "Supplier Quotations",
      columns: [
        { key: "id", label: "Quotation ID" },
        { key: "rfq", label: "RFQ Ref" },
        { key: "supplier", label: "Supplier" },
        { key: "item", label: "Item" },
        { key: "rate", label: "Unit Rate", align: "right" },
        { key: "leadTimeDays", label: "Lead Time", align: "right" },
        { key: "status", label: "Status" },
      ],
      records: supplierQuotations.map((sq) => ({
        route: `/meridian/edit/SupplierQuotation/${sq.id}`,
        cells: {
          id: sq.id,
          rfq: sq.rfq,
          supplier: sq.supplier,
          item: sq.item,
          rate: formatIDR(sq.rate),
          leadTimeDays: `${sq.leadTimeDays} days`,
          status: sq.status,
        },
      })),
    }),
  form: (id) => {
    const sq = supplierQuotations.find((c) => c.id === id);
    if (!sq) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-supplier-quotation-${id}`,
      title: `Supplier Quotation: ${sq.id}`,
      extraActions: [
        button("create-po-btn", "Create Purchase Order", `/meridian/edit/PurchaseOrder/new`, "primary"),
      ],
      fields: [
        { key: "rfq", label: "RFQ Reference", widget: "TextField", value: sq.rfq },
        { key: "supplier", label: "Supplier", widget: "TextField", value: sq.supplier },
        { key: "item", label: "Item", widget: "TextField", value: sq.item },
        { key: "rate", label: "Offered Rate", widget: "TextField", value: formatIDR(sq.rate) },
        { key: "leadTimeDays", label: "Lead Time (Days)", widget: "TextField", value: String(sq.leadTimeDays) },
        { key: "status", label: "Status", widget: "Select", value: sq.status, options: statusOptions(["Submitted", "Accepted", "Rejected"]) },
      ],
      listRoute: "/meridian/list/SupplierQuotation",
    });
  },
};

registry.PurchaseOrder = {
  list: () =>
    buildListDocument({
      docId: "meridian-purchase-order-list",
      title: "Purchase Orders",
      columns: [
        { key: "id", label: "PO Number" },
        { key: "supplier", label: "Supplier" },
        { key: "date", label: "Date" },
        { key: "deliveryDate", label: "Expected Delivery" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total Amount", align: "right" },
      ],
      records: purchaseOrders.map((po) => ({
        route: `/meridian/edit/PurchaseOrder/${po.id}`,
        cells: {
          id: po.id,
          supplier: po.supplier,
          date: po.date,
          deliveryDate: po.deliveryDate,
          status: po.status,
          total: formatIDR(po.total),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("PurchaseOrder", "PO-.YYYY.-.#####");
      return buildFlatFormDocument({
        docId: "meridian-purchase-order-new",
        title: "New Purchase Order",
        headerActions: [],
        extraActions: [],
        fields: [
          { key: "id", label: "PO Number", widget: "TextField", value: newId },
          { key: "supplier", label: "Supplier", widget: "TextField", value: suppliers[0]?.name ?? "" },
          { key: "quotationRef", label: "Quotation Ref", widget: "TextField", value: "-" },
          { key: "date", label: "PO Date", widget: "TextField", value: "2026-08-22" },
          { key: "deliveryDate", label: "Expected Delivery Date", widget: "TextField", value: "2026-09-22" },
          { key: "status", label: "Order Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Submitted", "Partially Received", "Completed"]) },
          { key: "total", label: "Total (incl. PPN)", widget: "TextField", value: "0" },
        ],
        listRoute: "/meridian/list/PurchaseOrder",
      });
    }
    const po = purchaseOrders.find((c) => c.id === id);
    if (!po) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-purchase-order-${id}`,
      title: `Purchase Order: ${po.id}`,
      headerActions: [
        button("print-po-btn", "Cetak Slip PO", `/meridian/print/purchase-order/PurchaseOrder/${po.id}`, "primary", "printer"),
      ],
      extraActions: [
        button("create-pr-btn", "Make Purchase Receipt", `/meridian/edit/PurchaseReceipt/new`, "primary"),
        button("create-pi-btn", "Make Purchase Invoice", `/meridian/edit/PurchaseInvoice/new`),
      ],
      fields: [
        { key: "id", label: "PO Number", widget: "TextField", value: po.id },
        { key: "supplier", label: "Supplier", widget: "TextField", value: po.supplier },
        { key: "quotationRef", label: "Quotation Ref", widget: "TextField", value: po.quotationRef ?? "-" },
        { key: "date", label: "PO Date", widget: "TextField", value: po.date },
        { key: "deliveryDate", label: "Expected Delivery Date", widget: "TextField", value: po.deliveryDate },
        { key: "status", label: "Order Status", widget: "Select", value: po.status, options: statusOptions(["Draft", "Submitted", "Partially Received", "Completed"]) },
        { key: "total", label: "Total (incl. PPN)", widget: "TextField", value: formatIDR(po.total) },
      ],
      listRoute: "/meridian/list/PurchaseOrder",
    });
  },
  newRoute: "/meridian/edit/PurchaseOrder/new",
};

registry.SalesOrder = {
  list: () =>
    buildListDocument({
      docId: "meridian-sales-order-list",
      title: "Sales Orders",
      columns: [
        { key: "id", label: "SO Number" },
        { key: "customer", label: "Customer" },
        { key: "date", label: "Date" },
        { key: "deliveryDate", label: "Delivery Date" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total Amount", align: "right" },
      ],
      records: salesOrders.map((so) => ({
        route: `/meridian/edit/SalesOrder/${so.id}`,
        cells: {
          id: so.id,
          customer: so.customer,
          date: so.date,
          deliveryDate: so.deliveryDate,
          status: so.status,
          total: formatIDR(so.total),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      const newId = getNextMeridianDocNumber("SalesOrder", "SO-.YYYY.-.#####");
      return buildFlatFormDocument({
        docId: "meridian-sales-order-new",
        title: "New Sales Order",
        headerActions: [],
        extraActions: [],
        fields: [
          { key: "id", label: "SO Number", widget: "TextField", value: newId },
          { key: "customer", label: "Customer", widget: "TextField", value: customers[0]?.name ?? "" },
          { key: "quoteRef", label: "Quote Ref", widget: "TextField", value: "-" },
          { key: "date", label: "Order Date", widget: "TextField", value: "2026-08-22" },
          { key: "deliveryDate", label: "Target Delivery Date", widget: "TextField", value: "2026-09-22" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "Submitted", "In Production", "Delivered", "Invoiced"]) },
          { key: "total", label: "Total Amount", widget: "TextField", value: "0" },
        ],
        listRoute: "/meridian/list/SalesOrder",
      });
    }
    const so = salesOrders.find((c) => c.id === id);
    if (!so) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-sales-order-${id}`,
      title: `Sales Order: ${so.id}`,
      headerActions: [
        button("print-so-btn", "Cetak Order Penjualan", `/meridian/print/sales-order/SalesOrder/${so.id}`, "primary", "printer"),
      ],
      extraActions: [
        button("gen-dn-btn", "Generate Delivery Note", `/meridian/edit/DeliveryNote/new`, "primary"),
        button("gen-si-btn", "Generate Sales Invoice", `/meridian/edit/SalesInvoice/new`),
      ],
      fields: [
        { key: "id", label: "SO Number", widget: "TextField", value: so.id },
        { key: "customer", label: "Customer", widget: "TextField", value: so.customer },
        { key: "quoteRef", label: "Quote Ref", widget: "TextField", value: so.quoteRef ?? "-" },
        { key: "date", label: "Order Date", widget: "TextField", value: so.date },
        { key: "deliveryDate", label: "Target Delivery Date", widget: "TextField", value: so.deliveryDate },
        { key: "status", label: "Status", widget: "Select", value: so.status, options: statusOptions(["Draft", "Submitted", "In Production", "Delivered", "Invoiced"]) },
        { key: "total", label: "Total Amount", widget: "TextField", value: formatIDR(so.total) },
      ],
      listRoute: "/meridian/list/SalesOrder",
    });
  },
  newRoute: "/meridian/edit/SalesOrder/new",
};

registry.DeliveryNote = {
  list: () =>
    buildListDocument({
      docId: "meridian-delivery-note-list",
      title: "Delivery Notes",
      columns: [
        { key: "id", label: "Delivery No" },
        { key: "salesOrder", label: "Sales Order" },
        { key: "customer", label: "Customer" },
        { key: "date", label: "Dispatch Date" },
        { key: "status", label: "Delivery Status" },
        { key: "reminderChannel", label: "Reminder Channel" },
      ],
      records: deliveryNotes.map((dn) => ({
        route: `/meridian/edit/DeliveryNote/${dn.id}`,
        cells: {
          id: dn.id,
          salesOrder: dn.salesOrder,
          customer: dn.customer,
          date: dn.date,
          status: dn.status,
          reminderChannel: dn.reminderChannel,
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-delivery-note-new",
        title: "New Delivery Note",
        headerActions: [],
        extraActions: [],
        fields: [
          { key: "salesOrder", label: "Originating Sales Order", widget: "TextField", value: salesOrders[0]?.id ?? "" },
          { key: "customer", label: "Customer", widget: "TextField", value: customers[0]?.name ?? "" },
          { key: "date", label: "Delivery Date", widget: "TextField", value: "2026-08-22" },
          { key: "trackingNo", label: "Waybill / Tracking No", widget: "TextField", value: "" },
          { key: "status", label: "Delivery Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "QC Inspected", "In Transit", "Delivered"]) },
          { key: "reminderChannel", label: "Customer Notification Channel", widget: "Select", value: "WhatsApp", options: statusOptions(["WhatsApp", "Telegram", "Email"]) },
        ],
        listRoute: "/meridian/list/DeliveryNote",
      });
    }
    const dn = deliveryNotes.find((c) => c.id === id);
    if (!dn) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-delivery-note-${id}`,
      title: `Delivery Note: ${dn.id}`,
      headerActions: [
        button("print-dn-btn", "Cetak Surat Jalan", `/meridian/print/delivery-note/DeliveryNote/${dn.id}`, "primary", "truck"),
      ],
      extraActions: [
        button("gen-si-btn", "Generate Sales Invoice", `/meridian/edit/SalesInvoice/new`, "primary"),
      ],
      fields: [
        { key: "salesOrder", label: "Originating Sales Order", widget: "TextField", value: dn.salesOrder },
        { key: "customer", label: "Customer", widget: "TextField", value: dn.customer },
        { key: "date", label: "Delivery Date", widget: "TextField", value: dn.date },
        { key: "trackingNo", label: "Waybill / Tracking No", widget: "TextField", value: dn.trackingNo },
        { key: "status", label: "Delivery Status", widget: "Select", value: dn.status, options: statusOptions(["Draft", "QC Inspected", "In Transit", "Delivered"]) },
        { key: "reminderChannel", label: "Customer Notification Channel", widget: "Select", value: dn.reminderChannel, options: statusOptions(["WhatsApp", "Telegram", "Email"]) },
      ],
      listRoute: "/meridian/list/DeliveryNote",
    });
  },
  newRoute: "/meridian/edit/DeliveryNote/new",
};

registry.BillOfMaterials = {
  list: () =>
    buildListDocument({
      docId: "meridian-bom-list",
      title: "Bill of Materials (BOM)",
      columns: [
        { key: "id", label: "BOM Code" },
        { key: "item", label: "Finished Item" },
        { key: "routing", label: "Routing Sequence" },
        { key: "isDefault", label: "Default" },
        { key: "totalCost", label: "Standard Cost", align: "right" },
      ],
      records: boms.map((bom) => ({
        route: `/meridian/edit/BillOfMaterials/${bom.id}`,
        cells: {
          id: bom.id,
          item: bom.item,
          routing: bom.routing,
          isDefault: bom.isDefault ? "Yes" : "No",
          totalCost: formatIDR(bom.totalCost),
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-bom-new",
        title: "New Bill of Materials",
        fields: [
          { key: "item", label: "Finished Item", widget: "TextField", value: items[0]?.name ?? "" },
          { key: "quantity", label: "Base Quantity", widget: "TextField", value: "1" },
          { key: "routing", label: "Manufacturing Routing", widget: "TextField", value: "Standard Assembly" },
          { key: "isDefault", label: "Default Active BOM", widget: "Checkbox", value: false },
          { key: "totalCost", label: "Standard Unit Cost", widget: "TextField", value: "0" },
        ],
        listRoute: "/meridian/list/BillOfMaterials",
      });
    }
    const bom = boms.find((c) => c.id === id);
    if (!bom) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-bom-${id}`,
      title: `Bill of Materials: ${bom.item}`,
      fields: [
        { key: "item", label: "Finished Item", widget: "TextField", value: bom.item },
        { key: "quantity", label: "Base Quantity", widget: "TextField", value: String(bom.quantity) },
        { key: "routing", label: "Manufacturing Routing", widget: "TextField", value: bom.routing },
        { key: "isDefault", label: "Default Active BOM", widget: "Checkbox", value: bom.isDefault },
        { key: "totalCost", label: "Standard Unit Cost", widget: "TextField", value: formatIDR(bom.totalCost) },
      ],
      listRoute: "/meridian/list/BillOfMaterials",
    });
  },
  newRoute: "/meridian/edit/BillOfMaterials/new",
};

registry.WorkOrder = {
  list: () =>
    buildListDocument({
      docId: "meridian-work-order-list",
      title: "Work Orders (Production)",
      columns: [
        { key: "id", label: "Work Order" },
        { key: "productionPlan", label: "Production Plan" },
        { key: "item", label: "Item" },
        { key: "plannedQty", label: "Planned", align: "right" },
        { key: "producedQty", label: "Produced", align: "right" },
        { key: "status", label: "Status" },
      ],
      records: workOrders.map((wo) => ({
        route: `/meridian/edit/WorkOrder/${wo.id}`,
        cells: {
          id: wo.id,
          productionPlan: wo.productionPlan,
          item: wo.item,
          plannedQty: `${wo.plannedQty} units`,
          producedQty: `${wo.producedQty} units`,
          status: wo.status,
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-work-order-new",
        title: "New Work Order",
        fields: [
          { key: "productionPlan", label: "Production Plan", widget: "TextField", value: "PROD-PLAN-2026-08" },
          { key: "bom", label: "BOM Reference", widget: "TextField", value: "BOM-001" },
          { key: "item", label: "Item to Produce", widget: "TextField", value: items[0]?.name ?? "" },
          { key: "plannedQty", label: "Planned Quantity", widget: "TextField", value: "10" },
          { key: "producedQty", label: "Produced Quantity", widget: "TextField", value: "0" },
          { key: "status", label: "Status", widget: "Select", value: "Draft", options: statusOptions(["Draft", "In Progress", "Completed", "QC Hold"]) },
          { key: "plannedStartDate", label: "Planned Start Date", widget: "TextField", value: "2026-08-22" },
        ],
        listRoute: "/meridian/list/WorkOrder",
      });
    }
    const wo = workOrders.find((c) => c.id === id);
    if (!wo) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-work-order-${id}`,
      title: `Work Order: ${wo.id}`,
      fields: [
        { key: "productionPlan", label: "Production Plan", widget: "TextField", value: wo.productionPlan },
        { key: "bom", label: "BOM Reference", widget: "TextField", value: wo.bom },
        { key: "item", label: "Item to Produce", widget: "TextField", value: wo.item },
        { key: "plannedQty", label: "Planned Quantity", widget: "TextField", value: String(wo.plannedQty) },
        { key: "producedQty", label: "Produced Quantity", widget: "TextField", value: String(wo.producedQty) },
        { key: "status", label: "Status", widget: "Select", value: wo.status, options: statusOptions(["Draft", "In Progress", "Completed", "QC Hold"]) },
        { key: "plannedStartDate", label: "Planned Start Date", widget: "TextField", value: wo.plannedStartDate },
      ],
      listRoute: "/meridian/list/WorkOrder",
    });
  },
  newRoute: "/meridian/edit/WorkOrder/new",
};

registry.JobCard = {
  list: () =>
    buildListDocument({
      docId: "meridian-job-card-list",
      title: "Job Cards (Shop Floor)",
      columns: [
        { key: "id", label: "Job Card ID" },
        { key: "workOrder", label: "Work Order" },
        { key: "operation", label: "Operation Step" },
        { key: "workstation", label: "Workstation" },
        { key: "operator", label: "Operator" },
        { key: "status", label: "Status" },
        { key: "timeInMins", label: "Standard Time", align: "right" },
      ],
      records: jobCards.map((jc) => ({
        route: `/meridian/edit/JobCard/${jc.id}`,
        cells: {
          id: jc.id,
          workOrder: jc.workOrder,
          operation: jc.operation,
          workstation: jc.workstation,
          operator: jc.operator,
          status: jc.status,
          timeInMins: `${jc.timeInMins} mins`,
        },
      })),
    }),
  form: (id) => {
    if (id === "new") {
      return buildFlatFormDocument({
        docId: "meridian-job-card-new",
        title: "New Job Card",
        fields: [
          { key: "workOrder", label: "Work Order Reference", widget: "TextField", value: "WO-2026-08-001" },
          { key: "operation", label: "Operation", widget: "TextField", value: "Assembly Step 1" },
          { key: "workstation", label: "Workstation", widget: "TextField", value: "Workstation A" },
          { key: "operator", label: "Assigned Operator", widget: "TextField", value: "Operator 1" },
          { key: "status", label: "Status", widget: "Select", value: "Pending", options: statusOptions(["Pending", "In Progress", "Passed", "Failed"]) },
          { key: "timeInMins", label: "Standard Time (Mins)", widget: "TextField", value: "30" },
        ],
        listRoute: "/meridian/list/JobCard",
      });
    }
    const jc = jobCards.find((c) => c.id === id);
    if (!jc) return undefined;
    return buildFlatFormDocument({
      docId: `meridian-job-card-${id}`,
      title: `Job Card: ${jc.id}`,
      fields: [
        { key: "workOrder", label: "Work Order Reference", widget: "TextField", value: jc.workOrder },
        { key: "operation", label: "Operation", widget: "TextField", value: jc.operation },
        { key: "workstation", label: "Workstation", widget: "TextField", value: jc.workstation },
        { key: "operator", label: "Assigned Operator", widget: "TextField", value: jc.operator },
        { key: "status", label: "Status", widget: "Select", value: jc.status, options: statusOptions(["Pending", "In Progress", "Passed", "Failed"]) },
        { key: "timeInMins", label: "Standard Time (Mins)", widget: "TextField", value: String(jc.timeInMins) },
      ],
      listRoute: "/meridian/list/JobCard",
    });
  },
  newRoute: "/meridian/edit/JobCard/new",
};

// --- Master / config doctypes ported from Meridian (Meridian parity Slice 3) ---

function masterListForm<T extends { id: string }>(config: {
  doctype: string;
  title: string;
  records: T[];
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  cell: (row: T) => Record<string, string>;
  fields: (row: T) => Array<{ key: string; label: string; widget: "TextField" | "Select" | "Textarea"; value: string; options?: Array<{ value: string; label: string }> }>;
}): void {
  registry[config.doctype] = {
    list: () =>
      buildListDocument({
        docId: `meridian-${config.doctype.toLowerCase()}-list`,
        title: config.title,
        columns: config.columns,
        records: config.records.map((row) => ({ route: `/meridian/edit/${config.doctype}/${row.id}`, cells: config.cell(row) })),
      }),
    form: (id) => {
      const row = config.records.find((candidate) => candidate.id === id);
      if (!row) return undefined;
      return buildFlatFormDocument({
        docId: `meridian-${config.doctype.toLowerCase()}-${id}`,
        title: `${config.title}: ${id}`,
        fields: config.fields(row),
        listRoute: `/meridian/list/${config.doctype}`,
      });
    },
  };
}

masterListForm({
  doctype: "ItemGroup",
  title: "Item Groups",
  records: itemGroups,
  columns: [
    { key: "name", label: "Item Group" },
    { key: "parent", label: "Parent" },
    { key: "itemCount", label: "Items", align: "right" },
  ],
  cell: (row) => ({ name: row.name, parent: row.parent || "—", itemCount: String(row.itemCount) }),
  fields: (row) => [
    { key: "name", label: "Name", widget: "TextField", value: row.name },
    { key: "parent", label: "Parent Item Group", widget: "TextField", value: row.parent },
  ],
});

masterListForm({
  doctype: "UOM",
  title: "Units of Measure",
  records: unitsOfMeasure,
  columns: [
    { key: "name", label: "UOM" },
    { key: "isWhole", label: "Whole Number" },
    { key: "conversions", label: "Conversions" },
  ],
  cell: (row) => ({
    name: row.name,
    isWhole: row.isWhole ? "Yes" : "No",
    conversions: row.conversions.length ? row.conversions.map((c) => `1 → ${c.factor} ${c.toUOM}`).join(", ") : "—",
  }),
  fields: (row) => [
    { key: "name", label: "Name", widget: "TextField", value: row.name },
    { key: "isWhole", label: "Whole Number Only", widget: "Select", value: row.isWhole ? "Yes" : "No", options: statusOptions(["Yes", "No"]) },
    { key: "conversions", label: "Conversions", widget: "Textarea", value: row.conversions.map((c) => `1 ${row.name} = ${c.factor} ${c.toUOM}`).join("\n") },
  ],
});

masterListForm({
  doctype: "Address",
  title: "Addresses",
  records: addresses,
  columns: [
    { key: "title", label: "Title" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
  ],
  cell: (row) => ({ title: row.title, city: row.city, country: row.country }),
  fields: (row) => [
    { key: "title", label: "Address Title", widget: "TextField", value: row.title },
    { key: "line1", label: "Address Line 1", widget: "TextField", value: row.line1 },
    { key: "city", label: "City", widget: "TextField", value: row.city },
    { key: "postalCode", label: "Postal Code", widget: "TextField", value: row.postalCode },
    { key: "country", label: "Country", widget: "TextField", value: row.country },
  ],
});

masterListForm({
  doctype: "Location",
  title: "Locations",
  records: locations,
  columns: [
    { key: "name", label: "Location" },
    { key: "parent", label: "Parent" },
    { key: "address", label: "Address" },
  ],
  cell: (row) => ({ name: row.isGroup ? `${row.name} (Group)` : row.name, parent: row.parent || "—", address: row.address }),
  fields: (row) => [
    { key: "name", label: "Location Name", widget: "TextField", value: row.name },
    { key: "parent", label: "Parent Location", widget: "TextField", value: row.parent },
    { key: "isGroup", label: "Is Group", widget: "Select", value: row.isGroup ? "Yes" : "No", options: statusOptions(["Yes", "No"]) },
    { key: "address", label: "Address", widget: "TextField", value: row.address },
  ],
});

masterListForm({
  doctype: "Batch",
  title: "Batches",
  records: batches,
  columns: [
    { key: "id", label: "Batch" },
    { key: "item", label: "Item" },
    { key: "expiryDate", label: "Expiry" },
    { key: "quantity", label: "Qty", align: "right" },
  ],
  cell: (row) => ({ id: row.id, item: row.item, expiryDate: row.expiryDate, quantity: String(row.quantity) }),
  fields: (row) => [
    { key: "id", label: "Batch ID", widget: "TextField", value: row.id },
    { key: "item", label: "Item", widget: "TextField", value: row.item },
    { key: "manufacturingDate", label: "Manufacturing Date", widget: "TextField", value: row.manufacturingDate },
    { key: "expiryDate", label: "Expiry Date", widget: "TextField", value: row.expiryDate },
    { key: "quantity", label: "Batch Quantity", widget: "TextField", value: String(row.quantity) },
  ],
});

masterListForm({
  doctype: "SerialNumber",
  title: "Serial Numbers",
  records: serialNumbers,
  columns: [
    { key: "id", label: "Serial No" },
    { key: "item", label: "Item" },
    { key: "warehouse", label: "Warehouse" },
    { key: "status", label: "Status" },
  ],
  cell: (row) => ({ id: row.id, item: row.item, warehouse: row.warehouse, status: row.status }),
  fields: (row) => [
    { key: "id", label: "Serial Number", widget: "TextField", value: row.id },
    { key: "item", label: "Item", widget: "TextField", value: row.item },
    { key: "warehouse", label: "Warehouse", widget: "TextField", value: row.warehouse },
    { key: "status", label: "Status", widget: "Select", value: row.status, options: statusOptions(["Active", "Delivered", "Inactive"]) },
    { key: "purchaseDate", label: "Purchase Date", widget: "TextField", value: row.purchaseDate },
  ],
});

masterListForm({
  doctype: "PaymentMethod",
  title: "Payment Methods",
  records: paymentMethods,
  columns: [
    { key: "name", label: "Method" },
    { key: "type", label: "Type" },
    { key: "account", label: "Account" },
  ],
  cell: (row) => ({ name: row.name, type: row.type, account: row.account }),
  fields: (row) => [
    { key: "name", label: "Name", widget: "TextField", value: row.name },
    { key: "type", label: "Type", widget: "Select", value: row.type, options: statusOptions(["Cash", "Bank", "Card", "Wallet"]) },
    { key: "account", label: "Deposit Account", widget: "TextField", value: row.account },
  ],
});

masterListForm({
  doctype: "POSProfile",
  title: "POS Profiles",
  records: posProfiles,
  columns: [
    { key: "name", label: "Profile" },
    { key: "location", label: "Location" },
    { key: "posUI", label: "UI" },
  ],
  cell: (row) => ({ name: row.name, location: row.location, posUI: row.posUI }),
  fields: (row) => [
    { key: "name", label: "Profile Name", widget: "TextField", value: row.name },
    { key: "location", label: "Inventory Location", widget: "TextField", value: row.location },
    { key: "cashAccount", label: "Cash Account", widget: "TextField", value: row.cashAccount },
    { key: "writeOffAccount", label: "Write Off Account", widget: "TextField", value: row.writeOffAccount },
    { key: "posUI", label: "POS UI", widget: "Select", value: row.posUI, options: statusOptions(["Classic", "Modern"]) },
  ],
});

export function getPageRegistryEntry(doctype: string): PageRegistryEntry | undefined {
  return registry[doctype];
}

export function listDoctypes(): string[] {
  return Object.keys(registry);
}
