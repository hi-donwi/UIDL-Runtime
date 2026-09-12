/**
 * Meridian (core accounting) stock ledger + moving-average valuation seed (Meridian parity Slice 5).
 *
 * Emits a `MeridianItem` master, a `MeridianStockLedgerEntry` set, and the matching balanced
 * `GeneralLedger` vouchers, mirroring what `meridianStockService` produces at runtime. Each
 * receipt reprices the item's moving-average rate; each issue leaves at that rate and posts
 * COGS. No PRNG draws. The Inventory GL balance equals the summed on-hand value.
 */

const TENANT = "meridian";
const WAREHOUSE = "Gudang Utama Meridian";
const INVENTORY_ACCOUNT = "1140";
const INVENTORY_ACCOUNT_NAME = "1140 - Persediaan Barang Dagang";
const GRNI_ACCOUNT = "2150";
const GRNI_ACCOUNT_NAME = "2150 - Utang Pembelian Diterima Blm Ditagih";
const COGS_ACCOUNT = "5110";
const COGS_ACCOUNT_NAME = "5110 - Harga Pokok Penjualan";

interface Move {
  item: string;
  name: string;
  type: "receive" | "issue";
  quantity: number;
  rate?: number;
  date: string;
  batchNo?: string;
  serialNos?: string[];
}

const MOVES: Move[] = [
  { item: "ITEM-001", name: "Kertas A4 80gsm", type: "receive", quantity: 500, rate: 40_000, date: "2027-07-01" },
  { item: "ITEM-002", name: "Tinta Printer Hitam", type: "receive", quantity: 120, rate: 80_000, date: "2027-07-01", batchNo: "BATCH-INK-2707" },
  { item: "ITEM-004", name: 'Monitor LED 24"', type: "receive", quantity: 30, rate: 1_700_000, date: "2027-07-01", serialNos: serialRange("SN-MON", 1, 30) },
  { item: "ITEM-008", name: "Raw Material - Kayu Jati", type: "receive", quantity: 15, rate: 3_400_000, date: "2027-07-01" },
  { item: "ITEM-009", name: "Raw Material - Besi Plat", type: "receive", quantity: 800, rate: 24_000, date: "2027-07-01" },
  { item: "ITEM-001", name: "Kertas A4 80gsm", type: "receive", quantity: 200, rate: 45_000, date: "2027-07-10" },
  { item: "ITEM-004", name: 'Monitor LED 24"', type: "receive", quantity: 10, rate: 1_800_000, date: "2027-07-12", serialNos: serialRange("SN-MON", 31, 10) },
  { item: "ITEM-001", name: "Kertas A4 80gsm", type: "issue", quantity: 300, date: "2027-07-20" },
  { item: "ITEM-002", name: "Tinta Printer Hitam", type: "issue", quantity: 40, date: "2027-07-22", batchNo: "BATCH-INK-2707" },
  { item: "ITEM-009", name: "Raw Material - Besi Plat", type: "issue", quantity: 200, date: "2027-07-25" },
];

/** Stock UOM + purchase-UOM conversions per item. */
const ITEM_UOM: Record<string, { stockUOM: string; conversions: Record<string, number> }> = {
  "ITEM-001": { stockUOM: "Lembar", conversions: { Rim: 500, Lembar: 1 } },
  "ITEM-002": { stockUOM: "Pcs", conversions: { Box: 24, Pcs: 1 } },
  "ITEM-004": { stockUOM: "Unit", conversions: { Unit: 1 } },
  "ITEM-008": { stockUOM: "M3", conversions: { M3: 1 } },
  "ITEM-009": { stockUOM: "Kg", conversions: { Ton: 1000, Kg: 1 } },
};

/** Items that require a batch number on every stock movement. */
const BATCH_TRACKED = new Set<string>(["ITEM-002"]);

/** Items that require one serial number per unit on every stock movement. */
const SERIAL_TRACKED = new Set<string>(["ITEM-004"]);

