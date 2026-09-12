import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerLine, GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Meridian (core accounting) customer payment with multi-invoice allocation — mirrors
 * Meridian's `Payment` + `PaymentFor` child. A receipt is split across one or more
 * submitted invoices, may carry a per-invoice write-off, and any excess lands on a
 * customer-advance account. The GL voucher balances cash + bad-debt against AR + advance;
 * every invoice it fully settles flips to `Paid`. Per-invoice attribution lives on the
 * `Payment.for` records; the GL tie-out is at the AR control-account level.
 */

const TENANT = "meridian";
const AR_ACCOUNT = "1130";
const AR_ACCOUNT_NAME = "1130 - Piutang Usaha";
const BAD_DEBT_ACCOUNT = "5180";
const BAD_DEBT_ACCOUNT_NAME = "5180 - Beban Piutang Tak Tertagih";
const ADVANCE_ACCOUNT = "2135";
const ADVANCE_ACCOUNT_NAME = "2135 - Uang Muka Pelanggan";

const CASH_ACCOUNTS: Record<string, { code: string; name: string }> = {
  Cash: { code: "1110", name: "1110 - Kas Utama / Bank" },
  "Bank Transfer": { code: "1110", name: "1110 - Kas Utama / Bank" },
  QRIS: { code: "1125", name: "1125 - Kliring EDC/QRIS/Transfer" },
  Card: { code: "1125", name: "1125 - Kliring EDC/QRIS/Transfer" },
};

export type PaymentMethod = keyof typeof CASH_ACCOUNTS;

export interface PaymentAllocationInput {
  invoiceId: string;
  allocatedAmount: number;
  writeOffAmount?: number;
}

export interface RecordSalesPaymentInput {
  party: string;
  method: PaymentMethod;
  receivedAt: string;
  allocations: PaymentAllocationInput[];
  /** Total cash received; defaults to the sum of allocated amounts (no advance). */
  amountReceived?: number;
}

export interface RecordSalesPaymentResult {
  payment: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
  invoices: Array<Record<string, unknown>>;
}

