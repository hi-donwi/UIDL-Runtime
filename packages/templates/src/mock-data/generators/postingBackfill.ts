/**
 * Posting Backfill Generator.
 *
 * Derives balanced double-entry General Ledger (GL) journal records from submitted
 * transactional documents across all 11 company consoles.
 *
 * Guarantees the fundamental accounting invariants for EVERY tenant:
 *   1. Σdebit === Σcredit for every single entry and in the aggregate
 *   2. Assets === Liabilities + Equity
 */

export interface GLPostingLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface GLJournalEntry {
  [key: string]: unknown;
  id: string;
  tenant: string;
  voucherType: string;
  voucherNo: string;
  postingDate: string;
  remarks: string;
  totalAmount: number;
  lines: GLPostingLine[];
}

export function backfillLedgerFromInvoices(
  tenant: string,
  invoices: Array<Record<string, unknown>>,
): GLJournalEntry[] {
  const entries: GLJournalEntry[] = [];

  for (const inv of invoices) {
    const status = String(inv.status ?? "");
    // Only post submitted / paid / overdue invoices
    if (status === "Draft" || status === "Cancelled") {
      continue;
    }

    const id = String(inv.id ?? "");
    const date = String(inv.date ?? inv.postingDate ?? "2026-08-01");
    const customer = String(inv.customer ?? inv.customerName ?? "Pelanggan Umum");
    const rawTotal = typeof inv.total === "number" ? inv.total : parseFloat(String(inv.total ?? 0)) || 0;
    const total = Math.round(rawTotal);

    if (total <= 0) continue;

    const isTaxable = Boolean(inv.isTaxable ?? false);
    const taxRate = isTaxable ? 0.11 : 0;
    const subtotal = Math.round(total / (1 + taxRate));
    const tax = total - subtotal;

    const lines: GLPostingLine[] = [
      {
        account: "1130",
        accountName: "1130 - Piutang Usaha",
        debit: total,
        credit: 0,
      },
      {
        account: "4110",
        accountName: "4110 - Pendapatan Penjualan",
        debit: 0,
        credit: subtotal,
      },
    ];

    if (tax > 0) {
      lines.push({
        account: "2140",
        accountName: "2140 - Hutang PPN Keluaran",
        debit: 0,
        credit: tax,
      });
    }

    entries.push({
      id: `JV-${tenant.toUpperCase().slice(0, 4)}-${id}`,
      tenant,
      voucherType: "Sales Invoice",
      voucherNo: id,
      postingDate: date,
      remarks: `Penjualan faktur ${id} kepada ${customer}`,
      totalAmount: total,
      lines,
    });
  }

  return entries;
}

export function backfillLedgerFromPayments(
  tenant: string,
  payments: Array<Record<string, unknown>>,
): GLJournalEntry[] {
  const entries: GLJournalEntry[] = [];

  for (const pay of payments) {
    const status = String(pay.status ?? "");
    if (status === "Draft" || status === "Cancelled") continue;

    const id = String(pay.id ?? "");
    const date = String(pay.date ?? pay.paymentDate ?? "2026-08-01");
    const party = String(pay.party ?? pay.customer ?? "Pelanggan");
    const rawAmount = typeof pay.amount === "number" ? pay.amount : parseFloat(String(pay.amount ?? 0)) || 0;
    const amount = Math.round(rawAmount);

    if (amount <= 0) continue;

    const lines: GLPostingLine[] = [
      {
        account: "1110",
        accountName: "1110 - Kas Utama / Bank",
        debit: amount,
        credit: 0,
      },
      {
        account: "1130",
        accountName: "1130 - Piutang Usaha",
        debit: 0,
        credit: amount,
      },
    ];

    entries.push({
      id: `JV-PAY-${tenant.toUpperCase().slice(0, 4)}-${id}`,
      tenant,
      voucherType: "Payment",
      voucherNo: id,
      postingDate: date,
      remarks: `Penerimaan pembayaran ${id} dari ${party}`,
      totalAmount: amount,
      lines,
    });
  }

  return entries;
}

/**
 * Validates that an array of GL journal entries satisfies the accounting balance invariant.
 */
export function verifyLedgerBalance(entries: GLJournalEntry[]): {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  imbalanceCount: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;
  let imbalanceCount = 0;

  for (const entry of entries) {
    let entryDebit = 0;
    let entryCredit = 0;

    for (const line of entry.lines) {
      entryDebit += line.debit;
      entryCredit += line.credit;
    }

    if (Math.abs(entryDebit - entryCredit) > 0.001) {
      imbalanceCount++;
    }

    totalDebit += entryDebit;
    totalCredit += entryCredit;
  }

  return {
    isBalanced: imbalanceCount === 0 && Math.abs(totalDebit - totalCredit) < 0.001,
    totalDebit,
    totalCredit,
    imbalanceCount,
  };
}
