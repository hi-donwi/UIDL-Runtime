/**
 * Meridian (core accounting) POS shift seed (Meridian parity Slice 2).
 *
 * Emits a deterministic set of `POSOpeningShift` / `POSClosingShift` / `POSSalesInvoice`
 * records plus the matching `GeneralLedger` vouchers, mirroring what `meridianPosService`
 * produces at runtime. No PRNG draws. Three shifts: one closed and balanced, one closed
 * short by Rp50.000, and one still open.
 */

const TENANT = "meridian";
const TAX_RATE = 0.11;

interface Denom {
  denomination: number;
  count: number;
}
interface Line {
  item: string;
  quantity: number;
  rate: number;
}
type Tender = "Cash" | "Card" | "QRIS" | "Transfer";

export interface MeridianPosSeed {
  openingShifts: Array<Record<string, unknown>>;
  closingShifts: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  vouchers: Array<Record<string, unknown>>;
}

const account = (code: string, name: string, debit: number, credit: number) => ({ account: code, accountName: name, debit, credit });

function countCash(denoms: Denom[]): number {
  return denoms.reduce((sum, d) => sum + d.denomination * d.count, 0);
}

function tenderTotals(entries: Array<[Tender, number]>): Record<Tender, number> {
  const base: Record<Tender, number> = { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 };
  for (const [t, v] of entries) base[t] += v;
  return base;
}

export function buildMeridianPosShifts(): MeridianPosSeed {
  const openingShifts: Array<Record<string, unknown>> = [];
  const closingShifts: Array<Record<string, unknown>> = [];
  const invoices: Array<Record<string, unknown>> = [];
  const vouchers: Array<Record<string, unknown>> = [];

  let invSeq = 0;
  const makeInvoice = (shiftId: string, date: string, customer: string, lines: Line[], pays: Array<[Tender, number]>) => {
    invSeq += 1;
    const id = `POS-INV-2027-${String(invSeq).padStart(5, "0")}`;
    const subtotal = Math.round(lines.reduce((s, l) => s + l.quantity * l.rate, 0));
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;
    const tt = tenderTotals(pays);
    const cash = tt.Cash;
    const nonCash = total - cash;
    invoices.push({
      id,
      tenant: TENANT,
      shiftId,
      customerName: customer,
      postingDate: date,
      lines: lines.map((l) => ({ ...l, amount: Math.round(l.quantity * l.rate) })),
      subtotal,
      tax,
      total,
      tenderTotals: tt,
      status: "Paid",
      route: `/meridian/edit/POSSalesInvoice/${id}`,
    });
    vouchers.push({
      id: `JV-NIMB-${id}`,
      tenant: TENANT,
      voucherType: "POS Invoice",
      voucherNo: id,
      postingDate: date,
      remarks: `Penjualan POS ${id}`,
      totalAmount: total,
      lines: [
        ...(cash > 0 ? [account("1110", "1110 - Kas Laci POS", cash, 0)] : []),
        ...(nonCash > 0 ? [account("1125", "1125 - Kliring EDC/QRIS/Transfer", nonCash, 0)] : []),
        account("4110", "4110 - Pendapatan Penjualan", 0, subtotal),
        ...(tax > 0 ? [account("2140", "2140 - Hutang PPN Keluaran", 0, tax)] : []),
      ],
    });
    return { total, cash, tt };
  };

  // --- Shift A: closed, balanced ---
  const aOpenCash: Denom[] = [{ denomination: 100_000, count: 5 }];
  const aFloat = countCash(aOpenCash);
  let aCashSales = 0;
  const aTender: Record<Tender, number> = { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 };
  for (let i = 0; i < 3; i++) {
    const r = makeInvoice("POS-OPEN-2027-07-30-001", "2027-07-30", "Walk-in", [{ item: "ITEM-001", quantity: 4, rate: 50_000 }], [["Cash", 222_000]]);
    aCashSales += r.cash;
    for (const k of Object.keys(aTender) as Tender[]) aTender[k] += r.tt[k];
  }
  const aExpected = aFloat + aCashSales;
  const aCloseCash: Denom[] = [
    { denomination: 100_000, count: 11 },
    { denomination: 50_000, count: 1 },
    { denomination: 10_000, count: 1 },
    { denomination: 5_000, count: 1 },
    { denomination: 1_000, count: 1 },
  ];
  const aCounted = countCash(aCloseCash);
  openingShifts.push(openingShift("POS-OPEN-2027-07-30-001", "Kasir Meridian 1", "Sari", "2027-07-30T08:00:00+07:00", aFloat, aOpenCash, aExpected, aTender, 3, "Closed", "POS-CLOSE-2027-07-30-001", "2027-07-30T21:00:00+07:00"));
  closingShifts.push(closingShift("POS-CLOSE-2027-07-30-001", "POS-OPEN-2027-07-30-001", "Kasir Meridian 1", "Budi", "2027-07-30T21:00:00+07:00", aCloseCash, aFloat, aExpected, aCounted, aTender));

  // --- Shift B: closed, short by Rp50.000 ---
  const bOpenCash: Denom[] = [{ denomination: 100_000, count: 3 }];
  const bFloat = countCash(bOpenCash);
  const bTender: Record<Tender, number> = { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 };
  const b1 = makeInvoice("POS-OPEN-2027-07-31-001", "2027-07-31", "Walk-in", [{ item: "ITEM-002", quantity: 2, rate: 100_000 }], [["Cash", 222_000]]);
  const b2 = makeInvoice("POS-OPEN-2027-07-31-001", "2027-07-31", "Walk-in", [{ item: "ITEM-003", quantity: 1, rate: 150_000 }], [["Card", 166_500]]);
  for (const r of [b1, b2]) for (const k of Object.keys(bTender) as Tender[]) bTender[k] += r.tt[k];
  const bExpected = bFloat + bTender.Cash;
  const bCloseCash: Denom[] = [
    { denomination: 100_000, count: 4 },
    { denomination: 50_000, count: 1 },
    { denomination: 10_000, count: 2 },
    { denomination: 2_000, count: 1 },
  ];
  const bCounted = countCash(bCloseCash); // 472_000 => short 50_000
  const bDiff = bCounted - bExpected;
  openingShifts.push(openingShift("POS-OPEN-2027-07-31-001", "Kasir Meridian 2", "Rina", "2027-07-31T08:00:00+07:00", bFloat, bOpenCash, bExpected, bTender, 2, "Closed", "POS-CLOSE-2027-07-31-001", "2027-07-31T21:00:00+07:00"));
  closingShifts.push(closingShift("POS-CLOSE-2027-07-31-001", "POS-OPEN-2027-07-31-001", "Kasir Meridian 2", "Budi", "2027-07-31T21:00:00+07:00", bCloseCash, bFloat, bExpected, bCounted, bTender));
  if (bDiff !== 0) {
    const m = Math.abs(bDiff);
    vouchers.push({
      id: "JV-NIMB-POS-CLOSE-2027-07-31-001",
      tenant: TENANT,
      voucherType: "POS Cash Variance",
      voucherNo: "POS-CLOSE-2027-07-31-001",
      postingDate: "2027-07-31",
      remarks: "Selisih kas shift POS-OPEN-2027-07-31-001 (kurang)",
      totalAmount: m,
      lines:
        bDiff < 0
          ? [account("5190", "5190 - Selisih Kas", m, 0), account("1110", "1110 - Kas Laci POS", 0, m)]
          : [account("1110", "1110 - Kas Laci POS", m, 0), account("4190", "4190 - Pendapatan Lain-lain", 0, m)],
    });
  }

  // --- Shift C: still open ---
  const cOpenCash: Denom[] = [{ denomination: 100_000, count: 2 }, { denomination: 50_000, count: 1 }];
  const cFloat = countCash(cOpenCash);
  const cTender: Record<Tender, number> = { Cash: 0, Card: 0, QRIS: 0, Transfer: 0 };
  const c1 = makeInvoice("POS-OPEN-2027-08-01-001", "2027-08-01", "Walk-in", [{ item: "ITEM-004", quantity: 1, rate: 100_000 }], [["QRIS", 111_000]]);
  for (const k of Object.keys(cTender) as Tender[]) cTender[k] += c1.tt[k];
  openingShifts.push(openingShift("POS-OPEN-2027-08-01-001", "Kasir Meridian 1", "Sari", "2027-08-01T08:00:00+07:00", cFloat, cOpenCash, cFloat + cTender.Cash, cTender, 1, "Open", null, null));

  return { openingShifts, closingShifts, invoices, vouchers };
}

