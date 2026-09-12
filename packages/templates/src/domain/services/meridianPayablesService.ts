import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";
import { AP_ACCOUNT, GRNI_ACCOUNT } from "../../mock-data/generators/meridianPurchaseCycle";

/**
 * Read-only Accounts Payable subledger ↔ GL control reconciliation for the Meridian
 * (core accounting) tenant — the buy-side mirror of `meridianReceivablesService`. Each
 * submitted purchase invoice's outstanding balance is derived from its `PurchasePayment`
 * allocations; the total must equal the net credit the ledger carries on the AP control
 * account (2110).
 */

const TENANT = "meridian";

export interface MeridianPayablesRow {
  invoiceId: string;
  supplierName: string;
  date: string;
  status: string;
  total: number;
  allocated: number;
  outstanding: number;
  apStatus: "Open" | "Partially Paid" | "Settled" | "Cancelled";
}

export interface MeridianPayablesSummary {
  submittedInvoiceCount: number;
  openCount: number;
  partiallyPaidCount: number;
  settledCount: number;
  cancelledCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  apControlBalance: number;
  tieOutDifference: number;
  /** Net credit on 2150 — goods received but not yet cleared by a matched Purchase Invoice. */
  grniBalance: number;
}

export interface MeridianPayablesReport {
  summary: MeridianPayablesSummary;
  rows: MeridianPayablesRow[];
  controls: string[];
}

/** Portion of a purchase invoice still owed after its PurchasePayment allocations. */
export function purchaseInvoiceOutstanding(
  invoiceId: string,
  total: number,
  payments: Array<Record<string, unknown>>,
): number {
  let allocated = 0;
  for (const payment of payments) {
    for (const line of (payment.for as Array<Record<string, unknown>> | undefined) ?? []) {
      if (line.invoiceId === invoiceId) allocated += Number(line.amount ?? 0);
    }
  }
  return round(total - allocated);
}

export async function buildMeridianPayablesReport(adapter: DataAdapter): Promise<MeridianPayablesReport> {
  const [invoiceResult, paymentResult, ledgerResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "PurchaseInvoice" }),
    adapter.query<Record<string, unknown>>({ collection: "PurchasePayment" }),
    adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" }),
  ]);

  const payments = paymentResult.rows;
  const submitted = invoiceResult.rows.filter((row) => row.status !== "Draft");

  const rows: MeridianPayablesRow[] = submitted.map((invoice) => {
    const invoiceId = String(invoice.id ?? "");
    const status = String(invoice.status ?? "");
    const total = round(Number(invoice.total ?? 0));
    const cancelled = status === "Cancelled";

    let allocated = 0;
    for (const payment of payments) {
      for (const line of (payment.for as Array<Record<string, unknown>> | undefined) ?? []) {
        if (line.invoiceId === invoiceId) allocated += Number(line.amount ?? 0);
      }
    }

    const outstanding = cancelled ? 0 : Math.max(0, purchaseInvoiceOutstanding(invoiceId, total, payments));
    const apStatus: MeridianPayablesRow["apStatus"] = cancelled
      ? "Cancelled"
      : outstanding <= 0
        ? "Settled"
        : allocated > 0
          ? "Partially Paid"
          : "Open";

    return {
      invoiceId,
      supplierName: String(invoice.supplierName ?? invoice.supplier ?? ""),
      date: String(invoice.date ?? ""),
      status,
      total,
      allocated: round(allocated),
      outstanding,
      apStatus,
    };
  });

  rows.sort((a, b) => b.outstanding - a.outstanding || a.invoiceId.localeCompare(b.invoiceId));

  const meridianLines = ledgerResult.rows
    .filter((voucher) => voucher.tenant === TENANT)
    .flatMap((voucher) => voucher.lines);
  const netCredit = (account: string) =>
    round(
      meridianLines
        .filter((line) => line.account === account)
        .reduce((sum, line) => sum + Number(line.credit ?? 0) - Number(line.debit ?? 0), 0),
    );
  const apControlBalance = netCredit(AP_ACCOUNT);
  const grniBalance = netCredit(GRNI_ACCOUNT);
  const totalOutstanding = round(rows.reduce((sum, row) => sum + row.outstanding, 0));

  const summary: MeridianPayablesSummary = {
    submittedInvoiceCount: rows.length,
    openCount: rows.filter((row) => row.apStatus === "Open").length,
    partiallyPaidCount: rows.filter((row) => row.apStatus === "Partially Paid").length,
    settledCount: rows.filter((row) => row.apStatus === "Settled").length,
    cancelledCount: rows.filter((row) => row.apStatus === "Cancelled").length,
    totalBilled: round(rows.filter((row) => row.apStatus !== "Cancelled").reduce((sum, row) => sum + row.total, 0)),
    totalPaid: round(rows.reduce((sum, row) => sum + row.allocated, 0)),
    totalOutstanding,
    apControlBalance,
    tieOutDifference: round(totalOutstanding - apControlBalance),
    grniBalance,
  };

  return { summary, rows, controls: buildControls() };
}

function buildControls(): string[] {
  return [
    "Each invoice's outstanding balance is total − allocated purchase payments.",
    "AP control balance is the net credit the ledger carries on account 2110; the tie-out difference against total outstanding must be zero.",
    "A purchase payment may settle several invoices at once (PurchasePaymentFor); it posts Dr 2110 Hutang Usaha / Cr 1110 Kas.",
    "GRNI balance is the net credit on 2150 — goods received on a submitted Purchase Receipt that a matched Purchase Invoice has not yet cleared.",
    "Illustrative reference data — not a substitute for a payables ageing or disbursement approval process.",
  ];
}

export function assertPayablesTieOut(report: MeridianPayablesReport): void {
  if (report.summary.tieOutDifference !== 0) {
    throw new DataError(`Meridian AP subledger does not tie out (${report.summary.tieOutDifference})`, "validation");
  }
}

function round(value: number): number {
  return Math.round(value);
}
