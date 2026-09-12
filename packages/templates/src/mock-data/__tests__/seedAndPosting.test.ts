import { describe, expect, it } from "vitest";
import { createSeed } from "../seed";
import { verifyLedgerBalance } from "../generators/postingBackfill";

describe("Unified Seed & Posting Backfill", () => {
  it("generates byte-identical seed data when called twice with the same PRNG seed", () => {
    const seed1 = createSeed(20260822);
    const seed2 = createSeed(20260822);

    expect(JSON.stringify(seed1)).toBe(JSON.stringify(seed2));
  });

  it("generates at least 60 records for the primary transactional collection of every tenant", () => {
    const data = createSeed(20260822);

    const PRIMARY_COLLECTIONS = [
      "SalesInvoice",
      "shoe_orders",
      "tuition_fees",
      "work_orders",
      "roasting_batches",
      "project_milestones",
      "crm_opportunities",
      "murabahah_financing",
      "patient_admissions",
      "medical_device_batches",
      "fulfillment_orders",
      "support_tickets",
    ];

    for (const coll of PRIMARY_COLLECTIONS) {
      const records = data[coll];
      expect(records, `Collection ${coll} should exist in seed`).toBeDefined();
      expect(records.length, `Collection ${coll} should have at least 60 records`).toBeGreaterThanOrEqual(60);
    }
  });

  it("backfills General Ledger entries with strictly balanced Σdebit === Σcredit for each entry and in aggregate", () => {
    const data = createSeed(20260822);
    const glEntries = data["GeneralLedger"] as never[];

    expect(glEntries.length).toBeGreaterThan(0);

    const balanceCheck = verifyLedgerBalance(glEntries);
    expect(balanceCheck.imbalanceCount).toBe(0);
    expect(balanceCheck.isBalanced).toBe(true);
    expect(balanceCheck.totalDebit).toBeGreaterThan(0);
    expect(balanceCheck.totalDebit).toBe(balanceCheck.totalCredit);
  });

  it("generates canonical shoe-company POS retail seed with linked derived rows", () => {
    const data = createSeed(20260822);
    const requiredCollections = [
      "POSShift",
      "POSInvoice",
      "POSPayment",
      "ItemVariant",
      "Warehouse",
      "StockLedgerEntry",
      "GLEntry",
      "CashClosing",
    ];

    for (const collection of requiredCollections) {
      expect(data[collection], `Collection ${collection} should exist`).toBeDefined();
      expect(data[collection].length, `Collection ${collection} should have rows`).toBeGreaterThan(0);
    }

    const shoeCustomers = data["Customer"].filter((row) => row.companyId === "shoe-company");
    expect(shoeCustomers.length).toBeGreaterThanOrEqual(8);

    const invoices = data["POSInvoice"];
    const payments = data["POSPayment"];
    const stockRows = data["StockLedgerEntry"];
    const glRows = data["GLEntry"];
    const postedInvoices = invoices.filter((row) => row.status !== "Held");
    expect(invoices.length).toBeGreaterThanOrEqual(24);
    expect(payments.length).toBeGreaterThanOrEqual(20);
    expect(stockRows.length).toBeGreaterThanOrEqual(postedInvoices.length);

    const invoiceIds = new Set(invoices.map((row) => row.id));
    for (const payment of payments) {
      expect(invoiceIds.has(payment.invoiceId)).toBe(true);
    }

    const glByVoucher = new Map<string, Array<Record<string, unknown>>>();
    for (const row of glRows) {
      const voucherNo = String(row.voucherNo);
      glByVoucher.set(voucherNo, [...(glByVoucher.get(voucherNo) ?? []), row]);
    }

    for (const invoice of postedInvoices) {
      const lines = glByVoucher.get(String(invoice.id)) ?? [];
      const debit = lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
      const credit = lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
      expect(lines.length).toBeGreaterThanOrEqual(4);
      expect(debit).toBe(credit);
    }
  });
});
