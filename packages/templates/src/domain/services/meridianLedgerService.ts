import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Whole-ledger consistency for the Meridian (core accounting) tenant. Aggregates every
 * `GeneralLedger` voucher — from every behavioural slice (Sales Invoice, POS, Payment, Stock)
 * plus the seed backfills — and checks the three invariants a double-entry ledger must satisfy:
 * every voucher balances, the aggregate balances, and Assets = Liabilities + Equity + (Income −
 * Expense), classified by the first digit of the account code (1 asset, 2 liability, 3 equity,
 * 4 income, 5 expense).
 */

const TENANT = "meridian";

export type LedgerRootType = "Asset" | "Liability" | "Equity" | "Income" | "Expense" | "Unclassified";

export interface LedgerAccountRow {
  account: string;
  accountName: string;
  rootType: LedgerRootType;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerSummary {
  voucherCount: number;
  unbalancedVouchers: string[];
  aggregateDebit: number;
  aggregateCredit: number;
  aggregateDelta: number;
  byRootType: Record<LedgerRootType, number>;
  accountingEquationDelta: number;
  netIncome: number;
}

export interface MeridianLedgerReport {
  summary: LedgerSummary;
  rows: LedgerAccountRow[];
}

export function rootTypeFor(accountCode: string): LedgerRootType {
  switch (accountCode.trim().charAt(0)) {
    case "1":
      return "Asset";
    case "2":
      return "Liability";
    case "3":
      return "Equity";
    case "4":
      return "Income";
    case "5":
      return "Expense";
    default:
      return "Unclassified";
  }
}

export function summariseLedger(vouchers: GeneralLedgerVoucher[]): MeridianLedgerReport {
  const accounts = new Map<string, LedgerAccountRow>();
  const unbalancedVouchers: string[] = [];
  let aggregateDebit = 0;
  let aggregateCredit = 0;

  for (const voucher of vouchers) {
    let voucherDebit = 0;
    let voucherCredit = 0;
    for (const line of voucher.lines) {
      const code = String(line.account ?? "");
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      voucherDebit += debit;
      voucherCredit += credit;

      const row =
        accounts.get(code) ??
        { account: code, accountName: String(line.accountName ?? code), rootType: rootTypeFor(code), debit: 0, credit: 0, balance: 0 };
      row.debit += debit;
      row.credit += credit;
      accounts.set(code, row);
    }
    aggregateDebit += voucherDebit;
    aggregateCredit += voucherCredit;
    if (round(voucherDebit) !== round(voucherCredit)) unbalancedVouchers.push(String(voucher.voucherNo ?? voucher.id ?? "?"));
  }

  const byRootType: Record<LedgerRootType, number> = {
    Asset: 0,
    Liability: 0,
    Equity: 0,
    Income: 0,
    Expense: 0,
    Unclassified: 0,
  };
  const rows = [...accounts.values()].map((row) => {
    // Debit-normal for Asset/Expense, credit-normal otherwise.
    const debitNormal = row.rootType === "Asset" || row.rootType === "Expense";
    row.balance = round(debitNormal ? row.debit - row.credit : row.credit - row.debit);
    byRootType[row.rootType] = round(byRootType[row.rootType] + row.balance);
    return row;
  });
  rows.sort((a, b) => a.account.localeCompare(b.account));

  const netIncome = round(byRootType.Income - byRootType.Expense);
  // Assets − Liabilities − Equity − netIncome should be zero for a balanced book.
  const accountingEquationDelta = round(byRootType.Asset - byRootType.Liability - byRootType.Equity - netIncome);

  return {
    summary: {
      voucherCount: vouchers.length,
      unbalancedVouchers,
      aggregateDebit: round(aggregateDebit),
      aggregateCredit: round(aggregateCredit),
      aggregateDelta: round(aggregateDebit - aggregateCredit),
      byRootType,
      accountingEquationDelta,
      netIncome,
    },
    rows,
  };
}

export async function buildMeridianLedgerReport(adapter: DataAdapter): Promise<MeridianLedgerReport> {
  const result = await adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" });
  return summariseLedger(result.rows.filter((row) => row.tenant === TENANT));
}

export interface LedgerPostingRow {
  date: string;
  voucherType: string;
  voucher: string;
  account: string;
  accountName: string;
  rootType: LedgerRootType;
  debit: number;
  credit: number;
  remarks: string;
}

/** One row per voucher line — the flat form the General Ledger report needs. */
export function flattenLedger(vouchers: GeneralLedgerVoucher[]): LedgerPostingRow[] {
  const rows: LedgerPostingRow[] = [];
  for (const voucher of vouchers) {
    for (const line of voucher.lines) {
      const code = String(line.account ?? "");
      rows.push({
        date: String(voucher.postingDate ?? ""),
        voucherType: String(voucher.voucherType ?? ""),
        voucher: String(voucher.voucherNo ?? voucher.id ?? ""),
        account: code,
        accountName: String(line.accountName ?? code),
        rootType: rootTypeFor(code),
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        remarks: String(voucher.remarks ?? ""),
      });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher) || a.account.localeCompare(b.account));
}

export async function loadMeridianLedgerPostings(adapter: DataAdapter): Promise<LedgerPostingRow[]> {
  const result = await adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" });
  return flattenLedger(result.rows.filter((row) => row.tenant === TENANT));
}

export function assertLedgerConsistent(report: MeridianLedgerReport): void {
  const { summary } = report;
  if (summary.unbalancedVouchers.length > 0) {
    throw new DataError(`Unbalanced Meridian vouchers: ${summary.unbalancedVouchers.join(", ")}`, "validation");
  }
  if (summary.aggregateDelta !== 0) {
    throw new DataError(`Meridian ledger aggregate does not balance (Δ ${summary.aggregateDelta})`, "validation");
  }
  if (summary.accountingEquationDelta !== 0) {
    throw new DataError(`Meridian accounting equation does not hold (Δ ${summary.accountingEquationDelta})`, "validation");
  }
}

function round(value: number): number {
  return Math.round(value);
}
