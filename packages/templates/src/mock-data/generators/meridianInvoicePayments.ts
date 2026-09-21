/**
 * Meridian (core accounting) payment backfill (Meridian parity Slice 6).
 *
 * For every already-posted `SalesInvoice` seeded with status "Paid", emits a `Payment`
 * record (with a `PaymentFor`-style `for` line) and a balanced cash/AR `GeneralLedger`
 * voucher, so the AR subledger ties out to the ledger control account before any
 * interactive payment is recorded. No PRNG draws.
 */

const TENANT = "meridian";
const CASH_ACCOUNT = "1110";
const CASH_ACCOUNT_NAME = "1110 - Kas Utama / Bank";
const AR_ACCOUNT = "1130";
const AR_ACCOUNT_NAME = "1130 - Piutang Usaha";

export interface MeridianPaymentSeed {
  payments: Array<Record<string, unknown>>;
  vouchers: Array<Record<string, unknown>>;
}

export function buildMeridianInvoicePayments(invoices: Array<Record<string, unknown>>): MeridianPaymentSeed {
  const payments: Array<Record<string, unknown>> = [];
  const vouchers: Array<Record<string, unknown>> = [];
  let seq = 0;

  for (const invoice of invoices) {
    if (invoice.status !== "Paid") continue;
    const invoiceId = String(invoice.id ?? "");
    const total = Math.round(Number(invoice.total ?? 0));
    if (total <= 0) continue;

    seq += 1;
    const paymentId = `PAY-NIMB-${String(seq).padStart(5, "0")}`;
    const date = String(invoice.dueDate ?? invoice.date ?? "2027-08-01");
    payments.push({
      id: paymentId,
      tenant: TENANT,
      party: invoice.customerName ?? invoice.customer ?? "",
      paymentType: "Receive",
      method: "Bank Transfer",
      date,
      amountReceived: total,
      allocatedAmount: total,
      writeOffAmount: 0,
      unallocatedAmount: 0,
      for: [{ invoiceId, amount: total }],
      status: "Submitted",
      route: `/meridian/edit/Payment/${paymentId}`,
    });
    vouchers.push({
      id: `JV-NIMB-${paymentId}`,
      tenant: TENANT,
      voucherType: "Payment",
      voucherNo: paymentId,
      postingDate: date,
      remarks: `Penerimaan pembayaran faktur ${invoiceId}`,
      totalAmount: total,
      lines: [
        { account: CASH_ACCOUNT, accountName: CASH_ACCOUNT_NAME, debit: total, credit: 0 },
        { account: AR_ACCOUNT, accountName: AR_ACCOUNT_NAME, debit: 0, credit: total },
      ],
    });
  }

  return { payments, vouchers };
}
