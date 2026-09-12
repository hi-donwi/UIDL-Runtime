import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import { calculatePOSCart, closePOSShift, openPOSShift, submitPOSSale, type POSItem } from "../posService";

describe("POS Service", () => {
  const catalog: POSItem[] = [
    { id: "ITEM-001", name: 'Laptop Business 14"', rate: 8500000 },
    { id: "ITEM-002", name: 'Monitor LED 24"', rate: 1750000 },
    { id: "ITEM-003", name: "Mouse Wireless", rate: 150000 },
  ];

  it("calculates zero totals when cart is empty", () => {
    const totals = calculatePOSCart(catalog, {});
    expect(totals.itemCount).toBe(0);
    expect(totals.subtotal).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
    expect(totals.lines).toHaveLength(0);
  });

  it("calculates single boolean toggled items with 11% VAT/PPN", () => {
    const totals = calculatePOSCart(catalog, {
      "ITEM-001": true,
      "ITEM-003": true,
    });

    expect(totals.itemCount).toBe(2);
    expect(totals.subtotal).toBe(8650000);
    expect(totals.tax).toBe(Math.round(8650000 * 0.11)); // 951500
    expect(totals.total).toBe(8650000 + 951500); // 9601500
    expect(totals.formattedTotal).toContain("9.601.500");
  });

  it("handles numeric quantities properly", () => {
    const totals = calculatePOSCart(catalog, {
      "ITEM-002": 2, // 3500000
      "ITEM-003": 4, // 600000
    });

    expect(totals.itemCount).toBe(6);
    expect(totals.subtotal).toBe(4100000);
    expect(totals.tax).toBe(451000);
    expect(totals.total).toBe(4551000);
  });
});

describe("POS sale service", () => {
  it("opens a real POSShift record without colliding with seeded shifts", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const shift = await openPOSShift(adapter, {
      companyId: "shoe-company",
      cashier: "Maya",
      outlet: "Jakarta",
      openingFloat: 750000,
      openedAt: "2026-08-24",
    });

    expect(shift).toMatchObject({
      id: "SHIFT-SHOE-2026-08-05",
      companyId: "shoe-company",
      cashier: "Maya",
      outlet: "Jakarta",
      openingFloat: 750000,
      expectedCash: 750000,
      status: "Open",
    });
    await expect(adapter.get("POSShift", String(shift.id))).resolves.toMatchObject({ record: shift });
  });

  it("submits a paid sale through invoice, payment, stock, GL, and receipt records", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });
    const beforeItem = await adapter.get<Record<string, unknown>>("ItemVariant", "SHOE-SNK-01");

    const result = await submitPOSSale(adapter, {
      companyId: "shoe-company",
      shiftId: "SHIFT-SHOE-2026-08-04",
      customerId: "CUST-SHOE-001",
      postingDate: "2026-08-24",
      lines: [{ itemVariantId: "SHOE-SNK-01", quantity: 2 }],
      payments: [{ tenderType: "QRIS", amount: 999000, referenceNo: "QR-TEST-001" }],
    });

    expect(result.invoice).toMatchObject({
      id: "POS-INV-2026-0029",
      companyId: "shoe-company",
      shiftId: "SHIFT-SHOE-2026-08-04",
      subtotal: 900000,
      tax: 99000,
      grandTotal: 999000,
      cogs: 522000,
      status: "Paid",
    });
    expect(result.payment).toMatchObject({
      id: "PAY-POS-2026-0023",
      invoiceId: result.invoice.id,
      tenderType: "QRIS",
      amount: 999000,
      clearingAccount: "1125 - EDC/QRIS/E-Wallet Clearing",
      status: "Settled",
    });
    expect(result.stockLedgerEntries).toEqual([
      expect.objectContaining({
        id: "SLE-SHOE-2026-0026",
        itemVariant: "SHOE-SNK-01",
        voucherNo: result.invoice.id,
        actualQty: -2,
        valuationRate: 261000,
        stockValue: -522000,
        status: "Posted",
      }),
    ]);
    expect(result.receipt).toMatchObject({
      id: "RCPT-SHOE-2026-0001",
      invoiceId: result.invoice.id,
      paymentId: result.payment.id,
      totalPaid: 999000,
    });

    const afterItem = await adapter.get<Record<string, unknown>>("ItemVariant", "SHOE-SNK-01");
    expect(Number(afterItem?.record.stock)).toBe(Number(beforeItem?.record.stock) - 2);

    const persistedGl = await adapter.query<Record<string, unknown>>({
      collection: "GLEntry",
      filters: [{ field: "voucherNo", op: "in", value: [result.invoice.id, result.payment.id] }],
    });
    expect(persistedGl.rows).toHaveLength(7);

    for (const voucherNo of [result.invoice.id, result.payment.id]) {
      const lines = persistedGl.rows.filter((line) => line.voucherNo === voucherNo);
      const debit = lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
      const credit = lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
      expect(debit).toBe(credit);
    }
  });

  it("rejects sale submission against a closed shift", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    await expect(
      submitPOSSale(adapter, {
        companyId: "shoe-company",
        shiftId: "SHIFT-SHOE-2026-08-01",
        customerId: "CUST-SHOE-001",
        postingDate: "2026-08-24",
        lines: [{ itemVariantId: "SHOE-SNK-01", quantity: 1 }],
        payments: [{ tenderType: "Cash", amount: 499500 }],
      }),
    ).rejects.toThrow('POS shift "SHIFT-SHOE-2026-08-01" is not open');
  });
});

