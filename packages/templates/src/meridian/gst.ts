import { customers, purchaseInvoices, salesInvoices, suppliers } from "./mockData";
import { formatIDR } from "./buildDocument";

export interface TaxSummary {
  taxableTotal: number;
  taxTotal: number;
  rows: Array<Record<string, string>>;
}

/**
 * GSTR1 (outward supplies, from sales invoices) / GSTR2 (inward supplies, from purchase
 * invoices) — derived from the same invoice records every other report reads, not a separate
 * hand-typed dataset, so it can never silently disagree with Sales/Purchase Invoice totals.
 */
export function taxSummary(kind: "GSTR1" | "GSTR2"): TaxSummary {
  if (kind === "GSTR1") {
    const submitted = salesInvoices.filter((invoice) => invoice.status !== "Draft");
    return {
      taxableTotal: submitted.reduce((total, invoice) => total + invoice.subtotal, 0),
      taxTotal: submitted.reduce((total, invoice) => total + invoice.tax, 0),
      rows: submitted.map((invoice) => ({
        invoice: invoice.id,
        party: customers.find((customer) => customer.id === invoice.customer)?.name ?? invoice.customer,
        taxable: formatIDR(invoice.subtotal),
        tax: formatIDR(invoice.tax),
      })),
    };
  }

  const submitted = purchaseInvoices.filter((invoice) => invoice.status !== "Draft");
  return {
    taxableTotal: submitted.reduce((total, invoice) => total + invoice.subtotal, 0),
    taxTotal: submitted.reduce((total, invoice) => total + invoice.tax, 0),
    rows: submitted.map((invoice) => ({
      invoice: invoice.id,
      party: suppliers.find((supplier) => supplier.id === invoice.supplier)?.name ?? invoice.supplier,
      taxable: formatIDR(invoice.subtotal),
      tax: formatIDR(invoice.tax),
    })),
  };
}