interface Loaded {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function recordSalesPayment(
  adapter: DataAdapter,
  input: RecordSalesPaymentInput,
): Promise<RecordSalesPaymentResult> {
  if (!input.party.trim()) throw new DataError("Payment requires a party", "validation", { party: "Required" });
  if (!CASH_ACCOUNTS[input.method]) throw new DataError(`Unknown payment method "${input.method}"`, "validation", { method: "Unknown" });
  if (input.allocations.length === 0) throw new DataError("Payment requires at least one allocation", "validation", { allocations: "Required" });

  const [paymentsResult, creditNotesResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "Payment" }),
    adapter.query<Record<string, unknown>>({ collection: "CreditNote" }),
  ]);

  const seen = new Set<string>();
  let totalAllocated = 0;
  let totalWriteOff = 0;
  const prepared: Array<{ loaded: Loaded; allocatedAmount: number; writeOffAmount: number; outstandingAfter: number }> = [];

  for (const allocation of input.allocations) {
    if (seen.has(allocation.invoiceId)) {
      throw new DataError(`Invoice "${allocation.invoiceId}" is allocated twice in one payment`, "validation", { invoiceId: "Duplicate" });
    }
    seen.add(allocation.invoiceId);

    const allocatedAmount = readMoney(allocation.allocatedAmount, "allocatedAmount", allocation.invoiceId);
    const writeOffAmount = readMoney(allocation.writeOffAmount ?? 0, "writeOffAmount", allocation.invoiceId);
    if (allocatedAmount + writeOffAmount <= 0) {
      throw new DataError(`Allocation for "${allocation.invoiceId}" settles nothing`, "validation", { allocatedAmount: "Zero" });
    }

    const loaded = await loadInvoice(adapter, allocation.invoiceId);
    const status = String(loaded.record.status ?? "");
    if (status !== "Unpaid" && status !== "Overdue") {
      throw new DataError(`Invoice "${allocation.invoiceId}" is not an open submitted invoice`, "validation", { status: "Expected Unpaid or Overdue" });
    }

    const invoiceTotal = readMoney(loaded.record.total, "total", allocation.invoiceId);
    const outstanding = invoiceOutstanding(allocation.invoiceId, invoiceTotal, paymentsResult.rows, creditNotesResult.rows);
    if (allocatedAmount + writeOffAmount > outstanding + 0.01) {
      throw new DataError(`Allocation for "${allocation.invoiceId}" exceeds its Rp${outstanding} outstanding balance`, "validation", {
        allocatedAmount: "Exceeds outstanding",
      });
    }

    totalAllocated = round(totalAllocated + allocatedAmount);
    totalWriteOff = round(totalWriteOff + writeOffAmount);
    prepared.push({ loaded, allocatedAmount, writeOffAmount, outstandingAfter: round(outstanding - allocatedAmount - writeOffAmount) });
  }

  const amountReceived = input.amountReceived == null ? totalAllocated : readMoney(input.amountReceived, "amountReceived", "payment");
  if (amountReceived < totalAllocated) {
    throw new DataError("Amount received is less than the allocated total", "validation", { amountReceived: "Below allocations" });
  }
  const unallocatedAmount = round(amountReceived - totalAllocated);

  const seq = paymentsResult.rows.length + 1;
  const paymentId = `PAY-NIMB-${String(seq).padStart(5, "0")}`;
  const cashAccount = CASH_ACCOUNTS[input.method];
  const lines: GeneralLedgerLine[] = [
    { account: cashAccount.code, accountName: cashAccount.name, debit: amountReceived, credit: 0 },
    ...(totalWriteOff > 0 ? [{ account: BAD_DEBT_ACCOUNT, accountName: BAD_DEBT_ACCOUNT_NAME, debit: totalWriteOff, credit: 0 }] : []),
    { account: AR_ACCOUNT, accountName: AR_ACCOUNT_NAME, debit: 0, credit: round(totalAllocated + totalWriteOff) },
    ...(unallocatedAmount > 0
      ? [{ account: ADVANCE_ACCOUNT, accountName: ADVANCE_ACCOUNT_NAME, debit: 0, credit: unallocatedAmount }]
      : []),
  ];
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${paymentId}`,
    voucherType: "Payment",
    voucherNo: paymentId,
    postingDate: input.receivedAt.slice(0, 10),
    remarks: `Penerimaan pembayaran dari ${input.party} (${prepared.map((entry) => entry.loaded.record.id).join(", ")})`,
    lines,
  });

  const createdPayment = await adapter.create<Record<string, unknown>>({
    collection: "Payment",
    data: {
      id: paymentId,
      tenant: TENANT,
      party: input.party,
      paymentType: "Receive",
      method: input.method,
      date: input.receivedAt.slice(0, 10),
      amountReceived,
      allocatedAmount: totalAllocated,
      writeOffAmount: totalWriteOff,
      unallocatedAmount,
      for: prepared.map((entry) => ({
        invoiceId: String(entry.loaded.record.id),
        amount: entry.allocatedAmount,
        writeOffAmount: entry.writeOffAmount,
      })),
      status: "Submitted",
      route: `/meridian/edit/Payment/${paymentId}`,
    },
  });

  const updatedInvoices: Array<Record<string, unknown>> = [];
  for (const entry of prepared) {
    const settled = entry.outstandingAfter <= 0.01;
    const updated = await adapter.update<Record<string, unknown>>({
      collection: "SalesInvoice",
      id: String(entry.loaded.record.id),
      version: entry.loaded.meta.version,
      data: {
        status: settled ? "Paid" : entry.loaded.record.status,
        outstandingAmount: Math.max(0, entry.outstandingAfter),
        lastPaymentId: paymentId,
      },
    });
    updatedInvoices.push(updated.record);
  }

  return { payment: createdPayment.record, voucher, invoices: updatedInvoices };
}

/**
 * Outstanding balance of one invoice from the Payment and CreditNote records:
 * total − Σ allocated − Σ written off − Σ credit notes.
 */
export function invoiceOutstanding(
  invoiceId: string,
  invoiceTotal: number,
  payments: Array<Record<string, unknown>>,
  creditNotes: Array<Record<string, unknown>>,
): number {
  let settled = 0;
  for (const payment of payments) {
    const forList = (payment.for as Array<Record<string, unknown>> | undefined) ?? [];
    for (const line of forList) {
      if (line.invoiceId !== invoiceId) continue;
      settled += Number(line.amount ?? 0) + Number(line.writeOffAmount ?? 0);
    }
  }
  for (const note of creditNotes) {
    if (note.invoice === invoiceId) settled += Number(note.amount ?? 0);
  }
  return round(invoiceTotal - settled);
}

async function loadInvoice(adapter: DataAdapter, invoiceId: string): Promise<Loaded> {
  const found = await adapter.get<Record<string, unknown>>("SalesInvoice", invoiceId);
  if (!found) throw new DataError(`Sales invoice "${invoiceId}" was not found`, "not_found");
  return found;
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
    throw new DataError(`Payment voucher "${input.voucherNo}" is unbalanced (${debit} != ${credit})`, "validation", {
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

function readMoney(value: unknown, field: string, ref: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`"${ref}" has an invalid ${field}`, "validation", { [field]: "Invalid money" });
  }
  return round(amount);
}

function round(value: number): number {
  return Math.round(value);
}
