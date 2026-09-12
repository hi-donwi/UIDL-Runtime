/**
 * Shared master data for the "Meridian Trading Co." reference.
 *
 * Every generated page (list/form/report/dashboard)
 * reads from this one dataset so numbers agree everywhere a value is shown twice — an invoice's
 * customer is a real row in `customers`, GL/Trial Balance/P&L/Balance Sheet are all *derived*
 * from postings computed off `salesInvoices`/`purchaseInvoices`/`payments`/`journalEntries`
 * rather than hand-typed separately, so debit always equals credit by construction.
 */

export interface Account {
  id: string;
  name: string;
  parent: string | null;
  rootType: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  isGroup: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
}

export interface Item {
  id: string;
  name: string;
  unit: string;
  rate: number;
  for: "Sales" | "Purchases" | "Both";
  group: string;
}

export interface InvoiceLine {
  item: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface SalesInvoice {
  id: string;
  customer: string;
  date: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Unpaid" | "Paid" | "Overdue";
}

export interface PurchaseInvoice {
  id: string;
  supplier: string;
  date: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Unpaid" | "Paid" | "Overdue";
}

export interface Payment {
  id: string;
  party: string;
  partyType: "Customer" | "Supplier";
  type: "Receive" | "Pay";
  amount: number;
  method: "Cash" | "Bank Transfer" | "Card";
  date: string;
  reference: string;
}

export interface JournalEntryLine {
  account: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  entryType: string;
  narration: string;
  lines: JournalEntryLine[];
}

export interface SalesQuote {
  id: string;
  customer: string;
  date: string;
  validTill: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Submitted" | "Expired";
}

export interface CreditNote {
  id: string;
  invoice: string;
  customer: string;
  date: string;
  reason: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Submitted" | "Applied";
}

export interface PriceListEntry {
  item: string;
  rate: number;
}

export interface PriceList {
  id: string;
  name: string;
  kind: "Selling" | "Buying";
  entries: PriceListEntry[];
}

export interface TaxTemplate {
  id: string;
  name: string;
  rate: number;
  kind: "Sales" | "Purchase";
}

export interface StockEntry {
  id: string;
  item: string;
  warehouseFrom?: string;
  warehouseTo?: string;
  quantity: number;
  date: string;
}

export interface StockBalance {
  item: string;
  warehouse: string;
  quantity: number;
  valuationRate: number;
}

export interface Shipment {
  id: string;
  salesInvoice: string;
  customer: string;
  date: string;
  status: "Draft" | "Submitted" | "Delivered";
}

export interface PurchaseReceipt {
  id: string;
  purchaseInvoice: string;
  supplier: string;
  date: string;
  status: "Draft" | "Submitted";
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  pointsPerAmount: number;
  redemptionRate: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  status: "New" | "Contacted" | "Qualified" | "Lost";
}

export interface PricingRule {
  id: string;
  name: string;
  appliesTo: string;
  discountPercent: number;
}

export interface CouponCode {
  id: string;
  code: string;
  discountPercent: number;
  used: number;
  limit: number;
}

export interface AccountingDimension {
  id: string;
  dimensionName: string;
  referenceDocType: string;
  defaultDimension: string;
  mandatoryFor: "P&L" | "Balance Sheet" | "Both";
  coveragePercent: number;
}

export interface ProcurementTrackerRow {
  id: string;
  materialRequest: string;
  rfq: string;
  supplierQuotation: string;
  purchaseOrder: string;
  receiptStatus: string;
  paymentStatus: string;
  value: number;
}

export interface SalesLifecycleRow {
  id: string;
  quotation: string;
  salesOrder: string;
  delivery: string;
  invoice: string;
  paymentReminder: "Email" | "WhatsApp" | "Telegram" | "None";
  value: number;
}

export interface ManufacturingPlanRow {
  id: string;
  productionPlan: string;
  item: string;
  projectedQty: number;
  shortfallQty: number;
  materialRequest: string;
  workOrder: string;
  qcGate: string;
}

export interface SupplierScorecardRow {
  id: string;
  supplier: string;
  onTimeDeliveryRate: number;
  defectRate: number;
  responsivenessScore: number;
  standing: "Preferred" | "Watch" | "Restricted";
}

export interface QualityInspection {
  id: string;
  referenceType: "Purchase Receipt" | "Delivery" | "Job Card";
  referenceId: string;
  item: string;
  sampleSize: number;
  defectCount: number;
  status: "Passed" | "Hold" | "Rejected";
  inspectedBy: string;
  date: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  customer: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved";
  slaDue: string;
  responseTimeMinutes: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  customer: string;
  budget: number;
  actualSpend: number;
  progressPercent: number;
  status: "In Progress" | "On Track" | "Completed";
}

export interface MaterialRequest {
  id: string;
  item: string;
  quantity: number;
  warehouse: string;
  requiredDate: string;
  status: "Draft" | "Pending RFQ" | "Ordered" | "Fulfilled";
  purpose: "Purchase" | "Manufacture" | "Auto Reorder";
}

export interface RequestForQuotation {
  id: string;
  materialRequest: string;
  item: string;
  quantity: number;
  date: string;
  validTill: string;
  status: "Draft" | "Sent" | "Comparing" | "Awarded";
}

export interface SupplierQuotation {
  id: string;
  rfq: string;
  supplier: string;
  item: string;
  rate: number;
  leadTimeDays: number;
  status: "Submitted" | "Accepted" | "Rejected";
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  quotationRef?: string;
  date: string;
  deliveryDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Submitted" | "Partially Received" | "Completed";
}

export interface SalesOrder {
  id: string;
  customer: string;
  quoteRef?: string;
  date: string;
  deliveryDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Submitted" | "In Production" | "Delivered" | "Invoiced";
}

export interface DeliveryNote {
  id: string;
  salesOrder: string;
  customer: string;
  date: string;
  status: "Draft" | "QC Inspected" | "In Transit" | "Delivered";
  trackingNo: string;
  reminderChannel: "WhatsApp" | "Telegram" | "Email";
}

export interface BOMRawMaterial {
  item: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface BillOfMaterials {
  id: string;
  item: string;
  quantity: number;
  totalCost: number;
  routing: string;
  isDefault: boolean;
  rawMaterials: BOMRawMaterial[];
}

export interface WorkOrder {
  id: string;
  productionPlan: string;
  bom: string;
  item: string;
  plannedQty: number;
  producedQty: number;
  status: "Draft" | "In Progress" | "Completed" | "QC Hold";
  plannedStartDate: string;
}

export interface JobCard {
  id: string;
  workOrder: string;
  operation: string;
  workstation: string;
  operator: string;
  status: "Pending" | "In Progress" | "Passed" | "Failed";
  timeInMins: number;
}

function sumLines(lines: InvoiceLine[]): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

function line(item: string, description: string, quantity: number, rate: number): InvoiceLine {
  return { item, description, quantity, rate, amount: quantity * rate };
}

const TAX_RATE = 0.11;

function invoice(
  lines: InvoiceLine[],
): { lines: InvoiceLine[]; subtotal: number; tax: number; total: number } {
  const subtotal = sumLines(lines);
  const tax = Math.round(subtotal * TAX_RATE);
  return { lines, subtotal, tax, total: subtotal + tax };
}

export const accounts: Account[] = [
  { id: "assets", name: "Assets", parent: null, rootType: "Asset", isGroup: true },
  { id: "current-assets", name: "Current Assets", parent: "assets", rootType: "Asset", isGroup: true },
  { id: "cash", name: "Cash", parent: "current-assets", rootType: "Asset", isGroup: false },
  { id: "bank", name: "Bank Operasional", parent: "current-assets", rootType: "Asset", isGroup: false },
  { id: "accounts-receivable", name: "Accounts Receivable", parent: "current-assets", rootType: "Asset", isGroup: false },
  { id: "inventory", name: "Inventory", parent: "current-assets", rootType: "Asset", isGroup: false },
  // PPN Masukan (input VAT) is a tax *credit* the company can offset against what it owes — an
  // asset (input tax credit receivable), not a liability. Modeling it as a Liability account
  // posted only with debits produced a confusing negative liability balance; this is the correct
  // classification, not just a cosmetic fix (verified: the Balance Sheet still balances either
  // way, since accountBalance() only cares about postings, not which side an account sits on).
  { id: "tax-credit-input", name: "Input Tax Credit - PPN Masukan", parent: "current-assets", rootType: "Asset", isGroup: false },
  { id: "fixed-assets", name: "Fixed Assets", parent: "assets", rootType: "Asset", isGroup: true },
  { id: "office-equipment", name: "Office Equipment", parent: "fixed-assets", rootType: "Asset", isGroup: false },

  { id: "liabilities", name: "Liabilities", parent: null, rootType: "Liability", isGroup: true },
  { id: "current-liabilities", name: "Current Liabilities", parent: "liabilities", rootType: "Liability", isGroup: true },
  { id: "accounts-payable", name: "Accounts Payable", parent: "current-liabilities", rootType: "Liability", isGroup: false },
  { id: "tax-payable-output", name: "Tax Payable - PPN Keluaran", parent: "current-liabilities", rootType: "Liability", isGroup: false },

  { id: "equity", name: "Equity", parent: null, rootType: "Equity", isGroup: true },
  { id: "owners-equity", name: "Owner's Equity", parent: "equity", rootType: "Equity", isGroup: false },
  { id: "retained-earnings", name: "Retained Earnings", parent: "equity", rootType: "Equity", isGroup: false },

  { id: "income", name: "Income", parent: null, rootType: "Income", isGroup: true },
  { id: "sales", name: "Sales", parent: "income", rootType: "Income", isGroup: false },
  { id: "service-income", name: "Service Income", parent: "income", rootType: "Income", isGroup: false },

  { id: "expense", name: "Expense", parent: null, rootType: "Expense", isGroup: true },
  { id: "cost-of-goods-sold", name: "Cost of Goods Sold", parent: "expense", rootType: "Expense", isGroup: false },
  { id: "rent-expense", name: "Rent Expense", parent: "expense", rootType: "Expense", isGroup: false },
  { id: "salaries-expense", name: "Salaries Expense", parent: "expense", rootType: "Expense", isGroup: false },
  { id: "utilities-expense", name: "Utilities Expense", parent: "expense", rootType: "Expense", isGroup: false },
];

export const customers: Customer[] = [
  { id: "CUST-001", name: "PT Sinar Abadi Jaya", email: "finance@sinarabadi.co.id", phone: "021-5551001", city: "Jakarta" },
  { id: "CUST-002", name: "CV Mitra Sejahtera", email: "ap@mitrasejahtera.co.id", phone: "022-5551002", city: "Bandung" },
  { id: "CUST-003", name: "Toko Berkah Makmur", email: "toko.berkah@gmail.com", phone: "031-5551003", city: "Surabaya" },
  { id: "CUST-004", name: "PT Cahaya Nusantara", email: "procurement@cahayanusantara.co.id", phone: "021-5551004", city: "Jakarta" },
  { id: "CUST-005", name: "UD Sumber Rejeki", email: "sumberrejeki.ud@gmail.com", phone: "0274-5551005", city: "Yogyakarta" },
  { id: "CUST-006", name: "PT Global Trading Indonesia", email: "ap@globaltrading.co.id", phone: "021-5551006", city: "Jakarta" },
  { id: "CUST-007", name: "CV Karya Utama", email: "finance@karyautama.co.id", phone: "024-5551007", city: "Semarang" },
  { id: "CUST-008", name: "Toko Maju Bersama", email: "majubersama.toko@gmail.com", phone: "061-5551008", city: "Medan" },
];

export const suppliers: Supplier[] = [
  { id: "SUPP-001", name: "PT Distribusi Utama", email: "sales@distribusiutama.co.id", phone: "021-5552001", city: "Jakarta" },
  { id: "SUPP-002", name: "CV Bahan Baku Sejahtera", email: "order@bahanbaku.co.id", phone: "022-5552002", city: "Bandung" },
  { id: "SUPP-003", name: "PT Logistik Cepat", email: "cs@logistikcepat.co.id", phone: "021-5552003", city: "Jakarta" },
  { id: "SUPP-004", name: "UD Sumber Material", email: "sumbermaterial@gmail.com", phone: "0274-5552004", city: "Yogyakarta" },
  { id: "SUPP-005", name: "PT Kemasan Prima", email: "sales@kemasanprima.co.id", phone: "031-5552005", city: "Surabaya" },
  { id: "SUPP-006", name: "CV Elektronik Jaya", email: "order@elektronikjaya.co.id", phone: "021-5552006", city: "Jakarta" },
];

export const items: Item[] = [
  { id: "ITEM-001", name: "Kertas A4 80gsm", unit: "Rim", rate: 45000, for: "Both", group: "Office Supplies" },
  { id: "ITEM-002", name: "Tinta Printer Hitam", unit: "Pcs", rate: 85000, for: "Both", group: "Office Supplies" },
  { id: "ITEM-003", name: 'Laptop Business 14"', unit: "Unit", rate: 8500000, for: "Sales", group: "Electronics" },
  { id: "ITEM-004", name: 'Monitor LED 24"', unit: "Unit", rate: 1750000, for: "Sales", group: "Electronics" },
  { id: "ITEM-005", name: "Meja Kantor", unit: "Unit", rate: 1200000, for: "Sales", group: "Furniture" },
  { id: "ITEM-006", name: "Kursi Kantor Ergonomis", unit: "Unit", rate: 950000, for: "Sales", group: "Furniture" },
  { id: "ITEM-007", name: "Kabel HDMI 2m", unit: "Pcs", rate: 45000, for: "Both", group: "Electronics" },
  { id: "ITEM-008", name: "Raw Material - Kayu Jati", unit: "M3", rate: 3500000, for: "Purchases", group: "Raw Material" },
  { id: "ITEM-009", name: "Raw Material - Besi Plat", unit: "Kg", rate: 25000, for: "Purchases", group: "Raw Material" },
  { id: "ITEM-010", name: "Jasa Instalasi", unit: "Jasa", rate: 500000, for: "Sales", group: "Services" },
  { id: "ITEM-011", name: "Jasa Maintenance", unit: "Jasa", rate: 350000, for: "Sales", group: "Services" },
  { id: "ITEM-012", name: "Box Packaging", unit: "Pcs", rate: 12000, for: "Purchases", group: "Packaging" },
];

export const salesInvoices: SalesInvoice[] = [
  { id: "SINV-2027-00001", customer: "CUST-001", date: "2027-07-02", dueDate: "2027-08-01", status: "Paid", ...invoice([line("ITEM-003", 'Laptop Business 14"', 3, 8500000), line("ITEM-004", 'Monitor LED 24"', 3, 1750000)]) },
  { id: "SINV-2027-00002", customer: "CUST-002", date: "2027-07-05", dueDate: "2027-08-04", status: "Paid", ...invoice([line("ITEM-005", "Meja Kantor", 4, 1200000), line("ITEM-006", "Kursi Kantor Ergonomis", 4, 950000)]) },
  { id: "SINV-2027-00003", customer: "CUST-003", date: "2027-07-09", dueDate: "2027-08-08", status: "Unpaid", ...invoice([line("ITEM-001", "Kertas A4 80gsm", 20, 45000), line("ITEM-002", "Tinta Printer Hitam", 10, 85000)]) },
  { id: "SINV-2027-00004", customer: "CUST-004", date: "2027-07-12", dueDate: "2027-08-11", status: "Overdue", ...invoice([line("ITEM-003", 'Laptop Business 14"', 5, 8500000)]) },
  { id: "SINV-2027-00005", customer: "CUST-005", date: "2027-07-15", dueDate: "2027-08-14", status: "Paid", ...invoice([line("ITEM-010", "Jasa Instalasi", 2, 500000), line("ITEM-011", "Jasa Maintenance", 4, 350000)]) },
  { id: "SINV-2027-00006", customer: "CUST-006", date: "2027-07-18", dueDate: "2027-08-17", status: "Unpaid", ...invoice([line("ITEM-004", 'Monitor LED 24"', 8, 1750000), line("ITEM-007", "Kabel HDMI 2m", 8, 45000)]) },
  { id: "SINV-2027-00007", customer: "CUST-007", date: "2027-07-21", dueDate: "2027-08-20", status: "Overdue", ...invoice([line("ITEM-006", "Kursi Kantor Ergonomis", 10, 950000)]) },
  { id: "SINV-2027-00008", customer: "CUST-008", date: "2027-07-24", dueDate: "2027-08-23", status: "Paid", ...invoice([line("ITEM-001", "Kertas A4 80gsm", 15, 45000), line("ITEM-002", "Tinta Printer Hitam", 6, 85000)]) },
  { id: "SINV-2027-00009", customer: "CUST-001", date: "2027-07-27", dueDate: "2027-08-26", status: "Unpaid", ...invoice([line("ITEM-005", "Meja Kantor", 2, 1200000), line("ITEM-010", "Jasa Instalasi", 1, 500000)]) },
  { id: "SINV-2027-00010", customer: "CUST-003", date: "2027-07-30", dueDate: "2027-08-29", status: "Draft", ...invoice([line("ITEM-003", 'Laptop Business 14"', 1, 8500000)]) },
];

export const purchaseInvoices: PurchaseInvoice[] = [
  { id: "PINV-2027-00001", supplier: "SUPP-001", date: "2027-07-03", dueDate: "2027-08-02", status: "Paid", ...invoice([line("ITEM-001", "Kertas A4 80gsm", 50, 32000), line("ITEM-002", "Tinta Printer Hitam", 20, 60000)]) },
  { id: "PINV-2027-00002", supplier: "SUPP-002", date: "2027-07-06", dueDate: "2027-08-05", status: "Unpaid", ...invoice([line("ITEM-008", "Raw Material - Kayu Jati", 6, 3200000)]) },
  { id: "PINV-2027-00003", supplier: "SUPP-003", date: "2027-07-10", dueDate: "2027-08-09", status: "Paid", ...invoice([line("ITEM-009", "Raw Material - Besi Plat", 400, 22000)]) },
  { id: "PINV-2027-00004", supplier: "SUPP-004", date: "2027-07-13", dueDate: "2027-08-12", status: "Overdue", ...invoice([line("ITEM-009", "Raw Material - Besi Plat", 250, 22000)]) },
  { id: "PINV-2027-00005", supplier: "SUPP-005", date: "2027-07-17", dueDate: "2027-08-16", status: "Unpaid", ...invoice([line("ITEM-012", "Box Packaging", 800, 10500)]) },
  { id: "PINV-2027-00006", supplier: "SUPP-006", date: "2027-07-20", dueDate: "2027-08-19", status: "Paid", ...invoice([line("ITEM-007", "Kabel HDMI 2m", 40, 32000)]) },
  { id: "PINV-2027-00007", supplier: "SUPP-001", date: "2027-07-23", dueDate: "2027-08-22", status: "Unpaid", ...invoice([line("ITEM-001", "Kertas A4 80gsm", 30, 32000)]) },
  { id: "PINV-2027-00008", supplier: "SUPP-002", date: "2027-07-26", dueDate: "2027-08-25", status: "Draft", ...invoice([line("ITEM-008", "Raw Material - Kayu Jati", 2, 3200000)]) },
];

function salesInvoiceTotal(id: string): number {
  const found = salesInvoices.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown sales invoice: ${id}`);
  return found.total;
}

function purchaseInvoiceTotal(id: string): number {
  const found = purchaseInvoices.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown purchase invoice: ${id}`);
  return found.total;
}

// Payment amounts are derived from the referenced invoice's own computed `total` (never a second
// hand-typed number) so a "Paid" invoice's payment always reconciles exactly; partial payments
// (against invoices still Unpaid/Overdue) are an explicit fraction of that same total.
export const payments: Payment[] = [
  { id: "PAY-2027-00001", party: "CUST-001", partyType: "Customer", type: "Receive", amount: salesInvoiceTotal("SINV-2027-00001"), method: "Bank Transfer", date: "2027-07-20", reference: "SINV-2027-00001" },
  { id: "PAY-2027-00002", party: "CUST-002", partyType: "Customer", type: "Receive", amount: salesInvoiceTotal("SINV-2027-00002"), method: "Bank Transfer", date: "2027-07-22", reference: "SINV-2027-00002" },
  { id: "PAY-2027-00003", party: "CUST-005", partyType: "Customer", type: "Receive", amount: salesInvoiceTotal("SINV-2027-00005"), method: "Cash", date: "2027-07-25", reference: "SINV-2027-00005" },
  { id: "PAY-2027-00004", party: "CUST-008", partyType: "Customer", type: "Receive", amount: salesInvoiceTotal("SINV-2027-00008"), method: "Card", date: "2027-08-01", reference: "SINV-2027-00008" },
  { id: "PAY-2027-00005", party: "SUPP-001", partyType: "Supplier", type: "Pay", amount: purchaseInvoiceTotal("PINV-2027-00001"), method: "Bank Transfer", date: "2027-07-24", reference: "PINV-2027-00001" },
  { id: "PAY-2027-00006", party: "SUPP-003", partyType: "Supplier", type: "Pay", amount: purchaseInvoiceTotal("PINV-2027-00003"), method: "Bank Transfer", date: "2027-07-28", reference: "PINV-2027-00003" },
  { id: "PAY-2027-00007", party: "SUPP-006", partyType: "Supplier", type: "Pay", amount: purchaseInvoiceTotal("PINV-2027-00006"), method: "Bank Transfer", date: "2027-08-01", reference: "PINV-2027-00006" },
  { id: "PAY-2027-00008", party: "CUST-001", partyType: "Customer", type: "Receive", amount: Math.round(salesInvoiceTotal("SINV-2027-00009") * 0.5), method: "Cash", date: "2027-08-02", reference: "SINV-2027-00009" },
  { id: "PAY-2027-00009", party: "CUST-003", partyType: "Customer", type: "Receive", amount: Math.round(salesInvoiceTotal("SINV-2027-00003") * 0.3), method: "Cash", date: "2027-08-03", reference: "SINV-2027-00003" },
  { id: "PAY-2027-00010", party: "SUPP-002", partyType: "Supplier", type: "Pay", amount: Math.round(purchaseInvoiceTotal("PINV-2027-00002") * 0.3), method: "Bank Transfer", date: "2027-08-04", reference: "PINV-2027-00002" },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "JE-2027-00001", date: "2027-07-01", entryType: "Opening Balance", narration: "Opening balances for FY2027",
    lines: [
      { account: "cash", debit: 25000000, credit: 0 },
      { account: "bank", debit: 80000000, credit: 0 },
      { account: "office-equipment", debit: 45000000, credit: 0 },
      { account: "owners-equity", debit: 0, credit: 150000000 },
    ],
  },
  {
    id: "JE-2027-00002", date: "2027-07-15", entryType: "Journal Entry", narration: "Office rent for July 2027",
    lines: [
      { account: "rent-expense", debit: 12000000, credit: 0 },
      { account: "bank", debit: 0, credit: 12000000 },
    ],
  },
  {
    id: "JE-2027-00003", date: "2027-07-25", entryType: "Journal Entry", narration: "Staff salaries for July 2027",
    lines: [
      { account: "salaries-expense", debit: 38000000, credit: 0 },
      { account: "bank", debit: 0, credit: 38000000 },
    ],
  },
  {
    id: "JE-2027-00004", date: "2027-07-28", entryType: "Journal Entry", narration: "Electricity and water, July 2027",
    lines: [
      { account: "utilities-expense", debit: 4200000, credit: 0 },
      { account: "cash", debit: 0, credit: 4200000 },
    ],
  },
  {
    id: "JE-2027-00005", date: "2027-07-30", entryType: "Journal Entry", narration: "Cash deposited to bank",
    lines: [
      { account: "bank", debit: 10000000, credit: 0 },
      { account: "cash", debit: 0, credit: 10000000 },
    ],
  },
  {
    id: "JE-2027-00006", date: "2027-07-31", entryType: "Journal Entry", narration: "Depreciation adjustment (illustrative)",
    lines: [
      { account: "utilities-expense", debit: 800000, credit: 0 },
      { account: "office-equipment", debit: 0, credit: 800000 },
    ],
  },
];