function serialRange(prefix: string, from: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${String(from + i).padStart(4, "0")}`);
}

export interface MeridianStockSeed {
  items: Array<Record<string, unknown>>;
  entries: Array<Record<string, unknown>>;
  vouchers: Array<Record<string, unknown>>;
}

const account = (code: string, name: string, debit: number, credit: number) => ({ account: code, accountName: name, debit, credit });

export function buildMeridianStockLedger(): MeridianStockSeed {
  // `value` is authoritative; `avg` is derived for display so `qty × avg` never drifts from GL.
  const state = new Map<string, { name: string; qty: number; value: number }>();
  const entries: Array<Record<string, unknown>> = [];
  const vouchers: Array<Record<string, unknown>> = [];
  let seq = 0;

  for (const move of MOVES) {
    const current = state.get(move.item) ?? { name: move.name, qty: 0, value: 0 };
    seq += 1;
    const sleId = `NSLE-${String(seq).padStart(5, "0")}`;

    if (move.type === "receive") {
      const rate = move.rate ?? 0;
      const inValue = move.quantity * rate;
      const newQty = current.qty + move.quantity;
      const newValue = current.value + inValue;
      state.set(move.item, { name: move.name, qty: newQty, value: newValue });
      entries.push(sle(sleId, move, +move.quantity, rate, newQty, newValue));
      vouchers.push(voucher(`JV-NIMB-${sleId}`, "Stock Receipt", sleId, move.date, `Penerimaan ${move.item}`, [
        account(INVENTORY_ACCOUNT, INVENTORY_ACCOUNT_NAME, inValue, 0),
        account(GRNI_ACCOUNT, GRNI_ACCOUNT_NAME, 0, inValue),
      ]));
    } else {
      const issueValue = current.qty > 0 ? Math.round((current.value * move.quantity) / current.qty) : 0;
      const newQty = current.qty - move.quantity;
      const newValue = current.value - issueValue;
      const rate = newQty > 0 ? Math.round(newValue / newQty) : Math.round(current.value / Math.max(1, current.qty));
      state.set(move.item, { name: move.name, qty: newQty, value: newValue });
      entries.push(sle(sleId, move, -move.quantity, rate, newQty, newValue));
      vouchers.push(voucher(`JV-NIMB-${sleId}`, "Stock Issue", sleId, move.date, `Pengeluaran ${move.item}`, [
        account(COGS_ACCOUNT, COGS_ACCOUNT_NAME, issueValue, 0),
        account(INVENTORY_ACCOUNT, INVENTORY_ACCOUNT_NAME, 0, issueValue),
      ]));
    }
  }

  const items = [...state.entries()].map(([id, s]) => ({
    id,
    tenant: TENANT,
    name: s.name,
    warehouse: WAREHOUSE,
    stockQty: s.qty,
    stockValue: s.value,
    valuationRate: s.qty > 0 ? Math.round(s.value / s.qty) : 0,
    stockUOM: ITEM_UOM[id]?.stockUOM ?? "Nos",
    // How many stock UOM per 1 of the keyed UOM (Meridian's UOMConversionItem.conversionFactor).
    uomConversions: ITEM_UOM[id]?.conversions ?? {},
    hasBatchNo: BATCH_TRACKED.has(id),
    hasSerialNo: SERIAL_TRACKED.has(id),
    route: `/meridian/edit/Item/${id}`,
  }));

  return { items, entries, vouchers };
}

function sle(
  id: string,
  move: Move,
  qtyChange: number,
  rate: number,
  balanceQty: number,
  balanceValue: number,
): Record<string, unknown> {
  return {
    id,
    tenant: TENANT,
    item: move.item,
    itemName: move.name,
    warehouse: WAREHOUSE,
    postingDate: move.date,
    voucherType: move.type === "receive" ? "Stock Receipt" : "Stock Issue",
    quantityChange: qtyChange,
    valuationRate: rate,
    balanceQty,
    balanceValue,
    ...(move.batchNo ? { batchNo: move.batchNo } : {}),
    ...(move.serialNos ? { serialNos: move.serialNos } : {}),
  };
}

function voucher(
  id: string,
  voucherType: string,
  voucherNo: string,
  postingDate: string,
  remarks: string,
  lines: Array<{ account: string; accountName: string; debit: number; credit: number }>,
): Record<string, unknown> {
  return {
    id,
    tenant: TENANT,
    voucherType,
    voucherNo,
    postingDate,
    remarks,
    totalAmount: lines.reduce((sum, l) => sum + l.debit, 0),
    lines,
  };
}
