import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerLine, GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Meridian (core accounting) POS shift lifecycle — the behavioural counterpart to the
 * toggle-cart POS mock. Mirrors Meridian's `POSOpeningShift` / `POSClosingShift`:
 * a shift opens with a physical cash count by denomination, POS invoices post balanced
 * cash / clearing / revenue / output-tax vouchers, and the shift closes with a second
 * denomination count reconciled against the expected drawer — a cash-variance journal
 * entry keeps the ledger balanced when the count is short or over.
 *
 * Adapter-backed and guarded, so it behaves identically through the in-memory and HTTP
 * adapters.
 */

const TENANT = "meridian";
const CASH_ACCOUNT = "1110";
const CASH_ACCOUNT_NAME = "1110 - Kas Laci POS";
const CLEARING_ACCOUNT = "1125";
const CLEARING_ACCOUNT_NAME = "1125 - Kliring EDC/QRIS/Transfer";
const REVENUE_ACCOUNT = "4110";
const REVENUE_ACCOUNT_NAME = "4110 - Pendapatan Penjualan";
const OUTPUT_TAX_ACCOUNT = "2140";
const OUTPUT_TAX_ACCOUNT_NAME = "2140 - Hutang PPN Keluaran";
const CASH_SHORT_ACCOUNT = "5190";
const CASH_SHORT_ACCOUNT_NAME = "5190 - Selisih Kas";
const CASH_OVER_ACCOUNT = "4190";
const CASH_OVER_ACCOUNT_NAME = "4190 - Pendapatan Lain-lain";
const TAX_RATE = 0.11;

/** Indonesian Rupiah note/coin denominations, largest first. */
export const IDR_DENOMINATIONS = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 200, 100];

export type PosTender = "Cash" | "Card" | "QRIS" | "Transfer";

export interface DenominationCount {
  denomination: number;
  count: number;
}

export interface OpenPosShiftInput {
  cashier: string;
  posProfile?: string;
  openedAt: string;
  openingCash: DenominationCount[];
}

export interface PosInvoiceLineInput {
  item: string;
  quantity: number;
  rate: number;
}

export interface PosInvoicePaymentInput {
  method: PosTender;
  amount: number;
}

export interface SubmitPosInvoiceInput {
  shiftId: string;
  customerName: string;
  postingDate: string;
  lines: PosInvoiceLineInput[];
  payments: PosInvoicePaymentInput[];
  taxRate?: number;
}

export interface ClosePosShiftInput {
  shiftId: string;
  supervisor: string;
  closedAt: string;
  closingCash: DenominationCount[];
}

export interface OpenPosShiftResult {
  shift: Record<string, unknown>;
}

export interface SubmitPosInvoiceResult {
  invoice: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
  shift: Record<string, unknown>;
}

export interface ClosePosShiftResult {
  openingShift: Record<string, unknown>;
  closingShift: Record<string, unknown>;
  varianceVoucher: GeneralLedgerVoucher | null;
}

interface Loaded {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export function countCash(denominations: DenominationCount[]): number {
  let total = 0;
  for (const line of denominations) {
    if (!IDR_DENOMINATIONS.includes(line.denomination)) {
      throw new DataError(`Unknown cash denomination ${line.denomination}`, "validation", { denomination: "Unknown" });
    }
    if (!Number.isInteger(line.count) || line.count < 0) {
      throw new DataError(`Denomination ${line.denomination} has an invalid count`, "validation", { count: "Invalid" });
    }
    total += line.denomination * line.count;
  }
  return total;
}

export async function openPosShift(adapter: DataAdapter, input: OpenPosShiftInput): Promise<OpenPosShiftResult> {
  if (!input.cashier.trim()) throw new DataError("POS shift requires a cashier", "validation", { cashier: "Required" });
  const openingFloat = countCash(input.openingCash);
  const posProfile = input.posProfile ?? "Kasir Meridian 1";

  const openShifts = await adapter.query<Record<string, unknown>>({ collection: "POSOpeningShift" });
  if (openShifts.rows.some((row) => row.tenant === TENANT && row.posProfile === posProfile && row.status === "Open")) {
    throw new DataError(`POS profile "${posProfile}" already has an open shift`, "validation", { posProfile: "Shift already open" });
  }

  const seq = openShifts.rows.length + 1;
  const id = `POS-OPEN-${input.openedAt.slice(0, 10)}-${String(seq).padStart(3, "0")}`;
  const record: Record<string, unknown> = {
    id,
    tenant: TENANT,
    posProfile,
    cashier: input.cashier,
    openingDate: input.openedAt,
    openingFloat,
    openingCash: input.openingCash.map((line) => ({ ...line })),
    expectedCash: openingFloat,
    salesByTender: { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 },
    invoiceCount: 0,
    status: "Open",
    route: `/meridian/edit/POSOpeningShift/${id}`,
  };
  const created = await adapter.create<Record<string, unknown>>({ collection: "POSOpeningShift", data: record });
  return { shift: created.record };
}

export async function submitPosInvoice(adapter: DataAdapter, input: SubmitPosInvoiceInput): Promise<SubmitPosInvoiceResult> {
  const shift = await loadShift(adapter, input.shiftId);
  if (shift.record.status !== "Open") {
    throw new DataError(`POS shift "${input.shiftId}" is not open`, "validation", { shiftId: "Shift must be Open" });
  }
  if (input.lines.length === 0) throw new DataError("POS invoice requires at least one line", "validation", { lines: "Required" });
  if (input.payments.length === 0) throw new DataError("POS invoice requires a payment", "validation", { payments: "Required" });

  const taxRate = input.taxRate ?? TAX_RATE;
  let subtotal = 0;
  for (const line of input.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new DataError(`POS line "${line.item}" has an invalid quantity`, "validation", { quantity: "Must be > 0" });
    }
    if (!Number.isFinite(line.rate) || line.rate < 0) {
      throw new DataError(`POS line "${line.item}" has an invalid rate`, "validation", { rate: "Invalid" });
    }
    subtotal += line.quantity * line.rate;
  }
  subtotal = round(subtotal);
  const tax = round(subtotal * taxRate);
  const total = round(subtotal + tax);

