import type { UIDLDocument, UIDLNode } from "~/types";
import { button, buildReportDocument, formatIDR, text, type ListColumn } from "./buildDocument";
import { meridianKpiRow } from "./meridianLayout";
import {
  accountingDimensions,
  accounts,
  creditNotes,
  items,
  manufacturingPlans,
  procurementTracker,
  projectSummaries,
  purchaseInvoices,
  qualityInspections,
  salesInvoices,
  salesLifecycleTracker,
  stockMovements,
  stockBalances,
  supplierScorecards,
  supportTickets,
  bankStatements,
  type Account,
} from "./mockData";
import {
  accountBalance,
  balanceForRootType,
  cashAndBankBalance,
  postings,
  profitAndLoss,
  totalPayables,
  totalReceivables,
  trialBalance,
} from "./ledger";
import { taxSummary } from "./gst";
import { reconcileInventoryToGl } from "../domain/services/inventoryReconciliationService";
import { buildMeridianPosShifts } from "../mock-data/generators/meridianPosShifts";
import { buildMeridianStockLedger } from "../mock-data/generators/meridianStockLedger";

/*
 * A figure in Report's filter strip. That strip is `grid grid-cols-5 gap-4 p-4 border-b`
 * and its contents are plain controls — no boxes inside boxes — so these are set as
 * SectionHeader-weight text rather than bordered tiles.
 */
function summaryText(id: string, value: string): UIDLNode {
  return { id, type: "Text", props: { value }, style: { fontSize: "text-base", fontWeight: 600 } };
}

export function buildGeneralLedgerDocument(): UIDLDocument {
  const rows = postings().map((posting) => ({
    date: posting.date,
    voucher: posting.voucher,
    account: accounts.find((a) => a.id === posting.account)?.name ?? posting.account,
    narration: posting.narration,
    debit: posting.debit ? formatIDR(posting.debit) : "-",
    credit: posting.credit ? formatIDR(posting.credit) : "-",
  }));
  const totalDebit = postings().reduce((total, p) => total + p.debit, 0);
  const totalCredit = postings().reduce((total, p) => total + p.credit, 0);

  return buildReportDocument({
    docId: "meridian-report-general-ledger",
    title: "General Ledger",
    summary: [
      summaryText("total-debit", `Total Debit: ${formatIDR(totalDebit)}`),
      summaryText("total-credit", `Total Credit: ${formatIDR(totalCredit)}`),
      summaryText("balanced", totalDebit === totalCredit ? "Balanced ✓" : "Out of balance"),
    ],
    columns: [
      { key: "date", label: "Date" },
      { key: "voucher", label: "Voucher" },
      { key: "account", label: "Account" },
      { key: "narration", label: "Narration" },
      { key: "debit", label: "Debit", align: "right" },
      { key: "credit", label: "Credit", align: "right" },
    ],
    rows,
  });
}

export function buildTrialBalanceDocument(): UIDLDocument {
  const rows = trialBalance().map((row) => ({
    account: row.accountName,
    debit: row.debit ? formatIDR(row.debit) : "-",
    credit: row.credit ? formatIDR(row.credit) : "-",
  }));
  const totalDebit = trialBalance().reduce((total, row) => total + row.debit, 0);
  const totalCredit = trialBalance().reduce((total, row) => total + row.credit, 0);

  return buildReportDocument({
    docId: "meridian-report-trial-balance",
    title: "Trial Balance",
    summary: [
      summaryText("total-debit", `Total Debit: ${formatIDR(totalDebit)}`),
      summaryText("total-credit", `Total Credit: ${formatIDR(totalCredit)}`),
    ],
    columns: [
      { key: "account", label: "Account" },
      { key: "debit", label: "Debit", align: "right" },
      { key: "credit", label: "Credit", align: "right" },
    ],
    rows,
  });
}

function leafAccountsOf(rootType: Account["rootType"]): Account[] {
  return accounts.filter((account) => !account.isGroup && account.rootType === rootType);
}

