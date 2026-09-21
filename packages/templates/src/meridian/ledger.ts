import {
  accounts,
  journalEntries,
  payments,
  purchaseInvoices,
  salesInvoices,
  type Account,
} from "./mockData";

/**
 * A minimal posting engine — NOT a real accounting system — that turns SalesInvoice/
 * PurchaseInvoice/Payment/JournalEntry mock records into GL-style debit/credit postings.
 * Every report (General Ledger, Trial Balance, P&L, Balance Sheet) and every dashboard figure
 * reads from `postings()`, so they can never silently disagree with each other or with the
 * source records — see `meridian.consistency.test.ts` for the proof.
 */

export interface Posting {
  date: string;
  account: string;
  debit: number;
  credit: number;
  voucher: string;
  narration: string;
}

function accountFor(id: string): Account {
  const account = accounts.find((candidate) => candidate.id === id);
  if (!account) throw new Error(`Unknown account: ${id}`);
  return account;
}

function paymentCashAccount(method: "Cash" | "Bank Transfer" | "Card"): string {
  return method === "Cash" ? "cash" : "bank";
}

export function postings(): Posting[] {
  const rows: Posting[] = [];

  for (const je of journalEntries) {
    for (const jeLine of je.lines) {
      rows.push({ date: je.date, account: jeLine.account, debit: jeLine.debit, credit: jeLine.credit, voucher: je.id, narration: je.narration });
    }
  }

  for (const invoice of salesInvoices) {
    if (invoice.status === "Draft") continue;
    rows.push({ date: invoice.date, account: "accounts-receivable", debit: invoice.total, credit: 0, voucher: invoice.id, narration: `Sales Invoice ${invoice.id}` });
    rows.push({ date: invoice.date, account: "sales", debit: 0, credit: invoice.subtotal, voucher: invoice.id, narration: `Sales Invoice ${invoice.id}` });
    rows.push({ date: invoice.date, account: "tax-payable-output", debit: 0, credit: invoice.tax, voucher: invoice.id, narration: `Sales Invoice ${invoice.id}` });
  }

  for (const invoice of purchaseInvoices) {
    if (invoice.status === "Draft") continue;
    rows.push({ date: invoice.date, account: "cost-of-goods-sold", debit: invoice.subtotal, credit: 0, voucher: invoice.id, narration: `Purchase Invoice ${invoice.id}` });
    rows.push({ date: invoice.date, account: "tax-credit-input", debit: invoice.tax, credit: 0, voucher: invoice.id, narration: `Purchase Invoice ${invoice.id}` });
    rows.push({ date: invoice.date, account: "accounts-payable", debit: 0, credit: invoice.total, voucher: invoice.id, narration: `Purchase Invoice ${invoice.id}` });
  }

  for (const payment of payments) {
    const cashAccount = paymentCashAccount(payment.method);
    if (payment.type === "Receive") {
      rows.push({ date: payment.date, account: cashAccount, debit: payment.amount, credit: 0, voucher: payment.id, narration: `Payment ${payment.id} (${payment.reference})` });
      rows.push({ date: payment.date, account: "accounts-receivable", debit: 0, credit: payment.amount, voucher: payment.id, narration: `Payment ${payment.id} (${payment.reference})` });
    } else {
      rows.push({ date: payment.date, account: "accounts-payable", debit: payment.amount, credit: 0, voucher: payment.id, narration: `Payment ${payment.id} (${payment.reference})` });
      rows.push({ date: payment.date, account: cashAccount, debit: 0, credit: payment.amount, voucher: payment.id, narration: `Payment ${payment.id} (${payment.reference})` });
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export interface TrialBalanceRow {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export function trialBalance(): TrialBalanceRow[] {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const posting of postings()) {
    const entry = totals.get(posting.account) ?? { debit: 0, credit: 0 };
    entry.debit += posting.debit;
    entry.credit += posting.credit;
    totals.set(posting.account, entry);
  }

  return [...totals.entries()]
    .map(([account, { debit, credit }]) => ({ account, accountName: accountFor(account).name, debit, credit }))
    .sort((a, b) => a.account.localeCompare(b.account));
}

/** Net balance for one account: debit-normal for Asset/Expense, credit-normal otherwise. */
export function accountBalance(accountId: string): number {
  const account = accountFor(accountId);
  const row = trialBalance().find((candidate) => candidate.account === accountId);
  if (!row) return 0;
  const isDebitNormal = account.rootType === "Asset" || account.rootType === "Expense";
  return isDebitNormal ? row.debit - row.credit : row.credit - row.debit;
}

export function balanceForRootType(rootType: Account["rootType"]): number {
  return accounts
    .filter((account) => !account.isGroup && account.rootType === rootType)
    .reduce((total, account) => total + accountBalance(account.id), 0);
}

export function profitAndLoss(): { income: number; expense: number; netProfit: number } {
  const income = balanceForRootType("Income");
  const expense = balanceForRootType("Expense");
  return { income, expense, netProfit: income - expense };
}

export function customerOutstanding(customerId: string): number {
  const invoiced = salesInvoices
    .filter((invoice) => invoice.customer === customerId && invoice.status !== "Draft")
    .reduce((total, invoice) => total + invoice.total, 0);
  const received = payments
    .filter((payment) => payment.party === customerId && payment.type === "Receive")
    .reduce((total, payment) => total + payment.amount, 0);
  return invoiced - received;
}

export function supplierOutstanding(supplierId: string): number {
  const invoiced = purchaseInvoices
    .filter((invoice) => invoice.supplier === supplierId && invoice.status !== "Draft")
    .reduce((total, invoice) => total + invoice.total, 0);
  const paid = payments
    .filter((payment) => payment.party === supplierId && payment.type === "Pay")
    .reduce((total, payment) => total + payment.amount, 0);
  return invoiced - paid;
}

export function totalReceivables(): number {
  return accountBalance("accounts-receivable");
}

export function totalPayables(): number {
  return accountBalance("accounts-payable");
}

export function cashAndBankBalance(): number {
  return accountBalance("cash") + accountBalance("bank");
}
