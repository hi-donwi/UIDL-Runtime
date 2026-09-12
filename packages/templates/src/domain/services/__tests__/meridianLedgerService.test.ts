import { describe, expect, it } from "vitest";
import { seed } from "../../../mock-data/seed";
import { assertLedgerConsistent, flattenLedger, rootTypeFor, summariseLedger } from "../meridianLedgerService";

function voucher(id: string, lines: Array<{ account: string; debit: number; credit: number }>): Record<string, unknown> {
  return {
    id,
    tenant: "meridian",
    voucherType: "Test",
    voucherNo: id,
    postingDate: "2027-08-01",
    remarks: id,
    totalAmount: lines.reduce((s, l) => s + l.debit, 0),
    lines: lines.map((l) => ({ ...l, accountName: `${l.account} - Test` })),
  };
}

describe("meridian whole-ledger consistency", () => {
  it("classifies accounts by the first digit of the code", () => {
    expect(rootTypeFor("1130")).toBe("Asset");
    expect(rootTypeFor("2140")).toBe("Liability");
    expect(rootTypeFor("3300")).toBe("Equity");
    expect(rootTypeFor("4110")).toBe("Income");
    expect(rootTypeFor("5110")).toBe("Expense");
    expect(rootTypeFor("9999")).toBe("Unclassified");
  });

  it("the seeded Meridian book balances per voucher, in aggregate, and by the accounting equation", () => {
    const vouchers = (seed.GeneralLedger as Array<Record<string, unknown>>).filter((row) => row.tenant === "meridian");
    const report = summariseLedger(vouchers as never);

    expect(vouchers.length).toBeGreaterThan(50);
    expect(report.summary.unbalancedVouchers).toEqual([]);
    expect(report.summary.aggregateDelta).toBe(0);
    expect(report.summary.accountingEquationDelta).toBe(0);
    // Assets = Liabilities + Equity + Net Income
    const { Asset, Liability, Equity } = report.summary.byRootType;
    expect(Asset).toBe(Liability + Equity + report.summary.netIncome);
    expect(() => assertLedgerConsistent(report)).not.toThrow();
  });

  it("flattens vouchers to one sorted row per line for the General Ledger report", () => {
    const rows = flattenLedger([
      voucher("V2", [
        { account: "5110", debit: 400, credit: 0 },
        { account: "1140", debit: 0, credit: 400 },
      ]),
      voucher("V1", [
        { account: "1130", debit: 1_000, credit: 0 },
        { account: "4110", debit: 0, credit: 1_000 },
      ]),
    ] as never);

    // Same posting date → sorted by voucher, then account.
    expect(rows.map((r) => [r.voucher, r.account, r.debit, r.credit, r.rootType])).toEqual([
      ["V1", "1130", 1_000, 0, "Asset"],
      ["V1", "4110", 0, 1_000, "Income"],
      ["V2", "1140", 0, 400, "Asset"],
      ["V2", "5110", 400, 0, "Expense"],
    ]);
  });

  it("flags an unbalanced voucher and an accounting-equation break", () => {
    const balanced = summariseLedger([
      voucher("V1", [
        { account: "1110", debit: 1_000, credit: 0 },
        { account: "4110", debit: 0, credit: 1_000 },
      ]),
    ] as never);
    expect(() => assertLedgerConsistent(balanced)).not.toThrow();
    expect(balanced.summary.netIncome).toBe(1_000);
    expect(balanced.summary.accountingEquationDelta).toBe(0);

    const broken = summariseLedger([
      voucher("V2", [
        { account: "1110", debit: 1_000, credit: 0 },
        { account: "4110", debit: 0, credit: 900 },
      ]),
    ] as never);
    expect(broken.summary.unbalancedVouchers).toEqual(["V2"]);
    expect(() => assertLedgerConsistent(broken)).toThrow();
  });
});