describe("POS close shift service", () => {
  it("closes a shift with expected cash and QRIS totals derived from payments", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });
    const shift = await openPOSShift(adapter, {
      companyId: "shoe-company",
      cashier: "Maya",
      outlet: "Jakarta",
      openingFloat: 750000,
      openedAt: "2026-08-24",
    });
    await submitPOSSale(adapter, {
      companyId: "shoe-company",
      shiftId: String(shift.id),
      customerId: "CUST-SHOE-001",
      postingDate: "2026-08-24",
      lines: [{ itemVariantId: "SHOE-SNK-01", quantity: 2 }],
      payments: [
        { tenderType: "Cash", amount: 500000 },
        { tenderType: "QRIS", amount: 499000, referenceNo: "QR-CLOSE-001" },
      ],
    });

    const result = await closePOSShift(adapter, {
      companyId: "shoe-company",
      shiftId: String(shift.id),
      closedAt: "2026-08-24",
      countedCash: 1250000,
      countedQRIS: 499000,
      supervisor: "Supervisor Retail",
    });

    expect(result.closing).toMatchObject({
      id: "CLOSE-SHOE-2026-0005",
      shiftId: shift.id,
      expectedCash: 1250000,
      countedCash: 1250000,
      expectedQRIS: 499000,
      countedQRIS: 499000,
      variance: 0,
      qrisVariance: 0,
      status: "Approved",
    });
    expect(result.shift).toMatchObject({
      id: shift.id,
      status: "Closed",
      expectedCash: 1250000,
      expectedQRIS: 499000,
      variance: 0,
      qrisVariance: 0,
    });
    const persistedShift = await adapter.get<Record<string, unknown>>("POSShift", String(shift.id));
    expect(persistedShift?.record.status).toBe("Closed");
  });

  it("blocks closing while a shift still has pending POS invoices", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    await expect(
      closePOSShift(adapter, {
        companyId: "shoe-company",
        shiftId: "SHIFT-SHOE-2026-08-04",
        closedAt: "2026-08-24",
        countedCash: 1000000,
        countedQRIS: 0,
        supervisor: "Supervisor Retail",
      }),
    ).rejects.toThrow('POS shift "SHIFT-SHOE-2026-08-04" has pending invoices');
  });
});