export const salesQuotes: SalesQuote[] = [
  { id: "SQTN-2027-00001", customer: "CUST-004", date: "2027-07-08", validTill: "2027-08-08", status: "Submitted", ...invoice([line("ITEM-003", 'Laptop Business 14"', 10, 8500000)]) },
  { id: "SQTN-2027-00002", customer: "CUST-006", date: "2027-07-11", validTill: "2027-08-11", status: "Submitted", ...invoice([line("ITEM-005", "Meja Kantor", 6, 1200000), line("ITEM-006", "Kursi Kantor Ergonomis", 6, 950000)]) },
  { id: "SQTN-2027-00003", customer: "CUST-007", date: "2027-07-14", validTill: "2027-07-28", status: "Expired", ...invoice([line("ITEM-004", 'Monitor LED 24"', 4, 1750000)]) },
  { id: "SQTN-2027-00004", customer: "CUST-002", date: "2027-07-19", validTill: "2027-08-19", status: "Draft", ...invoice([line("ITEM-010", "Jasa Instalasi", 3, 500000)]) },
  { id: "SQTN-2027-00005", customer: "CUST-008", date: "2027-07-26", validTill: "2027-08-26", status: "Submitted", ...invoice([line("ITEM-001", "Kertas A4 80gsm", 40, 45000)]) },
];

