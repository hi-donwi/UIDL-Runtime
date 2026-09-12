import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerLine, GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Meridian (core accounting) stock movement with moving-average valuation — the behavioural
 * counterpart to the static Stock Balance report. A receipt reprices the item's
 * moving-average rate and posts Inventory / GRNI; an issue leaves at the current rate and
 * posts COGS / Inventory. Every voucher balances, and the Inventory GL account stays equal
 * to the summed on-hand value.
 */

const TENANT = "meridian";
const DEFAULT_WAREHOUSE = "Gudang Utama Meridian";
const INVENTORY_ACCOUNT = "1140";
const INVENTORY_ACCOUNT_NAME = "1140 - Persediaan Barang Dagang";
const GRNI_ACCOUNT = "2150";
const GRNI_ACCOUNT_NAME = "2150 - Utang Pembelian Diterima Blm Ditagih";
const COGS_ACCOUNT = "5110";
const COGS_ACCOUNT_NAME = "5110 - Harga Pokok Penjualan";

export interface ReceiveStockInput {
  item: string;
  quantity: number;
  rate: number;
  receivedAt: string;
  warehouse?: string;
  /** Transaction UOM; converted to the item's stock UOM via its `uomConversions`. */
  uom?: string;
  /** Required when the item is batch-tracked (`hasBatchNo`). */
  batchNo?: string;
  /** Required when the item is serial-tracked (`hasSerialNo`) — one per stock-UOM unit. */
  serialNos?: string[];
}

export interface IssueStockInput {
  item: string;
  quantity: number;
  issuedAt: string;
  warehouse?: string;
  uom?: string;
  batchNo?: string;
  serialNos?: string[];
}

export interface StockMovementResult {
  item: Record<string, unknown>;
  entry: Record<string, unknown>;
  voucher: GeneralLedgerVoucher;
}

interface LoadedItem {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function receiveStock(adapter: DataAdapter, input: ReceiveStockInput): Promise<StockMovementResult> {
  const txnQuantity = assertPositive(input.quantity, "quantity");
  const txnRate = assertNonNegative(input.rate, "rate");
  const loaded = await loadItem(adapter, input.item);
  assertBatch(loaded.record, input.batchNo, input.item);

  const factor = uomFactor(loaded.record, input.uom, input.item);
  const quantity = round(txnQuantity * factor);
  assertSerials(loaded.record, input.serialNos, quantity, input.item);
  const stockRate = factor === 1 ? txnRate : round(txnRate / factor);
  const inValue = round(txnQuantity * txnRate); // total value is UOM-agnostic

  const oldQty = round(Number(loaded.record.stockQty ?? 0));
  const oldValue = round(Number(loaded.record.stockValue ?? oldQty * Number(loaded.record.valuationRate ?? 0)));
  const newQty = oldQty + quantity;
  const newValue = oldValue + inValue;
  const newAvg = newQty > 0 ? round(newValue / newQty) : 0;

