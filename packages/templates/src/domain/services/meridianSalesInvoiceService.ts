import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

/**
 * Meridian (core accounting) Sales Invoice lifecycle — the behavioural counterpart to the
 * render-only Meridian forms. Mirrors Meridian's `Invoice.ts` `beforeSubmit` / `afterSubmit` /
 * `afterCancel`: submitting a Draft posts a balanced AR / revenue / output-tax voucher into the
 * `GeneralLedger`, cancelling posts the mirror image, and a credit note posts a contra-revenue
 * voucher. Every voucher satisfies `Σdebit === Σcredit`; every guard fails loudly.
 *
 * Adapter-backed and idempotent-guarded, so it works identically through the in-memory and
 * HTTP adapters.
 */

// Account codes match the seed's GL backfill (mock-data/generators/postingBackfill.ts) so
// service-posted vouchers are homogeneous with the seeded ones.
const AR_ACCOUNT = "1130";
const AR_ACCOUNT_NAME = "1130 - Piutang Usaha";
const REVENUE_ACCOUNT = "4110";
const REVENUE_ACCOUNT_NAME = "4110 - Pendapatan Penjualan";
const OUTPUT_TAX_ACCOUNT = "2140";
const OUTPUT_TAX_ACCOUNT_NAME = "2140 - Hutang PPN Keluaran";
const TAX_RATE = 0.11;
const TENANT = "meridian";

export interface GeneralLedgerLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface GeneralLedgerVoucher {
  id: string;
  tenant: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  totalAmount: number;
  lines: GeneralLedgerLine[];
}

export interface SubmitSalesInvoiceInput {
  invoiceId: string;
  submittedAt?: string;
}

export interface CancelSalesInvoiceInput {
  invoiceId: string;
  cancelledAt?: string;
}

export interface CreateSalesCreditNoteInput {
  invoiceId: string;
  /** Portion of the invoice total to reverse. Defaults to the full invoice total. */
  amount?: number;
  issuedAt?: string;
}

export interface SubmitSalesInvoiceResult {
  invoice: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
}

export interface CancelSalesInvoiceResult {
  invoice: Record<string, unknown>;
  reversalVoucher: GeneralLedgerVoucher;
}

export interface CreateSalesCreditNoteResult {
  invoice: Record<string, unknown>;
  creditNote: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
}

interface LoadedInvoice {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function submitSalesInvoice(
  adapter: DataAdapter,
  input: SubmitSalesInvoiceInput,
): Promise<SubmitSalesInvoiceResult> {
  const invoice = await loadInvoice(adapter, input.invoiceId);
  if (invoice.record.status !== "Draft") {
    throw new DataError(`Sales invoice "${input.invoiceId}" must be Draft to submit`, "validation", {
      status: "Expected Draft",
    });
  }
  const total = readMoney(invoice.record.total, "total", input.invoiceId);
  if (total <= 0) {
    throw new DataError(`Sales invoice "${input.invoiceId}" has no billable total`, "validation", { total: "Must be > 0" });
  }
  if (await voucherExists(adapter, input.invoiceId, "Sales Invoice")) {
    throw new DataError(`Sales invoice "${input.invoiceId}" is already posted`, "validation", { invoiceId: "Already posted" });
  }

  const postingDate = datePart(input.submittedAt) ?? String(invoice.record.date ?? "");
  const { voucher, subtotal, tax } = await postSalesInvoiceVoucher(adapter, {
    invoiceId: input.invoiceId,
    total,
    isTaxable: invoice.record.isTaxable !== false,
    party: String(invoice.record.customerName ?? invoice.record.customer ?? ""),
    postingDate,
  });

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "SalesInvoice",
    id: input.invoiceId,
    version: invoice.meta.version,
    data: { status: "Unpaid", submittedAt: input.submittedAt ?? postingDate, subtotal, tax },
  });

  return { invoice: updated.record, voucher };
}

export interface PostSalesInvoiceVoucherArgs {
  invoiceId: string;
  total: number;
  isTaxable: boolean;
  party: string;
  postingDate: string;
}