export const creditNotes: CreditNote[] = [
  {
    id: "CN-2027-00001",
    invoice: "SINV-2027-00001",
    customer: "CUST-001",
    date: "2027-07-15",
    reason: "Unit monitor ada dead pixel / garansi retur",
    ...invoice([line("ITEM-004", 'Monitor LED 24"', 1, 1750000)]),
    status: "Submitted",
  },
  {
    id: "CN-2027-00002",
    invoice: "SINV-2027-00002",
    customer: "CUST-002",
    date: "2027-07-22",
    reason: "Pengembalian sisa kertas kantor",
    ...invoice([line("ITEM-001", "Kertas A4 80gsm", 5, 45000)]),
    status: "Applied",
  },
];

export const priceLists: PriceList[] = [
  { id: "PL-SELLING", name: "Standard Selling", kind: "Selling", entries: items.filter((item) => item.for !== "Purchases").map((item) => ({ item: item.id, rate: item.rate })) },
  { id: "PL-BUYING", name: "Standard Buying", kind: "Buying", entries: items.filter((item) => item.for !== "Sales").map((item) => ({ item: item.id, rate: Math.round(item.rate * 0.72) })) },
];

export const taxTemplates: TaxTemplate[] = [
  { id: "TAX-PPN-OUT", name: "PPN 11% (Keluaran)", rate: 11, kind: "Sales" },
  { id: "TAX-PPN-IN", name: "PPN 11% (Masukan)", rate: 11, kind: "Purchase" },
];