  const entry = await createEntry(adapter, {
    item: input.item,
    itemName: String(loaded.record.name ?? input.item),
    warehouse: input.warehouse ?? String(loaded.record.warehouse ?? DEFAULT_WAREHOUSE),
    postingDate: input.receivedAt.slice(0, 10),
    voucherType: "Stock Receipt",
    quantityChange: quantity,
    valuationRate: stockRate,
    balanceQty: newQty,
    balanceValue: newValue,
    ...(input.uom && input.uom !== stockUom(loaded.record) ? { txnUom: input.uom, txnQuantity, conversionFactor: factor } : {}),
    ...(input.batchNo ? { batchNo: input.batchNo } : {}),
    ...(input.serialNos && input.serialNos.length > 0 ? { serialNos: input.serialNos } : {}),
  });
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${entry.id as string}`,
    voucherType: "Stock Receipt",
    voucherNo: String(entry.id),
    postingDate: input.receivedAt.slice(0, 10),
    remarks: `Penerimaan ${input.item}`,
    lines: [
      { account: INVENTORY_ACCOUNT, accountName: INVENTORY_ACCOUNT_NAME, debit: inValue, credit: 0 },
      { account: GRNI_ACCOUNT, accountName: GRNI_ACCOUNT_NAME, debit: 0, credit: inValue },
    ],
  });
  const item = await updateItem(adapter, loaded, newQty, newValue, newAvg);
  return { item, entry, voucher };
}

export async function issueStock(adapter: DataAdapter, input: IssueStockInput): Promise<StockMovementResult> {
  const txnQuantity = assertPositive(input.quantity, "quantity");
  const loaded = await loadItem(adapter, input.item);
  assertBatch(loaded.record, input.batchNo, input.item);

  const factor = uomFactor(loaded.record, input.uom, input.item);
  const quantity = round(txnQuantity * factor);
  assertSerials(loaded.record, input.serialNos, quantity, input.item);

  const oldQty = round(Number(loaded.record.stockQty ?? 0));
  const oldValue = round(Number(loaded.record.stockValue ?? oldQty * Number(loaded.record.valuationRate ?? 0)));
  if (quantity > oldQty) {
    throw new DataError(`Cannot issue ${quantity} of "${input.item}"; only ${oldQty} on hand`, "validation", {
      quantity: "Exceeds stock on hand",
    });
  }
  const outValue = oldQty > 0 ? round((oldValue * quantity) / oldQty) : 0;
  const newQty = oldQty - quantity;
  const newValue = oldValue - outValue;
  const newAvg = newQty > 0 ? round(newValue / newQty) : round(oldValue / Math.max(1, oldQty));

  const entry = await createEntry(adapter, {
    item: input.item,
    itemName: String(loaded.record.name ?? input.item),
    warehouse: input.warehouse ?? String(loaded.record.warehouse ?? DEFAULT_WAREHOUSE),
    postingDate: input.issuedAt.slice(0, 10),
    voucherType: "Stock Issue",
    quantityChange: -quantity,
    valuationRate: newAvg,
    balanceQty: newQty,
    balanceValue: newValue,
    ...(input.uom && input.uom !== stockUom(loaded.record) ? { txnUom: input.uom, txnQuantity, conversionFactor: factor } : {}),
    ...(input.batchNo ? { batchNo: input.batchNo } : {}),
    ...(input.serialNos && input.serialNos.length > 0 ? { serialNos: input.serialNos } : {}),
  });
  const voucher = await postVoucher(adapter, {
    id: `JV-NIMB-${entry.id as string}`,
    voucherType: "Stock Issue",
    voucherNo: String(entry.id),
    postingDate: input.issuedAt.slice(0, 10),
    remarks: `Pengeluaran ${input.item}`,
    lines: [
      { account: COGS_ACCOUNT, accountName: COGS_ACCOUNT_NAME, debit: outValue, credit: 0 },
      { account: INVENTORY_ACCOUNT, accountName: INVENTORY_ACCOUNT_NAME, debit: 0, credit: outValue },
    ],
  });
  const item = await updateItem(adapter, loaded, newQty, newValue, newAvg);
  return { item, entry, voucher };
}

function stockUom(item: Record<string, unknown>): string {
  return String(item.stockUOM ?? "Nos");
}

/** How many stock UOM per 1 of `uom`. Absent / stock UOM → 1; unknown UOM → loud error. */
function uomFactor(item: Record<string, unknown>, uom: string | undefined, itemId: string): number {
  if (!uom || uom === stockUom(item)) return 1;
  const conversions = (item.uomConversions ?? {}) as Record<string, number>;
  const factor = Number(conversions[uom]);
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new DataError(`Item "${itemId}" has no UOM conversion for "${uom}"`, "validation", { uom: "Unknown UOM" });
  }
  return factor;
}

function assertBatch(item: Record<string, unknown>, batchNo: string | undefined, itemId: string): void {
  if (item.hasBatchNo && !batchNo?.trim()) {
    throw new DataError(`Item "${itemId}" is batch-tracked and requires a batch number`, "validation", { batchNo: "Required" });
  }
}

/** For a serial-tracked item, one serial number per stock-UOM unit, all distinct. */
function assertSerials(item: Record<string, unknown>, serialNos: string[] | undefined, quantity: number, itemId: string): void {
  if (!item.hasSerialNo) return;
  const list = serialNos ?? [];
  if (list.length !== quantity) {
    throw new DataError(`Item "${itemId}" is serial-tracked; expected ${quantity} serial numbers, got ${list.length}`, "validation", {
      serialNos: "One per unit required",
    });
  }
  if (new Set(list).size !== list.length) {
    throw new DataError(`Item "${itemId}" was given duplicate serial numbers`, "validation", { serialNos: "Duplicates" });
  }
}

async function loadItem(adapter: DataAdapter, itemId: string): Promise<LoadedItem> {
  const found = await adapter.get<Record<string, unknown>>("MeridianItem", itemId);
  if (!found) throw new DataError(`Item "${itemId}" was not found`, "not_found");
  if (found.record.tenant !== TENANT) {
    throw new DataError(`Item "${itemId}" belongs to another tenant`, "validation", { item: "Wrong tenant" });
  }
  return found;
}

interface EntryInput {
  item: string;
  itemName: string;
  warehouse: string;
  postingDate: string;
  voucherType: string;
  quantityChange: number;
  valuationRate: number;
  balanceQty: number;
  balanceValue: number;
  txnUom?: string;
  txnQuantity?: number;
  conversionFactor?: number;
  batchNo?: string;
  serialNos?: string[];
}

async function createEntry(adapter: DataAdapter, input: EntryInput): Promise<Record<string, unknown>> {
  const existing = await adapter.query<Record<string, unknown>>({ collection: "MeridianStockLedgerEntry" });
  const id = `NSLE-${String(existing.rows.length + 1).padStart(5, "0")}`;
  const created = await adapter.create<Record<string, unknown>>({
    collection: "MeridianStockLedgerEntry",
    data: { id, tenant: TENANT, ...input },
  });
  return created.record;
}

async function updateItem(
  adapter: DataAdapter,
  loaded: LoadedItem,
  stockQty: number,
  stockValue: number,
  valuationRate: number,
): Promise<Record<string, unknown>> {
  const updated = await adapter.update<Record<string, unknown>>({
    collection: "MeridianItem",
    id: String(loaded.record.id),
    version: loaded.meta.version,
    data: { stockQty, stockValue, valuationRate },
  });
  return updated.record;
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
    throw new DataError(`Stock voucher "${input.voucherNo}" is unbalanced (${debit} != ${credit})`, "validation", {
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

function assertPositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DataError(`Stock ${field} must be greater than zero`, "validation", { [field]: "Must be > 0" });
  }
  return round(value);
}

function assertNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Stock ${field} must be zero or greater`, "validation", { [field]: "Invalid" });
  }
  return round(value);
}

function round(value: number): number {
  return Math.round(value);
}