function openingShift(
  id: string,
  posProfile: string,
  cashier: string,
  openingDate: string,
  openingFloat: number,
  openingCash: Denom[],
  expectedCash: number,
  salesByTender: Record<Tender, number>,
  invoiceCount: number,
  status: string,
  closingShiftId: string | null,
  closedAt: string | null,
): Record<string, unknown> {
  return {
    id,
    tenant: TENANT,
    posProfile,
    cashier,
    openingDate,
    openingFloat,
    openingCash: openingCash.map((d) => ({ ...d })),
    expectedCash,
    salesByTender,
    invoiceCount,
    status,
    ...(closingShiftId ? { closingShift: closingShiftId } : {}),
    ...(closedAt ? { closedAt } : {}),
    route: `/meridian/edit/POSOpeningShift/${id}`,
  };
}

function closingShift(
  id: string,
  openingShiftId: string,
  posProfile: string,
  supervisor: string,
  closingDate: string,
  closingCash: Denom[],
  openingFloat: number,
  expectedCash: number,
  countedCash: number,
  salesByTender: Record<Tender, number>,
): Record<string, unknown> {
  const difference = countedCash - expectedCash;
  const closingAmounts = (["Cash", "Card", "QRIS", "Transfer"] as Tender[])
    .map((method) => {
      const openingAmount = method === "Cash" ? openingFloat : 0;
      const salesAmount = salesByTender[method];
      const expectedAmount = openingAmount + salesAmount;
      const closingAmount = method === "Cash" ? countedCash : expectedAmount;
      return { paymentMethod: method, openingAmount, salesAmount, expectedAmount, closingAmount, differenceAmount: closingAmount - expectedAmount };
    })
    .filter((row) => row.openingAmount !== 0 || row.salesAmount !== 0);
  return {
    id,
    tenant: TENANT,
    openingShift: openingShiftId,
    posProfile,
    supervisor,
    closingDate,
    closingCash: closingCash.map((d) => ({ ...d })),
    openingFloat,
    expectedCash,
    countedCash,
    differenceAmount: difference,
    closingAmounts,
    status: difference === 0 ? "Balanced" : difference < 0 ? "Short" : "Over",
    route: `/meridian/edit/POSClosingShift/${id}`,
  };
}