export interface PrintTemplate {
  id: string;
  name: string;
  forDoctype: string;
  isDefault: boolean;
}

export const printTemplates: PrintTemplate[] = [
  { id: "PT-SINV-STANDARD", name: "Standard Sales Invoice", forDoctype: "SalesInvoice", isDefault: true },
  { id: "PT-SINV-COMPACT", name: "Compact Sales Invoice", forDoctype: "SalesInvoice", isDefault: false },
  { id: "PT-PINV-STANDARD", name: "Standard Purchase Invoice", forDoctype: "PurchaseInvoice", isDefault: true },
];

export const stockMovements: StockEntry[] = [
  { id: "STE-2027-00001", item: "ITEM-003", warehouseFrom: "Main Warehouse", warehouseTo: "Showroom", quantity: 5, date: "2027-07-04" },
  { id: "STE-2027-00002", item: "ITEM-005", warehouseFrom: "Main Warehouse", warehouseTo: "Showroom", quantity: 8, date: "2027-07-10" },
  { id: "STE-2027-00003", item: "ITEM-001", warehouseFrom: "Main Warehouse", warehouseTo: "Showroom", quantity: 40, date: "2027-07-16" },
  { id: "STE-2027-00004", item: "ITEM-009", warehouseFrom: "Receiving Dock", warehouseTo: "Raw Material Store", quantity: 400, date: "2027-07-11" },
];

