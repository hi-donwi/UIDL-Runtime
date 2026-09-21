/**
 * Meridian (core accounting) purchase cycle — deterministic adapter seed for the
 * behavioural Purchase Invoice ↔ GL ↔ Accounts Payable flow (Meridian parity — purchase side).
 *
 * Mirrors the sales side: the adapter `PurchaseInvoice` rows share the eight
 * `PINV-2027-000NN` ids of the static `meridian/mockData.ts` `purchaseInvoices` (so the Meridian
 * form's Submit / Cancel buttons drive a real transition on a known record), but this is a
 * separate hand-authored list — exactly the pattern `meridianInvoices` vs `salesInvoices` uses.
 *
 * Every submitted / paid / overdue invoice posts a balanced `5120 Beban Pembelian` +
 * `1155 PPN Masukan` / `2110 Hutang Usaha` voucher; "Paid" invoices also carry a
 * `PurchasePayment` that relieves AP (Dr 2110 / Cr 1110) so the payables subledger ties out
 * to the ledger control account. Drafts post nothing. NO PRNG draws.
 */

const TENANT = "meridian";
const TAX_RATE = 0.11;

export const AP_ACCOUNT = "2110";
export const AP_ACCOUNT_NAME = "2110 - Hutang Usaha";
export const INPUT_TAX_ACCOUNT = "1155";
export const INPUT_TAX_ACCOUNT_NAME = "1155 - PPN Masukan";
export const PURCHASE_EXPENSE_ACCOUNT = "5120";
export const PURCHASE_EXPENSE_ACCOUNT_NAME = "5120 - Beban Pembelian";
export const GRNI_ACCOUNT = "2150";
export const GRNI_ACCOUNT_NAME = "2150 - Utang Pembelian Diterima Blm Ditagih";
export const CASH_ACCOUNT = "1110";
export const CASH_ACCOUNT_NAME = "1110 - Kas Utama / Bank";

interface GeneralLedgerLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface GeneralLedgerVoucher {
  [key: string]: unknown;
  id: string;
  tenant: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  totalAmount: number;
  lines: GeneralLedgerLine[];
}

export interface MeridianPurchaseCycle {
  invoices: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  receipts: Array<Record<string, unknown>>;
  vouchers: GeneralLedgerVoucher[];
}

/**
 * One Draft goods-receipt for the Draft invoice PINV-2027-00008, sharing the id of the static
 * `meridian/mockData.ts` receipt `PREC-2027-00004`. Submitting it posts Dr 1140 / Cr 2150 GRNI per
 * line via `meridianStockService.receiveStock`; the matched invoice then clears GRNI vs AP.
 */
const RECEIPTS: Array<Record<string, unknown>> = [
  {
    id: "PREC-2027-00004",
    tenant: TENANT,
    purchaseInvoice: "PINV-2027-00008",
    supplier: "SUPP-002",
    supplierName: "CV Bahan Baku Sejahtera",
    date: "2027-07-27",
    status: "Draft",
    lines: [{ item: "ITEM-008", itemName: "Raw Material - Kayu Jati", quantity: 2, rate: 3_200_000, uom: "M3" }],
    route: "/meridian/edit/PurchaseReceipt/PREC-2027-00004",
  },
];

interface SeedRow {
  seq: number;
  supplier: string;
  supplierName: string;
  date: string;
  dueDate: string;
  status: "Draft" | "Unpaid" | "Overdue" | "Paid" | "Cancelled";
  /** Net of tax; tax is round(subtotal * 0.11), matching meridian/mockData.ts's `invoice()` helper. */
  subtotal: number;
}

