import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";
import type { PosTender } from "./meridianPosService";

/**
 * Read-only POS shift reconciliation for the Meridian (core accounting) tenant. Ties each
 * shift's opening float plus cash sales to the counted drawer at close, splits sales by
 * tender, and checks that POS invoice totals equal the revenue + output-tax the ledger
 * carries for `POS Invoice` vouchers.
 */

const TENANT = "meridian";
const REVENUE_ACCOUNT = "4110";
const OUTPUT_TAX_ACCOUNT = "2140";

export interface MeridianPosShiftRow {
  shiftId: string;
  posProfile: string;
  cashier: string;
  openedAt: string;
  status: string;
  openingFloat: number;
  cashSales: number;
  nonCashSales: number;
  expectedCash: number;
  countedCash: number | null;
  differenceAmount: number | null;
  closeStatus: string | null;
  invoiceCount: number;
}

export interface MeridianPosShiftSummary {
  shiftCount: number;
  openCount: number;
  closedCount: number;
  balancedCount: number;
  shortCount: number;
  overCount: number;
  totalOpeningFloat: number;
  totalCashSales: number;
  totalNonCashSales: number;
  netCashVariance: number;
  invoiceCount: number;
  totalInvoiceValue: number;
  ledgerRevenuePlusTax: number;
  tieOutDifference: number;
  unbalancedVoucherCount: number;
}

export interface MeridianPosShiftReport {
  summary: MeridianPosShiftSummary;
  rows: MeridianPosShiftRow[];
  controls: string[];
}

export async function buildMeridianPosShiftReport(adapter: DataAdapter): Promise<MeridianPosShiftReport> {
  const [openingResult, closingResult, invoiceResult, ledgerResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "POSOpeningShift" }),
    adapter.query<Record<string, unknown>>({ collection: "POSClosingShift" }),
    adapter.query<Record<string, unknown>>({ collection: "POSSalesInvoice" }),
    adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" }),
  ]);

  const openingShifts = openingResult.rows.filter((row) => row.tenant === TENANT);
  const closingByShift = new Map<string, Record<string, unknown>>();
  for (const closing of closingResult.rows) {
    if (closing.tenant !== TENANT) continue;
    closingByShift.set(String(closing.openingShift ?? ""), closing);
  }

  const posVouchers = ledgerResult.rows.filter((row) => row.tenant === TENANT && row.voucherType === "POS Invoice");
  let unbalancedVoucherCount = 0;
  let ledgerRevenuePlusTax = 0;
  for (const voucher of posVouchers) {
    const debit = round(voucher.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
    const credit = round(voucher.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
    if (debit !== credit) unbalancedVoucherCount += 1;
    ledgerRevenuePlusTax += voucher.lines
      .filter((line) => line.account === REVENUE_ACCOUNT || line.account === OUTPUT_TAX_ACCOUNT)
      .reduce((sum, line) => sum + Number(line.credit ?? 0) - Number(line.debit ?? 0), 0);
  }

  const rows: MeridianPosShiftRow[] = openingShifts.map((shift) => {
    const shiftId = String(shift.id ?? "");
    const sales = normaliseTenders(shift.salesByTender);
    const cashSales = sales.Cash;
    const nonCashSales = round(sales.Card + sales.QRIS + sales.Transfer);
    const closing = closingByShift.get(shiftId);
    return {
      shiftId,
      posProfile: String(shift.posProfile ?? ""),
      cashier: String(shift.cashier ?? ""),
      openedAt: String(shift.openingDate ?? ""),
      status: String(shift.status ?? ""),
      openingFloat: round(Number(shift.openingFloat ?? 0)),
      cashSales,
      nonCashSales,
      expectedCash: round(Number(shift.expectedCash ?? 0)),
      countedCash: closing ? round(Number(closing.countedCash ?? 0)) : null,
      differenceAmount: closing ? round(Number(closing.differenceAmount ?? 0)) : null,
      closeStatus: closing ? String(closing.status ?? "") : null,
      invoiceCount: Number(shift.invoiceCount ?? 0),
    };
  });

  rows.sort((a, b) => Number(a.status === "Closed") - Number(b.status === "Closed") || a.shiftId.localeCompare(b.shiftId));

  const totalInvoiceValue = round(invoiceResult.rows.filter((row) => row.tenant === TENANT).reduce((sum, row) => sum + Number(row.total ?? 0), 0));
  const summary: MeridianPosShiftSummary = {
    shiftCount: rows.length,
    openCount: rows.filter((row) => row.status === "Open").length,
    closedCount: rows.filter((row) => row.status === "Closed").length,
    balancedCount: rows.filter((row) => row.closeStatus === "Balanced").length,
    shortCount: rows.filter((row) => row.closeStatus === "Short").length,
    overCount: rows.filter((row) => row.closeStatus === "Over").length,
    totalOpeningFloat: round(rows.reduce((sum, row) => sum + row.openingFloat, 0)),
    totalCashSales: round(rows.reduce((sum, row) => sum + row.cashSales, 0)),
    totalNonCashSales: round(rows.reduce((sum, row) => sum + row.nonCashSales, 0)),
    netCashVariance: round(rows.reduce((sum, row) => sum + (row.differenceAmount ?? 0), 0)),
    invoiceCount: rows.reduce((sum, row) => sum + row.invoiceCount, 0),
    totalInvoiceValue,
    ledgerRevenuePlusTax: round(ledgerRevenuePlusTax),
    tieOutDifference: round(totalInvoiceValue - ledgerRevenuePlusTax),
    unbalancedVoucherCount,
  };

  return { summary, rows, controls: buildControls() };
}

function buildControls(): string[] {
  return [
    "A shift opens and closes with a physical cash count by IDR denomination; the drawer difference is counted − (opening float + cash sales).",
    "A short or over count posts a cash-variance journal entry (5190 Selisih Kas / 4190 Pendapatan Lain-lain) so the ledger stays balanced with the drawer.",
    "Tie-out difference = POS invoice value − (revenue + output tax) posted for POS Invoice vouchers; it must be zero.",
    "Illustrative reference data — not a certified point-of-sale or cash-control system.",
  ];
}

function normaliseTenders(value: unknown): Record<PosTender, number> {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    Cash: round(Number(source.Cash ?? 0)),
    Card: round(Number(source.Card ?? 0)),
    QRIS: round(Number(source.QRIS ?? 0)),
    Transfer: round(Number(source.Transfer ?? 0)),
  };
}

function round(value: number): number {
  return Math.round(value);
}

export function assertPosReportOk(report: MeridianPosShiftReport): void {
  if (report.summary.unbalancedVoucherCount > 0 || report.summary.tieOutDifference !== 0) {
    throw new DataError("Meridian POS ledger does not reconcile", "validation");
  }
}
