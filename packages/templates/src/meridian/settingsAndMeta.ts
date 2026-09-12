import type { UIDLDocument, UIDLNode } from "~/types";
import { button, text } from "./buildDocument";
import { customers, items, purchaseInvoices, salesInvoices, suppliers, taxTemplates } from "./mockData";

// ---------------------------------------------------------------------------
// Tabbed Settings (Meridian parity Slice 4).
//
// Meridian's Settings is a tab strip backed by singles — AccountingSettings,
// PrintSettings, SystemSettings, Defaults, InventorySettings. There is no Tabs primitive in
// this runtime, so the strip is a row of `setState` buttons and each panel is a
// `visibility`-gated Column, the same pattern pointOfSale.ts uses for its cart.
// ---------------------------------------------------------------------------

type SettingsWidget = "TextField" | "Select" | "Checkbox";

interface SettingsField {
  key: string;
  label: string;
  widget: SettingsWidget;
  value: unknown;
  options?: Array<{ value: string; label: string }>;
}

interface SettingsTab {
  id: string;
  label: string;
  fields: SettingsField[];
}

const SETTINGS_TABS: SettingsTab[] = [
  {
    id: "general",
    label: "General",
    fields: [
      { key: "companyName", label: "Company Name", widget: "TextField", value: "Meridian Trading Co." },
      { key: "country", label: "Country", widget: "TextField", value: "Indonesia" },
      { key: "currency", label: "Display Currency", widget: "Select", value: "IDR", options: [{ value: "IDR", label: "IDR - Indonesian Rupiah" }, { value: "USD", label: "USD - US Dollar" }] },
      { key: "email", label: "Company Email", widget: "TextField", value: "finance@meridian.co.id" },
      { key: "hideGetStarted", label: "Hide Get Started", widget: "Checkbox", value: false },
    ],
  },
  {
    id: "invoices",
    label: "Invoices",
    fields: [
      { key: "invoiceNumbering", label: "Sales Invoice Series", widget: "TextField", value: "SINV-.YYYY.-" },
      { key: "defaultTaxTemplate", label: "Default Sales Tax", widget: "Select", value: "TAX-PPN-OUT", options: taxTemplates.map((t) => ({ value: t.id, label: t.name })) },
      { key: "invoiceTerms", label: "Default Terms & Notes", widget: "TextField", value: "Pembayaran 30 hari sejak faktur diterima." },
      { key: "showHSN", label: "Show HSN / Item Code Column", widget: "Checkbox", value: true },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    fields: [
      { key: "fiscalYearStart", label: "Fiscal Year Start", widget: "TextField", value: "2027-04-01" },
      { key: "fiscalYearEnd", label: "Fiscal Year End", widget: "TextField", value: "2028-03-31" },
      { key: "enableInventory", label: "Enable Inventory", widget: "Checkbox", value: true },
      { key: "enableDiscountAccounting", label: "Enable Discount Accounting", widget: "Checkbox", value: false },
      { key: "writeOffAccount", label: "Write Off Account", widget: "TextField", value: "5190 - Selisih Kas" },
      { key: "roundOffAccount", label: "Round Off Account", widget: "TextField", value: "4190 - Pendapatan Lain-lain" },
    ],
  },
  {
    id: "print",
    label: "Print",
    fields: [
      { key: "printTemplate", label: "Default Print Template", widget: "Select", value: "PT-SINV-STANDARD", options: [{ value: "PT-SINV-STANDARD", label: "Standard Sales Invoice" }, { value: "PT-SINV-COMPACT", label: "Compact Sales Invoice" }] },
      { key: "printFont", label: "Print Font", widget: "Select", value: "Inter", options: [{ value: "Inter", label: "Inter" }, { value: "Roboto", label: "Roboto" }, { value: "Lora", label: "Lora" }] },
      { key: "displayLogo", label: "Show Company Logo", widget: "Checkbox", value: true },
      { key: "displayTaxInvoice", label: "Print as Faktur Pajak", widget: "Checkbox", value: true },
    ],
  },
  {
    id: "system",
    label: "System",
    fields: [
      { key: "dateFormat", label: "Date Format", widget: "Select", value: "dd/MM/yyyy", options: [{ value: "dd/MM/yyyy", label: "dd/MM/yyyy" }, { value: "yyyy-MM-dd", label: "yyyy-MM-dd" }, { value: "MMM d, yyyy", label: "MMM d, yyyy" }] },
      { key: "displayPrecision", label: "Display Precision", widget: "Select", value: "2", options: [{ value: "0", label: "0" }, { value: "2", label: "2" }, { value: "3", label: "3" }] },
      { key: "autoUpdate", label: "Check for Updates Automatically", widget: "Checkbox", value: true },
      { key: "telemetry", label: "Share Anonymous Usage Data", widget: "Checkbox", value: false },
    ],
  },
];

function settingsFieldNode(tabId: string, field: SettingsField): UIDLNode {
  // Bound to the document's own state with an onChange, the same shape buildDocument.ts's
  // formControlNode uses, so these are valid controlled inputs (no React warning).
  const key = `${tabId}.${field.key}`;
  const base = {
    id: `f-${tabId}-${field.key}`,
    type: field.widget,
    props: {
      "aria-label": field.label,
      ...(field.widget === "Checkbox"
        ? { label: field.label, checked: { $bind: `state.${key}` } }
        : { label: field.label, value: { $bind: `state.${key}` }, border: false, size: "small" }),
      ...(field.widget === "Select" ? { options: field.options ?? [] } : {}),
    },
    events: { onChange: [{ setState: { path: key, value: null } }] },
  };
  return base as UIDLNode;
}

export function buildSettingsDocument(): UIDLDocument {
  const state: Record<string, unknown> = { activeTab: "general" };
  for (const tab of SETTINGS_TABS) {
    const tabState: Record<string, unknown> = {};
    for (const field of tab.fields) tabState[field.key] = field.value;
    state[tab.id] = tabState;
  }

  const tabStrip: UIDLNode = {
    id: "settings-tabs",
    type: "Row",
    style: { gap: "gap-1", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
    children: SETTINGS_TABS.map((tab) => ({
      id: `tab-btn-${tab.id}`,
      type: "Button",
      props: { label: tab.label, variant: "secondary" },
      events: { onClick: [{ setState: { path: "activeTab", value: tab.id } }] },
    })),
  };

  const panels: UIDLNode[] = SETTINGS_TABS.map((tab) => ({
    id: `settings-panel-${tab.id}`,
    type: "Column",
    visibility: { condition: { "==": [{ path: "state.activeTab" }, { literal: tab.id }] } },
    style: { gap: "gap-4", padding: "p-4", maxWidth: "max-w-2xl" },
    children: [
      text(`panel-${tab.id}-title`, `${tab.label} Settings`, { fontSize: "text-base", fontWeight: 600 }),
      ...tab.fields.map((field) => settingsFieldNode(tab.id, field)),
    ],
  }));

  return {
    version: "1.0.0",
    id: "meridian-settings",
    name: "Settings",
    state,
    root: {
      id: "page",
      type: "Column",
      style: { gap: "gap-0" },
      children: [
        { id: "settings-title", type: "Text", props: { value: "Settings" }, style: { fontSize: "text-2xl", fontWeight: 700, padding: "p-4" } },
        tabStrip,
        ...panels,
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Setup Wizard (Meridian parity Slice 4).
//
// Meridian's first-run SetupWizard collects company / country / currency / fiscal year /
// bank / chart-of-accounts template, then creates the file. Rendered here as a structured
// review-style page (the runtime has no persistence for a real first-run flow).
// ---------------------------------------------------------------------------

interface WizardStep {
  label: string;
  fields: SettingsField[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    label: "1 · Company",
    fields: [
      { key: "companyName", label: "Company Name", widget: "TextField", value: "Meridian Trading Co." },
      { key: "email", label: "Company Email", widget: "TextField", value: "finance@meridian.co.id" },
      { key: "companyType", label: "Business Type", widget: "Select", value: "Trading", options: [{ value: "Trading", label: "Trading / Distribution" }, { value: "Manufacturing", label: "Manufacturing" }, { value: "Services", label: "Services" }] },
    ],
  },
  {
    label: "2 · Region & Fiscal Year",
    fields: [
      { key: "country", label: "Country", widget: "Select", value: "Indonesia", options: [{ value: "Indonesia", label: "Indonesia" }, { value: "Malaysia", label: "Malaysia" }, { value: "Singapore", label: "Singapore" }] },
      { key: "currency", label: "Currency", widget: "TextField", value: "IDR" },
      { key: "fiscalYearStart", label: "Fiscal Year Start", widget: "TextField", value: "2027-04-01" },
      { key: "fiscalYearEnd", label: "Fiscal Year End", widget: "TextField", value: "2028-03-31" },
    ],
  },
  {
    label: "3 · Financials",
    fields: [
      { key: "bankName", label: "Bank Account Name", widget: "TextField", value: "Bank Operasional" },
      { key: "chartOfAccounts", label: "Chart of Accounts Template", widget: "Select", value: "id-standard", options: [{ value: "id-standard", label: "Indonesia - Standard (PSAK)" }, { value: "id-umkm", label: "Indonesia - UMKM Simplified" }, { value: "blank", label: "Blank" }] },
      { key: "enableInventory", label: "Enable Inventory", widget: "Checkbox", value: true },
      { key: "enablePointOfSale", label: "Enable Point of Sale", widget: "Checkbox", value: true },
    ],
  },
];

export function buildSetupWizardDocument(): UIDLDocument {
  const state: Record<string, unknown> = {};
  for (const step of WIZARD_STEPS) for (const field of step.fields) state[field.key] = field.value;

  const stepNodes: UIDLNode[] = WIZARD_STEPS.map((step, index) => ({
    id: `wizard-step-${index}`,
    type: "Column",
    style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border", borderRadius: "rounded-lg" },
    children: [
      text(`wizard-step-${index}-title`, step.label, { fontSize: "text-base", fontWeight: 600 }),
      ...step.fields.map((field) => settingsFieldNode("wizard", { ...field, key: field.key })),
    ],
  }));

  return {
    version: "1.0.0",
    id: "meridian-setup-wizard",
    name: "Setup Wizard",
    state: { wizard: state },
    root: {
      id: "page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-4", maxWidth: "max-w-2xl" },
      children: [
        { id: "wizard-title", type: "Text", props: { value: "Set Up Your Company" }, style: { fontSize: "text-2xl", fontWeight: 700 } },
        { id: "wizard-intro", type: "Text", props: { value: "These details create your company file, fiscal year, and chart of accounts. You can change everything later in Settings." }, style: { fontSize: "text-sm", color: "{primitives.color.text-secondary}" } },
        ...stepNodes,
        {
          id: "wizard-actions",
          type: "Row",
          style: { gap: "gap-2", padding: "p-2" },
          children: [
            button("wizard-complete", "Complete Setup", "/meridian/dashboard", "primary"),
            button("wizard-cancel", "Cancel", "/meridian/get-started"),
          ],
        },
      ],
    },
  };
}

interface GetStartedItem {
  key: string;
  label: string;
  description: string;
  route: string;
  done: boolean;
}

interface GetStartedSection {
  label: string;
  items: GetStartedItem[];
}

/**
 * Sections/labels/descriptions ported directly from the real
 * utils/getStartedConfig.ts — "Organisation", "Accounts", "Sales",
 * "Purchase". Two of the real config's items (Print Settings, Opening Balances) are dropped:
 * neither has a page in this demo (no Print Settings form, no separate opening-balances flow),
 * and pointing "Set Up" at a route that doesn't exist would be a dead link, not a simplification.
 * `done` is derived from the same mock data every other page reads (customers.length > 0, etc.),
 * not a hand-typed flag — Meridian is a company that already onboarded, so most items are done,
 * matching what the real onboarding checklist would show for an equally-populated company.
 */
function getStartedSections(): GetStartedSection[] {
  return [
    {
      label: "Organisation",
      items: [
        { key: "general", label: "General", description: "Set up your company information, currency and fiscal year", route: "/meridian/settings", done: true },
        { key: "system", label: "System", description: "Setup system defaults like date format and currency", route: "/meridian/settings", done: true },
      ],
    },
    {
      label: "Accounts",
      items: [
        { key: "review-accounts", label: "Review Accounts", description: "Review your chart of accounts, add any account or tax heads as needed", route: "/meridian/chart-of-accounts", done: true },
        { key: "add-taxes", label: "Add Taxes", description: "Set up your tax templates for your sales or purchase transactions", route: "/meridian/list/Tax", done: taxTemplates.length > 0 },
      ],
    },
    {
      label: "Sales",
      items: [
        { key: "sales-items", label: "Add Items", description: "Add products or services that you sell to your customers", route: "/meridian/list/SalesItem", done: items.some((item) => item.for !== "Purchases") },
        { key: "add-customers", label: "Add Customers", description: "Add a few customers to create your first sales invoice", route: "/meridian/list/Customer", done: customers.length > 0 },
        { key: "sales-invoice", label: "Create Sales Invoice", description: "Create your first sales invoice for the created customer", route: "/meridian/list/SalesInvoice", done: salesInvoices.length > 0 },
      ],
    },
    {
      label: "Purchase",
      items: [
        { key: "purchase-items", label: "Add Items", description: "Add products or services that you buy from your suppliers", route: "/meridian/list/PurchaseItem", done: items.some((item) => item.for !== "Sales") },
        { key: "add-suppliers", label: "Add Suppliers", description: "Add a few suppliers to create your first purchase invoice", route: "/meridian/list/Supplier", done: suppliers.length > 0 },
        { key: "purchase-invoice", label: "Create Purchase Invoice", description: "Create your first purchase invoice from the created supplier", route: "/meridian/list/PurchaseInvoice", done: purchaseInvoices.length > 0 },
      ],
    },
  ];
}

function getStartedCard(item: GetStartedItem): UIDLNode {
  return {
    id: `card-${item.key}`,
    type: "Column",
    style: {
      gap: "gap-2",
      padding: "p-4",
      borderColor: "{primitives.color.border}",
      borderWidth: "border",
      borderRadius: "rounded-lg",
      justifyContent: "space-between",
    },
    children: [
      {
        id: `card-${item.key}-body`,
        type: "Column",
        style: { gap: "gap-1" },
        children: [
          text(`card-${item.key}-status`, item.done ? "✓ Done" : "Not started", {
            fontSize: "text-xs",
            fontWeight: 600,
            color: item.done ? "{primitives.color.text-primary}" : "{primitives.color.text-secondary}",
          }),
          text(`card-${item.key}-title`, item.label, { fontSize: "text-base", fontWeight: 600 }),
          text(`card-${item.key}-desc`, item.description, { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
        ],
      },
      button(`card-${item.key}-action`, item.done ? "Review" : "Set Up", item.route),
    ],
  };
}

function getStartedSectionNode(section: GetStartedSection): UIDLNode {
  return {
    id: `section-${section.label}`,
    type: "Column",
    style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
    children: [
      text(`section-${section.label}-title`, section.label, { fontSize: "text-base", fontWeight: 600 }),
      {
        id: `section-${section.label}-grid`,
        type: "GridView",
        props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" } },
        style: { gap: "gap-3" },
        children: section.items.map(getStartedCard),
      },
    ],
  };
}

/** Mirrors the real GetStarted: a title-only PageHeader, then one section per group of
 *  cards — same "Organisation / Accounts / Sales / Purchase" section labels, same card shape
 *  (status, title, description, one action button), no independent hover-reveal state. */
export function buildGetStartedDocument(): UIDLDocument {
  return {
    version: "1.0.0",
    id: "meridian-get-started",
    name: "Get Started",
    root: {
      id: "page",
      type: "Column",
      style: { gap: "gap-0" },
      children: [
        { id: "title", type: "Text", props: { value: "Set Up Your Workspace" }, style: { fontSize: "text-2xl", fontWeight: 700, padding: "p-4" } },
        ...getStartedSections().map(getStartedSectionNode),
      ],
    },
  };
}

function metaToolPage(id: string, title: string, description: string, whatItDoes: string[]): UIDLDocument {
  return {
    version: "1.0.0",
    id,
    name: title,
    root: {
      id: "page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-4", maxWidth: "max-w-2xl" },
      children: [
        { id: "title", type: "Text", props: { value: title }, style: { fontSize: "text-2xl", fontWeight: 700 } },
        { id: "description", type: "Text", props: { value: description }, style: { fontSize: "text-sm", color: "{primitives.color.text-secondary}" } },
        {
          id: "notice",
          type: "Column",
          style: { gap: "gap-2", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border", borderRadius: "rounded-lg", background: "{primitives.color.surface}" },
          children: [
            { id: "notice-title", type: "Text", props: { value: "In the Meridian, this tool:" }, style: { fontSize: "text-sm", fontWeight: 600 } },
            ...whatItDoes.map((line, index) => ({
              id: `notice-item-${index}`,
              type: "Text",
              props: { value: `• ${line}` },
              style: { fontSize: "text-sm" },
            })),
            {
              id: "notice-scope",
              type: "Text",
              props: { value: "Represented here as an illustrative page — it's a schema/config editor, not a data-entry flow, so it's out of scope for this JSON-runtime demo's mock data." },
              style: { fontSize: "text-xs", color: "{primitives.color.text-secondary}" },
            },
          ],
        },
      ],
    },
  };
}

export function buildImportWizardDocument(): UIDLDocument {
  return metaToolPage(
    "meridian-import-wizard",
    "Import Wizard",
    "Bulk-import records (customers, items, invoices, etc.) from a CSV/Excel file.",
    ["Maps spreadsheet columns to doctype fields", "Validates rows before import", "Reports per-row errors"],
  );
}

export function buildCustomizeFormDocument(): UIDLDocument {
  return metaToolPage(
    "meridian-customize-form",
    "Customize Form",
    "Add custom fields to any doctype's form and list view without writing code.",
    ["Adds/reorders fields on standard doctypes", "Sets field visibility and requiredness", "Applies instantly across list, form, and print views"],
  );
}

export function buildTemplateBuilderDocument(): UIDLDocument {
  return metaToolPage(
    "meridian-template-builder",
    "Template Builder",
    "A visual, drag-and-drop editor for print templates (invoices, receipts, statements).",
    ["WYSIWYG layout for print-size documents", "Bind fields from the source doctype", "Preview and export as the final print template"],
  );
}

export function buildErpCloudSyncDocument(): UIDLDocument {
  return metaToolPage(
    "meridian-erp-cloud-sync",
    "ERP Cloud Sync",
    "Konfigurasi sinkronisasi data dua arah dengan ERP Cloud instance.",
    [
      "Sinkronisasi otomatis faktur penjualan dan pembelian ke ERP Cloud",
      "Pembaruan status sinkronisasi real-time",
      "Penyelarasan stok, harga, dan entri jurnal multi-cabang",
    ],
  );
}

export function buildBackupRestoreDocument(): UIDLDocument {
  return metaToolPage(
    "meridian-backup-restore",
    "Backup & Restore",
    "Manajemen snapshot cadangan database lokal dan pemulihan data.",
    [
      "Ekspor file arsip snapshot JSON lengkap",
      "Impor dan verifikasi integritas database cadangan",
      "Reset data ke saldo awal pabrik jika diperlukan",
    ],
  );
}