const ROWS: SeedRow[] = [
  { seq: 1, supplier: "SUPP-001", supplierName: "PT Distribusi Utama", date: "2027-07-03", dueDate: "2027-08-02", status: "Paid", subtotal: 2_800_000 },
  { seq: 2, supplier: "SUPP-002", supplierName: "CV Bahan Baku Sejahtera", date: "2027-07-06", dueDate: "2027-08-05", status: "Unpaid", subtotal: 19_200_000 },
  { seq: 3, supplier: "SUPP-003", supplierName: "PT Logistik Cepat", date: "2027-07-10", dueDate: "2027-08-09", status: "Paid", subtotal: 8_800_000 },
  { seq: 4, supplier: "SUPP-004", supplierName: "UD Sumber Material", date: "2027-07-13", dueDate: "2027-07-28", status: "Overdue", subtotal: 5_500_000 },
  { seq: 5, supplier: "SUPP-005", supplierName: "PT Kemasan Prima", date: "2027-07-17", dueDate: "2027-08-16", status: "Unpaid", subtotal: 8_400_000 },
  { seq: 6, supplier: "SUPP-006", supplierName: "CV Elektronik Jaya", date: "2027-07-20", dueDate: "2027-08-19", status: "Paid", subtotal: 1_280_000 },
  { seq: 7, supplier: "SUPP-001", supplierName: "PT Distribusi Utama", date: "2027-07-23", dueDate: "2027-08-22", status: "Unpaid", subtotal: 960_000 },
  { seq: 8, supplier: "SUPP-002", supplierName: "CV Bahan Baku Sejahtera", date: "2027-07-26", dueDate: "2027-08-25", status: "Draft", subtotal: 6_400_000 },
];

function round(value: number): number {
  return Math.round(value);
}

export function buildMeridianPurchaseCycle(): MeridianPurchaseCycle {
  const invoices: Array<Record<string, unknown>> = [];
  const payments: Array<Record<string, unknown>> = [];
  const vouchers: GeneralLedgerVoucher[] = [];
  let paymentSeq = 0;

  for (const row of ROWS) {
    const id = `PINV-2027-${String(row.seq).padStart(5, "0")}`;
    const subtotal = row.subtotal;
    const tax = round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    invoices.push({
      id,
      tenant: TENANT,
      supplier: row.supplier,
      supplierName: row.supplierName,
      date: row.date,
      dueDate: row.dueDate,
      status: row.status,
      total,
      subtotal,
      tax,
      isTaxable: true,
      route: `/meridian/edit/PurchaseInvoice/${id}`,
    });

    if (row.status === "Draft" || row.status === "Cancelled") continue;

    vouchers.push({
      id: `JV-NIMB-${id}`,
      tenant: TENANT,
      voucherType: "Purchase Invoice",
      voucherNo: id,
      postingDate: row.date,
      remarks: `Pembelian faktur ${id} dari ${row.supplierName}`,
      totalAmount: total,
      lines: [
        { account: PURCHASE_EXPENSE_ACCOUNT, accountName: PURCHASE_EXPENSE_ACCOUNT_NAME, debit: subtotal, credit: 0 },
        { account: INPUT_TAX_ACCOUNT, accountName: INPUT_TAX_ACCOUNT_NAME, debit: tax, credit: 0 },
        { account: AP_ACCOUNT, accountName: AP_ACCOUNT_NAME, debit: 0, credit: total },
      ],
    });

    if (row.status === "Paid") {
      paymentSeq += 1;
      const paymentId = `PPAY-NIMB-${String(paymentSeq).padStart(5, "0")}`;
      payments.push({
        id: paymentId,
        tenant: TENANT,
        supplier: row.supplier,
        supplierName: row.supplierName,
        date: row.dueDate,
        method: "Bank Transfer",
        amount: total,
        for: [{ invoiceId: id, amount: total }],
        status: "Submitted",
        route: `/meridian/edit/PurchasePayment/${paymentId}`,
      });
      vouchers.push({
        id: `JV-NIMB-${paymentId}`,
        tenant: TENANT,
        voucherType: "Purchase Payment",
        voucherNo: paymentId,
        postingDate: row.dueDate,
        remarks: `Pelunasan hutang ${id} ke ${row.supplierName}`,
        totalAmount: total,
        lines: [
          { account: AP_ACCOUNT, accountName: AP_ACCOUNT_NAME, debit: total, credit: 0 },
          { account: CASH_ACCOUNT, accountName: CASH_ACCOUNT_NAME, debit: 0, credit: total },
        ],
      });
    }
  }

  return { invoices, payments, receipts: RECEIPTS.map((row) => ({ ...row })), vouchers };
}
