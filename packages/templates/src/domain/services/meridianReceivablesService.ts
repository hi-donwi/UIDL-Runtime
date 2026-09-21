import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";
import { invoiceOutstanding } from "./meridianPaymentService";

/**
 * Read-only Accounts Receivable subledger ↔ GL control reconciliation for the Meridian
 * (core accounting) tenant. Each submitted invoice's outstanding balance is derived from
 * its payments, write-offs, and credit notes; the total must equal the net balance the
 * ledger carries on the AR control account.
 */

const TENANT = "meridian";
const AR_ACCOUNT = "1130";

export interface MeridianReceivablesRow {
  invoiceId: string;
  customerName: string;
  date: string;
  status: string;
  total: number;
  allocated: number;
  writtenOff: number;
  creditNoted: number;
  outstanding: number;
  arStatus: "Open" | "Partially Paid" | "Settled" | "Cancelled";
}

export interface MeridianReceivablesSummary {
  submittedInvoiceCount: number;
  openCount: number;
  partiallyPaidCount: number;
  settledCount: number;
  cancelledCount: number;
  totalBilled: number;
  totalCollected: number;
  totalWrittenOff: number;
  totalCreditNoted: number;
  totalOutstanding: number;
  customerAdvances: number;
  arControlBalance: number;
  tieOutDifference: number;
}

export interface MeridianReceivablesReport {
  summary: MeridianReceivablesSummary;
  rows: MeridianReceivablesRow[];
  controls: string[];
}

export async function buildMeridianReceivablesReport(adapter: DataAdapter): Promise<MeridianReceivablesReport> {
  const [invoiceResult, paymentResult, creditNoteResult, ledgerResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "SalesInvoice" }),
    adapter.query<Record<string, unknown>>({ collection: "Payment" }),
    adapter.query<Record<string, unknown>>({ collection: "CreditNote" }),
    adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" }),
  ]);

  const payments = paymentResult.rows;
  const creditNotes = creditNoteResult.rows;
  const submitted = invoiceResult.rows.filter((row) => row.status !== "Draft");

  const rows: MeridianReceivablesRow[] = submitted.map((invoice) => {
    const invoiceId = String(invoice.id ?? "");
    const status = String(invoice.status ?? "");
    const total = round(Number(invoice.total ?? 0));
    const cancelled = status === "Cancelled";

    let allocated = 0;
    let writtenOff = 0;
    for (const payment of payments) {
      for (const line of (payment.for as Array<Record<string, unknown>> | undefined) ?? []) {
        if (line.invoiceId !== invoiceId) continue;
        allocated += Number(line.amount ?? 0);
        writtenOff += Number(line.writeOffAmount ?? 0);
      }
    }
    const creditNoted = creditNotes
      .filter((note) => note.invoice === invoiceId)
      .reduce((sum, note) => sum + Number(note.amount ?? 0), 0);

    const outstanding = cancelled ? 0 : Math.max(0, invoiceOutstanding(invoiceId, total, payments, creditNotes));
    const arStatus: MeridianReceivablesRow["arStatus"] = cancelled
      ? "Cancelled"
      : outstanding <= 0
        ? "Settled"
        : allocated + writtenOff + creditNoted > 0
          ? "Partially Paid"
          : "Open";

    return {
      invoiceId,
      customerName: String(invoice.customerName ?? invoice.customer ?? ""),
      date: String(invoice.date ?? ""),
      status,
      total,
      allocated: round(allocated),
      writtenOff: round(writtenOff),
      creditNoted: round(creditNoted),
      outstanding,
      arStatus,
    };
  });

  rows.sort((a, b) => b.outstanding - a.outstanding || a.invoiceId.localeCompare(b.invoiceId));

  const arControlBalance = round(
    ledgerResult.rows
      .filter((voucher) => voucher.tenant === TENANT)
      .flatMap((voucher) => voucher.lines)
      .filter((line) => line.account === AR_ACCOUNT)
      .reduce((sum, line) => sum + Number(line.debit ?? 0) - Number(line.credit ?? 0), 0),
  );
  const totalOutstanding = round(rows.reduce((sum, row) => sum + row.outstanding, 0));

  const summary: MeridianReceivablesSummary = {
    submittedInvoiceCount: rows.length,
    openCount: rows.filter((row) => row.arStatus === "Open").length,
    partiallyPaidCount: rows.filter((row) => row.arStatus === "Partially Paid").length,
    settledCount: rows.filter((row) => row.arStatus === "Settled").length,
    cancelledCount: rows.filter((row) => row.arStatus === "Cancelled").length,
    totalBilled: round(rows.filter((row) => row.arStatus !== "Cancelled").reduce((sum, row) => sum + row.total, 0)),
    totalCollected: round(rows.reduce((sum, row) => sum + row.allocated, 0)),
    totalWrittenOff: round(rows.reduce((sum, row) => sum + row.writtenOff, 0)),
    totalCreditNoted: round(rows.reduce((sum, row) => sum + row.creditNoted, 0)),
    totalOutstanding,
    customerAdvances: round(payments.reduce((sum, payment) => sum + Number(payment.unallocatedAmount ?? 0), 0)),
    arControlBalance,
    tieOutDifference: round(totalOutstanding - arControlBalance),
  };

  return { summary, rows, controls: buildControls() };
}

function buildControls(): string[] {
  return [
    "Each invoice's outstanding balance is total − allocated payments − write-offs − credit notes.",
    "AR control balance is the net debit the ledger carries on account 1130; the tie-out difference against total outstanding must be zero.",
    "A payment may settle several invoices at once (PaymentFor) and its unallocated excess sits on the customer-advance account 2135.",
    "Illustrative reference data — not a substitute for a receivables ageing or collections process.",
  ];
}

export function assertReceivablesTieOut(report: MeridianReceivablesReport): void {
  if (report.summary.tieOutDifference !== 0) {
    throw new DataError(`Meridian AR subledger does not tie out (${report.summary.tieOutDifference})`, "validation");
  }
}

function round(value: number): number {
  return Math.round(value);
}