/** Current valuation snapshot. Transfers in `stockMovements` are movement history and must not
 * be summed as if they created inventory; stock reports and reconciliation read this balance. */
export const stockBalances: StockBalance[] = [
  { item: "ITEM-003", warehouse: "Showroom", quantity: 5, valuationRate: 8_500_000 },
  { item: "ITEM-005", warehouse: "Showroom", quantity: 8, valuationRate: 1_200_000 },
  { item: "ITEM-001", warehouse: "Showroom", quantity: 40, valuationRate: 45_000 },
  { item: "ITEM-009", warehouse: "Raw Material Store", quantity: 400, valuationRate: 25_000 },
];

export const shipments: Shipment[] = [
  { id: "SHP-2027-00001", salesInvoice: "SINV-2027-00001", customer: "CUST-001", date: "2027-07-03", status: "Delivered" },
  { id: "SHP-2027-00002", salesInvoice: "SINV-2027-00002", customer: "CUST-002", date: "2027-07-06", status: "Delivered" },
  { id: "SHP-2027-00003", salesInvoice: "SINV-2027-00006", customer: "CUST-006", date: "2027-07-19", status: "Submitted" },
  { id: "SHP-2027-00004", salesInvoice: "SINV-2027-00009", customer: "CUST-001", date: "2027-07-28", status: "Draft" },
];

export const purchaseReceipts: PurchaseReceipt[] = [
  { id: "PREC-2027-00001", purchaseInvoice: "PINV-2027-00001", supplier: "SUPP-001", date: "2027-07-04", status: "Submitted" },
  { id: "PREC-2027-00002", purchaseInvoice: "PINV-2027-00003", supplier: "SUPP-003", date: "2027-07-11", status: "Submitted" },
  { id: "PREC-2027-00003", purchaseInvoice: "PINV-2027-00006", supplier: "SUPP-006", date: "2027-07-21", status: "Submitted" },
  { id: "PREC-2027-00004", purchaseInvoice: "PINV-2027-00008", supplier: "SUPP-002", date: "2027-07-27", status: "Draft" },
];

export const loyaltyPrograms: LoyaltyProgram[] = [
  { id: "LP-STANDARD", name: "Meridian Rewards Standard", pointsPerAmount: 1, redemptionRate: 100 },
  { id: "LP-VIP", name: "Meridian Rewards VIP", pointsPerAmount: 2, redemptionRate: 80 },
];

export const leads: Lead[] = [
  { id: "LEAD-001", name: "Andi Wijaya", company: "PT Teknologi Maju", status: "Qualified" },
  { id: "LEAD-002", name: "Sari Puspita", company: "CV Sentosa Abadi", status: "Contacted" },
  { id: "LEAD-003", name: "Budi Santoso", company: "Toko Elektronik Jaya", status: "New" },
  { id: "LEAD-004", name: "Rina Kartika", company: "PT Sumber Makmur", status: "Lost" },
];

export const pricingRules: PricingRule[] = [
  { id: "PR-001", name: "Volume Discount - Furniture", appliesTo: "Furniture", discountPercent: 5 },
  { id: "PR-002", name: "Loyalty Discount - Electronics", appliesTo: "Electronics", discountPercent: 3 },
];

export const couponCodes: CouponCode[] = [
  { id: "CPN-001", code: "MERIDIAN10", discountPercent: 10, used: 14, limit: 100 },
  { id: "CPN-002", code: "WELCOME5", discountPercent: 5, used: 62, limit: 200 },
  { id: "CPN-003", code: "VIP20", discountPercent: 20, used: 3, limit: 20 },
];

export const accountingDimensions: AccountingDimension[] = [
  { id: "DIM-DEPT", dimensionName: "Department", referenceDocType: "Department", defaultDimension: "Operations", mandatoryFor: "P&L", coveragePercent: 92 },
  { id: "DIM-PROJ", dimensionName: "Project", referenceDocType: "Project", defaultDimension: "Meridian Rollout", mandatoryFor: "Both", coveragePercent: 78 },
  { id: "DIM-CHAN", dimensionName: "Sales Channel", referenceDocType: "Sales Channel", defaultDimension: "B2B Direct", mandatoryFor: "P&L", coveragePercent: 86 },
];

export const procurementTracker: ProcurementTrackerRow[] = [
  { id: "P2P-001", materialRequest: "MR-2027-00014", rfq: "RFQ-2027-00009", supplierQuotation: "SQ-SUPP-002", purchaseOrder: "PO-2027-00031", receiptStatus: "Quality Check", paymentStatus: "Pending Invoice", value: 19200000 },
  { id: "P2P-002", materialRequest: "MR-2027-00015", rfq: "RFQ-2027-00010", supplierQuotation: "SQ-SUPP-005", purchaseOrder: "PO-2027-00032", receiptStatus: "Put Away", paymentStatus: "Payment Order Draft", value: 8400000 },
  { id: "P2P-003", materialRequest: "Auto Reorder", rfq: "RFQ-2027-00011", supplierQuotation: "Comparing", purchaseOrder: "Not Created", receiptStatus: "Not Received", paymentStatus: "Not Due", value: 1280000 },
];

export const salesLifecycleTracker: SalesLifecycleRow[] = [
  { id: "Q2C-001", quotation: "SQTN-2027-00001", salesOrder: "SO-2027-00018", delivery: "Delivered", invoice: "SINV-2027-00004", paymentReminder: "WhatsApp", value: 47175000 },
  { id: "Q2C-002", quotation: "SQTN-2027-00002", salesOrder: "SO-2027-00019", delivery: "Reserved Batch", invoice: "Draft", paymentReminder: "Email", value: 14319000 },
  { id: "Q2C-003", quotation: "SQTN-2027-00005", salesOrder: "SO-2027-00020", delivery: "Material Request", invoice: "Not Invoiced", paymentReminder: "Telegram", value: 1998000 },
];

