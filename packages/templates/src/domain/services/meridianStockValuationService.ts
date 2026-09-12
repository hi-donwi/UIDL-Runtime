import { DataError, type DataAdapter } from "~/data/types";
import type { GeneralLedgerVoucher } from "./meridianSalesInvoiceService";

/**
 * Read-only stock valuation ↔ Inventory GL reconciliation for the Meridian (core accounting)
 * tenant. Each item's on-hand value (moving-average) is summed and checked against the net
 * balance the ledger carries on the Inventory control account — the tie-out the static
 * `InventoryReconciliation` report cannot achieve because Meridian never posts stock to GL.
 */

const TENANT = "meridian";
const INVENTORY_ACCOUNT = "1140";
const COGS_ACCOUNT = "5110";

export interface MeridianStockValuationRow {
  item: string;
  itemName: string;
  warehouse: string;
  quantityOnHand: number;
  movingAverageRate: number;
  stockValue: number;
  movementCount: number;
}

export interface MeridianStockValuationSummary {
  itemCount: number;
  totalQuantityOnHand: number;
  totalStockValue: number;
  inventoryGlBalance: number;
  tieOutDifference: number;
  totalReceiptsValue: number;
  totalIssuesValue: number;
  unbalancedVoucherCount: number;
}

export interface MeridianStockValuationReport {
  summary: MeridianStockValuationSummary;
  rows: MeridianStockValuationRow[];
  controls: string[];
}

export async function buildMeridianStockValuationReport(adapter: DataAdapter): Promise<MeridianStockValuationReport> {
  const [itemResult, entryResult, ledgerResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "MeridianItem" }),
    adapter.query<Record<string, unknown>>({ collection: "MeridianStockLedgerEntry" }),
    adapter.query<GeneralLedgerVoucher>({ collection: "GeneralLedger" }),
  ]);

  const items = itemResult.rows.filter((row) => row.tenant === TENANT);
  const entries = entryResult.rows.filter((row) => row.tenant === TENANT);
  const movementCount = new Map<string, number>();
  for (const entry of entries) {
    const item = String(entry.item ?? "");
    movementCount.set(item, (movementCount.get(item) ?? 0) + 1);
  }

  const rows: MeridianStockValuationRow[] = items.map((item) => {
    const quantityOnHand = round(Number(item.stockQty ?? 0));
    const movingAverageRate = round(Number(item.valuationRate ?? 0));
    // `stockValue` is the authoritative field the service maintains; `qty × rate` would drift.
    const stockValue = round(Number(item.stockValue ?? quantityOnHand * movingAverageRate));
    return {
      item: String(item.id ?? ""),
      itemName: String(item.name ?? ""),
      warehouse: String(item.warehouse ?? ""),
      quantityOnHand,
      movingAverageRate,
      stockValue,
      movementCount: movementCount.get(String(item.id ?? "")) ?? 0,
    };
  });
  rows.sort((a, b) => b.stockValue - a.stockValue || a.item.localeCompare(b.item));

  const stockVouchers = ledgerResult.rows.filter(
    (voucher) => voucher.tenant === TENANT && (voucher.voucherType === "Stock Receipt" || voucher.voucherType === "Stock Issue"),
  );
  let unbalancedVoucherCount = 0;
  let inventoryGlBalance = 0;
  let totalReceiptsValue = 0;
  let totalIssuesValue = 0;
  for (const voucher of stockVouchers) {
    const debit = round(voucher.lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0));
    const credit = round(voucher.lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0));
    if (debit !== credit) unbalancedVoucherCount += 1;
    for (const line of voucher.lines) {
      if (line.account === INVENTORY_ACCOUNT) inventoryGlBalance += Number(line.debit ?? 0) - Number(line.credit ?? 0);
      if (line.account === COGS_ACCOUNT) totalIssuesValue += Number(line.debit ?? 0);
    }
    if (voucher.voucherType === "Stock Receipt") totalReceiptsValue += debit;
  }

  const totalStockValue = round(rows.reduce((sum, row) => sum + row.stockValue, 0));
  const summary: MeridianStockValuationSummary = {
    itemCount: rows.length,
    totalQuantityOnHand: round(rows.reduce((sum, row) => sum + row.quantityOnHand, 0)),
    totalStockValue,
    inventoryGlBalance: round(inventoryGlBalance),
    tieOutDifference: round(totalStockValue - inventoryGlBalance),
    totalReceiptsValue: round(totalReceiptsValue),
    totalIssuesValue: round(totalIssuesValue),
    unbalancedVoucherCount,
  };

  return { summary, rows, controls: buildControls() };
}

function buildControls(): string[] {
  return [
    "Each receipt reprices the item's moving-average rate: (old qty × old rate + received qty × receipt rate) ÷ new qty.",
    "Each issue leaves stock at the current moving-average rate and posts that value to COGS.",
    "Tie-out difference = summed on-hand value − net debit on the Inventory control account (1140); it must be zero.",
    "Illustrative reference data — a single warehouse, no landed cost, batch, or serial valuation.",
  ];
}

export function assertStockTieOut(report: MeridianStockValuationReport): void {
  if (report.summary.tieOutDifference !== 0 || report.summary.unbalancedVoucherCount > 0) {
    throw new DataError(`Meridian stock valuation does not tie out (${report.summary.tieOutDifference})`, "validation");
  }
}

function round(value: number): number {
  return Math.round(value);
}