/**
 * Creates the AR / revenue / output-tax voucher for a submitted Sales Invoice, without
 * touching the invoice's status. Shared by `submitSalesInvoice` (which flips the status
 * itself) and the state-machine transition path (where `runTransition` has already flipped
 * it). Idempotency-guarded: a second call for an already-posted invoice throws.
 */
export async function postSalesInvoiceVoucher(
  adapter: DataAdapter,
  args: PostSalesInvoiceVoucherArgs,
): Promise<{ voucher: GeneralLedgerVoucher; subtotal: number; tax: number }> {
  const total = readMoney(args.total, "total", args.invoiceId);
  if (total <= 0) {
    throw new DataError(`Sales invoice "${args.invoiceId}" has no billable total`, "validation", { total: "Must be > 0" });
  }
  if (await voucherExists(adapter, args.invoiceId, "Sales Invoice")) {
    throw new DataError(`Sales invoice "${args.invoiceId}" is already posted`, "validation", { invoiceId: "Already posted" });
  }
  const { subtotal, tax } = splitTax(total, args.isTaxable);
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${args.invoiceId}`,
    voucherType: "Sales Invoice",
    voucherNo: args.invoiceId,
    postingDate: args.postingDate,
    remarks: `Penjualan faktur ${args.invoiceId} kepada ${args.party}`,
    lines: revenueLines(total, subtotal, tax),
  });
  return { voucher, subtotal, tax };
}

export async function cancelSalesInvoice(
  adapter: DataAdapter,
  input: CancelSalesInvoiceInput,
): Promise<CancelSalesInvoiceResult> {
  const invoice = await loadInvoice(adapter, input.invoiceId);
  const status = String(invoice.record.status ?? "");
  if (status !== "Unpaid" && status !== "Overdue") {
    throw new DataError(`Sales invoice "${input.invoiceId}" must be submitted and unpaid to cancel`, "validation", {
      status: "Expected Unpaid or Overdue",
    });
  }
  const original = await getVoucher(adapter, input.invoiceId, "Sales Invoice");
  if (!original) {
    throw new DataError(`Sales invoice "${input.invoiceId}" has no posted voucher to reverse`, "validation", {
      invoiceId: "Not posted",
    });
  }
  if (await hasDownstreamDocuments(adapter, input.invoiceId)) {
    throw new DataError(`Sales invoice "${input.invoiceId}" has payments or credit notes and cannot be cancelled`, "validation", {
      invoiceId: "Downstream documents exist",
    });
  }

  const postingDate = datePart(input.cancelledAt) ?? String(original.postingDate ?? invoice.record.date ?? "");
  const reversalVoucher = await postReversalVoucher(adapter, input.invoiceId, original, postingDate);

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "SalesInvoice",
    id: input.invoiceId,
    version: invoice.meta.version,
    data: { status: "Cancelled", cancelledAt: input.cancelledAt ?? postingDate },
  });

  return { invoice: updated.record, reversalVoucher };
}

async function postReversalVoucher(
  adapter: DataAdapter,
  invoiceId: string,
  original: GeneralLedgerVoucher,
  postingDate: string,
): Promise<GeneralLedgerVoucher> {
  return postVoucher(adapter, {
    id: `JV-NIMB-${invoiceId}-REV`,
    voucherType: "Sales Invoice Reversal",
    voucherNo: invoiceId,
    postingDate,
    remarks: `Pembatalan faktur ${invoiceId}`,
    lines: original.lines.map((line) => ({
      account: line.account,
      accountName: line.accountName,
      debit: line.credit,
      credit: line.debit,
    })),
  });
}

/** Public accessor for a posted Sales Invoice / Reversal voucher — used by the transition path. */
export async function getSalesInvoiceVoucher(
  adapter: DataAdapter,
  invoiceId: string,
  voucherType: "Sales Invoice" | "Sales Invoice Reversal" = "Sales Invoice",
): Promise<GeneralLedgerVoucher | undefined> {
  return getVoucher(adapter, invoiceId, voucherType);
}

/**
 * Posts the mirror-image reversal for a Sales Invoice whose status has already been flipped to
 * "Cancelled" by `runTransition`. If the invoice has downstream payments/credit notes, the
 * status is put back and an error is thrown — a cancel that can't post cleanly must not stand.
 */
export async function reverseSalesInvoiceVoucher(
  adapter: DataAdapter,
  record: Record<string, unknown>,
  priorStatus: string,
): Promise<GeneralLedgerVoucher> {
  const invoiceId = String(record.id ?? "");
  const original = await getVoucher(adapter, invoiceId, "Sales Invoice");
  if (!original) {
    await restoreStatus(adapter, invoiceId, priorStatus);
    throw new DataError(`Sales invoice "${invoiceId}" has no posted voucher to reverse`, "validation", { invoiceId: "Not posted" });
  }
  if (await getVoucher(adapter, invoiceId, "Sales Invoice Reversal")) {
    return original; // idempotent
  }
  if (await hasDownstreamDocuments(adapter, invoiceId)) {
    await restoreStatus(adapter, invoiceId, priorStatus);
    throw new DataError(`Sales invoice "${invoiceId}" has payments or credit notes and cannot be cancelled`, "validation", {
      invoiceId: "Downstream documents exist",
    });
  }
  const postingDate = String(original.postingDate ?? record.date ?? "");
  return postReversalVoucher(adapter, invoiceId, original, postingDate);
}

async function restoreStatus(adapter: DataAdapter, invoiceId: string, status: string): Promise<void> {
  const fresh = await adapter.get<Record<string, unknown>>("SalesInvoice", invoiceId);
  if (!fresh) return;
  await adapter.update({ collection: "SalesInvoice", id: invoiceId, version: fresh.meta.version, data: { status } });
}

export async function createSalesCreditNote(
  adapter: DataAdapter,
  input: CreateSalesCreditNoteInput,
): Promise<CreateSalesCreditNoteResult> {
  const invoice = await loadInvoice(adapter, input.invoiceId);
  const status = String(invoice.record.status ?? "");
  if (status !== "Unpaid" && status !== "Overdue" && status !== "Paid") {
    throw new DataError(`Sales invoice "${input.invoiceId}" must be submitted before a credit note`, "validation", {
      status: "Expected submitted invoice",
    });
  }
  const total = readMoney(invoice.record.total, "total", input.invoiceId);
  const amount = input.amount == null ? total : readMoney(input.amount, "amount", input.invoiceId);
  if (amount <= 0 || amount > total) {
    throw new DataError(`Credit note amount for "${input.invoiceId}" must be between 0 and the invoice total`, "validation", {
      amount: "Out of range",
    });
  }

  const existing = await adapter.query<Record<string, unknown>>({ collection: "CreditNote" });
  const priorForInvoice = existing.rows.filter((row) => row.invoice === input.invoiceId);
  const priorTotal = priorForInvoice.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  if (priorTotal + amount > total) {
    throw new DataError(`Credit notes for "${input.invoiceId}" would exceed the invoice total`, "validation", {
      amount: "Exceeds remaining balance",
    });
  }

  const seq = existing.rows.length + 1;
  const creditNoteId = `CN-NIMB-${String(seq).padStart(5, "0")}`;
  const issuedAt = datePart(input.issuedAt) ?? String(invoice.record.date ?? "");
  const { subtotal, tax } = splitTax(amount, invoice.record.isTaxable !== false);

  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${creditNoteId}`,
    voucherType: "Credit Note",
    voucherNo: creditNoteId,
    postingDate: issuedAt,
    remarks: `Retur penjualan atas faktur ${input.invoiceId}`,
    lines: [
      { account: REVENUE_ACCOUNT, accountName: REVENUE_ACCOUNT_NAME, debit: subtotal, credit: 0 },
      ...(tax > 0 ? [{ account: OUTPUT_TAX_ACCOUNT, accountName: OUTPUT_TAX_ACCOUNT_NAME, debit: tax, credit: 0 }] : []),
      { account: AR_ACCOUNT, accountName: AR_ACCOUNT_NAME, debit: 0, credit: amount },
    ],
  });

  const created = await adapter.create<Record<string, unknown>>({
    collection: "CreditNote",
    data: {
      id: creditNoteId,
      tenant: TENANT,
      invoice: input.invoiceId,
      customerName: invoice.record.customerName ?? invoice.record.customer ?? "",
      date: issuedAt,
      amount,
      subtotal,
      tax,
      status: "Submitted",
      route: `/meridian/edit/CreditNote/${creditNoteId}`,
    },
  });

  return { invoice: invoice.record, creditNote: created.record, voucher };
}

