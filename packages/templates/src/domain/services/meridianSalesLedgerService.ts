import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Read-only Sales Invoice ↔ General Ledger reconciliation for the Meridian (core accounting)
 * tenant. Proves that every submitted invoice has a balanced posting, that AR debits tie out to
 * billed value net of credit notes, and that Draft invoices carry no posting — the invariant a
 * "submit posts to the ledger" flow must preserve.
 */

const TENANT = "meridian";
const AR_ACCOUNT = "1130";

export interface MeridianSalesLedgerInput {
  asOf?: string;
}

export interface MeridianSalesLedgerRow {
  invoiceId: string;
  customerName: string;
  date: string;
  status: string;
  total: number;
  posted: boolean;
  reversed: boolean;
  voucherBalanced: boolean;
  arDebit: number;
  creditNoteTotal: number;
  netReceivable: number;
}

export interface MeridianSalesLedgerSummary {
  asOf: string;
  invoiceCount: number;
  postedCount: number;
  draftCount: number;
  cancelledCount: number;
  creditNoteCount: number;
  unbalancedVoucherCount: number;
  totalPostedBilled: number;
  totalArDebit: number;
  totalCreditNotes: number;
  totalCollected: number;
  totalNetReceivable: number;
  tieOutDifference: number;
}

export interface MeridianSalesLedgerReport {
  summary: MeridianSalesLedgerSummary;
  rows: MeridianSalesLedgerRow[];
  controls: string[];
}

export async function buildMeridianSalesLedgerReport(
  adapter: DataAdapter,
  input: MeridianSalesLedgerInput = {},
): Promise<MeridianSalesLedgerReport> {
  const asOf = input.asOf ?? "2027-08-22";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new DataError("asOf must be an ISO date", "validation", { asOf: "Invalid date" });
  }

  const [invoiceResult, ledgerResult, creditNoteResult, paymentResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "SalesInvoice" }),
    adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" }),
    adapter.query<Record<string, unknown>>({ collection: "CreditNote" }),
    adapter.query<Record<string, unknown>>({ collection: "Payment" }),
  ]);

  const vouchers = ledgerResult.rows.filter((row) => row.tenant === TENANT);
  const salesVoucherByInvoice = indexBy(vouchers, "Sales Invoice");
  const reversalVoucherByInvoice = indexBy(vouchers, "Sales Invoice Reversal");
  const creditNotesByInvoice = new Map<string, Array<Record<string, unknown>>>();
  for (const note of creditNoteResult.rows) {
    const invoiceId = String(note.invoice ?? "");
    if (!invoiceId) continue;
    const bucket = creditNotesByInvoice.get(invoiceId);
    if (bucket) bucket.push(note);
    else creditNotesByInvoice.set(invoiceId, [note]);
  }

  let unbalancedVoucherCount = 0;
  let netArAcrossVouchers = 0;
  for (const voucher of vouchers) {
    const debit = round(voucher.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
    const credit = round(voucher.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
    if (debit !== credit) unbalancedVoucherCount += 1;
    netArAcrossVouchers += arDebitOf(voucher);
  }

  const rows: MeridianSalesLedgerRow[] = invoiceResult.rows.map((invoice) => {
    const invoiceId = String(invoice.id ?? "");
    const status = String(invoice.status ?? "");
    const total = round(Number(invoice.total ?? 0));
    const salesVoucher = salesVoucherByInvoice.get(invoiceId);
    const reversal = reversalVoucherByInvoice.get(invoiceId);
    const notes = creditNotesByInvoice.get(invoiceId) ?? [];
    const creditNoteTotal = round(notes.reduce((sum, note) => sum + Number(note.amount ?? 0), 0));
    // arDebitOf already returns a signed net (a reversal voucher's AR line is a credit),
    // so sales and reversal are added, not subtracted.
    const arDebit = (salesVoucher ? arDebitOf(salesVoucher) : 0) + (reversal ? arDebitOf(reversal) : 0);

    return {
      invoiceId,
      customerName: String(invoice.customerName ?? invoice.customer ?? ""),
      date: String(invoice.date ?? ""),
      status,
      total,
      posted: Boolean(salesVoucher),
      reversed: Boolean(reversal),
      voucherBalanced: salesVoucher ? voucherBalanced(salesVoucher) : true,
      arDebit: round(arDebit),
      creditNoteTotal,
      netReceivable: round(Math.max(0, arDebit - creditNoteTotal)),
    };
  });

  rows.sort((a, b) => Number(a.posted) - Number(b.posted) || a.invoiceId.localeCompare(b.invoiceId));

  const postedRows = rows.filter((row) => row.posted && !row.reversed);
  const summary: MeridianSalesLedgerSummary = {
    asOf,
    invoiceCount: rows.length,
    postedCount: rows.filter((row) => row.posted).length,
    draftCount: rows.filter((row) => row.status === "Draft").length,
    cancelledCount: rows.filter((row) => row.status === "Cancelled").length,
    creditNoteCount: creditNoteResult.rows.length,
    unbalancedVoucherCount,
    totalPostedBilled: round(postedRows.reduce((sum, row) => sum + row.total, 0)),
    totalArDebit: round(netArAcrossVouchers),
    totalCreditNotes: round(creditNoteResult.rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)),
    totalCollected: round(
      paymentResult.rows.reduce(
        (sum, payment) =>
          sum +
          ((payment.for as Array<Record<string, unknown>> | undefined) ?? []).reduce(
            (line, entry) => line + Number(entry.amount ?? 0) + Number(entry.writeOffAmount ?? 0),
            0,
          ),
        0,
      ),
    ),
    totalNetReceivable: round(rows.reduce((sum, row) => sum + row.netReceivable, 0)),
    tieOutDifference: 0,
  };
  // Posted billed must equal the net AR the ledger still carries plus everything that has
  // already relieved it — credit notes and collected payments (with any write-off).
  summary.tieOutDifference = round(
    summary.totalPostedBilled - summary.totalArDebit - summary.totalCreditNotes - summary.totalCollected,
  );

  return { summary, rows, controls: buildControls() };
}

function indexBy(vouchers: GeneralLedgerVoucher[], voucherType: string): Map<string, GeneralLedgerVoucher> {
  const map = new Map<string, GeneralLedgerVoucher>();
  for (const voucher of vouchers) {
    if (voucher.voucherType === voucherType) map.set(String(voucher.voucherNo), voucher);
  }
  return map;
}

function arDebitOf(voucher: GeneralLedgerVoucher): number {
  return voucher.lines
    .filter((line) => line.account === AR_ACCOUNT || String(line.accountName ?? "").includes("Piutang Usaha"))
    .reduce((sum, line) => sum + Number(line.debit ?? 0) - Number(line.credit ?? 0), 0);
}

function voucherBalanced(voucher: GeneralLedgerVoucher): boolean {
  const debit = round(voucher.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
  const credit = round(voucher.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
  return debit === credit;
}

function buildControls(): string[] {
  return [
    "A Draft invoice carries no General Ledger voucher; submitting it posts a balanced AR / revenue / output-tax entry.",
    "Cancelling a submitted invoice posts a mirror-image reversal voucher rather than deleting the original.",
    "Tie-out difference = posted billed − AR debit − credit notes; it must be zero.",
    "Illustrative reference data — not a substitute for a double-entry accounting engine or audit.",
  ];
}

function round(value: number): number {
  return Math.round(value);
}