  const tenderTotals = emptyTenders();
  for (const payment of input.payments) {
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new DataError("POS payment amount must be positive", "validation", { amount: "Invalid" });
    }
    tenderTotals[payment.method] = round(tenderTotals[payment.method] + payment.amount);
  }
  const paid = round(Object.values(tenderTotals).reduce((sum, value) => sum + value, 0));
  if (paid !== total) {
    throw new DataError(`POS payment total ${paid} does not match invoice total ${total}`, "validation", {
      payments: "Must match invoice total",
    });
  }

  const invoiceResult = await adapter.query<Record<string, unknown>>({ collection: "POSSalesInvoice" });
  const seq = invoiceResult.rows.length + 1;
  const invoiceId = `POS-INV-${input.postingDate.slice(0, 4)}-${String(seq).padStart(5, "0")}`;

  const cashAmount = tenderTotals.Cash;
  const nonCashAmount = round(total - cashAmount);
  const lines: GeneralLedgerLine[] = [
    ...(cashAmount > 0 ? [{ account: CASH_ACCOUNT, accountName: CASH_ACCOUNT_NAME, debit: cashAmount, credit: 0 }] : []),
    ...(nonCashAmount > 0
      ? [{ account: CLEARING_ACCOUNT, accountName: CLEARING_ACCOUNT_NAME, debit: nonCashAmount, credit: 0 }]
      : []),
    { account: REVENUE_ACCOUNT, accountName: REVENUE_ACCOUNT_NAME, debit: 0, credit: subtotal },
    ...(tax > 0 ? [{ account: OUTPUT_TAX_ACCOUNT, accountName: OUTPUT_TAX_ACCOUNT_NAME, debit: 0, credit: tax }] : []),
  ];
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${invoiceId}`,
    voucherType: "POS Invoice",
    voucherNo: invoiceId,
    postingDate: input.postingDate,
    remarks: `Penjualan POS ${invoiceId} (${String(shift.record.posProfile ?? "")})`,
    lines,
  });

  const createdInvoice = await adapter.create<Record<string, unknown>>({
    collection: "POSSalesInvoice",
    data: {
      id: invoiceId,
      tenant: TENANT,
      shiftId: input.shiftId,
      customerName: input.customerName,
      postingDate: input.postingDate,
      lines: input.lines.map((line) => ({ ...line, amount: round(line.quantity * line.rate) })),
      subtotal,
      tax,
      total,
      tenderTotals,
      status: "Paid",
      route: `/meridian/edit/POSSalesInvoice/${invoiceId}`,
    },
  });

  const salesByTender = mergeTenders(shift.record.salesByTender, tenderTotals);
  const updatedShift = await adapter.update<Record<string, unknown>>({
    collection: "POSOpeningShift",
    id: input.shiftId,
    version: shift.meta.version,
    data: {
      expectedCash: round(Number(shift.record.expectedCash ?? 0) + cashAmount),
      salesByTender,
      invoiceCount: Number(shift.record.invoiceCount ?? 0) + 1,
    },
  });

  return { invoice: createdInvoice.record, voucher, shift: updatedShift.record };
}

export async function closePosShift(adapter: DataAdapter, input: ClosePosShiftInput): Promise<ClosePosShiftResult> {
  if (!input.supervisor.trim()) throw new DataError("Closing a POS shift requires a supervisor", "validation", { supervisor: "Required" });
  const shift = await loadShift(adapter, input.shiftId);
  if (shift.record.status !== "Open") {
    throw new DataError(`POS shift "${input.shiftId}" is not open`, "validation", { shiftId: "Shift must be Open" });
  }

  const countedCash = countCash(input.closingCash);
  const openingFloat = round(Number(shift.record.openingFloat ?? 0));
  const expectedCash = round(Number(shift.record.expectedCash ?? 0));
  const difference = round(countedCash - expectedCash);
  const salesByTender = normaliseTenders(shift.record.salesByTender);

  const closingSeq = (await adapter.query<Record<string, unknown>>({ collection: "POSClosingShift" })).rows.length + 1;
  const closingId = `POS-CLOSE-${input.closedAt.slice(0, 10)}-${String(closingSeq).padStart(3, "0")}`;

  let varianceVoucher: GeneralLedgerVoucher | null = null;
  if (difference !== 0) {
    const magnitude = Math.abs(difference);
    const lines: GeneralLedgerLine[] =
      difference < 0
        ? [
            { account: CASH_SHORT_ACCOUNT, accountName: CASH_SHORT_ACCOUNT_NAME, debit: magnitude, credit: 0 },
            { account: CASH_ACCOUNT, accountName: CASH_ACCOUNT_NAME, debit: 0, credit: magnitude },
          ]
        : [
            { account: CASH_ACCOUNT, accountName: CASH_ACCOUNT_NAME, debit: magnitude, credit: 0 },
            { account: CASH_OVER_ACCOUNT, accountName: CASH_OVER_ACCOUNT_NAME, debit: 0, credit: magnitude },
          ];
    varianceVoucher = await postVoucher(adapter, {
      id: `JV-NIMB-${closingId}`,
      voucherType: "POS Cash Variance",
      voucherNo: closingId,
      postingDate: input.closedAt.slice(0, 10),
      remarks: `Selisih kas shift ${input.shiftId} (${difference > 0 ? "lebih" : "kurang"})`,
      lines,
    });
  }

  const closingAmounts = (["Cash", "Card", "QRIS", "Transfer"] as PosTender[])
    .map((method) => {
      const openingAmount = method === "Cash" ? openingFloat : 0;
      const sales = salesByTender[method];
      const expectedAmount = round(openingAmount + sales);
      const closingAmount = method === "Cash" ? countedCash : expectedAmount;
      return {
        paymentMethod: method,
        openingAmount,
        salesAmount: sales,
        expectedAmount,
        closingAmount,
        differenceAmount: round(closingAmount - expectedAmount),
      };
    })
    .filter((row) => row.openingAmount !== 0 || row.salesAmount !== 0);

  const createdClosing = await adapter.create<Record<string, unknown>>({
    collection: "POSClosingShift",
    data: {
      id: closingId,
      tenant: TENANT,
      openingShift: input.shiftId,
      posProfile: shift.record.posProfile,
      supervisor: input.supervisor,
      closingDate: input.closedAt,
      closingCash: input.closingCash.map((line) => ({ ...line })),
      openingFloat,
      expectedCash,
      countedCash,
      differenceAmount: difference,
      closingAmounts,
      status: difference === 0 ? "Balanced" : difference < 0 ? "Short" : "Over",
      route: `/meridian/edit/POSClosingShift/${closingId}`,
    },
  });

  const updatedOpening = await adapter.update<Record<string, unknown>>({
    collection: "POSOpeningShift",
    id: input.shiftId,
    version: shift.meta.version,
    data: { status: "Closed", closingShift: closingId, closedAt: input.closedAt },
  });

  return { openingShift: updatedOpening.record, closingShift: createdClosing.record, varianceVoucher };
}

async function loadShift(adapter: DataAdapter, shiftId: string): Promise<Loaded> {
  const found = await adapter.get<Record<string, unknown>>("POSOpeningShift", shiftId);
  if (!found) throw new DataError(`POS opening shift "${shiftId}" was not found`, "not_found");
  if (found.record.tenant !== TENANT) {
    throw new DataError(`POS shift "${shiftId}" belongs to another tenant`, "validation", { shiftId: "Wrong tenant" });
  }
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
    throw new DataError(`POS voucher "${input.voucherNo}" is unbalanced (${debit} != ${credit})`, "validation", {
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

function emptyTenders(): Record<PosTender, number> {
  return { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 };
}

function normaliseTenders(value: unknown): Record<PosTender, number> {
  const source = (value ?? {}) as Record<string, unknown>;
  const result = emptyTenders();
  for (const key of Object.keys(result) as PosTender[]) {
    result[key] = round(Number(source[key] ?? 0));
  }
  return result;
}

function mergeTenders(existing: unknown, delta: Record<PosTender, number>): Record<PosTender, number> {
  const base = normaliseTenders(existing);
  for (const key of Object.keys(base) as PosTender[]) {
    base[key] = round(base[key] + delta[key]);
  }
  return base;
}

function round(value: number): number {
  return Math.round(value);
}