async function loadInvoice(adapter: DataAdapter, invoiceId: string): Promise<LoadedInvoice> {
  const found = await adapter.get<Record<string, unknown>>("SalesInvoice", invoiceId);
  if (!found) throw new DataError(`Sales invoice "${invoiceId}" was not found`, "not_found");
  return found;
}

async function voucherExists(adapter: DataAdapter, voucherNo: string, voucherType: string): Promise<boolean> {
  return (await getVoucher(adapter, voucherNo, voucherType)) != null;
}

async function getVoucher(
  adapter: DataAdapter,
  voucherNo: string,
  voucherType: string,
): Promise<GeneralLedgerVoucher | undefined> {
  const result = await adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" });
  return result.rows.find(
    (row) => row.tenant === TENANT && row.voucherType === voucherType && row.voucherNo === voucherNo,
  );
}

async function hasDownstreamDocuments(adapter: DataAdapter, invoiceId: string): Promise<boolean> {
  const [creditNotes, payments, salesPayments] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "CreditNote" }),
    adapter.query<Record<string, unknown>>({ collection: "Payment" }),
    adapter.query<Record<string, unknown>>({ collection: "SalesPayment" }),
  ]);
  const refs = (rows: Array<Record<string, unknown>>) =>
    rows.some(
      (row) =>
        row.invoice === invoiceId ||
        row.invoiceId === invoiceId ||
        row.reference === invoiceId ||
        (Array.isArray(row.for) && (row.for as Array<{ invoiceId?: string }>).some((entry) => entry.invoiceId === invoiceId)),
    );
  return refs(creditNotes.rows) || refs(payments.rows) || refs(salesPayments.rows);
}

