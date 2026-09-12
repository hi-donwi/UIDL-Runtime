import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerLine, GeneralLedgerVoucher } from "./meridianSalesInvoiceService";
import {
  AP_ACCOUNT,
  AP_ACCOUNT_NAME,
  GRNI_ACCOUNT,
  GRNI_ACCOUNT_NAME,
  INPUT_TAX_ACCOUNT,
  INPUT_TAX_ACCOUNT_NAME,
  PURCHASE_EXPENSE_ACCOUNT,
  PURCHASE_EXPENSE_ACCOUNT_NAME,
} from "../../mock-data/generators/meridianPurchaseCycle";

/**
 * Meridian (core accounting) Purchase Invoice lifecycle — the buy-side mirror of
 * `meridianSalesInvoiceService`. Submitting a Draft posts a balanced
 * `5120 Beban Pembelian` + `1155 PPN Masukan` / `2110 Hutang Usaha` voucher into the
 * `GeneralLedger`; cancelling posts the mirror image and is blocked once a
 * `PurchasePayment` references the invoice. Every voucher satisfies `Σdebit === Σcredit`;
 * every guard fails loudly. Adapter-backed and idempotency-guarded, so it behaves
 * identically through the in-memory and HTTP adapters.
 */

const TENANT = "meridian";
const TAX_RATE = 0.11;

export interface SubmitPurchaseInvoiceInput {
  invoiceId: string;
  submittedAt?: string;
}

export interface CancelPurchaseInvoiceInput {
  invoiceId: string;
  cancelledAt?: string;
}

export interface SubmitPurchaseInvoiceResult {
  invoice: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
}

export interface CancelPurchaseInvoiceResult {
  invoice: Record<string, unknown>;
  reversalVoucher: GeneralLedgerVoucher;
}

interface LoadedInvoice {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function submitPurchaseInvoice(
  adapter: DataAdapter,
  input: SubmitPurchaseInvoiceInput,
): Promise<SubmitPurchaseInvoiceResult> {
  const invoice = await loadInvoice(adapter, input.invoiceId);
  if (invoice.record.status !== "Draft") {
    throw new DataError(`Purchase invoice "${input.invoiceId}" must be Draft to submit`, "validation", {
      status: "Expected Draft",
    });
  }
  const total = readMoney(invoice.record.total, "total", input.invoiceId);
  if (total <= 0) {
    throw new DataError(`Purchase invoice "${input.invoiceId}" has no billable total`, "validation", { total: "Must be > 0" });
  }
  if (await voucherExists(adapter, input.invoiceId, "Purchase Invoice")) {
    throw new DataError(`Purchase invoice "${input.invoiceId}" is already posted`, "validation", { invoiceId: "Already posted" });
  }

  const postingDate = datePart(input.submittedAt) ?? String(invoice.record.date ?? "");
  const { voucher, subtotal, tax } = await postPurchaseInvoiceVoucher(adapter, {
    invoiceId: input.invoiceId,
    total,
    isTaxable: invoice.record.isTaxable !== false,
    party: String(invoice.record.supplierName ?? invoice.record.supplier ?? ""),
    postingDate,
  });

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "PurchaseInvoice",
    id: input.invoiceId,
    version: invoice.meta.version,
    data: { status: "Unpaid", submittedAt: input.submittedAt ?? postingDate, subtotal, tax },
  });

  return { invoice: updated.record, voucher };
}

export interface PostPurchaseInvoiceVoucherArgs {
  invoiceId: string;
  total: number;
  isTaxable: boolean;
  party: string;
  postingDate: string;
}

/**
 * Creates the expense / input-tax / AP voucher for a submitted Purchase Invoice without
 * touching its status. Shared by `submitPurchaseInvoice` (which flips the status itself) and
 * the state-machine transition path (where `runTransition` has already flipped it).
 * Idempotency-guarded: a second call for an already-posted invoice throws.
 */
