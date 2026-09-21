import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";
import { receiveStock } from "./meridianStockService";

/**
 * Meridian (core accounting) Purchase Receipt — the goods-in leg of the purchase cycle.
 * Submitting a Draft receipt posts one `1140 Persediaan` / `2150 GRNI` stock movement per
 * line (via `meridianStockService.receiveStock`, which also reprices the item's moving-average).
 * The matched Purchase Invoice later debits 2150 GRNI instead of 5120 expense, so a
 * receipt + invoice pair nets GRNI to zero.
 *
 * Adapter-backed and idempotency-guarded.
 */

const TENANT = "meridian";

export interface PurchaseReceiptLine {
  item: string;
  quantity: number;
  rate: number;
  uom?: string;
  batchNo?: string;
  serialNos?: string[];
}

export interface SubmitPurchaseReceiptInput {
  receiptId: string;
  receivedAt?: string;
}

export interface SubmitPurchaseReceiptResult {
  receipt: Record<string, unknown>;
  entries: Array<Record<string, unknown>>;
  vouchers: GeneralLedgerVoucher[];
}

interface LoadedReceipt {
  record: Record<string, unknown>;
  meta: RecordMeta;
}

export async function submitPurchaseReceipt(
  adapter: DataAdapter,
  input: SubmitPurchaseReceiptInput,
): Promise<SubmitPurchaseReceiptResult> {
  const receipt = await loadReceipt(adapter, input.receiptId);
  if (receipt.record.status !== "Draft") {
    throw new DataError(`Purchase receipt "${input.receiptId}" must be Draft to receive`, "validation", {
      status: "Expected Draft",
    });
  }
  const receivedAt = (input.receivedAt ?? String(receipt.record.date ?? "")).slice(0, 10);
  const { entries, vouchers } = await postReceiptLines(adapter, receipt.record, receivedAt);

  const updated = await adapter.update<Record<string, unknown>>({
    collection: "PurchaseReceipt",
    id: input.receiptId,
    version: receipt.meta.version,
    data: {
      status: "Submitted",
      receivedAt,
      stockEntries: entries.map((entry) => String(entry.id)),
    },
  });

  return { receipt: updated.record, entries, vouchers };
}

/**
 * Posts the stock movements for a Purchase Receipt whose status has already been flipped to
 * "Submitted" by `runTransition` (the state-machine transition path). Idempotency-guarded:
 * once the receipt records `stockEntries`, a second call is a no-op.
 */
export async function postPurchaseReceiptStock(
  adapter: DataAdapter,
  record: Record<string, unknown>,
): Promise<GeneralLedgerVoucher[]> {
  if (Array.isArray(record.stockEntries) && record.stockEntries.length > 0) {
    return []; // idempotent
  }
  const receivedAt = String(record.receivedAt ?? record.date ?? "").slice(0, 10);
  const { entries, vouchers } = await postReceiptLines(adapter, record, receivedAt);
  const fresh = await adapter.get<Record<string, unknown>>("PurchaseReceipt", String(record.id ?? ""));
  if (fresh) {
    await adapter.update({
      collection: "PurchaseReceipt",
      id: String(record.id ?? ""),
      version: fresh.meta.version,
      data: { receivedAt, stockEntries: entries.map((entry) => String(entry.id)) },
    });
  }
  return vouchers;
}

async function postReceiptLines(
  adapter: DataAdapter,
  record: Record<string, unknown>,
  receivedAt: string,
): Promise<{ entries: Array<Record<string, unknown>>; vouchers: GeneralLedgerVoucher[] }> {
  const lines = (record.lines as PurchaseReceiptLine[] | undefined) ?? [];
  if (lines.length === 0) {
    throw new DataError(`Purchase receipt "${String(record.id)}" has no lines to receive`, "validation", { lines: "Required" });
  }
  const entries: Array<Record<string, unknown>> = [];
  const vouchers: GeneralLedgerVoucher[] = [];
  for (const line of lines) {
    const result = await receiveStock(adapter, {
      item: line.item,
      quantity: Number(line.quantity),
      rate: Number(line.rate),
      receivedAt,
      uom: line.uom,
      batchNo: line.batchNo,
      serialNos: line.serialNos,
    });
    entries.push(result.entry);
    vouchers.push(result.voucher);
  }
  return { entries, vouchers };
}

async function loadReceipt(adapter: DataAdapter, receiptId: string): Promise<LoadedReceipt> {
  const found = await adapter.get<Record<string, unknown>>("PurchaseReceipt", receiptId);
  if (!found) throw new DataError(`Purchase receipt "${receiptId}" was not found`, "not_found");
  if (found.record.tenant !== undefined && found.record.tenant !== TENANT) {
    throw new DataError(`Purchase receipt "${receiptId}" belongs to another tenant`, "validation", { receiptId: "Wrong tenant" });
  }
  return found;
}
