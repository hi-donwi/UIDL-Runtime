import type { ShellNavGroup, ShellNavItem } from "../MeridianShell";

/**
 * The Meridian navigation tree: the standard double-entry accounting desk, grouped the way an
 * operator moves through it — Sales and Purchases as the two transaction sides, Common for the
 * masters both share, then Reports, Inventory and POS.
 *
 * Every route points at the `/meridian/...` scheme this reference serves. Groups that a live
 * product would show conditionally (Inventory and POS behind a settings toggle, regional tax
 * screens behind a tax registration) are always visible here, because the reference runs on
 * fixed data rather than a configured tenant.
 */

/**
 * A list item stays "active" (keeping its group expanded) while viewing either the list itself
 * or an edit page for a record of that doctype — matching the real sidebar's own
 * `isItemActive`, which does the same `params.schemaName === item.schemaName` check.
 */
function listItem(label: string, doctype: string): ShellNavItem {
  const path = `/meridian/list/${doctype}`;
  return {
    label,
    path,
    isActive: (activePath) => activePath === path || activePath.startsWith(`/meridian/edit/${doctype}/`),
  };
}

export const MERIDIAN_SIDEBAR: ShellNavGroup[] = [
  {
    label: "Get Started",
    items: [
      { label: "Get Started", path: "/meridian/get-started" },
      { label: "Setup Wizard", path: "/meridian/setup-wizard" },
    ],
  },
  {
    label: "Dashboard",
    items: [{ label: "Dashboard", path: "/meridian/dashboard" }],
  },
  {
    label: "Sales",
    items: [
      listItem("Sales Quotes", "SalesQuote"),
      listItem("Sales Orders", "SalesOrder"),
      listItem("Delivery Notes", "DeliveryNote"),
      listItem("Sales Invoices", "SalesInvoice"),
      listItem("Credit Notes", "CreditNote"),
      listItem("Sales Payments", "SalesPayment"),
      listItem("Quote-to-Cash Tracker", "SalesLifecycleTracker"),
      listItem("Customers", "Customer"),
      listItem("Sales Items", "SalesItem"),
      listItem("Loyalty Program", "LoyaltyProgram"),
      listItem("Lead", "Lead"),
      listItem("Support Tickets", "SupportTicket"),
      listItem("Pricing Rule", "PricingRule"),
      listItem("Coupon Code", "CouponCode"),
    ],
  },
  {
    label: "Purchases",
    items: [
      listItem("Material Requests", "MaterialRequest"),
      listItem("Request for Quotations", "RequestForQuotation"),
      listItem("Supplier Quotations", "SupplierQuotation"),
      listItem("Purchase Orders", "PurchaseOrder"),
      listItem("Purchase Invoices", "PurchaseInvoice"),
      listItem("Purchase Payments", "PurchasePayment"),
      listItem("Procurement Tracker", "ProcurementTracker"),
      listItem("Supplier Scorecard", "SupplierScorecard"),
      listItem("Suppliers", "Supplier"),
      listItem("Purchase Items", "PurchaseItem"),
    ],
  },
  {
    label: "Common",
    items: [
      listItem("Journal Entry", "JournalEntry"),
      listItem("Party", "Party"),
      listItem("Items", "Item"),
      listItem("Item Groups", "ItemGroup"),
      listItem("Addresses", "Address"),
      listItem("Projects", "ProjectSummary"),
      listItem("Price List", "PriceList"),
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "General Ledger", path: "/meridian/report/GeneralLedger" },
      { label: "Profit And Loss", path: "/meridian/report/ProfitAndLoss" },
      { label: "Balance Sheet", path: "/meridian/report/BalanceSheet" },
      { label: "Trial Balance", path: "/meridian/report/TrialBalance" },
      { label: "Sales Invoice Ledger", path: "/meridian/report/SalesInvoiceLedger" },
      { label: "Accounts Receivable", path: "/meridian/report/AccountsReceivable" },
      { label: "Accounts Payable", path: "/meridian/report/AccountsPayable" },
    ],
  },
  {
    label: "Inventory",
    items: [
      listItem("Bill of Materials", "BillOfMaterials"),
      listItem("Work Orders", "WorkOrder"),
      listItem("Job Cards", "JobCard"),
      listItem("Stock Movement", "StockMovement"),
      listItem("Shipment", "Shipment"),
      listItem("Purchase Receipt", "PurchaseReceipt"),
      listItem("Locations", "Location"),
      listItem("Batches", "Batch"),
      listItem("Serial Numbers", "SerialNumber"),
      listItem("Quality Inspections", "QualityInspection"),
      listItem("MRP Readiness", "ManufacturingPlan"),
      { label: "Stock Ledger", path: "/meridian/report/StockLedger" },
      { label: "Stock Balance", path: "/meridian/report/StockBalance" },
      { label: "Inventory Reconciliation", path: "/meridian/report/InventoryReconciliation" },
      { label: "Stock Valuation Ledger", path: "/meridian/report/StockValuationLedger" },
    ],
  },
  {
    label: "POS",
    items: [
      { label: "Point of Sale", path: "/meridian/pos" },
      { label: "POS Shift Ledger", path: "/meridian/report/POSShiftLedger" },
      listItem("POS Profiles", "POSProfile"),
    ],
  },
  {
    label: "GST",
    items: [
      { label: "GSTR1", path: "/meridian/report/GSTR1" },
      { label: "GSTR2", path: "/meridian/report/GSTR2" },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Chart of Accounts", path: "/meridian/chart-of-accounts" },
      listItem("Accounting Dimensions", "AccountingDimension"),
      listItem("Tax Templates", "Tax"),
      listItem("Units of Measure", "UOM"),
      listItem("Payment Methods", "PaymentMethod"),
      listItem("Number Series", "NumberSeries"),
      { label: "Import Wizard", path: "/meridian/import-wizard" },
      listItem("Print Templates", "PrintTemplate"),
      { label: "Customize Form", path: "/meridian/customize-form" },
      { label: "Settings", path: "/meridian/settings" },
    ],
  },
];