export async function postPurchaseInvoiceVoucher(
  adapter: DataAdapter,
  args: PostPurchaseInvoiceVoucherArgs,
): Promise<{ voucher: GeneralLedgerVoucher; subtotal: number; tax: number }> {
  const total = readMoney(args.total, "total", args.invoiceId);
  if (total <= 0) {
    throw new DataError(`Purchase invoice "${args.invoiceId}" has no billable total`, "validation", { total: "Must be > 0" });
  }
  if (await voucherExists(adapter, args.invoiceId, "Purchase Invoice")) {
    throw new DataError(`Purchase invoice "${args.invoiceId}" is already posted`, "validation", { invoiceId: "Already posted" });
  }
  const { subtotal, tax } = splitTax(total, args.isTaxable);
  // Three-way match: if a submitted Purchase Receipt already booked the goods (Dr 1140 /
  // Cr 2150 GRNI), the invoice clears GRNI rather than expensing to 5120.
  const matched = await hasSubmittedReceipt(adapter, args.invoiceId);
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${args.invoiceId}`,
    voucherType: "Purchase Invoice",
    voucherNo: args.invoiceId,
    postingDate: args.postingDate,
    remarks: `Pembelian faktur ${args.invoiceId} dari ${args.party}${matched ? " (GRNI)" : ""}`,
    lines: expenseLines(total, subtotal, tax, matched),
  });
  return { voucher, subtotal, tax };
}

export async function cancelPurchaseInvoice(
  adapter: DataAdapter,
  input: CancelPurchaseInvoiceInput,
): Promise<CancelPurchaseInvoiceResult> {
  const invoice = await loadInvoice(adapter, input.invoiceId);
  const status = String(invoice.record.status ?? "");
  if (status !== "Unpaid" && status !== "Overdue") {
    throw new DataError(`Purchase invoice "${input.invoiceId}" must be submitted and unpaid to cancel`, "validation", {
      status: "Expected Unpaid or Overdue",
    });
  }
  const original = await getVoucher(adapter, input.invoiceId, "Purchase Invoice");
  if (!original) {
    throw new DataError(`Purchase invoice "${input.invoiceId}" has no posted voucher to reverse`, "validation", {
      invoiceId: "Not posted",
    });
  }
  if (await hasDownstreamDocuments(adapter, input.invoiceId)) {
    throw new DataError(`Purchase invoice "${input.invoiceId}" has payments and cannot be cancelled`, "validation", {
      invoiceId: "Downstream documents exist",
    });
  }

  const postingDate = datePart(input.cancelledAt) ?? String(original.postingDate ?? invoice.record.date ?? "");
  const reversalVoucher = await postReversalVoucher(adapter, input.invoiceId, original, postingDate);

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "PurchaseInvoice",
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
    voucherType: "Purchase Invoice Reversal",
    voucherNo: invoiceId,
    postingDate,
    remarks: `Pembatalan faktur pembelian ${invoiceId}`,
    lines: original.lines.map((line) => ({
      account: line.account,
      accountName: line.accountName,
      debit: line.credit,
      credit: line.debit,
    })),
  });
}

/** Public accessor for a posted Purchase Invoice / Reversal voucher — used by the transition path. */
export async function getPurchaseInvoiceVoucher(
  adapter: DataAdapter,
  invoiceId: string,
  voucherType: "Purchase Invoice" | "Purchase Invoice Reversal" = "Purchase Invoice",
): Promise<GeneralLedgerVoucher | undefined> {
  return getVoucher(adapter, invoiceId, voucherType);
}

/**
 * Posts the mirror-image reversal for a Purchase Invoice whose status has already been flipped
 * to "Cancelled" by `runTransition`. If the invoice has downstream payments, the status is put
 * back and an error is thrown — a cancel that can't post cleanly must not stand.
 */
export async function reversePurchaseInvoiceVoucher(
  adapter: DataAdapter,
  record: Record<string, unknown>,
  priorStatus: string,
): Promise<GeneralLedgerVoucher> {
  const invoiceId = String(record.id ?? "");
  const original = await getVoucher(adapter, invoiceId, "Purchase Invoice");
  if (!original) {
    await restoreStatus(adapter, invoiceId, priorStatus);
    throw new DataError(`Purchase invoice "${invoiceId}" has no posted voucher to reverse`, "validation", { invoiceId: "Not posted" });
  }
  if (await getVoucher(adapter, invoiceId, "Purchase Invoice Reversal")) {
    return original; // idempotent
  }
  if (await hasDownstreamDocuments(adapter, invoiceId)) {
    await restoreStatus(adapter, invoiceId, priorStatus);
    throw new DataError(`Purchase invoice "${invoiceId}" has payments and cannot be cancelled`, "validation", {
      invoiceId: "Downstream documents exist",
    });
  }
  const postingDate = String(original.postingDate ?? record.date ?? "");
  return postReversalVoucher(adapter, invoiceId, original, postingDate);
}

async function restoreStatus(adapter: DataAdapter, invoiceId: string, status: string): Promise<void> {
  const fresh = await adapter.get<Record<string, unknown>>("PurchaseInvoice", invoiceId);
  if (!fresh) return;
  await adapter.update({ collection: "PurchaseInvoice", id: invoiceId, version: fresh.meta.version, data: { status } });
}

async function loadInvoice(adapter: DataAdapter, invoiceId: string): Promise<LoadedInvoice> {
  const found = await adapter.get<Record<string, unknown>>("PurchaseInvoice", invoiceId);
  if (!found) throw new DataError(`Purchase invoice "${invoiceId}" was not found`, "not_found");
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
  const payments = await adapter.query<Record<string, unknown>>({ collection: "PurchasePayment" });
  return payments.rows.some(
    (row) =>
      row.invoice === invoiceId ||
      row.invoiceId === invoiceId ||
      row.reference === invoiceId ||
      (Array.isArray(row.for) && (row.for as Array<{ invoiceId?: string }>).some((entry) => entry.invoiceId === invoiceId)),
  );
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

function expenseLines(total: number, subtotal: number, tax: number, matchedReceipt: boolean): GeneralLedgerLine[] {
  const debitAccount = matchedReceipt
    ? { account: GRNI_ACCOUNT, accountName: GRNI_ACCOUNT_NAME }
    : { account: PURCHASE_EXPENSE_ACCOUNT, accountName: PURCHASE_EXPENSE_ACCOUNT_NAME };
  return [
    { ...debitAccount, debit: subtotal, credit: 0 },
    ...(tax > 0 ? [{ account: INPUT_TAX_ACCOUNT, accountName: INPUT_TAX_ACCOUNT_NAME, debit: tax, credit: 0 }] : []),
    { account: AP_ACCOUNT, accountName: AP_ACCOUNT_NAME, debit: 0, credit: total },
  ];
}

async function hasSubmittedReceipt(adapter: DataAdapter, invoiceId: string): Promise<boolean> {
  const receipts = await adapter.query<Record<string, unknown>>({ collection: "PurchaseReceipt" });
  return receipts.rows.some(
    (row) =>
      row.status === "Submitted" &&
      (row.purchaseInvoice === invoiceId || row.invoice === invoiceId || row.invoiceId === invoiceId),
  );
}

function splitTax(gross: number, taxable: boolean): { subtotal: number; tax: number } {
  if (!taxable) return { subtotal: round(gross), tax: 0 };
  const subtotal = round(gross / (1 + TAX_RATE));
  return { subtotal, tax: round(gross - subtotal) };
}

function readMoney(value: unknown, field: string, ref: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`Purchase invoice "${ref}" has an invalid ${field}`, "validation", { [field]: "Invalid money" });
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
