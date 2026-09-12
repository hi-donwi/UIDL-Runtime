import { describe, expect, it } from "vitest";
import {
  accountBalance,
  balanceForRootType,
  postings,
  profitAndLoss,
  totalPayables,
  totalReceivables,
  trialBalance,
} from "../ledger";
import { accounts } from "../mockData";

/**
 * Restored (and widened) from the demo→reference migration: the one guarantee that the Meridian
 * financial reports can never silently disagree, because General Ledger, Trial Balance, Profit
 * and Loss, and Balance Sheet all derive from the single `postings()` source.
 */
describe("Meridian ledger consistency", () => {
  it("every posting voucher balances and the ledger balances in aggregate", () => {
    const byVoucher = new Map<string, { debit: number; credit: number }>();
    let totalDebit = 0;
    let totalCredit = 0;
    for (const posting of postings()) {
      totalDebit += posting.debit;
      totalCredit += posting.credit;
      const entry = byVoucher.get(posting.voucher) ?? { debit: 0, credit: 0 };
      entry.debit += posting.debit;
      entry.credit += posting.credit;
      byVoucher.set(posting.voucher, entry);
    }

    for (const [voucher, { debit, credit }] of byVoucher) {
      expect(Math.round(debit), `voucher ${voucher} debit != credit`).toBe(Math.round(credit));
    }
    expect(Math.round(totalDebit)).toBe(Math.round(totalCredit));
  });

  it("the trial balance nets to zero and references only known accounts", () => {
    const rows = trialBalance();
    const knownAccounts = new Set(accounts.map((account) => account.id));
    let debit = 0;
    let credit = 0;
    for (const row of rows) {
      expect(knownAccounts.has(row.account), `unknown account ${row.account}`).toBe(true);
      debit += row.debit;
      credit += row.credit;
    }
    expect(Math.round(debit)).toBe(Math.round(credit));
  });

  it("Profit and Loss equals Income − Expense from the same postings", () => {
    const pnl = profitAndLoss();
    expect(pnl.income).toBe(balanceForRootType("Income"));
    expect(pnl.expense).toBe(balanceForRootType("Expense"));
    expect(pnl.netProfit).toBe(pnl.income - pnl.expense);
  });

  it("the Balance Sheet balances: Assets = Liabilities + Equity + Net Profit", () => {
    const assets = balanceForRootType("Asset");
    const liabilities = balanceForRootType("Liability");
    const equity = balanceForRootType("Equity");
    const netProfit = profitAndLoss().netProfit;
    expect(Math.round(assets)).toBe(Math.round(liabilities + equity + netProfit));
  });

  it("aggregate control accounts agree with the receivable/payable helpers", () => {
    expect(totalReceivables()).toBe(accountBalance("accounts-receivable"));
    expect(totalPayables()).toBe(accountBalance("accounts-payable"));
  });
});