export const manufacturingPlans: ManufacturingPlanRow[] = [
  { id: "MRP-001", productionPlan: "PP-2027-00004", item: "Meja Kantor", projectedQty: 12, shortfallQty: 4, materialRequest: "MR-2027-00014", workOrder: "WO-2027-00008", qcGate: "BOM + Routing Ready" },
  { id: "MRP-002", productionPlan: "PP-2027-00004", item: "Kursi Kantor Ergonomis", projectedQty: 18, shortfallQty: 0, materialRequest: "Not Required", workOrder: "WO-2027-00009", qcGate: "Inspection Template" },
  { id: "MRP-003", productionPlan: "PP-2027-00005", item: "Box Packaging", projectedQty: -260, shortfallQty: 260, materialRequest: "Auto Reorder", workOrder: "Purchase Only", qcGate: "Receipt Hold" },
];

export const supplierScorecards: SupplierScorecardRow[] = [
  { id: "SUP-SCORE-001", supplier: "PT Distribusi Utama", onTimeDeliveryRate: 96, defectRate: 1.2, responsivenessScore: 94, standing: "Preferred" },
  { id: "SUP-SCORE-002", supplier: "CV Bahan Baku Sejahtera", onTimeDeliveryRate: 88, defectRate: 3.8, responsivenessScore: 82, standing: "Watch" },
  { id: "SUP-SCORE-003", supplier: "UD Sumber Material", onTimeDeliveryRate: 71, defectRate: 7.4, responsivenessScore: 68, standing: "Restricted" },
];

export const qualityInspections: QualityInspection[] = [
  { id: "QC-2027-00001", referenceType: "Purchase Receipt", referenceId: "PREC-2027-00001", item: "Kayu Jati Solid", sampleSize: 50, defectCount: 0, status: "Passed", inspectedBy: "Budi Santoso", date: "2027-07-04" },
  { id: "QC-2027-00002", referenceType: "Purchase Receipt", referenceId: "PREC-2027-00003", item: "Baut & Fitting Set", sampleSize: 100, defectCount: 6, status: "Hold", inspectedBy: "Dewi Lestari", date: "2027-07-21" },
  { id: "QC-2027-00003", referenceType: "Delivery", referenceId: "SHP-2027-00002", item: "Meja Kantor Eksekutif", sampleSize: 10, defectCount: 0, status: "Passed", inspectedBy: "Budi Santoso", date: "2027-07-06" },
  { id: "QC-2027-00004", referenceType: "Job Card", referenceId: "WO-2027-00008", item: "Finishing & Coating", sampleSize: 12, defectCount: 1, status: "Passed", inspectedBy: "Hendra Wijaya", date: "2027-07-18" },
];

export const supportTickets: SupportTicket[] = [
  { id: "TCK-2027-0001", subject: "Permintaan Penyesuaian Faktur Pajak", customer: "PT Megah Jaya", priority: "High", status: "In Progress", slaDue: "2h remaining", responseTimeMinutes: 24 },
  { id: "TCK-2027-0002", subject: "Konfirmasi Jadwal Kirim Batch 2", customer: "CV Sinar Terang", priority: "Medium", status: "Resolved", slaDue: "Met SLA", responseTimeMinutes: 15 },
  { id: "TCK-2027-0003", subject: "Klaim Garansi Engsel Kursi", customer: "PT Karya Abadi", priority: "Urgent", status: "Open", slaDue: "45m remaining", responseTimeMinutes: 8 },
  { id: "TCK-2027-0004", subject: "Pertanyaan Integrasi e-Faktur API", customer: "PT Global Distribusi", priority: "Low", status: "Resolved", slaDue: "Met SLA", responseTimeMinutes: 45 },
];

export const projectSummaries: ProjectSummary[] = [
  { id: "PROJ-2027-001", name: "Fitout Kantor Pusat Megah Jaya", customer: "PT Megah Jaya", budget: 150000000, actualSpend: 112500000, progressPercent: 75, status: "On Track" },
  { id: "PROJ-2027-002", name: "Pengadaan Meja Ergonomis B2B", customer: "PT Teknologi Nusantara", budget: 85000000, actualSpend: 68000000, progressPercent: 80, status: "On Track" },
  { id: "PROJ-2027-003", name: "Renovasi Showroom Cabang Timur", customer: "Meridian Internal", budget: 45000000, actualSpend: 42000000, progressPercent: 93, status: "In Progress" },
];

export const materialRequests: MaterialRequest[] = [
  { id: "MR-2027-00014", item: "Kayu Jati Solid", quantity: 40, warehouse: "Main Warehouse", requiredDate: "2027-07-15", status: "Ordered", purpose: "Manufacture" },
  { id: "MR-2027-00015", item: "Baut & Fitting Set", quantity: 200, warehouse: "Main Warehouse", requiredDate: "2027-07-20", status: "Pending RFQ", purpose: "Purchase" },
  { id: "MR-2027-00016", item: "Box Packaging", quantity: 500, warehouse: "Raw Material Store", requiredDate: "2027-07-25", status: "Fulfilled", purpose: "Auto Reorder" },
];

export const rfqs: RequestForQuotation[] = [
  { id: "RFQ-2027-00009", materialRequest: "MR-2027-00014", item: "Kayu Jati Solid", quantity: 40, date: "2027-07-02", validTill: "2027-07-10", status: "Awarded" },
  { id: "RFQ-2027-00010", materialRequest: "MR-2027-00015", item: "Baut & Fitting Set", quantity: 200, date: "2027-07-08", validTill: "2027-07-16", status: "Comparing" },
  { id: "RFQ-2027-00011", materialRequest: "MR-2027-00016", item: "Box Packaging", quantity: 500, date: "2027-07-12", validTill: "2027-07-20", status: "Sent" },
];

export const supplierQuotations: SupplierQuotation[] = [
  { id: "SQ-SUPP-002", rfq: "RFQ-2027-00009", supplier: "PT Kayu Nusantara", item: "Kayu Jati Solid", rate: 480000, leadTimeDays: 3, status: "Accepted" },
  { id: "SQ-SUPP-005", rfq: "RFQ-2027-00010", supplier: "CV Hardware Utama", item: "Baut & Fitting Set", rate: 42000, leadTimeDays: 2, status: "Submitted" },
  { id: "SQ-SUPP-006", rfq: "RFQ-2027-00010", supplier: "UD Perkakas Mandiri", item: "Baut & Fitting Set", rate: 45000, leadTimeDays: 1, status: "Submitted" },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-2027-00031", supplier: "PT Kayu Nusantara", quotationRef: "SQ-SUPP-002", date: "2027-07-03", deliveryDate: "2027-07-06", lines: [{ item: "Kayu Jati Solid", description: "Grade A Teak", quantity: 40, rate: 480000, amount: 19200000 }], subtotal: 19200000, tax: 2112000, total: 21312000, status: "Partially Received" },
  { id: "PO-2027-00032", supplier: "CV Hardware Utama", quotationRef: "SQ-SUPP-005", date: "2027-07-09", deliveryDate: "2027-07-12", lines: [{ item: "Baut & Fitting Set", description: "Stainless Steel Fasteners", quantity: 200, rate: 42000, amount: 8400000 }], subtotal: 8400000, tax: 924000, total: 9324000, status: "Submitted" },
];

