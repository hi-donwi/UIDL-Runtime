/**
 * Point of Sale (POS) Calculation Service.
 *
 * Computes live POS cart totals, VAT/PPN 11%, discounts, and payment balances
 * on the host side, keeping expression evaluation clean and deterministic.
 */

import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export interface POSItem {
  id: string;
  name: string;
  rate: number;
}

export interface POSCartLine {
  id: string;
  name: string;
  rate: number;
  qty: number;
  amount: number;
}

export interface POSCartTotals {
  lines: POSCartLine[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  formattedSubtotal: string;
  formattedTax: string;
  formattedTotal: string;
}

export function formatIDR(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

export function calculatePOSCart(
  catalog: POSItem[],
  cartState: Record<string, boolean | number | undefined>,
  taxRate: number = 0.11,
): POSCartTotals {
  const lines: POSCartLine[] = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const item of catalog) {
    const rawQty = cartState[item.id];
    let qty = 0;
    if (typeof rawQty === "boolean") {
      qty = rawQty ? 1 : 0;
    } else if (typeof rawQty === "number") {
      qty = Math.max(0, Math.floor(rawQty));
    }

    if (qty > 0) {
      const amount = qty * item.rate;
      lines.push({
        id: item.id,
        name: item.name,
        rate: item.rate,
        qty,
        amount,
      });
      subtotal += amount;
      itemCount += qty;
    }
  }

  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return {
    lines,
    itemCount,
    subtotal,
    tax,
    total,
    formattedSubtotal: formatIDR(subtotal),
    formattedTax: formatIDR(tax),
    formattedTotal: formatIDR(total),
  };
}

export interface OpenPOSShiftInput {
  companyId: string;
  cashier: string;
  outlet: string;
  openingFloat: number;
  openedAt: string;
}

export interface POSSaleLineInput {
  itemVariantId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export type POSTenderType = "Cash" | "QRIS" | "Card" | "E-Wallet";

export interface POSSalePaymentInput {
  tenderType: POSTenderType;
  amount: number;
  referenceNo?: string;
}

export interface SubmitPOSSaleInput {
  companyId: string;
  shiftId: string;
  customerId: string;
  postingDate: string;
  lines: POSSaleLineInput[];
  payments: POSSalePaymentInput[];
  taxRate?: number;
}

export interface ClosePOSShiftInput {
  companyId: string;
  shiftId: string;
  closedAt: string;
  countedCash: number;
  countedQRIS?: number;
  supervisor: string;
  reason?: string;
}

export type POSRecord = Record<string, unknown>;

export interface SubmitPOSSaleResult {
  invoice: POSRecord;
  payment: POSRecord;
  payments: POSRecord[];
  stockLedgerEntries: POSRecord[];
  glEntries: POSRecord[];
  receipt: POSRecord;
}

export interface ClosePOSShiftResult {
  shift: POSRecord;
  closing: POSRecord;
  invoices: POSRecord[];
  payments: POSRecord[];
  paymentTotals: Record<POSTenderType, number>;
}

interface LoadedRecord<T extends POSRecord = POSRecord> {
  record: T;
  meta: RecordMeta;
}

interface SaleLine {
  item: POSRecord;
  itemMeta: RecordMeta;
  itemVariantId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
  standardCost: number;
  cogs: number;
  stockBefore: number;
  stockAfter: number;
}

const SHOE_COMPANY_ID = "shoe-company";
const AR_ACCOUNT = "1130 - Piutang POS";
const CASH_ACCOUNT = "1110 - Kas Laci";
const TENDER_CLEARING_ACCOUNT = "1125 - EDC/QRIS/E-Wallet Clearing";
const SALES_REVENUE_ACCOUNT = "4110 - Pendapatan Penjualan Sepatu";
const OUTPUT_TAX_ACCOUNT = "2140 - Hutang PPN Keluaran";
const COGS_ACCOUNT = "5110 - Harga Pokok Penjualan";
const INVENTORY_ACCOUNT = "1150 - Persediaan Sepatu";

export async function openPOSShift(adapter: DataAdapter, input: OpenPOSShiftInput): Promise<POSRecord> {
  if (input.companyId !== SHOE_COMPANY_ID) {
    throw new DataError(`POS shift service only supports "${SHOE_COMPANY_ID}" in this demo`, "validation", {
      companyId: "Unsupported company",
    });
  }
  if (!input.cashier.trim()) {
    throw new DataError("POS shift requires a cashier", "validation", { cashier: "Required" });
  }
  if (!input.outlet.trim()) {
    throw new DataError("POS shift requires an outlet", "validation", { outlet: "Required" });
  }
  if (!Number.isFinite(input.openingFloat) || input.openingFloat < 0) {
    throw new DataError("POS shift opening float must be zero or greater", "validation", {
      openingFloat: "Must be zero or greater",
    });
  }

  const { year, month } = dateParts(input.openedAt);
  const id = await nextSequentialId(adapter, "POSShift", `SHIFT-SHOE-${year}-${month}-`, 2);
  const record: POSRecord = {
    id,
    companyId: input.companyId,
    cashier: input.cashier,
    outlet: input.outlet,
    openedAt: input.openedAt,
    closedAt: "",
    openingFloat: roundMoney(input.openingFloat),
    expectedCash: roundMoney(input.openingFloat),
    countedCash: 0,
    variance: 0,
    status: "Open",
    route: `/app/shoe-company/edit/POSShift/${id}`,
  };

  const created = await adapter.create<POSRecord>({ collection: "POSShift", data: record });
  return created.record;
}

export async function submitPOSSale(adapter: DataAdapter, input: SubmitPOSSaleInput): Promise<SubmitPOSSaleResult> {
  if (input.companyId !== SHOE_COMPANY_ID) {
    throw new DataError(`POS sale service only supports "${SHOE_COMPANY_ID}" in this demo`, "validation", {
      companyId: "Unsupported company",
    });
  }
  if (input.lines.length === 0) {
    throw new DataError("POS sale requires at least one line", "validation", { lines: "Required" });
  }
  if (input.payments.length === 0) {
    throw new DataError("POS sale requires at least one payment", "validation", { payments: "Required" });
  }

  const shift = await loadRequired(adapter, "POSShift", input.shiftId);
  if (shift.record.companyId !== input.companyId) {
    throw new DataError(`POS shift "${input.shiftId}" belongs to another company`, "validation", { shiftId: "Wrong company" });
  }
  if (shift.record.status !== "Open") {
    throw new DataError(`POS shift "${input.shiftId}" is not open`, "validation", { shiftId: "Shift must be Open" });
  }

  const customer = await loadRequired(adapter, "Customer", input.customerId);
  if (customer.record.companyId !== input.companyId) {
    throw new DataError(`Customer "${input.customerId}" belongs to another company`, "validation", { customerId: "Wrong company" });
  }
  if (customer.record.status === "Blocked") {
    throw new DataError(`Customer "${input.customerId}" is blocked`, "validation", { customerId: "Blocked customer" });
  }

  const outlet = String(shift.record.outlet ?? "");
  const warehouse = await findDefaultWarehouse(adapter, input.companyId, outlet);
  const saleLines = await buildSaleLines(adapter, input);
  const subtotal = roundMoney(saleLines.reduce((sum, line) => sum + line.amount, 0));
  const discount = roundMoney(saleLines.reduce((sum, line) => sum + line.discount, 0));
  const tax = roundMoney(subtotal * (input.taxRate ?? 0.11));
  const grandTotal = roundMoney(subtotal + tax);
  const cogs = roundMoney(saleLines.reduce((sum, line) => sum + line.cogs, 0));
  const totalPaid = roundMoney(input.payments.reduce((sum, payment) => sum + payment.amount, 0));
  if (totalPaid !== grandTotal) {
    throw new DataError(`POS payment total ${totalPaid} does not match invoice total ${grandTotal}`, "validation", {
      payments: "Payment total must match invoice total",
    });
  }

  const { year } = dateParts(input.postingDate);
  const nextGLEntryId = await sequentialIdFactory(adapter, "GLEntry", `GLE-SHOE-${year}-`, 5);
  const invoiceId = await nextSequentialId(adapter, "POSInvoice", `POS-INV-${year}-`, 4);
  const invoice: POSRecord = {
    id: invoiceId,
    companyId: input.companyId,
    shiftId: input.shiftId,
    customerName: input.customerId,
    outlet,
    postingDate: input.postingDate,
    subtotal,
    discount,
    tax,
    grandTotal,
    total: grandTotal,
    productSku: saleLines[0]?.itemVariantId,
    quantity: saleLines.reduce((sum, line) => sum + line.quantity, 0),
    cogs,
    updateStock: true,
    status: "Paid",
    lines: saleLines.map((line) => ({
      itemVariantId: line.itemVariantId,
      itemName: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      amount: line.amount,
      standardCost: line.standardCost,
      cogs: line.cogs,
    })),
    route: `/app/shoe-company/edit/POSInvoice/${invoiceId}`,
  };

  const createdInvoice = await adapter.create<POSRecord>({ collection: "POSInvoice", data: invoice });
  const { payments, paymentGlEntries } = await createPayments(adapter, input, createdInvoice.record, nextGLEntryId);
  const stockLedgerEntries = await createStockLedgerEntries(adapter, input, createdInvoice.record, saleLines, warehouse.record);
  await updateItemStocks(adapter, saleLines);
  const invoiceGlEntries = await createInvoiceGLEntries(adapter, input, createdInvoice.record, nextGLEntryId);
  const receipt = await createPOSReceipt(adapter, input, createdInvoice.record, payments);
  await updateShiftCash(adapter, shift, input.payments);

  return {
    invoice: createdInvoice.record,
    payment: payments[0],
    payments,
    stockLedgerEntries,
    glEntries: [...invoiceGlEntries, ...paymentGlEntries],
    receipt,
  };
}

export async function closePOSShift(adapter: DataAdapter, input: ClosePOSShiftInput): Promise<ClosePOSShiftResult> {
  if (input.companyId !== SHOE_COMPANY_ID) {
    throw new DataError(`POS close shift service only supports "${SHOE_COMPANY_ID}" in this demo`, "validation", {
      companyId: "Unsupported company",
    });
  }
  if (!input.supervisor.trim()) {
    throw new DataError("POS close shift requires a supervisor", "validation", { supervisor: "Required" });
  }
  if (!Number.isFinite(input.countedCash) || input.countedCash < 0) {
    throw new DataError("Counted cash must be zero or greater", "validation", { countedCash: "Must be zero or greater" });
  }
  const countedQRIS = input.countedQRIS ?? 0;
  if (!Number.isFinite(countedQRIS) || countedQRIS < 0) {
    throw new DataError("Counted QRIS must be zero or greater", "validation", { countedQRIS: "Must be zero or greater" });
  }

  const shift = await loadRequired(adapter, "POSShift", input.shiftId);
  if (shift.record.companyId !== input.companyId) {
    throw new DataError(`POS shift "${input.shiftId}" belongs to another company`, "validation", { shiftId: "Wrong company" });
  }
  if (shift.record.status !== "Open" && shift.record.status !== "Closing") {
    throw new DataError(`POS shift "${input.shiftId}" cannot be closed from status "${String(shift.record.status)}"`, "validation", {
      shiftId: "Shift must be Open or Closing",
    });
  }

  const invoices = await loadShiftInvoices(adapter, input.companyId, input.shiftId);
  const pendingInvoices = invoices.filter((invoice) => !["Paid", "Cancelled"].includes(String(invoice.status ?? "")));
  if (pendingInvoices.length > 0) {
    throw new DataError(
      `POS shift "${input.shiftId}" has pending invoices: ${pendingInvoices.map((invoice) => String(invoice.id)).join(", ")}`,
      "validation",
      { invoices: "All invoices must be Paid or Cancelled before closing" },
    );
  }

  const payments = await loadShiftPayments(adapter, input.companyId, input.shiftId);
  const paymentTotals = tenderTotals(payments);
  const expectedCash = roundMoney(Number(shift.record.openingFloat ?? 0) + paymentTotals.Cash);
  const expectedQRIS = roundMoney(paymentTotals.QRIS);
  const qrisCount = input.countedQRIS ?? expectedQRIS;
  const variance = roundMoney(input.countedCash - expectedCash);
  const qrisVariance = roundMoney(qrisCount - expectedQRIS);
  const { year } = dateParts(input.closedAt);
  const id = await nextSequentialId(adapter, "CashClosing", `CLOSE-SHOE-${year}-`, 4);
  const closing: POSRecord = {
    id,
    companyId: input.companyId,
    shiftId: input.shiftId,
    cashier: shift.record.cashier,
    expectedCash,
    countedCash: roundMoney(input.countedCash),
    variance,
    expectedQRIS,
    countedQRIS: roundMoney(qrisCount),
    qrisVariance,
    paymentTotals,
    supervisor: input.supervisor,
    reason: input.reason ?? "",
    status: "Approved",
    route: `/app/shoe-company/edit/CashClosing/${id}`,
  };
  const createdClosing = await adapter.create<POSRecord>({ collection: "CashClosing", data: closing });
  const updatedShift = await adapter.update<POSRecord>({
    collection: "POSShift",
    id: input.shiftId,
    version: shift.meta.version,
    data: {
      closedAt: input.closedAt,
      expectedCash,
      countedCash: roundMoney(input.countedCash),
      variance,
      expectedQRIS,
      countedQRIS: roundMoney(qrisCount),
      qrisVariance,
      closingId: id,
      status: "Closed",
    },
  });

  return {
    shift: updatedShift.record,
    closing: createdClosing.record,
    invoices,
    payments,
    paymentTotals,
  };
}

async function createPayments(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  invoice: POSRecord,
  nextGLEntryId: () => string,
): Promise<{ payments: POSRecord[]; paymentGlEntries: POSRecord[] }> {
  const { year } = dateParts(input.postingDate);
  const nextPaymentId = await sequentialIdFactory(adapter, "POSPayment", `PAY-POS-${year}-`, 4);
  const created: POSRecord[] = [];
  const paymentGlEntries: POSRecord[] = [];

  for (const paymentInput of input.payments) {
    if (!Number.isFinite(paymentInput.amount) || paymentInput.amount <= 0) {
      throw new DataError("POS payment amount must be greater than zero", "validation", { payments: "Invalid payment amount" });
    }
    const id = nextPaymentId();
    const clearingAccount = clearingAccountFor(paymentInput.tenderType);
    const payment: POSRecord = {
      id,
      companyId: input.companyId,
      invoiceId: invoice.id,
      shiftId: input.shiftId,
      tenderType: paymentInput.tenderType,
      amount: roundMoney(paymentInput.amount),
      referenceNo: paymentInput.referenceNo ?? (paymentInput.tenderType === "Cash" ? "" : `REF-${id}`),
      clearingAccount,
      status: "Settled",
      route: `/app/shoe-company/edit/POSPayment/${id}`,
    };
    const persisted = await adapter.create<POSRecord>({ collection: "POSPayment", data: payment });
    const glEntries = await createPaymentGLEntries(adapter, input, persisted.record, clearingAccount, nextGLEntryId);
    paymentGlEntries.push(...glEntries);
    created.push(persisted.record);
  }

  return { payments: created, paymentGlEntries };
}

async function loadShiftInvoices(adapter: DataAdapter, companyId: string, shiftId: string): Promise<POSRecord[]> {
  const result = await adapter.query<POSRecord>({
    collection: "POSInvoice",
    filters: [
      { field: "companyId", op: "eq", value: companyId },
      { field: "shiftId", op: "eq", value: shiftId },
    ],
  });
  return result.rows;
}

async function loadShiftPayments(adapter: DataAdapter, companyId: string, shiftId: string): Promise<POSRecord[]> {
  const result = await adapter.query<POSRecord>({
    collection: "POSPayment",
    filters: [
      { field: "companyId", op: "eq", value: companyId },
      { field: "shiftId", op: "eq", value: shiftId },
    ],
  });
  return result.rows.filter((payment) => payment.status !== "Voided");
}

function tenderTotals(payments: POSRecord[]): Record<POSTenderType, number> {
  const totals: Record<POSTenderType, number> = {
    Cash: 0,
    QRIS: 0,
    Card: 0,
    "E-Wallet": 0,
  };
  for (const payment of payments) {
    const tenderType = payment.tenderType as POSTenderType;
    if (!(tenderType in totals)) continue;
    totals[tenderType] = roundMoney(totals[tenderType] + Number(payment.amount ?? 0));
  }
  return totals;
}

async function createStockLedgerEntries(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  invoice: POSRecord,
  saleLines: SaleLine[],
  warehouse: POSRecord,
): Promise<POSRecord[]> {
  const { year } = dateParts(input.postingDate);
  const nextSleId = await sequentialIdFactory(adapter, "StockLedgerEntry", `SLE-SHOE-${year}-`, 4);
  const stockAfterByItem = new Map<string, number>();
  const entries: POSRecord[] = [];

  for (const line of saleLines) {
    const previous = stockAfterByItem.get(line.itemVariantId) ?? line.stockBefore;
    const qtyAfterTransaction = previous - line.quantity;
    stockAfterByItem.set(line.itemVariantId, qtyAfterTransaction);
    const id = nextSleId();
    const entry: POSRecord = {
      id,
      companyId: input.companyId,
      itemVariant: line.itemVariantId,
      warehouse: warehouse.id,
      postingDate: input.postingDate,
      voucherType: "POSInvoice",
      voucherNo: invoice.id,
      actualQty: -line.quantity,
      qtyAfterTransaction,
      valuationRate: line.standardCost,
      stockValue: -line.cogs,
      status: "Posted",
      route: `/app/shoe-company/edit/StockLedgerEntry/${id}`,
    };
    const persisted = await adapter.create<POSRecord>({ collection: "StockLedgerEntry", data: entry });
    entries.push(persisted.record);
  }

  return entries;
}

async function createInvoiceGLEntries(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  invoice: POSRecord,
  nextGLEntryId: () => string,
): Promise<POSRecord[]> {
  const lines = [
    { account: AR_ACCOUNT, debit: Number(invoice.grandTotal ?? 0), credit: 0 },
    { account: SALES_REVENUE_ACCOUNT, debit: 0, credit: Number(invoice.subtotal ?? 0) },
    { account: OUTPUT_TAX_ACCOUNT, debit: 0, credit: Number(invoice.tax ?? 0) },
    { account: COGS_ACCOUNT, debit: Number(invoice.cogs ?? 0), credit: 0 },
    { account: INVENTORY_ACCOUNT, debit: 0, credit: Number(invoice.cogs ?? 0) },
  ];
  assertBalancedVoucher(String(invoice.id), lines);
  return createGLEntries(adapter, input, "POSInvoice", String(invoice.id), String(invoice.customerName ?? ""), lines, nextGLEntryId);
}

async function createPaymentGLEntries(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  payment: POSRecord,
  clearingAccount: string,
  nextGLEntryId: () => string,
): Promise<POSRecord[]> {
  const amount = Number(payment.amount ?? 0);
  const lines = [
    { account: clearingAccount, debit: amount, credit: 0 },
    { account: AR_ACCOUNT, debit: 0, credit: amount },
  ];
  assertBalancedVoucher(String(payment.id), lines);
  return createGLEntries(adapter, input, "POSPayment", String(payment.id), String(payment.invoiceId ?? ""), lines, nextGLEntryId);
}

async function createGLEntries(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  voucherType: string,
  voucherNo: string,
  party: string,
  lines: Array<{ account: string; debit: number; credit: number }>,
  nextGLEntryId: () => string,
): Promise<POSRecord[]> {
  const entries: POSRecord[] = [];
  for (const line of lines) {
    const id = nextGLEntryId();
    const entry: POSRecord = {
      id,
      companyId: input.companyId,
      postingDate: input.postingDate,
      account: line.account,
      party,
      voucherType,
      voucherNo,
      debit: roundMoney(line.debit),
      credit: roundMoney(line.credit),
      status: "Posted",
      route: `/app/shoe-company/edit/GLEntry/${id}`,
    };
    const persisted = await adapter.create<POSRecord>({ collection: "GLEntry", data: entry });
    entries.push(persisted.record);
  }
  return entries;
}

async function createPOSReceipt(
  adapter: DataAdapter,
  input: SubmitPOSSaleInput,
  invoice: POSRecord,
  payments: POSRecord[],
): Promise<POSRecord> {
  const { year } = dateParts(input.postingDate);
  const id = await nextSequentialId(adapter, "POSReceipt", `RCPT-SHOE-${year}-`, 4);
  const totalPaid = roundMoney(payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0));
  const receipt: POSRecord = {
    id,
    companyId: input.companyId,
    invoiceId: invoice.id,
    paymentId: payments[0]?.id,
    paymentIds: payments.map((payment) => payment.id),
    shiftId: input.shiftId,
    customerId: input.customerId,
    postingDate: input.postingDate,
    outlet: invoice.outlet,
    lines: invoice.lines,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    grandTotal: invoice.grandTotal,
    totalPaid,
    status: "Issued",
    route: `/app/shoe-company/edit/POSReceipt/${id}`,
  };
  const persisted = await adapter.create<POSRecord>({ collection: "POSReceipt", data: receipt });
  return persisted.record;
}

async function buildSaleLines(adapter: DataAdapter, input: SubmitPOSSaleInput): Promise<SaleLine[]> {
  const loadedItems = new Map<string, LoadedRecord>();
  const reserved = new Map<string, number>();
  const lines: SaleLine[] = [];

  for (const rawLine of input.lines) {
    if (!rawLine.itemVariantId) {
      throw new DataError("POS sale line requires an item variant", "validation", { lines: "Item variant is required" });
    }
    if (!Number.isInteger(rawLine.quantity) || rawLine.quantity <= 0) {
      throw new DataError("POS sale quantity must be a positive integer", "validation", { lines: "Invalid quantity" });
    }
    const loaded = loadedItems.get(rawLine.itemVariantId) ?? (await loadRequired(adapter, "ItemVariant", rawLine.itemVariantId));
    loadedItems.set(rawLine.itemVariantId, loaded);
    const item = loaded.record;
    if (item.companyId !== input.companyId) {
      throw new DataError(`Item "${rawLine.itemVariantId}" belongs to another company`, "validation", { lines: "Wrong company" });
    }
    if (item.status !== "Active") {
      throw new DataError(`Item "${rawLine.itemVariantId}" is not active`, "validation", { lines: "Inactive item" });
    }
    const stockBefore = Number(item.stock ?? 0);
    const nextReserved = (reserved.get(rawLine.itemVariantId) ?? 0) + rawLine.quantity;
    if (stockBefore < nextReserved) {
      throw new DataError(`Insufficient stock for "${rawLine.itemVariantId}"`, "validation", { lines: "Insufficient stock" });
    }
    reserved.set(rawLine.itemVariantId, nextReserved);

    const unitPrice = roundMoney(rawLine.unitPrice ?? Number(item.unitPrice ?? 0));
    const discount = roundMoney(rawLine.discount ?? 0);
    const amount = roundMoney(unitPrice * rawLine.quantity - discount);
    if (amount <= 0) {
      throw new DataError("POS sale line amount must be greater than zero", "validation", { lines: "Invalid amount" });
    }
    const standardCost = roundMoney(Number(item.standardCost ?? 0));
    const cogs = roundMoney(standardCost * rawLine.quantity);
    lines.push({
      item,
      itemMeta: loaded.meta,
      itemVariantId: rawLine.itemVariantId,
      itemName: String(item.itemName ?? rawLine.itemVariantId),
      quantity: rawLine.quantity,
      unitPrice,
      discount,
      amount,
      standardCost,
      cogs,
      stockBefore,
      stockAfter: stockBefore - nextReserved,
    });
  }

  return lines;
}

async function updateItemStocks(adapter: DataAdapter, saleLines: SaleLine[]): Promise<void> {
  const latestByItem = new Map<string, SaleLine>();
  for (const line of saleLines) latestByItem.set(line.itemVariantId, line);
  for (const line of latestByItem.values()) {
    await adapter.update({
      collection: "ItemVariant",
      id: line.itemVariantId,
      version: line.itemMeta.version,
      data: { stock: line.stockAfter },
    });
  }
}

async function updateShiftCash(
  adapter: DataAdapter,
  shift: LoadedRecord,
  payments: POSSalePaymentInput[],
): Promise<void> {
  const cashTotal = roundMoney(payments.filter((payment) => payment.tenderType === "Cash").reduce((sum, payment) => sum + payment.amount, 0));
  if (cashTotal <= 0) return;
  const expectedCash = roundMoney(Number(shift.record.expectedCash ?? shift.record.openingFloat ?? 0) + cashTotal);
  await adapter.update({
    collection: "POSShift",
    id: String(shift.record.id),
    version: shift.meta.version,
    data: { expectedCash },
  });
}

async function findDefaultWarehouse(adapter: DataAdapter, companyId: string, outlet: string): Promise<LoadedRecord> {
  const result = await adapter.query<POSRecord>({
    collection: "Warehouse",
    filters: [
      { field: "companyId", op: "eq", value: companyId },
      { field: "outlet", op: "eq", value: outlet },
      { field: "status", op: "eq", value: "Active" },
    ],
  });
  const warehouse = result.rows.find((row) => row.isDefault === true) ?? result.rows[0];
  if (!warehouse?.id) {
    throw new DataError(`No active warehouse found for outlet "${outlet}"`, "validation", { outlet: "No default warehouse" });
  }
  const loaded = await adapter.get<POSRecord>("Warehouse", String(warehouse.id));
  if (!loaded) {
    throw new DataError(`Warehouse "${String(warehouse.id)}" was not found`, "not_found");
  }
  return loaded;
}

async function loadRequired(adapter: DataAdapter, collection: string, id: string): Promise<LoadedRecord> {
  const loaded = await adapter.get<POSRecord>(collection, id);
  if (!loaded) {
    throw new DataError(`Record "${id}" was not found in "${collection}"`, "not_found");
  }
  return loaded;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const nextId = await sequentialIdFactory(adapter, collection, prefix, width);
  return nextId();
}

async function sequentialIdFactory(
  adapter: DataAdapter,
  collection: string,
  prefix: string,
  width: number,
): Promise<() => string> {
  const result = await adapter.query<POSRecord>({ collection, fields: ["id"] });
  let counter = result.rows.reduce((max: number, row: Record<string, unknown>) => Math.max(max, idCounter(String(row.id ?? ""), prefix)), 0);
  return () => {
    counter += 1;
    return `${prefix}${String(counter).padStart(width, "0")}`;
  };
}

function idCounter(id: string, prefix: string): number {
  if (!id.startsWith(prefix)) return 0;
  const raw = id.slice(prefix.length);
  return /^\d+$/.test(raw) ? Number(raw) : 0;
}

function clearingAccountFor(tenderType: POSTenderType): string {
  return tenderType === "Cash" ? CASH_ACCOUNT : TENDER_CLEARING_ACCOUNT;
}

function assertBalancedVoucher(voucherNo: string, lines: Array<{ debit: number; credit: number }>): void {
  const debit = roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));
  const credit = roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));
  if (debit !== credit) {
    throw new Error(`Unbalanced POS voucher ${voucherNo}: debit ${debit} != credit ${credit}`);
  }
}

function dateParts(date: string): { year: string; month: string } {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) {
    throw new DataError(`Invalid date "${date}"`, "validation", { date: "Use YYYY-MM-DD" });
  }
  return { year: match[1], month: match[2] };
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
