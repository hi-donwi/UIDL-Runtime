import { test, expect } from "@playwright/test";

/**
 * Real-browser coverage for the "Meridian Trading Co." reference — a JSON-UIDL implementation inspired by Meridian's
 * navigation and doctypes. Unlike visual-regression.spec.ts (which renders
 * standalone documents through a dedicated harness), this drives the actual ReferenceApp shell and its
 * `/meridian/...` router, because the thing being proven here is real navigation — sidebar clicks,
 * list-to-form-to-list journeys — not just that one document renders in isolation.
 *
 * Baselines live in e2e/meridian-reference.spec.ts-snapshots/. Regenerate deliberately with
 * `npm run test:reference:update` after a real, reviewed visual change.
 */

function collectConsoleErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("catalog landing shows the Meridian reference card and opens the reference", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByText("Meridian Accounting")).toBeVisible();

  await page.locator("article", { hasText: "Meridian Accounting" }).getByRole("button", { name: "Buka Meridian" }).click();
  await expect(page).toHaveURL(/\/meridian\/dashboard$/);
  await expect(page.getByText("Total Receivables")).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("shoe-company ModuleSpec pilot renders generated workspace and list with mock data", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/app/shoe-company/retail-ops");

  await expect(page.getByText("Operasi Retail Sepatu").first()).toBeVisible();
  await expect(page.getByText("Pesanan Sepatu").first()).toBeVisible();

  await page.getByRole("button", { name: "Pesanan Sepatu" }).click();
  await expect(page).toHaveURL(/\/app\/shoe-company\/list\/ShoeOrder$/);
  await expect(page.getByText("ORD-SHOE-0001")).toBeVisible();

  await page.goto("/app/shoe-company/list/POSShift");
  await expect(page.getByText("SHIFT-SHOE-2026-08-01")).toBeVisible();

  await page.goto("/app/shoe-company/list/POSInvoice");
  await expect(page.getByText("POS-INV-2026-0001")).toBeVisible();
  await page.getByRole("button", { name: "+ Invoice POS" }).click();
  await expect(page).toHaveURL(/\/app\/shoe-company\/edit\/POSInvoice\/new$/);
  await expect(page.getByText("Buat Invoice POS").first()).toBeVisible();

  await page.goto("/app/shoe-company/list/POSPayment");
  await expect(page.getByText("PAY-POS-2026-0022")).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("full journey: sidebar accordion, list -> open -> pre-filled form -> save -> back to list", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");

  // The Sales group is a collapsed accordion row on the Dashboard page — its items only render
  // once it's the active group, matching the Meridian sidebar (expansion is a pure
  // function of the current route, not independent toggle state). `exact: true` matters here:
  // the Dashboard's own Unpaid Invoices widget has a "View Sales Invoices" button, which is a
  // substring match for "Sales Invoices" otherwise.
  await expect(page.getByRole("button", { name: "Sales Invoices", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesQuote$/);
  await expect(page.getByRole("button", { name: "Sales Invoices", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sales Invoices", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesInvoice$/);
  await expect(page.getByText("SINV-2027-00001")).toBeVisible();

  // SalesInvoice's list is now $query-backed DataTable, not the hand-composed
  // whole-row-clickable Row list other Meridian doctypes still use — it navigates via a per-row
  // "Open" action instead (README §Row actions (DataTable)), scoped to the row's data-row-id.
  await page.locator("[data-row-id='SINV-2027-00001']").getByRole("button", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/meridian\/edit\/SalesInvoice\/SINV-2027-00001$/);
  await expect(page.getByText("Grand Total Rp 34.132.500")).toBeVisible();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesInvoice$/);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("POS: real shift lifecycle — open, sell with multi-tender, close with a cash count", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));
  await page.goto("/meridian/pos");

  // The seed has an open shift (Kasir Meridian 1) — the till renders straight away.
  await expect(page.getByText(/expected drawer/i)).toBeVisible();
  await page.getByTestId("pos-layout-modern").click();
  await page.getByTestId("pos-layout-classic").click();

  // Add an item, open the payment modal, submit the exact grand total.
  await page.locator("[data-testid^='pos-item-']").first().click();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(1);
  await page.getByTestId("pos-pay").click();
  await page.getByTestId("pos-tender-Cash").click();
  await page.getByTestId("pos-payment-submit").click();
  await expect(page.getByTestId("pos-receipt")).toContainText("Sale completed");
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);

  // Close the shift with a denomination count.
  await page.getByRole("button", { name: "Close Shift", exact: true }).click();
  await page.getByLabel("Supervisor").fill("Budi");
  await page.getByLabel("Count 100000").fill("50");
  await page.getByTestId("pos-close-confirm").click();
  await expect(page.getByTestId("pos-close-summary")).toBeVisible();
  await expect(page.getByText("Open POS Shift")).toBeVisible(); // back to the open-shift form

  expect(errors, errors.join("\n")).toEqual([]);
});

test("inventory reconciliation is opened from the sidebar and surfaces the stock-to-GL mismatch", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");

  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/BillOfMaterials$/);

  await page.getByRole("button", { name: "Inventory Reconciliation", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/InventoryReconciliation$/);
  await expect(page.getByText("Stock Value: Rp 63.900.000")).toBeVisible();
  await expect(page.getByText("Inventory GL: Rp 0")).toBeVisible();
  await expect(page.getByText("Difference: Rp 63.900.000")).toBeVisible();
  await expect(page.getByText("Mismatch", { exact: true })).toBeVisible();
  await expect(page.getByText(/Warehouse reconciliation is unavailable/)).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("school dunning report is opened from the sidebar and derives overdue exposure", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/app/school-abc/school-finance");

  await expect(page.getByText("School Finance").first()).toBeVisible();
  await page.getByRole("button", { name: "Keuangan Sekolah", exact: true }).click();
  await page.getByRole("button", { name: "Laporan Tunggakan", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/school-abc\/report\/SchoolDunningReport$/);
  await expect(page.getByRole("heading", { name: "School Dunning Report" }).first()).toBeVisible();
  await expect(page.getByText("Rp 46.500.000").first()).toBeVisible();
  await expect(page.getByText("31").first()).toBeVisible();
  await expect(page.getByText("18 days").first()).toBeVisible();
  await expect(page.getByText("Second Reminder").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("hospital claim reconciliation is opened from the sidebar and surfaces outstanding payer balances", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/app/hospital-medika/clinical-ops");

  await expect(page.getByText("Clinical Ops").first()).toBeVisible();
  await page.getByRole("button", { name: "Pelayanan RS", exact: true }).click();
  await page.getByRole("button", { name: "Rekonsiliasi Klaim", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/hospital-medika\/report\/HospitalClaimReconciliation$/);
  await expect(page.getByRole("heading", { name: "Hospital Claim Reconciliation" }).first()).toBeVisible();
  await expect(page.getByText("Rp 8.507.000").first()).toBeVisible();
  await expect(page.getByText("Rp 16.995.000").first()).toBeVisible();
  await expect(page.getByText("89.8%").first()).toBeVisible();
  await expect(page.getByText("Disputed").first()).toBeVisible();
  await expect(page.getByText("Partially Paid").first()).toBeVisible();
  await expect(page.getByText(/disputed.*disallowances stay inside expected settlement/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("helpdesk SLA report is opened from the sidebar and derives elapsed time from timestamps", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/app/helpdesk/support-desk");

  await expect(page.getByText("Support Desk").first()).toBeVisible();
  await page.getByRole("button", { name: "Service Desk", exact: true }).click();
  await page.getByRole("button", { name: "SLA & Eskalasi", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/helpdesk\/report\/HelpdeskSlaReport$/);
  await expect(page.getByRole("heading", { name: "Helpdesk SLA Report" }).first()).toBeVisible();
  await expect(page.getByText("74.3%").first()).toBeVisible();
  await expect(page.getByText("164.0h").first()).toBeVisible();
  await expect(page.getByText("Breached").first()).toBeVisible();
  await expect(page.getByText("At Risk").first()).toBeVisible();
  await expect(page.getByText(/Elapsed time is wall-clock minutes/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("koperasi collectibility report is opened from the sidebar and grades financing from installment ageing", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/app/koperasi-bmt/member-finance");

  await expect(page.getByText("Member Finance").first()).toBeVisible();
  await page.getByRole("button", { name: "Koperasi & BMT", exact: true }).click();
  await page.getByRole("button", { name: "Kolektibilitas OJK", exact: true }).click();

  await expect(page).toHaveURL(/\/app\/koperasi-bmt\/report\/KoperasiCollectibilityReport$/);
  await expect(page.getByRole("heading", { name: "Murabahah Collectibility" }).first()).toBeVisible();
  await expect(page.getByText("12.4%").first()).toBeVisible();
  await expect(page.getByText("Rp 667.728.432").first()).toBeVisible();
  await expect(page.getByText("Rp 37.180.778").first()).toBeVisible();
  await expect(page.getByText("4 - Diragukan").first()).toBeVisible();
  await expect(page.getByText("3 - Kurang Lancar").first()).toBeVisible();
  await expect(page.getByText(/Days past due is measured from the earliest unpaid installment/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Sales Invoice Draft→Submit→Cancel posts and reverses in the ledger", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  // Open the reconciliation report from the Reports group.
  await page.goto("/meridian/dashboard");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.getByRole("button", { name: "Sales Invoice Ledger", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/SalesInvoiceLedger$/);
  await expect(page.getByRole("heading", { name: "Sales Invoice Ledger" }).first()).toBeVisible();
  await expect(page.getByText("53/65").first()).toBeVisible();

  // Submit a known Draft invoice through the real service, then reload the report.
  const submitted = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/meridianSalesInvoiceService";
    const [cfg, svc] = await Promise.all([
      import(/* @vite-ignore */ configPath),
      import(/* @vite-ignore */ servicePath),
    ]);
    const res = await svc.submitSalesInvoice(cfg.dataAdapter, { invoiceId: "SINV-2027-00010", submittedAt: "2027-08-20" });
    return String(res.invoice.status);
  });
  expect(submitted).toBe("Unpaid");

  await page.reload();
  await expect(page.getByText("54/65").first()).toBeVisible();
  await expect(page.getByText("SINV-2027-00010").first()).toBeVisible();
  await expect(page.getByText("Posted").first()).toBeVisible();
  await expect(page.getByText("Balanced").first()).toBeVisible();

  // Cancel it — a mirror reversal voucher, invoice count posted stays, a Reversed row appears.
  const cancelled = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/meridianSalesInvoiceService";
    const [cfg, svc] = await Promise.all([
      import(/* @vite-ignore */ configPath),
      import(/* @vite-ignore */ servicePath),
    ]);
    const res = await svc.cancelSalesInvoice(cfg.dataAdapter, { invoiceId: "SINV-2027-00010", cancelledAt: "2027-08-21" });
    return String(res.invoice.status);
  });
  expect(cancelled).toBe("Cancelled");

  await page.reload();
  await expect(page.getByText("54/65").first()).toBeVisible();
  await expect(page.getByText("Reversed").first()).toBeVisible();
  await expect(page.getByText(/A Draft invoice carries no General Ledger voucher/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian POS shift opens with a cash count, sells, and closes reconciled", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));
  await page.goto("/meridian/dashboard");

  await page.getByRole("button", { name: "POS", exact: true }).click();
  await page.getByRole("button", { name: "POS Shift Ledger", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/POSShiftLedger$/);
  await expect(page.getByRole("heading", { name: "POS Shift Ledger" }).first()).toBeVisible();
  await expect(page.getByText("2/3 closed").first()).toBeVisible();
  await expect(page.getByText("Short").first()).toBeVisible();

  const closeResult = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const servicePath = "/@id/@uidl-runtime/templates/domain/services/meridianPosService";
    const [cfg, svc] = await Promise.all([
      import(/* @vite-ignore */ configPath),
      import(/* @vite-ignore */ servicePath),
    ]);
    const { shift } = await svc.openPosShift(cfg.dataAdapter, {
      cashier: "Sari",
      posProfile: "Kasir Meridian 9",
      openedAt: "2027-08-03T08:00:00+07:00",
      openingCash: [{ denomination: 100000, count: 2 }],
    });
    await svc.submitPosInvoice(cfg.dataAdapter, {
      shiftId: String(shift.id),
      customerName: "Walk-in",
      postingDate: "2027-08-03",
      lines: [{ item: "ITEM-001", quantity: 2, rate: 100000 }],
      payments: [{ method: "Cash", amount: 222000 }],
    });
    const close = await svc.closePosShift(cfg.dataAdapter, {
      shiftId: String(shift.id),
      supervisor: "Budi",
      closedAt: "2027-08-03T21:00:00+07:00",
      closingCash: [{ denomination: 100000, count: 4 }, { denomination: 20000, count: 1 }, { denomination: 2000, count: 1 }],
    });
    return String(close.closingShift.status);
  });
  expect(closeResult).toBe("Balanced");

  await page.reload();
  await expect(page.getByText("3/4 closed").first()).toBeVisible();
  await expect(page.getByText(/cash-variance journal entry/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Accounts Receivable ties out and a recorded payment settles an invoice", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));
  await page.goto("/meridian/dashboard");

  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.getByRole("button", { name: "Accounts Receivable", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/AccountsReceivable$/);
  await expect(page.getByRole("heading", { name: "Accounts Receivable" }).first()).toBeVisible();
  await expect(page.getByText("Rp 527.010.000").first()).toBeVisible(); // outstanding
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  const settled = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const svcPath = "/@id/@uidl-runtime/templates/domain/services/meridianPaymentService";
    const [cfg, svc] = await Promise.all([
      import(/* @vite-ignore */ configPath),
      import(/* @vite-ignore */ svcPath),
    ]);
    const invoices = (await cfg.dataAdapter.query({ collection: "SalesInvoice" })).rows;
    const target = invoices.find((row: { status: string }) => row.status === "Unpaid");
    const res = await svc.recordSalesPayment(cfg.dataAdapter, {
      party: String(target.customerName),
      method: "Bank Transfer",
      receivedAt: "2027-08-15",
      allocations: [{ invoiceId: String(target.id), allocatedAmount: Number(target.total) }],
    });
    return { id: String(target.id), status: String(res.invoices[0].status) };
  });
  expect(settled.status).toBe("Paid");

  await page.reload();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // still tied out
  await expect(page.getByText(settled.id)).toHaveCount(0); // settled invoice dropped from the outstanding table
  await expect(page.getByText(/AR control balance is the net debit the ledger carries/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Stock Valuation Ledger ties out and moving-average survives a receipt and an issue", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));
  await page.goto("/meridian/dashboard");

  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByRole("button", { name: "Stock Valuation Ledger", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/StockValuationLedger$/);
  await expect(page.getByRole("heading", { name: "Stock Valuation Ledger" }).first()).toBeVisible();
  await expect(page.getByText("Rp 157.371.429").first()).toBeVisible(); // stock value == Inventory GL
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out

  const moved = await page.evaluate(async () => {
    const configPath = "/@id/@uidl-runtime/templates/config/data.config";
    const svcPath = "/@id/@uidl-runtime/templates/domain/services/meridianStockService";
    const [cfg, svc] = await Promise.all([
      import(/* @vite-ignore */ configPath),
      import(/* @vite-ignore */ svcPath),
    ]);
    // ITEM-001 is stocked in Lembar and bought in Rim (1 Rim = 500 Lembar).
    const rec = await svc.receiveStock(cfg.dataAdapter, { item: "ITEM-001", quantity: 2, uom: "Rim", rate: 225000, receivedAt: "2027-08-01" });
    // ITEM-002 is batch-tracked; ITEM-004 is serial-tracked.
    await svc.issueStock(cfg.dataAdapter, { item: "ITEM-002", quantity: 10, batchNo: "BATCH-INK-2707", issuedAt: "2027-08-02" });
    const iss = await svc.issueStock(cfg.dataAdapter, {
      item: "ITEM-004",
      quantity: 5,
      serialNos: ["SN-MON-0001", "SN-MON-0002", "SN-MON-0003", "SN-MON-0004", "SN-MON-0005"],
      issuedAt: "2027-08-02",
    });
    return { recvQty: Number(rec.item.stockQty), issueCogs: Number(iss.voucher.lines[0].debit) };
  });
  expect(moved.recvQty).toBe(1_400); // 400 Lembar + 2 Rim * 500
  expect(moved.issueCogs).toBe(8_625_000); // 69_000_000 * 5 / 40

  await page.reload();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // still tied out
  await expect(page.getByText(/Tie-out difference = summed on-hand value/i).first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian master doctypes resolve to real list and form pages", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  // Opened from the sidebar.
  await page.goto("/meridian/dashboard");
  await page.getByRole("button", { name: "Common", exact: true }).click();
  await page.getByRole("button", { name: "Item Groups", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/ItemGroup$/);
  await expect(page.getByText("Office Supplies").first()).toBeVisible();

  // Every ported master doctype has a list and a working form.
  for (const [doctype, sampleId, marker] of [
    ["UOM", "UOM-RIM", "Units of Measure: UOM-RIM"],
    ["Address", "ADDR-HQ", "Addresses: ADDR-HQ"],
    ["Location", "LOC-MAIN", "Locations: LOC-MAIN"],
    ["Batch", "BATCH-INK-2707", "Batches: BATCH-INK-2707"],
    ["SerialNumber", "SN-LAP-0001", "Serial Numbers: SN-LAP-0001"],
    ["PaymentMethod", "PM-QRIS", "Payment Methods: PM-QRIS"],
    ["POSProfile", "POSP-JKT-1", "POS Profiles: POSP-JKT-1"],
  ] as const) {
    await page.goto(`/meridian/list/${doctype}`);
    await expect(page.getByText("This page is on the build roadmap")).toHaveCount(0);
    await page.goto(`/meridian/edit/${doctype}/${sampleId}`);
    await expect(page.getByText(marker).first()).toBeVisible();
  }

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Sales Invoice form Submit button drives a real transition + GL posting", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  // A Draft invoice's form shows Submit; clicking it runs the state-machine transition.
  await page.goto("/meridian/edit/SalesInvoice/SINV-2027-00010");
  await expect(page.getByText("Sales Invoice: SINV-2027-00010")).toBeVisible();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesInvoice$/);

  // The reconciliation report now counts it as posted, balanced, and still tied out.
  await page.goto("/meridian/report/SalesInvoiceLedger");
  await expect(page.getByText("54/65").first()).toBeVisible();
  await expect(page.getByText("SINV-2027-00010").first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  // Cancelling the now-submitted invoice posts the mirror reversal.
  await page.goto("/meridian/edit/SalesInvoice/SINV-2027-00010");
  await page.getByRole("button", { name: "Cancel Invoice", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesInvoice$/);
  await page.goto("/meridian/report/SalesInvoiceLedger");
  await expect(page.getByText("Reversed").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Purchase Invoice Submit posts to GL and the Accounts Payable report ties out", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  // The seeded AP subledger ties to the 2110 control account.
  await page.goto("/meridian/report/AccountsPayable");
  await expect(page.getByRole("heading", { name: "Accounts Payable" }).first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  // A Draft purchase invoice's form shows Submit; clicking it runs the state-machine transition.
  await page.goto("/meridian/edit/PurchaseInvoice/PINV-2027-00008");
  await expect(page.getByText("Purchase Invoice: PINV-2027-00008")).toBeVisible();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/PurchaseInvoice$/);

  // Still tied out, and the newly-posted invoice now shows as an open payable.
  await page.goto("/meridian/report/AccountsPayable");
  await expect(page.getByText("PINV-2027-00008").first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  // Cancelling the now-submitted invoice posts the mirror reversal and it drops off the report.
  await page.goto("/meridian/edit/PurchaseInvoice/PINV-2027-00008");
  await page.getByRole("button", { name: "Cancel Invoice", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/PurchaseInvoice$/);
  await page.goto("/meridian/report/AccountsPayable");
  await expect(page.getByText("PINV-2027-00008")).toHaveCount(0);
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // still tied out

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Purchase Receipt receives stock and a matched invoice clears GRNI", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  // Receive the seeded Draft goods-receipt for PINV-2027-00008 — the state-machine transition
  // posts one 1140 / 2150 GRNI stock movement per line via meridianStockService.receiveStock.
  await page.goto("/meridian/edit/PurchaseReceipt/PREC-2027-00004");
  await expect(page.getByText("Purchase Receipt: PREC-2027-00004")).toBeVisible();
  await page.getByRole("button", { name: "Receive Stock", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/PurchaseReceipt$/);

  // Stock moved into 1140 and stays tied to the ledger.
  await page.goto("/meridian/report/StockValuationLedger");
  await expect(page.getByRole("heading", { name: "Stock Valuation Ledger" }).first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  // Submitting the matched invoice clears GRNI (Dr 2150) instead of expensing to 5120; the AP
  // subledger still ties to the 2110 control account.
  await page.goto("/meridian/edit/PurchaseInvoice/PINV-2027-00008");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/PurchaseInvoice$/);

  await page.goto("/meridian/report/AccountsPayable");
  await expect(page.getByText("PINV-2027-00008").first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // tie-out difference

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian financial statements read the live ledger and reflect a submitted invoice", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));
  await page.goto("/meridian/dashboard");

  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.getByRole("button", { name: "Trial Balance", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/report\/TrialBalance$/);
  await expect(page.getByRole("heading", { name: "Trial Balance" }).first()).toBeVisible();
  await expect(page.getByText("Rp 1.567.274.271").first()).toBeVisible(); // total debit = total credit
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // difference

  // A submitted invoice moves the statements — proof the reports read the adapter ledger.
  await page.goto("/meridian/edit/SalesInvoice/SINV-2027-00010");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/list\/SalesInvoice$/);

  await page.goto("/meridian/report/TrialBalance");
  await expect(page.getByText("Rp 1.575.774.271").first()).toBeVisible(); // +8.5M
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // still balanced

  await page.goto("/meridian/report/BalanceSheet");
  await expect(page.getByRole("heading", { name: "Balance Sheet" }).first()).toBeVisible();
  await expect(page.getByText("Current Year Earnings").first()).toBeVisible();

  // The dashboard KPIs read the same live ledger.
  await page.goto("/meridian/dashboard");
  await expect(page.getByText("Total Receivables")).toBeVisible();
  await expect(page.getByText("Rp 535.510.000").first()).toBeVisible(); // AR 1130 net, +8.5M

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian ad-hoc Journal Entry Submit posts balanced lines to the ledger", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  // The behavioural adapter JE shows in the Journal Entry list above the static ones.
  await page.goto("/meridian/list/JournalEntry");
  await page.getByText("JE-NIMB-0001").click();
  await expect(page).toHaveURL(/\/meridian\/edit\/JournalEntry\/JE-NIMB-0001$/);
  await expect(page.getByTestId("je-total-debit")).toHaveText("Rp 2.500.000");
  await expect(page.getByTestId("je-total-credit")).toHaveText("Rp 2.500.000");

  await page.getByTestId("je-submit").click();
  await expect(page.getByTestId("je-posted")).toContainText("Posted JE-NIMB-0001");

  // It moved the ledger: Trial Balance total is now +2.5M and still balanced.
  await page.goto("/meridian/report/TrialBalance");
  await expect(page.getByText("Rp 1.569.774.271").first()).toBeVisible();
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // difference

  // Cancelling posts the mirror reversal — the ledger still balances (difference Rp 0).
  await page.goto("/meridian/edit/JournalEntry/JE-NIMB-0001");
  await page.getByTestId("je-cancel").click();
  await expect(page.getByTestId("je-posted")).toContainText("Reversed JE-NIMB-0001");
  await page.goto("/meridian/report/TrialBalance");
  await expect(page.getByText("Rp 1.572.274.271").first()).toBeVisible(); // + reversal debit
  await expect(page.getByText("Rp 0").first()).toBeVisible(); // still balanced

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Import Wizard validates CSV and creates only the valid rows", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/meridian/dashboard");
  await page.evaluate(() => window.localStorage.removeItem("uidl-runtime-mock-db"));

  await page.goto("/meridian/import-wizard");
  await expect(page.getByRole("heading", { name: "Import Wizard" }).first()).toBeVisible();

  // Default sample: CUST-IMP-01/02 valid, CUST-IMP-03 missing its name.
  await page.getByTestId("import-preview").click();
  await expect(page.getByTestId("import-summary")).toHaveText("2 valid · 1 invalid");
  await expect(page.getByTestId("import-preview-table")).toContainText("Missing name");

  await page.getByTestId("import-run").click();
  await expect(page.getByTestId("import-result")).toContainText("Created 2 Customer record(s); skipped 1");

  // Re-previewing now flags the created ids as existing — proof they were persisted.
  await page.getByTestId("import-preview").click();
  await expect(page.getByTestId("import-summary")).toHaveText("0 valid · 3 invalid");
  await expect(page.getByTestId("import-preview-table")).toContainText('Id "CUST-IMP-01" already exists');

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Meridian Settings is tabbed and the Setup Wizard opens from the sidebar", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/meridian/settings");
  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  await expect(page.getByLabel("Company Name")).toBeVisible(); // General tab open by default
  await expect(page.getByLabel("Write Off Account")).toHaveCount(0); // Accounting tab hidden
  await page.getByRole("button", { name: "Accounting", exact: true }).click();
  await expect(page.getByLabel("Write Off Account")).toBeVisible();
  await expect(page.getByLabel("Company Name")).toHaveCount(0);

  await page.goto("/meridian/dashboard");
  await page.getByRole("button", { name: "Get Started", exact: true }).click();
  await page.getByRole("button", { name: "Setup Wizard", exact: true }).click();
  await expect(page).toHaveURL(/\/meridian\/setup-wizard$/);
  await expect(page.getByText("Set Up Your Company").first()).toBeVisible();
  await expect(page.getByText("3 · Financials").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete Setup" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("dashboard matches its visual baseline", async ({ page }) => {
  await page.goto("/meridian/dashboard");
  await expect(page.getByText("Total Receivables")).toBeVisible();
  await expect(page).toHaveScreenshot("meridian-dashboard.png", { fullPage: true });
});

test("sales invoice list matches its visual baseline", async ({ page }) => {
  await page.goto("/meridian/list/SalesInvoice");
  await expect(page.getByText("SINV-2027-00010")).toBeVisible();
  await expect(page).toHaveScreenshot("meridian-sales-invoice-list.png", { fullPage: true });
});

test("procure-to-pay and manufacturing journeys navigate and render forms correctly", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  // 1. Material Requests list -> open record form
  await page.goto("/meridian/list/MaterialRequest");
  await expect(page.getByText("MR-2027-00014")).toBeVisible();
  await page.locator("[data-node-id='list-row-0']").click();
  await expect(page).toHaveURL(/\/meridian\/edit\/MaterialRequest\/MR-2027-00014$/);
  await expect(page.getByRole("heading", { name: "Material Request: MR-2027-00014" })).toBeVisible();

  // 2. Bill of Materials list -> open record form
  await page.goto("/meridian/list/BillOfMaterials");
  await expect(page.getByText("BOM-MEJA-01")).toBeVisible();
  await page.locator("[data-node-id='list-row-0']").click();
  await expect(page).toHaveURL(/\/meridian\/edit\/BillOfMaterials\/BOM-MEJA-01$/);
  await expect(page.getByRole("heading", { name: "Bill of Materials: Meja Kantor Eksekutif" })).toBeVisible();

  // 3. Work Orders list -> open record form
  await page.goto("/meridian/list/WorkOrder");
  await expect(page.getByText("WO-2027-00008")).toBeVisible();
  await page.locator("[data-node-id='list-row-0']").click();
  await expect(page).toHaveURL(/\/meridian\/edit\/WorkOrder\/WO-2027-00008$/);
  await expect(page.getByRole("heading", { name: "Work Order: WO-2027-00008" })).toBeVisible();

  // 4. Job Cards list -> open record form
  await page.goto("/meridian/list/JobCard");
  await expect(page.getByText("JC-2027-0001")).toBeVisible();
  await page.locator("[data-node-id='list-row-0']").click();
  await expect(page).toHaveURL(/\/meridian\/edit\/JobCard\/JC-2027-0001$/);
  await expect(page.getByRole("heading", { name: "Job Card: JC-2027-0001" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Indonesian Tax Invoice print format renders correctly", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/meridian/edit/SalesInvoice/SINV-2027-00001");
  await expect(page.getByRole("button", { name: "Cetak Faktur Pajak" })).toBeVisible();
  await page.getByRole("button", { name: "Cetak Faktur Pajak" }).click();

  await expect(page).toHaveURL(/\/meridian\/print\/tax-invoice\/SalesInvoice\/SINV-2027-00001$/);
  await expect(page.getByText("FAKTUR PAJAK", { exact: true })).toBeVisible();
  await expect(page.getByText("PENGUSAHA KENA PAJAK (PENJUAL)")).toBeVisible();
  await expect(page.getByText("PT Meridian Trading Nusantara", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "← Kembali ke Invoice" }).click();
  await expect(page).toHaveURL(/\/meridian\/edit\/SalesInvoice\/SINV-2027-00001$/);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Koperasi & BMT Syariah console renders cleanly from route", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/console/koperasi-bmt/dashboard");
  await expect(page).toHaveURL(/\/app\/koperasi-bmt\/member-finance$/);
  await expect(page.getByText("Member Finance").first()).toBeVisible();
  await expect(page.getByText(/Total Simpanan/).first()).toBeVisible();
  await expect(page.getByText("Akad Murabahah").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Healthcare, Medtech, Omnichannel, and HelpDesk consoles render with no console errors", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  // 1. Healthcare
  await page.goto("/console/hospital-medika/dashboard");
  await expect(page).toHaveURL(/\/app\/hospital-medika\/clinical-ops$/);
  await expect(page.getByText("Clinical Ops").first()).toBeVisible();
  await expect(page.getByText("Antrean Pasien").first()).toBeVisible();

  // 2. Medtech High-Compliance
  await page.goto("/console/medical-device/dashboard");
  await expect(page).toHaveURL(/\/app\/medical-device\/quality-manufacturing$/);
  await expect(page.getByText("Quality Manufacturing").first()).toBeVisible();
  await expect(page.getByText("Device Batches").first()).toBeVisible();

  // 3. Omnichannel Distribution
  await page.goto("/console/omnichannel-dist/dashboard");
  await expect(page).toHaveURL(/\/app\/omnichannel-dist\/fulfillment-ops$/);
  await expect(page.getByText("Fulfillment Ops").first()).toBeVisible();
  await expect(page.getByText("Antrean Pesanan").first()).toBeVisible();

  // 4. Help Desk Support
  await page.goto("/console/helpdesk/dashboard");
  await expect(page).toHaveURL(/\/app\/helpdesk\/support-desk$/);
  await expect(page.getByText("Support Desk").first()).toBeVisible();
  await expect(page.getByText("Antrean Tiket").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Generated console and industry print formats render cleanly", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  // 1. Generated Medtech console list
  await page.goto("/console/medical-device/dashboard");
  await expect(page).toHaveURL(/\/app\/medical-device\/quality-manufacturing$/);
  await page.getByRole("button", { name: "Device Batches" }).first().click();
  await expect(page).toHaveURL(/\/app\/medical-device\/list\/DeviceBatch$/);
  await expect(page.getByText("Batch Produksi Alat Kesehatan (DHR)").first()).toBeVisible();

  // 2. Certificate of Analysis (CoA)
  await page.goto("/meridian/print/certificate-of-analysis/medical-device/DHR-2027-B091");
  await expect(page.getByText("CERTIFICATE OF ANALYSIS (CoA)")).toBeVisible();
  await expect(page.getByText("PT MEDTECH PRECISION INDONESIA", { exact: true })).toBeVisible();

  // 3. Surat Perjanjian Akad Murabahah
  await page.goto("/meridian/print/akad-murabahah/koperasi-bmt/MRB-2027-0104");
  await expect(page.getByText("SURAT PERJANJIAN AKAD PEMBIAYAAN MURABAHAH (JUAL-BELI)")).toBeVisible();
  await expect(page.getByText("KOPERASI & BMT SYARIAH MANDIRI", { exact: true })).toBeVisible();

  // 4. Shipping Label & Packing Slip
  await page.goto("/meridian/print/packing-slip/omnichannel-dist/ORD-SHP-99210");
  await expect(page.getByText("SHIPPING LABEL & PACKING SLIP")).toBeVisible();
  await expect(page.getByText("NUSANTARA OMNICHANNEL DISTRIBUTION", { exact: true })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Universal Command Palette (Cmd+K) navigates directly to consoles and documents", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/console/shoe-company/dashboard");
  await expect(page.getByRole("heading", { name: "Toko Sepatu Nusantara", exact: true })).toBeVisible();

  // Open via Floating Tools FAB Menu
  const fabBtn = page.getByRole("button", { name: "Developer & Tools Menu" });
  await expect(fabBtn).toBeVisible();
  await fabBtn.click();

  const cmdPaletteBtn = page.getByRole("button", { name: "Command Palette" });
  await expect(cmdPaletteBtn).toBeVisible();
  await cmdPaletteBtn.click();

  await expect(page.getByRole("dialog", { name: "Universal Command Palette" })).toBeVisible();

  // Search for "faktur"
  const searchInput = page.getByPlaceholder(/cari modul, konsol industri/i);
  await searchInput.fill("faktur");
  await expect(page.getByText(/faktur pajak ppn 11%/i)).toBeVisible();

  // Click on search result
  await page.getByText(/faktur pajak ppn 11%/i).click();
  await expect(page).toHaveURL(/\/meridian\/print\/tax-invoice\/SalesInvoice\/SINV-2027-00001$/);
  await expect(page.getByText("FAKTUR PAJAK", { exact: true })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Generated medical-device create form renders from metadata", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/app/medical-device/list/DeviceBatch");
  await page.getByRole("button", { name: "+ Batch Produksi Alat Kesehatan (DHR)" }).click();
  await expect(page).toHaveURL(/\/app\/medical-device\/edit\/DeviceBatch\/new$/);
  await expect(page.getByText("Buat Batch Produksi Alat Kesehatan (DHR)").first()).toBeVisible();
  await expect(page.getByText("Nama Perangkat Medis").first()).toBeVisible();
  await expect(page.getByText("Kode UDI").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Simpan/i })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Live JSON Schema Playground renders and updates preview on preset changes", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/playground");
  await expect(page.getByText("uidl-runtime JSON Schema Playground")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daftar Pasien Aktif" })).toBeVisible();

  // Switch template to Omnichannel
  const select = page.getByRole("combobox");
  await select.selectOption("omnichannel");

  await expect(page.getByRole("heading", { name: "Antrean Pesanan Masuk (Marketplace Fulfillment)" })).toBeVisible();
  await expect(page.getByText("Lapakku Official", { exact: true })).toBeVisible();

  // Click back to catalog
  await page.getByRole("button", { name: /Kembali ke Katalog/i }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Dark mode theme toggle updates container styling classes", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  const themeToggle = page.getByTitle(/toggle dark \/ light theme/i);
  await expect(themeToggle).toBeVisible();

  // Toggle to dark mode
  await themeToggle.click();
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

  // Toggle back to light mode
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Visual Inspector in Playground allows inspection and node updates", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/playground");
  await expect(page.getByText("uidl-runtime JSON Schema Playground")).toBeVisible();

  // Open Inspector
  const inspectorBtn = page.getByRole("button", { name: /inspector/i });
  await inspectorBtn.click();
  await expect(page.getByText("Visual Inspector")).toBeVisible();
  await expect(page.getByText("Component Hierarchy Tree")).toBeVisible();

  // Select a node in the tree
  const textNodeBtn = page.getByRole("button", { name: /<Text>/i }).first();
  await textNodeBtn.click();
  await expect(page.getByText("Node ID & Type")).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("AI Builder in Playground synthesizes valid UIDL console from prompt", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/playground");

  // Open AI Builder modal
  await page.getByRole("button", { name: /AI Builder/i }).click();
  await expect(page.getByText("AI Console & Document Synthesizer")).toBeVisible();

  // Click quick prompt "Rental Mobil"
  await page.getByRole("button", { name: /Rental Mobil/i }).click();

  // Verify synthesized document is rendered in live preview
  await expect(page.getByTestId("live-preview").getByText("Innova Zenix Hybrid")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daftar Armada & Status Booking Aktif" })).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Language switcher toggle switches between Indonesian and English", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  const langToggle = page.getByTitle(/switch language/i);
  await expect(langToggle).toBeVisible();
  await expect(langToggle).toContainText("ID");

  // Switch to English
  await langToggle.click();
  await expect(langToggle).toContainText("EN");

  // Switch back to Indonesian
  await langToggle.click();
  await expect(langToggle).toContainText("ID");

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Print formats render SVG Barcode, QRCode, and DataMatrix properly", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  // 1. Faktur Pajak with DJP QR Code & Terbilang
  await page.goto("/meridian/print/tax-invoice/SalesInvoice/SINV-2027-00001");
  await expect(page.getByText("FAKTUR PAJAK", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/QR Code for https:\/\/efaktur\.pajak\.go\.id/i)).toBeVisible();
  await expect(page.getByText(/Terbilang:/i)).toBeVisible();

  // 2. CoA with DataMatrix UDI
  await page.goto("/meridian/print/certificate-of-analysis/medical-device/DHR-2027-B091");
  await expect(page.getByText("CERTIFICATE OF ANALYSIS (CoA)", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/UDI DataMatrix/i)).toBeVisible();

  // 3. Prescription with Patient Barcode
  await page.goto("/meridian/print/medical-prescription/hospital-medika/RM-2027-0412");
  await expect(page.getByText("SALINAN RESEP DOKTER (APOTEK)", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Barcode for RM-2027-0412/i)).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});

test("Generated console resets reference data via floating FAB tools menu", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/console/medical-device/dashboard");
  await expect(page).toHaveURL(/\/app\/medical-device\/quality-manufacturing$/);
  await expect(page.getByText("Quality Manufacturing").first()).toBeVisible();

  // Open Floating Tools Menu FAB
  const fabBtn = page.getByRole("button", { name: "Developer & Tools Menu" });
  await expect(fabBtn).toBeVisible();
  await fabBtn.click();

  // Verify menu items inside popup
  await expect(page.getByRole("button", { name: "Reset Reference Data" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Components Gallery" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Schema Playground" })).toBeVisible();

  // Click Reset Reference Data
  await page.getByRole("button", { name: "Reset Reference Data" }).click();
  await expect(page.getByText("Quality Manufacturing").first()).toBeVisible();

  expect(errors, errors.join("\n")).toEqual([]);
});