export const salesOrders: SalesOrder[] = [
  { id: "SO-2027-00018", customer: "PT Megah Jaya", quoteRef: "SQTN-2027-00001", date: "2027-07-01", deliveryDate: "2027-07-08", lines: [{ item: "Meja Kantor Eksekutif", description: "Custom Mahogany Finish", quantity: 15, rate: 3145000, amount: 47175000 }], subtotal: 47175000, tax: 5189250, total: 52364250, status: "Delivered" },
  { id: "SO-2027-00019", customer: "CV Sinar Terang", quoteRef: "SQTN-2027-00002", date: "2027-07-05", deliveryDate: "2027-07-14", lines: [{ item: "Kursi Kantor Ergonomis", description: "Mesh Back Lumbar Support", quantity: 20, rate: 715950, amount: 14319000 }], subtotal: 14319000, tax: 1575090, total: 15894090, status: "In Production" },
  { id: "SO-2027-00020", customer: "Toko Elektronik Jaya", quoteRef: "SQTN-2027-00005", date: "2027-07-11", deliveryDate: "2027-07-18", lines: [{ item: "Box Packaging", description: "Heavy Duty Cardboard", quantity: 200, rate: 9990, amount: 1998000 }], subtotal: 1998000, tax: 219780, total: 2217780, status: "Submitted" },
];

export const deliveryNotes: DeliveryNote[] = [
  { id: "DN-2027-00001", salesOrder: "SO-2027-00018", customer: "PT Megah Jaya", date: "2027-07-06", status: "Delivered", trackingNo: "TRK-EXP-8891", reminderChannel: "WhatsApp" },
  { id: "DN-2027-00002", salesOrder: "SO-2027-00019", customer: "CV Sinar Terang", date: "2027-07-12", status: "QC Inspected", trackingNo: "TRK-EXP-8892", reminderChannel: "Email" },
  { id: "DN-2027-00003", salesOrder: "SO-2027-00020", customer: "Toko Elektronik Jaya", date: "2027-07-15", status: "Draft", trackingNo: "TRK-EXP-8893", reminderChannel: "Telegram" },
];

export const boms: BillOfMaterials[] = [
  {
    id: "BOM-MEJA-01",
    item: "Meja Kantor Eksekutif",
    quantity: 1,
    totalCost: 1850000,
    routing: "Cutting -> Assembly -> Finishing",
    isDefault: true,
    rawMaterials: [
      { item: "Kayu Jati Solid", quantity: 2, rate: 480000, amount: 960000 },
      { item: "Rangka Kaki Besi", quantity: 1, rate: 420000, amount: 420000 },
      { item: "Baut & Fitting Set", quantity: 1, rate: 70000, amount: 70000 },
      { item: "Finishing Melamic Coating", quantity: 1, rate: 400000, amount: 400000 },
    ],
  },
  {
    id: "BOM-KURSI-01",
    item: "Kursi Kantor Ergonomis",
    quantity: 1,
    totalCost: 450000,
    routing: "Frame Assembly -> Upholstery -> QC",
    isDefault: true,
    rawMaterials: [
      { item: "Mekanisme Gaslift & Roda", quantity: 1, rate: 180000, amount: 180000 },
      { item: "Busa & Kain Mesh", quantity: 1, rate: 150000, amount: 150000 },
      { item: "Armrest & Baut", quantity: 1, rate: 120000, amount: 120000 },
    ],
  },
];

export const workOrders: WorkOrder[] = [
  { id: "WO-2027-00008", productionPlan: "PP-2027-00004", bom: "BOM-MEJA-01", item: "Meja Kantor Eksekutif", plannedQty: 15, producedQty: 10, status: "In Progress", plannedStartDate: "2027-07-04" },
  { id: "WO-2027-00009", productionPlan: "PP-2027-00004", bom: "BOM-KURSI-01", item: "Kursi Kantor Ergonomis", plannedQty: 20, producedQty: 20, status: "Completed", plannedStartDate: "2027-07-06" },
  { id: "WO-2027-00010", productionPlan: "PP-2027-00005", bom: "BOM-MEJA-01", item: "Meja Kantor Eksekutif", plannedQty: 8, producedQty: 0, status: "QC Hold", plannedStartDate: "2027-07-16" },
];

export const jobCards: JobCard[] = [
  { id: "JC-2027-0001", workOrder: "WO-2027-00008", operation: "Pemotongan & Serut Kayu", workstation: "Woodworking Area A", operator: "Slamet Riyadi", status: "Passed", timeInMins: 120 },
  { id: "JC-2027-0002", workOrder: "WO-2027-00008", operation: "Perakitan Konstruksi", workstation: "Assembly Bay 2", operator: "Agus Santoso", status: "In Progress", timeInMins: 90 },
  { id: "JC-2027-0003", workOrder: "WO-2027-00008", operation: "Finishing & Melamic", workstation: "Spray Booth 1", operator: "Hendra Wijaya", status: "Pending", timeInMins: 180 },
  { id: "JC-2027-0004", workOrder: "WO-2027-00009", operation: "Perakitan Frame & Upholstery", workstation: "Upholstery Line 1", operator: "Bambang Sutrisno", status: "Passed", timeInMins: 60 },
];

export interface NumberSeries {
  id: string;
  prefix: string;
  current: number;
}

export const numberSeries: NumberSeries[] = [
  { id: "Sales Invoice", prefix: "SINV-2027-", current: 18 },
  { id: "Purchase Invoice", prefix: "PINV-2027-", current: 12 },
  { id: "Sales Order", prefix: "SO-2027-", current: 20 },
  { id: "Purchase Order", prefix: "PO-2027-", current: 32 },
  { id: "Journal Entry", prefix: "JV-2027-", current: 5 },
  { id: "POS Invoice", prefix: "POS-2027-", current: 48 },
];

export interface BankStatementRow {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  status: "Matched" | "Unreconciled";
}

export const bankStatements: BankStatementRow[] = [
  { id: "STMT-001", date: "2027-07-02", description: "TRANSFER MASUK PELANGGAN PT MEGAH JAYA", reference: "PAY-2027-00001", debit: 34132500, credit: 0, status: "Matched" },
  { id: "STMT-002", date: "2027-07-05", description: "PEMBAYARAN SUPPLIER PT KAYU NUSANTARA", reference: "PAY-2027-00003", debit: 0, credit: 21312000, status: "Matched" },
  { id: "STMT-003", date: "2027-07-10", description: "SETORAN TUNAI KASIR POS CABANG UTAMA", reference: "POS-DEPOSIT-08", debit: 18500000, credit: 0, status: "Unreconciled" },
  { id: "STMT-004", date: "2027-07-15", description: "BIAYA ADMINISTRASI BANK & PAJAK BUNGA", reference: "BNK-FEE-07", debit: 0, credit: 125000, status: "Unreconciled" },
];

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  docType: string;
  docName: string;
  action: string;
  status: "Synced" | "Pending" | "Failed";
}

