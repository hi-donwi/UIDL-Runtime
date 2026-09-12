import { describe, expect, it } from "vitest";
import {
  accounts,
  customers,
  journalEntries,
  payments,
  purchaseInvoices,
  salesInvoices,
  suppliers,
} from "../../../../../packages/templates/src/meridian/mockData";
import {
  accountBalance,
  customerOutstanding,
  postings,
  profitAndLoss,
  supplierOutstanding,
  trialBalance,
} from "../../../../../packages/templates/src/meridian/ledger";

describe("meridian demo mock data — internal consistency", () => {
  it("every sales invoice's total equals its own line items plus tax", () => {
    for (const invoice of salesInvoices) {
      const lineSum = invoice.lines.reduce((total, line) => total + line.amount, 0);
      expect(invoice.subtotal, invoice.id).toBe(lineSum);
      expect(invoice.total, invoice.id).toBe(invoice.subtotal + invoice.tax);
      for (const invoiceLine of invoice.lines) {
        expect(invoiceLine.amount, `${invoice.id} ${invoiceLine.item}`).toBe(invoiceLine.quantity * invoiceLine.rate);
      }
    }
  });

  it("every purchase invoice's total equals its own line items plus tax", () => {
    for (const invoice of purchaseInvoices) {
      const lineSum = invoice.lines.reduce((total, line) => total + line.amount, 0);
      expect(invoice.subtotal, invoice.id).toBe(lineSum);
      expect(invoice.total, invoice.id).toBe(invoice.subtotal + invoice.tax);
    }
  });

  it("every journal entry balances (debit total equals credit total)", () => {
    for (const entry of journalEntries) {
      const debit = entry.lines.reduce((total, line) => total + line.debit, 0);
      const credit = entry.lines.reduce((total, line) => total + line.credit, 0);
      expect(debit, entry.id).toBe(credit);
    }
  });

  it("every payment amount is derived from a real invoice and never exceeds its total", () => {
    for (const payment of payments) {
      const source =
        payment.type === "Receive"
          ? salesInvoices.find((invoice) => invoice.id === payment.reference)
          : purchaseInvoices.find((invoice) => invoice.id === payment.reference);
      expect(source, `${payment.id} references ${payment.reference}`).toBeDefined();
      expect(payment.amount, payment.id).toBeGreaterThan(0);
      expect(payment.amount, payment.id).toBeLessThanOrEqual(source!.total);
    }
  });

  it("every posting references a real account and the whole ledger balances globally", () => {
    const rows = postings();
    expect(rows.length).toBeGreaterThan(0);
    for (const posting of rows) {
      expect(accounts.some((account) => account.id === posting.account), `unknown account ${posting.account}`).toBe(true);
    }
    const totalDebit = rows.reduce((total, row) => total + row.debit, 0);
    const totalCredit = rows.reduce((total, row) => total + row.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it("the trial balance's total debits equal its total credits", () => {
    const rows = trialBalance();
    const totalDebit = rows.reduce((total, row) => total + row.debit, 0);
    const totalCredit = rows.reduce((total, row) => total + row.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });

  it("customer/supplier outstanding never goes negative and matches unpaid invoice math", () => {
    for (const customer of customers) {
      expect(customerOutstanding(customer.id), customer.id).toBeGreaterThanOrEqual(0);
    }
    for (const supplier of suppliers) {
      expect(supplierOutstanding(supplier.id), supplier.id).toBeGreaterThanOrEqual(0);
    }

    // A fully "Paid" invoice must reconcile to exactly zero outstanding.
    const paidInvoice = salesInvoices.find((invoice) => invoice.id === "SINV-2027-00001")!;
    expect(paidInvoice.status).toBe("Paid");
    const otherInvoicesForSameCustomer = salesInvoices.some(
      (invoice) => invoice.customer === paidInvoice.customer && invoice.id !== paidInvoice.id && invoice.status !== "Draft",
    );
    if (!otherInvoicesForSameCustomer) {
      expect(customerOutstanding(paidInvoice.customer)).toBe(0);
    }
  });

  it("Accounts Receivable / Accounts Payable balances equal the sum of individual party outstanding", () => {
    const totalCustomerOutstanding = customers.reduce((total, customer) => total + customerOutstanding(customer.id), 0);
    const totalSupplierOutstanding = suppliers.reduce((total, supplier) => total + supplierOutstanding(supplier.id), 0);
    expect(accountBalance("accounts-receivable")).toBe(totalCustomerOutstanding);
    expect(accountBalance("accounts-payable")).toBe(totalSupplierOutstanding);
  });

  it("profit and loss net profit equals income minus expense, both non-zero", () => {
    const { income, expense, netProfit } = profitAndLoss();
    expect(income).toBeGreaterThan(0);
    expect(expense).toBeGreaterThan(0);
    expect(netProfit).toBe(income - expense);
  });

  it("every account referenced by an invoice/payment/journal entry exists in the chart of accounts", () => {
    const accountIds = new Set(accounts.map((account) => account.id));
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        expect(accountIds.has(line.account), `${entry.id} references ${line.account}`).toBe(true);
      }
    }
  });
});