export function buildProfitAndLossDocument(): UIDLDocument {
  const { income, expense, netProfit } = profitAndLoss();
  const rows = [
    ...leafAccountsOf("Income").map((account) => ({ account: account.name, section: "Income", amount: formatIDR(accountBalance(account.id)) })),
    ...leafAccountsOf("Expense").map((account) => ({ account: account.name, section: "Expense", amount: formatIDR(accountBalance(account.id)) })),
  ];

  return buildReportDocument({
    docId: "meridian-report-profit-and-loss",
    title: "Profit And Loss",
    summary: [
      summaryText("total-income", `Total Income: ${formatIDR(income)}`),
      summaryText("total-expense", `Total Expense: ${formatIDR(expense)}`),
      summaryText("net-profit", `Net Profit: ${formatIDR(netProfit)}`),
    ],
    columns: [
      { key: "section", label: "Section" },
      { key: "account", label: "Account" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    rows,
  });
}

export function buildBalanceSheetDocument(): UIDLDocument {
  const netProfit = profitAndLoss().netProfit;
  const assetTotal = balanceForRootType("Asset");
  const liabilityTotal = balanceForRootType("Liability");
  const equityTotal = balanceForRootType("Equity") + netProfit;

  const rows = [
    ...leafAccountsOf("Asset").map((account) => ({ section: "Assets", account: account.name, amount: formatIDR(accountBalance(account.id)) })),
    ...leafAccountsOf("Liability").map((account) => ({ section: "Liabilities", account: account.name, amount: formatIDR(accountBalance(account.id)) })),
    ...leafAccountsOf("Equity").map((account) => ({ section: "Equity", account: account.name, amount: formatIDR(accountBalance(account.id)) })),
    { section: "Equity", account: "Current Year Earnings", amount: formatIDR(netProfit) },
  ];

  return buildReportDocument({
    docId: "meridian-report-balance-sheet",
    title: "Balance Sheet",
    summary: [
      summaryText("total-assets", `Total Assets: ${formatIDR(assetTotal)}`),
      summaryText("total-liabilities-equity", `Total Liabilities + Equity: ${formatIDR(liabilityTotal + equityTotal)}`),
      summaryText("balanced", assetTotal === liabilityTotal + equityTotal ? "Balanced ✓" : "Out of balance"),
    ],
    columns: [
      { key: "section", label: "Section" },
      { key: "account", label: "Account" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    rows,
  });
}

function buildStockLedgerDocument(): UIDLDocument {
  const rows = stockMovements.map((entry) => ({
    date: entry.date,
    item: items.find((i) => i.id === entry.item)?.name ?? entry.item,
    from: entry.warehouseFrom ?? "-",
    to: entry.warehouseTo ?? "-",
    quantity: String(entry.quantity),
  }));

  return buildReportDocument({
    docId: "meridian-report-stock-ledger",
    title: "Stock Ledger",
    columns: [
      { key: "date", label: "Date" },
      { key: "item", label: "Item" },
      { key: "from", label: "From" },
      { key: "to", label: "To" },
      { key: "quantity", label: "Qty", align: "right" },
    ],
    rows,
  });
}

function buildStockBalanceDocument(): UIDLDocument {
  const rows = stockBalances.map((balance) => {
    const item = items.find((candidate) => candidate.id === balance.item);
    return {
      item: item?.name ?? balance.item,
      warehouse: balance.warehouse,
      quantity: String(balance.quantity),
      value: formatIDR(balance.quantity * balance.valuationRate),
    };
  });
  const totalValue = stockBalances.reduce(
    (total, balance) => total + balance.quantity * balance.valuationRate,
    0,
  );

  return buildReportDocument({
    docId: "meridian-report-stock-balance",
    title: "Stock Balance",
    summary: [summaryText("total-stock-value", `Total Stock Value: ${formatIDR(totalValue)}`)],
    columns: [
      { key: "item", label: "Item" },
      { key: "warehouse", label: "Warehouse" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "value", label: "Value", align: "right" },
    ],
    rows,
  });
}

export function buildInventoryReconciliationDocument(): UIDLDocument {
  const result = reconcileInventoryToGl({
    companyId: "meridian-trading",
    stockLines: stockBalances.map((balance) => ({
      itemId: balance.item,
      warehouse: balance.warehouse,
      quantity: balance.quantity,
      valuationRate: balance.valuationRate,
    })),
    glBalances: [{ accountId: "inventory", amount: accountBalance("inventory") }],
  });

  return buildReportDocument({
    docId: "meridian-report-inventory-reconciliation",
    title: "Inventory Reconciliation",
    summary: [
      summaryText("stock-value", `Stock Value: ${formatIDR(result.stockValue)}`),
      summaryText("inventory-gl", `Inventory GL: ${formatIDR(result.inventoryGlBalance)}`),
      summaryText("difference", `Difference: ${formatIDR(result.difference)}`),
      summaryText("status", result.status === "matched" ? "Matched" : "Mismatch"),
      text("warehouse-control", result.controls[0] ?? "Warehouse-level stock and GL balances are available."),
    ],
    columns: [
      { key: "warehouse", label: "Warehouse" },
      { key: "stockValue", label: "Stock Value", align: "right" },
      { key: "inventoryGl", label: "Inventory GL", align: "right" },
      { key: "difference", label: "Difference", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: result.warehouses.map((warehouse) => ({
      warehouse: warehouse.warehouse,
      stockValue: formatIDR(warehouse.stockValue),
      inventoryGl: warehouse.inventoryGlBalance === null ? "Not allocated" : formatIDR(warehouse.inventoryGlBalance),
      difference: warehouse.difference === null ? "Not available" : formatIDR(warehouse.difference),
      status: warehouse.status === "unallocated" ? "GL dimension unavailable" : warehouse.status === "matched" ? "Matched" : "Mismatch",
    })),
  });
}

export function buildEFakturReportDocument(): UIDLDocument {
  const rows = salesInvoices.map((inv) => ({
    id: inv.id,
    customer: inv.customer,
    date: inv.date,
    subtotal: formatIDR(inv.subtotal),
    tax: formatIDR(inv.tax),
    total: formatIDR(inv.total),
  }));

  const totalDpp = salesInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
  const totalPpn = salesInvoices.reduce((sum, inv) => sum + inv.tax, 0);

  return buildReportDocument({
    docId: "meridian-report-efaktur-djp",
    title: "e-Faktur DJP (Direktorat Jenderal Pajak)",
    summary: [
      summaryText("total-dpp", `Total DPP: ${formatIDR(totalDpp)}`),
      summaryText("total-ppn", `Total PPN 11%: ${formatIDR(totalPpn)}`),
      button("btn-export-csv", "Ekspor CSV e-Faktur", "/meridian/report/EFakturDJP", "primary"),
    ],
    columns: [
      { key: "id", label: "Nomor Faktur" },
      { key: "customer", label: "Nama Pelanggan" },
      { key: "date", label: "Tanggal" },
      { key: "subtotal", label: "DPP (Rp)", align: "right" },
      { key: "tax", label: "PPN 11% (Rp)", align: "right" },
      { key: "total", label: "Total Faktur (Rp)", align: "right" },
    ],
    rows,
  });
}

export function buildBankReconciliationReportDocument(): UIDLDocument {
  const bookBal = cashAndBankBalance();
  const clearedTotal = bankStatements.filter((s) => s.status === "Matched").reduce((sum, s) => sum + (s.debit || s.credit), 0);
  const statementBal = 145000000;
  const difference = bookBal - statementBal;

  const rows = bankStatements.map((stmt) => ({
    date: stmt.date,
    description: stmt.description,
    reference: stmt.reference,
    debit: stmt.debit > 0 ? formatIDR(stmt.debit) : "-",
    credit: stmt.credit > 0 ? formatIDR(stmt.credit) : "-",
    status: stmt.status,
  }));

  return buildReportDocument({
    docId: "meridian-report-bank-reconciliation",
    title: "Bank Reconciliation",
    headerActions: [
      button("adj-jv-btn", "+ Add Adjustment Voucher", "/meridian/edit/JournalEntry/new", "primary"),
    ],
    summary: [
      summaryText("book-balance", `Saldo Buku Besar: ${formatIDR(bookBal)}`),
      summaryText("cleared-total", `Mutasi Cocok: ${formatIDR(clearedTotal)}`),
      summaryText("stmt-balance", `Saldo Rekening Koran: ${formatIDR(statementBal)}`),
      summaryText("diff-balance", `Selisih: ${formatIDR(difference)}`),
    ],
    columns: [
      { key: "date", label: "Tanggal" },
      { key: "description", label: "Keterangan Mutasi" },
      { key: "reference", label: "No. Referensi" },
      { key: "debit", label: "Debit (Masuk)", align: "right" },
      { key: "credit", label: "Kredit (Keluar)", align: "right" },
      { key: "status", label: "Status Rekonsiliasi" },
    ],
    rows,
  });
}

/**
 * Static Sales Invoice ↔ GL reconciliation snapshot (as-seeded).
 *
 * `MeridianReferenceRoute` overrides this with an adapter-backed live component that reflects
 * post-submit / post-cancel state; this synchronous builder keeps the sidebar link resolvable
 * for direct URLs, SSR, and the sidebar-coverage test.
 */
function buildSalesInvoiceLedgerDocument(): UIDLDocument {
  const rows = salesInvoices.map((inv) => {
    const voucherLines = postings().filter((posting) => posting.voucher === inv.id);
    const posted = voucherLines.length > 0;
    const arDebit = voucherLines
      .filter((line) => line.account === "accounts-receivable")
      .reduce((sum, line) => sum + line.debit - line.credit, 0);
    const debit = voucherLines.reduce((sum, line) => sum + line.debit, 0);
    const credit = voucherLines.reduce((sum, line) => sum + line.credit, 0);
    const cnTotal = creditNotes
      .filter((note) => note.invoice === inv.id)
      .reduce((sum, note) => sum + note.total, 0);
    return {
      invoice: inv.id,
      status: inv.status,
      total: formatIDR(inv.total),
      posting: posted ? "Posted" : "Not posted",
      balanced: posted ? (Math.round(debit) === Math.round(credit) ? "Balanced" : "UNBALANCED") : "-",
      arDebit: formatIDR(arDebit),
      netReceivable: formatIDR(Math.max(0, arDebit - cnTotal)),
    };
  });
  const postedCount = rows.filter((row) => row.posting === "Posted").length;
  const draftCount = salesInvoices.filter((inv) => inv.status === "Draft").length;
  const cnTotalAll = creditNotes.reduce((sum, note) => sum + note.total, 0);

  return buildReportDocument({
    docId: "meridian-report-sales-invoice-ledger",
    title: "Sales Invoice Ledger",
    summary: [
      summaryText("posted", `Posted: ${postedCount}/${salesInvoices.length}`),
      summaryText("drafts", `Draft (unposted): ${draftCount}`),
      summaryText("credit-notes", `Credit Notes: ${formatIDR(cnTotalAll)}`),
      text("ledger-note", "Submitting a Draft posts a balanced AR / revenue / output-tax voucher; cancelling posts a mirror reversal."),
    ],
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total", align: "right" },
      { key: "posting", label: "GL Posting" },
      { key: "balanced", label: "Balanced" },
      { key: "arDebit", label: "AR Debit", align: "right" },
      { key: "netReceivable", label: "Net Receivable", align: "right" },
    ],
    rows,
  });
}

/**
 * Static POS shift reconciliation snapshot (as-seeded), computed from the same deterministic
 * generator that feeds the seed. `MeridianReferenceRoute` overrides this with an adapter-backed
 * live component; this keeps the sidebar link resolvable for direct URLs / SSR / coverage test.
 */
function buildPosShiftLedgerDocument(): UIDLDocument {
  const seed = buildMeridianPosShifts();
  const closingByShift = new Map(seed.closingShifts.map((row) => [String(row.openingShift), row]));
  const rows = seed.openingShifts.map((shift) => {
    const sales = (shift.salesByTender ?? {}) as Record<string, number>;
    const closing = closingByShift.get(String(shift.id));
    return {
      shift: String(shift.id),
      cashier: String(shift.cashier ?? ""),
      status: String(shift.status ?? ""),
      openingFloat: formatIDR(Number(shift.openingFloat ?? 0)),
      cashSales: formatIDR(Number(sales.Cash ?? 0)),
      expectedCash: formatIDR(Number(shift.expectedCash ?? 0)),
      countedCash: closing ? formatIDR(Number(closing.countedCash ?? 0)) : "-",
      difference: closing ? formatIDR(Number(closing.differenceAmount ?? 0)) : "-",
      result: closing ? String(closing.status ?? "") : "Open",
    };
  });
  const closedCount = seed.openingShifts.filter((row) => row.status === "Closed").length;
  const netVariance = seed.closingShifts.reduce((sum, row) => sum + Number(row.differenceAmount ?? 0), 0);
  const totalInvoiceValue = seed.invoices.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return buildReportDocument({
    docId: "meridian-report-pos-shift-ledger",
    title: "POS Shift Ledger",
    summary: [
      summaryText("closed", `Closed: ${closedCount}/${seed.openingShifts.length}`),
      summaryText("variance", `Net Cash Variance: ${formatIDR(netVariance)}`),
      summaryText("invoice-value", `POS Invoice Value: ${formatIDR(totalInvoiceValue)}`),
      text("pos-note", "A short or over count posts a cash-variance journal entry so the ledger stays balanced with the drawer."),
    ],
    columns: [
      { key: "shift", label: "Shift" },
      { key: "cashier", label: "Cashier" },
      { key: "status", label: "Status" },
      { key: "openingFloat", label: "Opening Float", align: "right" },
      { key: "cashSales", label: "Cash Sales", align: "right" },
      { key: "expectedCash", label: "Expected Cash", align: "right" },
      { key: "countedCash", label: "Counted Cash", align: "right" },
      { key: "difference", label: "Difference", align: "right" },
      { key: "result", label: "Result" },
    ],
    rows,
  });
}

/**
 * Static Accounts Receivable snapshot (as-seeded from `meridian/mockData.ts`).
 * `MeridianReferenceRoute` overrides this with an adapter-backed live component that reflects
 * recorded payments; this keeps the sidebar link resolvable for direct URLs / SSR / coverage.
 */
function buildAccountsReceivableDocument(): UIDLDocument {
  const rows = salesInvoices
    .filter((inv) => inv.status !== "Draft")
    .map((inv) => {
      const creditNoted = creditNotes.filter((note) => note.invoice === inv.id).reduce((sum, note) => sum + note.total, 0);
      const paid = inv.status === "Paid" ? inv.total : 0;
      const outstanding = Math.max(0, inv.total - paid - creditNoted);
      return {
        invoice: inv.id,
        customer: inv.customer,
        total: formatIDR(inv.total),
        paid: formatIDR(paid),
        creditNote: formatIDR(creditNoted),
        outstanding: formatIDR(outstanding),
        status: outstanding <= 0 ? "Settled" : inv.status,
        _outstanding: outstanding,
      };
    })
    .filter((row) => row._outstanding > 0)
    .map(({ _outstanding, ...row }) => row);
  const totalOutstanding = salesInvoices
    .filter((inv) => inv.status !== "Draft" && inv.status !== "Paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  return buildReportDocument({
    docId: "meridian-report-accounts-receivable",
    title: "Accounts Receivable",
    summary: [
      summaryText("ar-outstanding", `Total Outstanding: ${formatIDR(totalOutstanding)}`),
      text("ar-note", "Outstanding = total − payments − credit notes; the live view ties this to the AR control account in the ledger."),
    ],
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "creditNote", label: "Credit Note", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
  });
}

/**
 * Static Accounts Payable snapshot (as-seeded). `MeridianReferenceRoute` overrides this with an
 * adapter-backed live component that ties the subledger to the AP control account.
 */
function buildAccountsPayableDocument(): UIDLDocument {
  const rows = purchaseInvoices
    .filter((inv) => inv.status !== "Draft")
    .map((inv) => {
      const paid = inv.status === "Paid" ? inv.total : 0;
      const outstanding = Math.max(0, inv.total - paid);
      return {
        invoice: inv.id,
        supplier: inv.supplier,
        total: formatIDR(inv.total),
        paid: formatIDR(paid),
        outstanding: formatIDR(outstanding),
        status: outstanding <= 0 ? "Settled" : inv.status,
        _outstanding: outstanding,
      };
    })
    .filter((row) => row._outstanding > 0)
    .map(({ _outstanding, ...row }) => row);
  const totalOutstanding = purchaseInvoices
    .filter((inv) => inv.status !== "Draft" && inv.status !== "Paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  return buildReportDocument({
    docId: "meridian-report-accounts-payable",
    title: "Accounts Payable",
    summary: [
      summaryText("ap-outstanding", `Total Outstanding: ${formatIDR(totalOutstanding)}`),
      text("ap-note", "Outstanding = total − purchase payments; the live view ties this to the AP control account 2110 in the ledger."),
    ],
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "supplier", label: "Supplier" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
  });
}

/**
 * Static stock valuation snapshot (as-seeded), computed from the deterministic generator that
 * feeds the seed. `MeridianReferenceRoute` overrides this with an adapter-backed live component.
 */
function buildStockValuationLedgerDocument(): UIDLDocument {
  const seed = buildMeridianStockLedger();
  const rows = seed.items
    .map((item) => ({
      item: String(item.id),
      name: String(item.name),
      warehouse: String(item.warehouse),
      qty: String(item.stockQty),
      rate: formatIDR(Number(item.valuationRate ?? 0)),
      value: formatIDR(Number(item.stockValue ?? 0)),
      _v: Number(item.stockValue ?? 0),
    }))
    .sort((a, b) => b._v - a._v)
    .map(({ _v, ...row }) => row);
  const totalValue = seed.items.reduce((sum, item) => sum + Number(item.stockValue ?? 0), 0);
  const invGl = seed.vouchers
    .flatMap((v) => (v.lines as Array<{ account: string; debit: number; credit: number }>))
    .filter((l) => l.account === "1140")
    .reduce((sum, l) => sum + l.debit - l.credit, 0);

  return buildReportDocument({
    docId: "meridian-report-stock-valuation-ledger",
    title: "Stock Valuation Ledger",
    summary: [
      summaryText("stock-value", `Stock Value: ${formatIDR(totalValue)}`),
      summaryText("inventory-gl", `Inventory GL: ${formatIDR(invGl)}`),
      summaryText("tie-out", `Tie-out Difference: ${formatIDR(totalValue - invGl)}`),
      text("valuation-note", "Moving-average: each receipt reprices, each issue leaves at the current rate and posts COGS. The live view maintains this against the ledger."),
    ],
    columns: [
      { key: "item", label: "Item" },
      { key: "name", label: "Name" },
      { key: "warehouse", label: "Warehouse" },
      { key: "qty", label: "Qty", align: "right" },
      { key: "rate", label: "Avg Rate", align: "right" },
      { key: "value", label: "Value", align: "right" },
    ],
    rows,
  });
}

const REPORT_BUILDERS: Record<string, () => UIDLDocument> = {
  GeneralLedger: buildGeneralLedgerDocument,
  TrialBalance: buildTrialBalanceDocument,
  ProfitAndLoss: buildProfitAndLossDocument,
  BalanceSheet: buildBalanceSheetDocument,
  SalesInvoiceLedger: buildSalesInvoiceLedgerDocument,
  POSShiftLedger: buildPosShiftLedgerDocument,
  AccountsReceivable: buildAccountsReceivableDocument,
  AccountsPayable: buildAccountsPayableDocument,
  StockValuationLedger: buildStockValuationLedgerDocument,
  GSTR1: () => buildGstReportDocument("GSTR1"),
  GSTR2: () => buildGstReportDocument("GSTR2"),
  StockLedger: buildStockLedgerDocument,
  StockBalance: buildStockBalanceDocument,
  InventoryReconciliation: buildInventoryReconciliationDocument,
  EFakturDJP: buildEFakturReportDocument,
  BankReconciliation: buildBankReconciliationReportDocument,
};

export function getReportBuilder(reportName: string): (() => UIDLDocument) | undefined {
  return REPORT_BUILDERS[reportName];
}

function buildGstReportDocument(kind: "GSTR1" | "GSTR2"): UIDLDocument {
  const summary = taxSummary(kind);
  const columns: ListColumn[] = kind === "GSTR1"
    ? [{ key: "invoice", label: "Invoice" }, { key: "party", label: "Customer" }, { key: "taxable", label: "Taxable Value", align: "right" }, { key: "tax", label: "PPN Keluaran", align: "right" }]
    : [{ key: "invoice", label: "Invoice" }, { key: "party", label: "Supplier" }, { key: "taxable", label: "Taxable Value", align: "right" }, { key: "tax", label: "PPN Masukan", align: "right" }];

  return buildReportDocument({
    docId: `meridian-report-${kind.toLowerCase()}`,
    title: kind === "GSTR1" ? "GSTR1 — Outward Supplies" : "GSTR2 — Inward Supplies",
    summary: [
      summaryText("taxable-total", `Total Taxable Value: ${formatIDR(summary.taxableTotal)}`),
      summaryText("tax-total", `Total Tax: ${formatIDR(summary.taxTotal)}`),
    ],
    columns,
    rows: summary.rows,
  });
}

// ---------------------------------------------------------------------------
// Chart of Accounts — rendered as an indented DataTable (no tree widget exists).
// ---------------------------------------------------------------------------

export function buildChartOfAccountsDocument(): UIDLDocument {
  function depthOf(account: Account): number {
    let depth = 0;
    let current = account;
    while (current.parent) {
      const parent = accounts.find((candidate) => candidate.id === current.parent);
      if (!parent) break;
      depth += 1;
      current = parent;
    }
    return depth;
  }

  const rows = accounts.map((account) => ({
    name: `${"— ".repeat(depthOf(account))}${account.name}`,
    rootType: account.rootType,
    balance: account.isGroup ? "" : formatIDR(accountBalance(account.id)),
  }));

  return buildReportDocument({
    docId: "meridian-chart-of-accounts",
    title: "Chart of Accounts",
    columns: [
      { key: "name", label: "Account" },
      { key: "rootType", label: "Type" },
      { key: "balance", label: "Balance", align: "right" },
    ],
    rows,
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface PaidUnpaidSummary {
  paid: number;
  unpaid: number;
  count: number;
}

function paidUnpaidSummary(invoices: Array<{ status: string; total: number }>): PaidUnpaidSummary {
  const paid = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0);
  const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  return { paid, unpaid: total - paid, count: invoices.length };
}

/**
 * Ported from UnpaidInvoices: a title, a paid amount on
 * the left and an unpaid amount on the right, then a single bar whose fill width is the paid
 * share of the total — same shape as the real widget (Sales Invoices in blue, Purchase Invoices
 * in pink), minus the click-to-filter routing and per-widget period selector, which need list
 * filtering infrastructure this demo doesn't have yet.
 */
function unpaidInvoicesWidget(id: string, title: string, invoices: Array<{ status: string; total: number }>, listRoute: string, barColor: string): UIDLNode {
  const { paid, unpaid, count } = paidUnpaidSummary(invoices);
  const total = paid + unpaid;
  const paidShare = total > 0 ? Math.round((paid / total) * 100) : 0;

  return {
    id,
    type: "Column",
    style: { gap: "gap-3", padding: "p-4" },
    children: [
      text(`${id}-title`, title, { fontSize: "text-base", fontWeight: 600 }),
      {
        id: `${id}-amounts`,
        type: "Row",
        props: { style: { display: "flex", justifyContent: "space-between" } },
        children: [
          text(`${id}-paid`, `${formatIDR(paid)} Paid`, { fontSize: "text-sm", fontWeight: 600 }),
          text(`${id}-unpaid`, `${formatIDR(unpaid)} Unpaid`, { fontSize: "text-sm", fontWeight: 600, color: "{primitives.color.text-secondary}" }),
        ],
      },
      {
        id: `${id}-bar`,
        type: "Row",
        props: { style: { height: "16px", borderRadius: "6px", overflow: "hidden" } },
        style: { width: "w-full", background: "{primitives.color.border}" },
        children: count > 0 ? [{ id: `${id}-bar-fill`, type: "Row", props: { style: { width: `${paidShare}%`, height: "100%", background: barColor } }, children: [] }] : [],
      },
      button(`${id}-view`, `View ${title}`, listRoute),
    ],
  };
}

function dashboardCard(id: string, label: string, value: string, helper: string): UIDLNode {
  return {
    id,
    type: "Column",
    style: { padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border", borderRadius: "rounded-lg", background: "{primitives.color.surface}", gap: "gap-1" },
    children: [
      text(`${id}-label`, label, { fontSize: "text-xs", color: "{primitives.color.text-secondary}" }),
      text(`${id}-value`, value, { fontSize: "text-xl", fontWeight: 700 }),
      text(`${id}-helper`, helper, { fontSize: "text-xs", color: "{primitives.color.text-secondary}" }),
    ],
  };
}

function dashboardTable(id: string, title: string, dataSource: string, columns: ListColumn[]): UIDLNode {
  return {
    id,
    type: "DataTable",
    props: { title, dataSource, columns },
    style: { width: "w-full" },
  };
}

function erpSectionHeader(): UIDLNode {
  return {
    id: "erp-header",
    type: "Column",
    style: { gap: "gap-2", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-t" },
    children: [
      text("erp-eyebrow", "Extended ERP workflow layer", { fontSize: "text-xs", fontWeight: 600, color: "{primitives.color.text-secondary}" }),
      text("erp-title", "From Meridian ledger to ERP operations", { fontSize: "text-2xl", fontWeight: 700 }),
      text(
        "erp-copy",
        "Meridian keeps the existing Meridian-style accounting dashboard, then adds extended ERP workflows for dimensions, procure-to-pay, quote-to-cash, MRP, quality gates, and supplier performance using the same UIDL style.",
        { fontSize: "text-sm", color: "{primitives.color.text-secondary}" },
      ),
    ],
  };
}

function erpWorkflowCards(): UIDLNode {
  const dimensionCoverage = Math.round(accountingDimensions.reduce((total, row) => total + row.coveragePercent, 0) / accountingDimensions.length);
  const procureValue = procurementTracker.reduce((total, row) => total + row.value, 0);
  const salesValue = salesLifecycleTracker.reduce((total, row) => total + row.value, 0);
  const mrpShortfall = manufacturingPlans.reduce((total, row) => total + row.shortfallQty, 0);
  const passedQC = qualityInspections.filter((q) => q.status === "Passed").length;
  const qcPassRate = Math.round((passedQC / qualityInspections.length) * 100);
  const resolvedSLA = supportTickets.filter((t) => t.status === "Resolved" || t.slaDue.includes("remaining")).length;
  const slaCompliance = Math.round((resolvedSLA / supportTickets.length) * 100);

  return {
    id: "erp-kpis",
    type: "GridView",
    props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" } },
    style: { gap: "gap-3", padding: "p-4" },
    children: [
      dashboardCard("erp-kpi-dimensions", "Dimension Coverage", `${dimensionCoverage}%`, "Department, Project, Sales Channel"),
      dashboardCard("erp-kpi-procure", "Procure-to-Pay", formatIDR(procureValue), `${procurementTracker.length} active buying chains`),
      dashboardCard("erp-kpi-sales", "Quote-to-Cash", formatIDR(salesValue), `${salesLifecycleTracker.length} linked sales chains`),
      dashboardCard("erp-kpi-mrp", "MRP Shortfall", `${mrpShortfall} units`, "Auto reorder + work order readiness"),
      dashboardCard("erp-kpi-qc", "Quality Pass Rate", `${qcPassRate}%`, `${qualityInspections.length} gate inspections logged`),
      dashboardCard("erp-kpi-sla", "Support SLA", `${slaCompliance}%`, `${supportTickets.length} service tickets tracked`),
    ],
  };
}

function erpModuleSummary(): UIDLNode {
  return {
    id: "erp-module-summary",
    type: "GridView",
    props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" } },
    style: { gap: "gap-4", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
    children: [
      {
        id: "erp-core-modules",
        type: "Column",
        style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border", borderRadius: "rounded-lg", background: "{primitives.color.surface}" },
        children: [
          text("erp-core-title", "Core ERP Modules & Navigation", { fontSize: "text-base", fontWeight: 600 }),
          text("erp-core-copy", "Accounting Dimensions, Procurement, Sales, Stock, Manufacturing/MRP, Quality Gates, Help Desk/SLA, and Project Budgeting.", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
          {
            id: "erp-module-actions",
            type: "Row",
            props: { style: { display: "flex", flexWrap: "wrap" } },
            style: { gap: "gap-2" },
            children: [
              button("erp-open-gl", "General Ledger", "/meridian/report/GeneralLedger"),
              button("erp-open-dimensions", "Dimensions", "/meridian/list/AccountingDimension"),
              button("erp-open-procurement", "Procurement", "/meridian/list/ProcurementTracker"),
              button("erp-open-q2c", "Quote-to-Cash", "/meridian/list/SalesLifecycleTracker"),
              button("erp-open-mrp", "MRP Readiness", "/meridian/list/ManufacturingPlan"),
              button("erp-open-suppliers", "Supplier Scorecard", "/meridian/list/SupplierScorecard"),
              button("erp-open-qc", "Quality Gates", "/meridian/list/QualityInspection"),
              button("erp-open-support", "Help Desk & SLA", "/meridian/list/SupportTicket"),
              button("erp-open-projects", "Projects", "/meridian/list/ProjectSummary"),
              button("erp-open-pos", "Point of Sale", "/meridian/pos"),
              button("erp-open-stock", "Stock Balance", "/meridian/report/StockBalance"),
            ],
          },
        ],
      },
      {
        id: "erp-controls",
        type: "Column",
        style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border", borderRadius: "rounded-lg", background: "{primitives.color.surface}" },
        children: [
          text("erp-controls-title", "ERP Control Signals & Governance", { fontSize: "text-base", fontWeight: 600 }),
          text("erp-controls-copy", "Submitted documents stay immutable, double-entry ledger totals remain balanced, and every operational chain links back to a voucher or stock movement.", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
          text("erp-controls-note", "All operational records maintain trace links across Sales Quotes, Sales Orders, Work Orders, Purchase Receipts, and Service Tickets.", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
        ],
      },
    ],
  };
}

/** Financial figures the dashboard shows — supplied from the adapter ledger by
 *  `MeridianDashboard`, or computed from the static `meridian/ledger.ts` when omitted. */
export interface DashboardFinancials {
  receivables: number;
  payables: number;
  cash: number;
  netProfit: number;
  income: number;
  expense: number;
  expenseBreakdown: Array<{ label: string; value: number }>;
}

function staticDashboardFinancials(): DashboardFinancials {
  const { income, expense, netProfit } = profitAndLoss();
  const expenseAccounts = accounts.filter((account) => account.rootType === "Expense" && !account.isGroup);
  return {
    receivables: totalReceivables(),
    payables: totalPayables(),
    cash: cashAndBankBalance(),
    netProfit,
    income,
    expense,
    expenseBreakdown: expenseAccounts
      .map((account) => ({ label: account.name, value: accountBalance(account.id) }))
      .filter((row) => row.value !== 0),
  };
}

export interface DashboardInvoiceSources {
  sales: Array<{ status: string; total: number }>;
  purchase: Array<{ status: string; total: number }>;
}

export function buildDashboardDocument(
  financials?: DashboardFinancials,
  invoiceSources?: DashboardInvoiceSources,
): UIDLDocument {
  const f = financials ?? staticDashboardFinancials();
  const invoices = invoiceSources ?? { sales: salesInvoices, purchase: purchaseInvoices };
  const { income, expense, netProfit, receivables, payables, cash, expenseBreakdown } = f;

  const kpis: Array<[string, string]> = [
    ["Total Receivables", formatIDR(receivables)],
    ["Total Payables", formatIDR(payables)],
    ["Cash & Bank", formatIDR(cash)],
    ["Net Profit (Jul 2027)", formatIDR(netProfit)],
  ];

  const incomeExpenseChart = [
    { label: "Income", value: income },
    { label: "Expense", value: expense },
  ];
  const dimensionRows = accountingDimensions.map((dimension) => ({
    dimension: dimension.dimensionName,
    reference: dimension.referenceDocType,
    default: dimension.defaultDimension,
    mandatory: dimension.mandatoryFor,
    coverage: `${dimension.coveragePercent}%`,
  }));
  const procurementRows = procurementTracker.map((row) => ({ ...row, value: formatIDR(row.value) }));
  const salesRows = salesLifecycleTracker.map((row) => ({ ...row, value: formatIDR(row.value) }));
  const manufacturingRows = manufacturingPlans.map((row) => ({ ...row, projectedQty: String(row.projectedQty), shortfallQty: String(row.shortfallQty) }));
  const supplierRows = supplierScorecards.map((row) => ({
    supplier: row.supplier,
    onTime: `${row.onTimeDeliveryRate}%`,
    defect: `${row.defectRate}%`,
    response: String(row.responsivenessScore),
    standing: row.standing,
  }));
  const qualityRows = qualityInspections.map((row) => ({
    ...row,
    sampleSize: `${row.sampleSize} units`,
    defects: `${row.defectCount} (${((row.defectCount / row.sampleSize) * 100).toFixed(1)}%)`,
  }));
  const supportRows = supportTickets.map((row) => ({
    ...row,
    responseTime: `${row.responseTimeMinutes}m`,
  }));
  const projectRows = projectSummaries.map((row) => ({
    ...row,
    budget: formatIDR(row.budget),
    actualSpend: formatIDR(row.actualSpend),
    progress: `${row.progressPercent}%`,
  }));

  return {
    version: "1.0.0",
    id: "meridian-dashboard",
    name: "Meridian Trading Co. Dashboard",
    dataSources: {
      incomeExpense: incomeExpenseChart,
      expenseBreakdown,
      dimensions: dimensionRows,
      procurement: procurementRows,
      salesLifecycle: salesRows,
      manufacturing: manufacturingRows,
      suppliers: supplierRows,
      quality: qualityRows,
      support: supportRows,
      projects: projectRows,
    },
    definitions: {},
    root: {
      id: "page",
      type: "Column",
      style: { gap: "gap-0" },
      children: [
        meridianKpiRow("kpis", kpis),
        // Cashflow — real Dashboard's own first section, full width, above a divider.
        {
          id: "cashflow-section",
          type: "Column",
          style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            { id: "cashflow-chart", type: "Chart", props: { title: "Cashflow", chartType: "bar", xKey: "label", yKey: "value", dataSource: "incomeExpense" }, style: { width: "w-full" } },
          ],
        },
        // Unpaid Invoices — Sales | Purchase side by side, matching Dashboard's own two
        // UnpaidInvoices widgets in one row.
        {
          id: "unpaid-section",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" } },
          style: { borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            unpaidInvoicesWidget("unpaid-sales", "Sales Invoices", invoices.sales, "/meridian/list/SalesInvoice", "#3b82f6"),
            unpaidInvoicesWidget("unpaid-purchase", "Purchase Invoices", invoices.purchase, "/meridian/list/PurchaseInvoice", "#ec4899"),
          ],
        },
        // Profit and Loss | Expenses — Dashboard's own bottom row.
        {
          id: "pnl-expenses-section",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" } },
          style: { borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            {
              id: "pnl-widget",
              type: "Column",
              style: { gap: "gap-3", padding: "p-4" },
              children: [
                { id: "pnl-chart", type: "Chart", props: { title: "Profit and Loss", chartType: "bar", xKey: "label", yKey: "value", dataSource: "incomeExpense" }, style: { width: "w-full" } },
              ],
            },
            {
              id: "expenses-widget",
              type: "Column",
              style: { gap: "gap-3", padding: "p-4" },
              children:
                expenseBreakdown.length > 0
                  ? [{ id: "expenses-chart", type: "Chart", props: { title: "Expenses", chartType: "bar", xKey: "label", yKey: "value", dataSource: "expenseBreakdown" }, style: { width: "w-full" } }]
                  : [text("expenses-title", "Expenses", { fontSize: "text-base", fontWeight: 600 }), text("expenses-empty", "No expense postings yet", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" })],
            },
          ],
        },
        erpSectionHeader(),
        erpWorkflowCards(),
        erpModuleSummary(),
        {
          id: "erp-dimensions-section",
          type: "Column",
          style: { gap: "gap-3", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            text("erp-dimensions-title", "Accounting Dimensions", { fontSize: "text-lg", fontWeight: 700 }),
            text("erp-dimensions-copy", "Segment one chart of accounts by Department, Project, and Sales Channel instead of creating duplicate accounts for every reporting axis.", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
            dashboardTable("erp-dimensions-table", "Dimension setup and coverage", "dimensions", [
              { key: "dimension", label: "Dimension" },
              { key: "reference", label: "Reference DocType" },
              { key: "default", label: "Default" },
              { key: "mandatory", label: "Mandatory" },
              { key: "coverage", label: "Coverage", align: "right" },
            ]),
          ],
        },
        {
          id: "erp-workflows-section",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" } },
          style: { gap: "gap-4", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            dashboardTable("erp-procurement-table", "Procure-to-Pay Tracker", "procurement", [
              { key: "materialRequest", label: "MR" },
              { key: "rfq", label: "RFQ" },
              { key: "purchaseOrder", label: "PO" },
              { key: "receiptStatus", label: "Receipt" },
              { key: "value", label: "Value", align: "right" },
            ]),
            dashboardTable("erp-sales-table", "Quote-to-Cash Tracker", "salesLifecycle", [
              { key: "quotation", label: "Quotation" },
              { key: "salesOrder", label: "Sales Order" },
              { key: "delivery", label: "Delivery" },
              { key: "paymentReminder", label: "Reminder" },
              { key: "value", label: "Value", align: "right" },
            ]),
          ],
        },
        {
          id: "erp-operations-section",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" } },
          style: { gap: "gap-4", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            dashboardTable("erp-mrp-table", "MRP and Manufacturing Readiness", "manufacturing", [
              { key: "productionPlan", label: "Plan" },
              { key: "item", label: "Item" },
              { key: "projectedQty", label: "Projected", align: "right" },
              { key: "shortfallQty", label: "Shortfall", align: "right" },
              { key: "qcGate", label: "Gate" },
            ]),
            dashboardTable("erp-supplier-table", "Supplier Scorecard", "suppliers", [
              { key: "supplier", label: "Supplier" },
              { key: "onTime", label: "On-time", align: "right" },
              { key: "defect", label: "Defect", align: "right" },
              { key: "response", label: "Response", align: "right" },
              { key: "standing", label: "Standing" },
            ]),
          ],
        },
        {
          id: "erp-quality-support-section",
          type: "GridView",
          props: { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" } },
          style: { gap: "gap-4", padding: "p-4", borderColor: "{primitives.color.border}", borderWidth: "border-b" },
          children: [
            dashboardTable("erp-quality-table", "Quality Gates & Inspections", "quality", [
              { key: "referenceType", label: "Ref Type" },
              { key: "referenceId", label: "Ref ID" },
              { key: "item", label: "Item" },
              { key: "sampleSize", label: "Sample", align: "right" },
              { key: "defects", label: "Defects", align: "right" },
              { key: "status", label: "QC Status" },
            ]),
            dashboardTable("erp-support-table", "Customer Support & SLA Tracking", "support", [
              { key: "id", label: "Ticket" },
              { key: "subject", label: "Subject" },
              { key: "customer", label: "Customer" },
              { key: "priority", label: "Priority" },
              { key: "slaDue", label: "SLA Status" },
              { key: "status", label: "Status" },
            ]),
          ],
        },
        {
          id: "erp-projects-section",
          type: "Column",
          style: { gap: "gap-3", padding: "p-4" },
          children: [
            text("erp-projects-title", "Project Governance & Budget Utilization", { fontSize: "text-lg", fontWeight: 700 }),
            text("erp-projects-copy", "Track cross-functional customer fitout and renovation projects against approved budgets and milestones.", { fontSize: "text-sm", color: "{primitives.color.text-secondary}" }),
            dashboardTable("erp-projects-table", "Active projects budget vs actual", "projects", [
              { key: "name", label: "Project Name" },
              { key: "customer", label: "Customer" },
              { key: "budget", label: "Budget", align: "right" },
              { key: "actualSpend", label: "Actual Spend", align: "right" },
              { key: "progress", label: "Progress", align: "right" },
              { key: "status", label: "Status" },
            ]),
          ],
        },
      ],
    },
  };
}