export const syncQueue: SyncQueueItem[] = [
  { id: "SYNC-01", timestamp: "2027-07-15 14:30", docType: "Sales Invoice", docName: "SINV-2027-00001", action: "Push to ERP Cloud", status: "Synced" },
  { id: "SYNC-02", timestamp: "2027-07-15 15:10", docType: "Purchase Invoice", docName: "PINV-2027-00001", action: "Push to ERP Cloud", status: "Synced" },
  { id: "SYNC-03", timestamp: "2027-07-15 16:45", docType: "Journal Entry", docName: "JV-2027-00001", action: "Push to ERP Cloud", status: "Pending" },
  { id: "SYNC-04", timestamp: "2027-07-15 17:00", docType: "Item Price", docName: "PR-HW-001", action: "Pull Price Updates", status: "Synced" },
];

export interface BackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  size: string;
  recordsCount: number;
  status: "Verified";
}

export const backupSnapshots: BackupSnapshot[] = [
  { id: "SNAP-2027-07-15-01", filename: "Meridian_Backup_2027-07-15.json", timestamp: "2027-07-15 18:00 WIB", size: "4.8 MB", recordsCount: 2150, status: "Verified" },
  { id: "SNAP-2027-07-14-01", filename: "Meridian_Backup_2027-07-14.json", timestamp: "2027-07-14 23:59 WIB", size: "4.6 MB", recordsCount: 2080, status: "Verified" },
];

// ---------------------------------------------------------------------------
// Master / config doctypes ported from Meridian (Meridian parity Slice 3):
// ItemGroup, UOM (+ conversions), Address, Location, Batch, SerialNumber,
// PaymentMethod, POSProfile. List + form only — enough to close the "these
// doctypes are not modelled at all" gap without a full domain engine.
// ---------------------------------------------------------------------------

export interface ItemGroupRow {
  id: string;
  name: string;
  parent: string;
  itemCount: number;
}

export const itemGroups: ItemGroupRow[] = [
  { id: "IG-ALL", name: "All Item Groups", parent: "", itemCount: 12 },
  { id: "IG-OFFICE", name: "Office Supplies", parent: "All Item Groups", itemCount: 3 },
  { id: "IG-ELEC", name: "Electronics", parent: "All Item Groups", itemCount: 3 },
  { id: "IG-FURN", name: "Furniture", parent: "All Item Groups", itemCount: 2 },
  { id: "IG-RAW", name: "Raw Material", parent: "All Item Groups", itemCount: 2 },
  { id: "IG-SVC", name: "Services", parent: "All Item Groups", itemCount: 2 },
];

export interface UOMRow {
  id: string;
  name: string;
  isWhole: boolean;
  conversions: Array<{ toUOM: string; factor: number }>;
}

export const unitsOfMeasure: UOMRow[] = [
  { id: "UOM-NOS", name: "Nos", isWhole: true, conversions: [] },
  { id: "UOM-RIM", name: "Rim", isWhole: true, conversions: [{ toUOM: "Lembar", factor: 500 }] },
  { id: "UOM-BOX", name: "Box", isWhole: true, conversions: [{ toUOM: "Nos", factor: 24 }] },
  { id: "UOM-KG", name: "Kg", isWhole: false, conversions: [{ toUOM: "Gram", factor: 1000 }] },
  { id: "UOM-M3", name: "M3", isWhole: false, conversions: [] },
];

export interface AddressRow {
  id: string;
  title: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export const addresses: AddressRow[] = [
  { id: "ADDR-HQ", title: "Meridian HQ", line1: "Jl. Jenderal Sudirman Kav. 52-53", city: "Jakarta Selatan", postalCode: "12190", country: "Indonesia" },
  { id: "ADDR-WH", title: "Gudang Utama", line1: "Kawasan Industri Pulogadung Blok A3", city: "Jakarta Timur", postalCode: "13920", country: "Indonesia" },
  { id: "ADDR-CUST-001", title: "PT Surya Jaya Abadi", line1: "Jl. Gatot Subroto No. 18", city: "Bandung", postalCode: "40262", country: "Indonesia" },
];

export interface LocationRow {
  id: string;
  name: string;
  parent: string;
  isGroup: boolean;
  address: string;
}

export const locations: LocationRow[] = [
  { id: "LOC-STORES", name: "Stores", parent: "", isGroup: true, address: "Gudang Utama" },
  { id: "LOC-MAIN", name: "Main Warehouse", parent: "Stores", isGroup: false, address: "Gudang Utama" },
  { id: "LOC-SHOWROOM", name: "Showroom", parent: "Stores", isGroup: false, address: "Meridian HQ" },
  { id: "LOC-RAW", name: "Raw Material Store", parent: "Stores", isGroup: false, address: "Gudang Utama" },
];

export interface BatchRow {
  id: string;
  item: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
}

export const batches: BatchRow[] = [
  { id: "BATCH-INK-2707", item: "ITEM-002", manufacturingDate: "2027-05-01", expiryDate: "2029-05-01", quantity: 80 },
  { id: "BATCH-PAPER-2706", item: "ITEM-001", manufacturingDate: "2027-06-10", expiryDate: "2030-06-10", quantity: 400 },
];

export interface SerialNumberRow {
  id: string;
  item: string;
  warehouse: string;
  status: "Active" | "Delivered" | "Inactive";
  purchaseDate: string;
}

export const serialNumbers: SerialNumberRow[] = [
  { id: "SN-LAP-0001", item: "ITEM-003", warehouse: "Main Warehouse", status: "Active", purchaseDate: "2027-07-02" },
  { id: "SN-LAP-0002", item: "ITEM-003", warehouse: "Showroom", status: "Delivered", purchaseDate: "2027-07-02" },
  { id: "SN-MON-0001", item: "ITEM-004", warehouse: "Main Warehouse", status: "Active", purchaseDate: "2027-07-12" },
];

export interface PaymentMethodRow {
  id: string;
  name: string;
  type: "Cash" | "Bank" | "Card" | "Wallet";
  account: string;
}

export const paymentMethods: PaymentMethodRow[] = [
  { id: "PM-CASH", name: "Cash", type: "Cash", account: "Cash" },
  { id: "PM-BANK", name: "Transfer Bank", type: "Bank", account: "Bank Operasional" },
  { id: "PM-QRIS", name: "QRIS", type: "Wallet", account: "Bank Operasional" },
  { id: "PM-EDC", name: "EDC / Card", type: "Card", account: "Bank Operasional" },
];

export interface POSProfileRow {
  id: string;
  name: string;
  location: string;
  cashAccount: string;
  writeOffAccount: string;
  posUI: "Classic" | "Modern";
}

export const posProfiles: POSProfileRow[] = [
  { id: "POSP-JKT-1", name: "Kasir Meridian 1", location: "Showroom", cashAccount: "Cash", writeOffAccount: "Cost of Goods Sold", posUI: "Modern" },
  { id: "POSP-JKT-2", name: "Kasir Meridian 2", location: "Showroom", cashAccount: "Cash", writeOffAccount: "Cost of Goods Sold", posUI: "Classic" },
];