interface PostVoucherInput {
  id: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  lines: GeneralLedgerLine[];
}

async function postVoucher(adapter: DataAdapter, input: PostVoucherInput): Promise<GeneralLedgerVoucher> {
  const debit = round(input.lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = round(input.lines.reduce((sum, line) => sum + line.credit, 0));
  if (debit !== credit) {
    throw new DataError(`General ledger voucher "${input.voucherNo}" is unbalanced (${debit} != ${credit})`, "validation", {
      voucherNo: "Unbalanced",
    });
  }
  const voucher: GeneralLedgerVoucher = {
    id: input.id,
    tenant: TENANT,
    voucherType: input.voucherType,
    voucherNo: input.voucherNo,
    postingDate: input.postingDate,
    remarks: input.remarks,
    totalAmount: debit,
    lines: input.lines.map((line) => ({ ...line, debit: round(line.debit), credit: round(line.credit) })),
  };
  const created = await adapter.create<GeneralLedgerVoucher>({ collection: "GeneralLedger", data: { ...voucher } });
  return created.record;
}

function revenueLines(total: number, subtotal: number, tax: number): GeneralLedgerLine[] {
  return [
    { account: AR_ACCOUNT, accountName: AR_ACCOUNT_NAME, debit: total, credit: 0 },
    { account: REVENUE_ACCOUNT, accountName: REVENUE_ACCOUNT_NAME, debit: 0, credit: subtotal },
    ...(tax > 0 ? [{ account: OUTPUT_TAX_ACCOUNT, accountName: OUTPUT_TAX_ACCOUNT_NAME, debit: 0, credit: tax }] : []),
  ];
}

function splitTax(gross: number, taxable: boolean): { subtotal: number; tax: number } {
  if (!taxable) return { subtotal: round(gross), tax: 0 };
  const subtotal = round(gross / (1 + TAX_RATE));
  return { subtotal, tax: round(gross - subtotal) };
}

function readMoney(value: unknown, field: string, ref: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`Sales invoice "${ref}" has an invalid ${field}`, "validation", { [field]: "Invalid money" });
  }
  return round(amount);
}

function datePart(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function round(value: number): number {
  return Math.round(value);
}
