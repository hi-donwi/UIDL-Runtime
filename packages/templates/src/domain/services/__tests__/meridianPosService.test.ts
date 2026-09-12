import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { DataError } from "~/data/types";
import { closePosShift, countCash, openPosShift, submitPosInvoice } from "../meridianPosService";

function adapter() {
  return createInMemoryAdapter({ seed: { POSOpeningShift: [], POSClosingShift: [], POSSalesInvoice: [], GeneralLedger: [] } });
}

const balanced = (lines: Array<{ debit: number; credit: number }>) =>
  Math.round(lines.reduce((s, l) => s + l.debit, 0)) === Math.round(lines.reduce((s, l) => s + l.credit, 0));

describe("meridian POS shift lifecycle", () => {
  it("counts cash by denomination and rejects unknown denominations or bad counts", () => {
    expect(countCash([{ denomination: 100_000, count: 3 }, { denomination: 50_000, count: 1 }])).toBe(350_000);
    expect(() => countCash([{ denomination: 300, count: 1 }])).toThrow(DataError);
    expect(() => countCash([{ denomination: 100_000, count: -1 }])).toThrow(DataError);
  });

  it("opens with an opening float, posts balanced POS vouchers, and accrues expected cash", async () => {
    const a = adapter();
    const { shift } = await openPosShift(a, {
      cashier: "Sari",
      posProfile: "Kasir 1",
      openedAt: "2027-08-02T08:00:00+07:00",
      openingCash: [{ denomination: 100_000, count: 2 }],
    });
    expect(shift).toMatchObject({ openingFloat: 200_000, expectedCash: 200_000, status: "Open" });

    const sale = await submitPosInvoice(a, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-02",
      lines: [{ item: "ITEM-001", quantity: 2, rate: 100_000 }],
      payments: [{ method: "Cash", amount: 222_000 }],
    });
    expect(sale.invoice).toMatchObject({ subtotal: 200_000, tax: 22_000, total: 222_000 });
    expect(sale.voucher.voucherType).toBe("POS Invoice");
    expect(balanced(sale.voucher.lines)).toBe(true);
    expect(sale.voucher.lines[0]).toMatchObject({ account: "1110", debit: 222_000 });
    expect(sale.shift).toMatchObject({ expectedCash: 422_000, invoiceCount: 1 });

    const nonCash = await submitPosInvoice(a, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-02",
      lines: [{ item: "ITEM-002", quantity: 1, rate: 150_000 }],
      payments: [{ method: "QRIS", amount: 166_500 }],
    });
    expect(nonCash.voucher.lines.find((l) => l.account === "1125")).toMatchObject({ debit: 166_500 });
    expect(nonCash.shift).toMatchObject({ expectedCash: 422_000, salesByTender: { Cash: 222_000, QRIS: 166_500 } });
  });

  it("closes balanced when the counted drawer matches expected cash", async () => {
    const a = adapter();
    const { shift } = await openPosShift(a, { cashier: "Sari", openedAt: "2027-08-02T08:00:00+07:00", openingCash: [{ denomination: 100_000, count: 2 }] });
    await submitPosInvoice(a, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-02",
      lines: [{ item: "ITEM-001", quantity: 2, rate: 100_000 }],
      payments: [{ method: "Cash", amount: 222_000 }],
    });

    const close = await closePosShift(a, {
      shiftId: String(shift.id),
      supervisor: "Budi",
      closedAt: "2027-08-02T21:00:00+07:00",
      closingCash: [{ denomination: 100_000, count: 4 }, { denomination: 20_000, count: 1 }, { denomination: 2_000, count: 1 }],
    });
    expect(close.closingShift).toMatchObject({ countedCash: 422_000, expectedCash: 422_000, differenceAmount: 0, status: "Balanced" });
    expect(close.varianceVoucher).toBeNull();
    expect(close.openingShift).toMatchObject({ status: "Closed" });
  });

  it("posts a cash-variance journal entry when the drawer is short", async () => {
    const a = adapter();
    const { shift } = await openPosShift(a, { cashier: "Rina", openedAt: "2027-08-02T08:00:00+07:00", openingCash: [{ denomination: 100_000, count: 3 }] });
    await submitPosInvoice(a, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-02",
      lines: [{ item: "ITEM-001", quantity: 2, rate: 100_000 }],
      payments: [{ method: "Cash", amount: 222_000 }],
    });

    // expected 522_000; count 472_000 -> short 50_000
    const close = await closePosShift(a, {
      shiftId: String(shift.id),
      supervisor: "Budi",
      closedAt: "2027-08-02T21:00:00+07:00",
      closingCash: [{ denomination: 100_000, count: 4 }, { denomination: 50_000, count: 1 }, { denomination: 20_000, count: 1 }, { denomination: 2_000, count: 1 }],
    });
    expect(close.closingShift).toMatchObject({ differenceAmount: -50_000, status: "Short" });
    expect(close.varianceVoucher?.voucherType).toBe("POS Cash Variance");
    expect(close.varianceVoucher?.lines).toEqual([
      { account: "5190", accountName: "5190 - Selisih Kas", debit: 50_000, credit: 0 },
      { account: "1110", accountName: "1110 - Kas Laci POS", debit: 0, credit: 50_000 },
    ]);
  });

  it("guards double-open, sales on a closed shift, and payment totals that miss the invoice total", async () => {
    const a = adapter();
    const { shift } = await openPosShift(a, { cashier: "Sari", posProfile: "Kasir 1", openedAt: "2027-08-02T08:00:00+07:00", openingCash: [{ denomination: 100_000, count: 1 }] });
    await expect(
      openPosShift(a, { cashier: "Sari", posProfile: "Kasir 1", openedAt: "2027-08-02T09:00:00+07:00", openingCash: [{ denomination: 100_000, count: 1 }] }),
    ).rejects.toMatchObject({ code: "validation" });

    await expect(
      submitPosInvoice(a, {
        shiftId: String(shift.id),
        customerName: "x",
        postingDate: "2027-08-02",
        lines: [{ item: "a", quantity: 1, rate: 100_000 }],
        payments: [{ method: "Cash", amount: 100_000 }],
      }),
    ).rejects.toMatchObject({ code: "validation" }); // 100_000 != 111_000 total

    await closePosShift(a, { shiftId: String(shift.id), supervisor: "Budi", closedAt: "2027-08-02T21:00:00+07:00", closingCash: [{ denomination: 100_000, count: 1 }] });
    await expect(
      submitPosInvoice(a, {
        shiftId: String(shift.id),
        customerName: "x",
        postingDate: "2027-08-02",
        lines: [{ item: "a", quantity: 1, rate: 100_000 }],
        payments: [{ method: "Cash", amount: 111_000 }],
      }),
    ).rejects.toBeInstanceOf(DataError);
  });
});
