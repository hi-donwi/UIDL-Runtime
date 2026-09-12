import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createInMemoryAdapter } from "~/data";
import { ShoePosScreen } from "../ShoePosScreen";

function seedDb() {
  return {
    ItemVariant: [
      { id: "SHOE-SNK-01", companyId: "shoe-company", itemName: "Sneaker Runner Pro", unitPrice: 500000, standardCost: 300000, stock: 10, status: "Active" },
      { id: "SHOE-FML-01", companyId: "shoe-company", itemName: "Formal Oxford Classic", unitPrice: 750000, standardCost: 450000, stock: 5, status: "Active" },
    ],
    Customer: [{ id: "CUST-SHOE-001", companyId: "shoe-company", customerName: "PT Uji Coba Sepatu", status: "Active" }],
    Warehouse: [{ id: "WH-JKT-01", companyId: "shoe-company", outlet: "Jakarta", isDefault: true, status: "Active" }],
    POSShift: [],
    POSInvoice: [],
    POSPayment: [],
    POSReceipt: [],
    StockLedgerEntry: [],
    GLEntry: [],
    CashClosing: [],
  };
}

async function openShift(adapter: ReturnType<typeof createInMemoryAdapter>) {
  render(<ShoePosScreen dataAdapter={adapter} />);
  await screen.findByTestId("open-shift-cashier");
  fireEvent.change(screen.getByTestId("open-shift-cashier"), { target: { value: "Kasir Uji" } });
  fireEvent.click(screen.getByTestId("open-shift-submit"));
  await screen.findByTestId("pos-checkout");
}

describe("ShoePosScreen", () => {
  it("shows the open-shift form when no shift is active, and opening one switches to the cart", async () => {
    const adapter = createInMemoryAdapter({ seed: seedDb() });
    await openShift(adapter);

    expect(screen.getByTestId(`pos-item-SHOE-SNK-01`)).toBeInTheDocument();
    const shifts = await adapter.query({ collection: "POSShift" });
    expect(shifts.rows).toHaveLength(1);
    expect(shifts.rows[0]).toMatchObject({ cashier: "Kasir Uji", status: "Open" });
  });

  it("computes subtotal/tax/total as items are added to the cart", async () => {
    const adapter = createInMemoryAdapter({ seed: seedDb() });
    await openShift(adapter);

    fireEvent.click(screen.getByTestId("pos-item-SHOE-SNK-01"));
    fireEvent.click(screen.getByTestId("pos-item-SHOE-SNK-01"));

    await waitFor(() => expect(screen.getByTestId("pos-qty-SHOE-SNK-01")).toHaveTextContent("2"));
    expect(screen.getByTestId("pos-subtotal")).toHaveTextContent("Rp 1.000.000");
    expect(screen.getByTestId("pos-tax")).toHaveTextContent("Rp 110.000");
    expect(screen.getByTestId("pos-total")).toHaveTextContent("Rp 1.110.000");
  });

  it("completes a split-payment sale, deducts stock, and resets the cart", async () => {
    const adapter = createInMemoryAdapter({ seed: seedDb() });
    await openShift(adapter);

    fireEvent.click(screen.getByTestId("pos-item-SHOE-SNK-01"));
    await waitFor(() => expect(screen.getByTestId("pos-total")).toHaveTextContent("Rp 555.000"));

    fireEvent.change(screen.getByTestId("pos-payment-amount-0"), { target: { value: "500000" } });
    fireEvent.click(screen.getByText("+ Tambah pembayaran"));
    await waitFor(() => expect(screen.getByTestId("pos-payment-amount-1")).toHaveValue(55000));

    expect(screen.getByTestId("pos-checkout")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("pos-checkout"));

    await screen.findByTestId("pos-last-sale");
    expect(screen.getByTestId("pos-last-sale")).toHaveTextContent("Rp 555.000");

    const invoices = await adapter.query({ collection: "POSInvoice" });
    expect(invoices.rows).toHaveLength(1);
    expect(invoices.rows[0]).toMatchObject({ status: "Paid", grandTotal: 555000 });

    const stockLedger = await adapter.query({ collection: "StockLedgerEntry" });
    expect(stockLedger.rows.length).toBeGreaterThan(0);

    const gl = await adapter.query({ collection: "GLEntry" });
    const debit = gl.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = gl.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    expect(debit).toBe(credit);
    expect(debit).toBeGreaterThan(0);

    const item = await adapter.get("ItemVariant", "SHOE-SNK-01");
    expect(item?.record.stock).toBe(9);

    // Cart resets after a successful sale.
    expect(screen.queryByTestId("pos-qty-SHOE-SNK-01")).not.toBeInTheDocument();
  });

  it("keeps checkout disabled while payment total doesn't match the cart total", async () => {
    const adapter = createInMemoryAdapter({ seed: seedDb() });
    await openShift(adapter);

    fireEvent.click(screen.getByTestId("pos-item-SHOE-FML-01"));
    await waitFor(() => expect(screen.getByTestId("pos-total")).toHaveTextContent("Rp 832.500"));
    fireEvent.change(screen.getByTestId("pos-payment-amount-0"), { target: { value: "500000" } });

    await waitFor(() => expect(screen.getByTestId("pos-checkout")).toBeDisabled());
    expect(screen.getByText(/belum sama dengan total invoice/)).toBeInTheDocument();
  });

  it("closes the shift and reports a zero variance when counted cash matches expected", async () => {
    const adapter = createInMemoryAdapter({ seed: seedDb() });
    await openShift(adapter);

    fireEvent.click(screen.getByTestId("pos-item-SHOE-SNK-01"));
    await waitFor(() => expect(screen.getByTestId("pos-total")).toHaveTextContent("Rp 555.000"));
    fireEvent.change(screen.getByTestId("pos-payment-amount-0"), { target: { value: "555000" } });
    fireEvent.click(screen.getByTestId("pos-checkout"));
    await screen.findByTestId("pos-last-sale");

    fireEvent.click(screen.getByTestId("open-close-shift"));
    const cashField = await screen.findByTestId("close-shift-cash");
    // openingFloat (750000, the component's default) + Cash tender (555000).
    fireEvent.change(cashField, { target: { value: "1305000" } });
    fireEvent.change(screen.getByTestId("close-shift-supervisor"), { target: { value: "Supervisor Uji" } });
    fireEvent.click(screen.getByTestId("close-shift-submit"));

    const summary = await screen.findByTestId("close-shift-summary");
    expect(summary).toHaveTextContent("Rp 0");

    const shifts = await adapter.query({ collection: "POSShift" });
    expect(shifts.rows[0]).toMatchObject({ status: "Closed", variance: 0 });
  });
});
