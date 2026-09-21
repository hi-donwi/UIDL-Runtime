/**
 * Unified Mock Data Seed Generator.
 *
 * Generates deterministic, high-volume seed data for all 11 industry company consoles
 * and Meridian standard ERP using a seeded PRNG (`mulberry32`).
 *
 * Guarantees:
 *   1. Byte-identical reproduction across identical seed calls
 *   2. ≥ 60 realistic records for primary transactional collections per tenant
 *   3. Automatically backfilled and verified double-entry General Ledger postings
 */

import { createPrng } from "./prng";
import { DEMO_DEFAULT_SEED, DEMO_TODAY } from "./constants";
import { backfillLedgerFromInvoices } from "./generators/postingBackfill";
import { buildHospitalClaimCycle } from "./generators/hospitalClaimCycle";
import { enrichHelpdeskSlaTimeline } from "./generators/helpdeskSlaTimeline";
import { buildKoperasiInstallmentLedger } from "./generators/koperasiInstallmentLedger";
import { buildMeridianPosShifts } from "./generators/meridianPosShifts";
import { buildMeridianInvoicePayments } from "./generators/meridianInvoicePayments";
import { buildMeridianStockLedger } from "./generators/meridianStockLedger";
import { buildMeridianPurchaseCycle } from "./generators/meridianPurchaseCycle";
import { buildMeridianJournalEntries } from "./generators/meridianJournalEntries";

export interface UnifiedSeedData {
  [collection: string]: Array<Record<string, unknown>>;
}

const CUSTOMER_NAMES = [
  "PT Sinar Jaya Abadi",
  "CV Makmur Sentosa",
  "PT Nusantara Medika",
  "Toko Berkah Bersama",
  "PT Prima Konstruksi",
  "Klinik Sehat Sejahtera",
  "UD Sumber Rejeki",
  "PT Mega Distribusi",
  "Koperasi Bina Mandiri",
  "PT Global Indo Perkasa",
  "CV Citra Mandiri",
  "PT Indo Tech Solusi",
  "RS Bethesda Prima",
  "Apotek Sehat Bersama",
  "PT Graha Karya",
];

const SUPPLIER_NAMES = [
  "PT Mitra Bahari Supply",
  "CV Anugerah Material",
  "PT Global Packaging Indo",
  "PT Farma Bahan Medika",
  "PT Sumber Kimia Murni",
  "CV Logistik Cepat",
  "PT Baja Prima Utama",
  "PT Kopi Tani Nusantara",
  "PT Tekstil Rapi Indo",
  "CV Paperindo Sejati",
];

const SHOE_PRODUCTS = [
  { name: "Sneaker Aero Lite", sku: "SHOE-SNK-01", price: 450000, category: "Sneakers" },
  { name: "Sepatu Formal Oxford", sku: "SHOE-OXF-02", price: 750000, category: "Formal" },
  { name: "Running Shoes Velocity", sku: "SHOE-RUN-03", price: 620000, category: "Sport" },
  { name: "Slip-on Casual Loafer", sku: "SHOE-SLP-04", price: 380000, category: "Casual" },
  { name: "Safety Boot Pro Guard", sku: "SHOE-SFT-05", price: 890000, category: "Safety" },
  { name: "High Heels Velvet Noir", sku: "SHOE-HEL-06", price: 540000, category: "Formal" },
  { name: "Sandal Trail Adventure", sku: "SHOE-SND-07", price: 280000, category: "Outdoor" },
  { name: "Kids Light Speed", sku: "SHOE-KID-08", price: 320000, category: "Kids" },
];

const COFFEE_LOTS = [
  { lot: "LOT-GAYO-01", origin: "Aceh Gayo Wet Hulled", grade: "Grade 1", bagQty: 120 },
  { lot: "LOT-TORA-02", origin: "Toraja Sapan Washed", grade: "Specialty", bagQty: 80 },
  { lot: "LOT-IJEN-03", origin: "Ijen Anaerobic Natural", grade: "Micro-lot", bagQty: 45 },
  { lot: "LOT-KINT-04", origin: "Kintamani Honey Process", grade: "Grade 1", bagQty: 90 },
  { lot: "LOT-FLOR-05", origin: "Bajawa Flores Washed", grade: "Specialty", bagQty: 60 },
];

/**
 * Creates a complete deterministic seed dataset.
 */
export function createSeed(seedNumber: number = DEMO_DEFAULT_SEED): UnifiedSeedData {
  const prng = createPrng(seedNumber);
  const data: UnifiedSeedData = {};

  // -------------------------------------------------------------
  // 1. Meridian Trading Co. (Meridian Core ERP)
  // -------------------------------------------------------------
  const customerNameById = new Map([
    ["CUST-001", "PT Surya Jaya Abadi"],
    ["CUST-002", "CV Mitra Usaha"],
    ["CUST-003", "PT Pelita Mandiri"],
    ["CUST-004", "Toko Sinar Gemilang"],
    ["CUST-005", "CV Bintang Mandiri"],
    ["CUST-006", "PT Sukses Makmur"],
    ["CUST-007", "Toko Aneka Baru"],
    ["CUST-008", "CV Prima Sentosa"],
  ]);

  const meridianInvoices: Array<Record<string, unknown>> = [
    {
      id: "SINV-2027-00001",
      customer: "CUST-001",
      customerName: "PT Surya Jaya Abadi",
      date: "2027-07-02",
      dueDate: "2027-08-01",
      status: "Paid",
      total: 30750000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00001",
    },
    {
      id: "SINV-2027-00002",
      customer: "CUST-002",
      customerName: "CV Mitra Usaha",
      date: "2027-07-05",
      dueDate: "2027-08-04",
      status: "Paid",
      total: 8600000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00002",
    },
    {
      id: "SINV-2027-00003",
      customer: "CUST-003",
      customerName: "PT Pelita Mandiri",
      date: "2027-07-09",
      dueDate: "2027-08-08",
      status: "Unpaid",
      total: 1750000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00003",
    },
    {
      id: "SINV-2027-00004",
      customer: "CUST-004",
      customerName: "Toko Sinar Gemilang",
      date: "2027-07-12",
      dueDate: "2027-08-11",
      status: "Overdue",
      total: 42500000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00004",
    },
    {
      id: "SINV-2027-00005",
      customer: "CUST-005",
      customerName: "CV Bintang Mandiri",
      date: "2027-07-15",
      dueDate: "2027-08-14",
      status: "Paid",
      total: 2400000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00005",
    },
    {
      id: "SINV-2027-00006",
      customer: "CUST-006",
      customerName: "PT Sukses Makmur",
      date: "2027-07-18",
      dueDate: "2027-08-17",
      status: "Unpaid",
      total: 14360000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00006",
    },
    {
      id: "SINV-2027-00007",
      customer: "CUST-007",
      customerName: "Toko Aneka Baru",
      date: "2027-07-21",
      dueDate: "2027-08-20",
      status: "Overdue",
      total: 9500000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00007",
    },
    {
      id: "SINV-2027-00008",
      customer: "CUST-008",
      customerName: "CV Prima Sentosa",
      date: "2027-07-24",
      dueDate: "2027-08-23",
      status: "Paid",
      total: 1185000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00008",
    },
    {
      id: "SINV-2027-00009",
      customer: "CUST-001",
      customerName: "PT Surya Jaya Abadi",
      date: "2027-07-27",
      dueDate: "2027-08-26",
      status: "Unpaid",
      total: 2900000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00009",
    },
    {
      id: "SINV-2027-00010",
      customer: "CUST-003",
      customerName: "PT Pelita Mandiri",
      date: "2027-07-30",
      dueDate: "2027-08-29",
      status: "Draft",
      total: 8500000,
      isTaxable: true,
      route: "/meridian/edit/SalesInvoice/SINV-2027-00010",
    },
  ];

  for (let i = 11; i <= 65; i++) {
    const id = `SINV-2027-${String(i).padStart(5, "0")}`;
    const custKey = prng.choice(["CUST-001", "CUST-002", "CUST-003", "CUST-004", "CUST-005", "CUST-006", "CUST-007", "CUST-008"]);
    const customer = custKey;
    const customerName = customerNameById.get(custKey) ?? custKey;
    const date = prng.dateBetween("2026-06-01", DEMO_TODAY);
    const status = prng.choice(["Draft", "Unpaid", "Paid", "Paid", "Overdue"]);
    const qty = prng.nextInt(1, 10);
    const rate = prng.nextInt(5, 50) * 100000;
    const total = qty * rate;

    meridianInvoices.push({
      id,
      customer,
      customerName,
      date,
      dueDate: prng.dateBetween(date, "2026-09-30"),
      status,
      total,
      isTaxable: true,
      route: `/meridian/edit/SalesInvoice/${id}`,
    });
  }
  data["SalesInvoice"] = meridianInvoices;

  const meridianCustomers: Array<Record<string, unknown>> = CUSTOMER_NAMES.map((name, idx) => ({
    id: `CUST-${String(idx + 1).padStart(3, "0")}`,
    name,
    customerGroup: idx % 3 === 0 ? "Corporate" : "Retail",
    territory: "Indonesia",
    email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    phone: `081${prng.nextInt(10000000, 99999999)}`,
    route: `/app/meridian/edit/Customer/CUST-${String(idx + 1).padStart(3, "0")}`,
  }));
  data["Customer"] = meridianCustomers;

  const meridianSuppliers: Array<Record<string, unknown>> = SUPPLIER_NAMES.map((name, idx) => ({
    id: `SUPP-${String(idx + 1).padStart(3, "0")}`,
    name,
    supplierGroup: "Bahan Baku & Jasa",
    email: `sales@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.co.id`,
    phone: `021-${prng.nextInt(5000000, 8999999)}`,
    route: `/app/meridian/edit/Supplier/SUPP-${String(idx + 1).padStart(3, "0")}`,
  }));
  data["Supplier"] = meridianSuppliers;

  // -------------------------------------------------------------
  // 2. Toko Sepatu Nusantara (shoe-company)
  // -------------------------------------------------------------
  const shoeOrders: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `ORD-SHOE-${String(i).padStart(4, "0")}`;
    const product = prng.choice(SHOE_PRODUCTS);
    const qty = prng.nextInt(1, 6);
    const total = qty * product.price;
    const date = prng.dateBetween("2026-06-01", DEMO_TODAY);
    const status = prng.choice(["Draft", "Selesai", "Selesai", "Dikirim", "Batal"]);

    shoeOrders.push({
      id,
      customerName: prng.choice(CUSTOMER_NAMES),
      productName: product.name,
      sku: product.sku,
      category: product.category,
      quantity: qty,
      unitPrice: product.price,
      total,
      date,
      status,
      route: `/app/shoe-company/edit/ShoeOrder/${id}`,
    });
  }
  data["shoe_orders"] = shoeOrders;
  data["ShoeOrder"] = shoeOrders;

  const shoeCustomers = CUSTOMER_NAMES.slice(0, 12).map((name, idx) => ({
    id: `CUST-SHOE-${String(idx + 1).padStart(3, "0")}`,
    companyId: "shoe-company",
    customerName: name,
    phone: `08${prng.nextInt(1100000000, 8899999999)}`,
    email: `shoe.${idx + 1}@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.co.id`,
    segment: prng.choice(["Walk-in", "Member", "Marketplace", "Corporate"]),
    creditLimit: idx % 4 === 0 ? 25000000 : 0,
    status: "Active",
    route: `/app/shoe-company/edit/Customer/CUST-SHOE-${String(idx + 1).padStart(3, "0")}`,
  }));
  data["Customer"] = [...(data["Customer"] ?? []), ...shoeCustomers];

  const shoeWarehouses = [
    { id: "WH-SHOE-JKT", warehouseName: "Outlet Jakarta", outlet: "Jakarta", warehouseType: "Store", isDefault: true },
    { id: "WH-SHOE-BDG", warehouseName: "Outlet Bandung", outlet: "Bandung", warehouseType: "Store", isDefault: true },
    { id: "WH-SHOE-SBY", warehouseName: "Outlet Surabaya", outlet: "Surabaya", warehouseType: "Store", isDefault: true },
    { id: "WH-SHOE-ONL", warehouseName: "Gudang Online", outlet: "Online", warehouseType: "Store", isDefault: true },
    { id: "WH-SHOE-RET", warehouseName: "Gudang Retur & QC", outlet: "Jakarta", warehouseType: "Return", isDefault: false },
  ].map((warehouse) => ({
    ...warehouse,
    companyId: "shoe-company",
    status: "Active",
    route: `/app/shoe-company/edit/Warehouse/${warehouse.id}`,
  }));
  data["Warehouse"] = shoeWarehouses;

  const itemVariants = SHOE_PRODUCTS.map((product, idx) => {
    const size = String([38, 39, 40, 41, 42, 43, 44, 32][idx % 8]);
    const color = ["Black", "Tan", "White", "Navy", "Brown", "Maroon", "Olive", "Pink"][idx % 8];
    const stock = prng.nextInt(35, 160);
    return {
      id: product.sku,
      companyId: "shoe-company",
      itemName: product.name,
      category: product.category,
      size,
      color,
      barcode: `899${String(202608220000 + idx).padStart(12, "0")}`,
      unitPrice: product.price,
      standardCost: Math.round(product.price * 0.58),
      stock,
      status: "Active",
      route: `/app/shoe-company/edit/ItemVariant/${product.sku}`,
    };
  });
  data["ItemVariant"] = itemVariants;
  data["shoe_products"] = itemVariants.map((item) => ({
    id: item.id,
    name: item.itemName,
    sku: item.id,
    price: item.unitPrice,
    category: item.category,
    stock: item.stock,
    route: `/app/shoe-company/edit/ShoeProduct/${item.id}`,
  }));

  const shiftOutlets = ["Jakarta", "Bandung", "Surabaya", "Online"];
  const posShifts: Array<Record<string, unknown>> = shiftOutlets.map((outlet, idx) => ({
    id: `SHIFT-SHOE-2026-08-${String(idx + 1).padStart(2, "0")}`,
    companyId: "shoe-company",
    cashier: ["Rani", "Bima", "Sinta", "Dewi"][idx],
    outlet,
    openedAt: "2026-08-24",
    closedAt: idx < 3 ? "2026-08-24" : "",
    openingFloat: 1000000 + idx * 250000,
    expectedCash: 0,
    countedCash: 0,
    variance: 0,
    status: idx < 3 ? "Closed" : "Open",
    route: `/app/shoe-company/edit/POSShift/SHIFT-SHOE-2026-08-${String(idx + 1).padStart(2, "0")}`,
  }));

  const posInvoices = shoeOrders.slice(0, 28).map((order, idx) => {
    const shift = posShifts[idx % posShifts.length];
    const customer = shoeCustomers[idx % shoeCustomers.length];
    const product = itemVariants.find((item) => item.id === order.sku) ?? itemVariants[0];
    const grandTotal = Number(order.total ?? 0);
    const subtotal = Math.round(grandTotal / 1.11);
    const tax = grandTotal - subtotal;
    const status = idx % 11 === 0 ? "Held" : idx % 7 === 0 ? "Submitted" : "Paid";
    const id = `POS-INV-2026-${String(idx + 1).padStart(4, "0")}`;
    const quantity = Number(order.quantity ?? 1);
    const cogs = Math.round(Number(product.standardCost ?? 0) * quantity);
    return {
      id,
      companyId: "shoe-company",
      shiftId: shift.id,
      customerName: customer.id,
      outlet: shift.outlet,
      postingDate: order.date,
      subtotal,
      discount: 0,
      tax,
      grandTotal,
      total: grandTotal,
      productSku: product.id,
      quantity,
      cogs,
      updateStock: true,
      status,
      route: `/app/shoe-company/edit/POSInvoice/${id}`,
    };
  });
  data["POSInvoice"] = posInvoices;

  const paidInvoices = posInvoices.filter((invoice) => invoice.status === "Paid");
  const tenderTypes = ["Cash", "QRIS", "Card", "E-Wallet"];
  const posPayments = paidInvoices.map((invoice, idx) => {
    const tenderType = tenderTypes[idx % tenderTypes.length];
    const id = `PAY-POS-2026-${String(idx + 1).padStart(4, "0")}`;
    return {
      id,
      companyId: "shoe-company",
      invoiceId: invoice.id,
      shiftId: invoice.shiftId,
      tenderType,
      amount: invoice.grandTotal,
      referenceNo: tenderType === "Cash" ? "" : `REF-${id}`,
      clearingAccount: tenderType === "Cash" ? "1110 - Kas Laci" : "1125 - EDC/QRIS/E-Wallet Clearing",
      status: "Settled",
      route: `/app/shoe-company/edit/POSPayment/${id}`,
    };
  });
  data["POSPayment"] = posPayments;

  const stockLedgerEntries = posInvoices
    .filter((invoice) => invoice.status !== "Held")
    .map((invoice, idx) => {
      const warehouse = shoeWarehouses.find((entry) => entry.outlet === invoice.outlet) ?? shoeWarehouses[0];
      const cogs = Number(invoice.cogs ?? 0);
      const quantity = Number(invoice.quantity ?? 1);
      const id = `SLE-SHOE-2026-${String(idx + 1).padStart(4, "0")}`;
      return {
        id,
        companyId: "shoe-company",
        itemVariant: invoice.productSku,
        warehouse: warehouse.id,
        postingDate: invoice.postingDate,
        voucherType: "POSInvoice",
        voucherNo: invoice.id,
        actualQty: -quantity,
        qtyAfterTransaction: Math.max(0, 120 - idx * 2 - quantity),
        valuationRate: quantity > 0 ? Math.round(cogs / quantity) : 0,
        stockValue: -cogs,
        status: "Posted",
        route: `/app/shoe-company/edit/StockLedgerEntry/${id}`,
      };
    });
  data["StockLedgerEntry"] = stockLedgerEntries;

  let glSequence = 1;
  const glEntries = posInvoices
    .filter((invoice) => invoice.status !== "Held")
    .flatMap((invoice) => {
      const subtotal = Number(invoice.subtotal ?? 0);
      const tax = Number(invoice.tax ?? 0);
      const total = Number(invoice.grandTotal ?? 0);
      const cogs = Number(invoice.cogs ?? 0);
      const lines = [
        { account: "1115 - POS Tender Clearing", debit: total, credit: 0 },
        { account: "4110 - Pendapatan Penjualan Sepatu", debit: 0, credit: subtotal },
        { account: "2140 - Hutang PPN Keluaran", debit: 0, credit: tax },
        { account: "5110 - Harga Pokok Penjualan", debit: cogs, credit: 0 },
        { account: "1150 - Persediaan Sepatu", debit: 0, credit: cogs },
      ];
      return lines.map((line) => {
        const id = `GLE-SHOE-2026-${String(glSequence++).padStart(5, "0")}`;
        return {
          id,
          companyId: "shoe-company",
          postingDate: invoice.postingDate,
          account: line.account,
          party: invoice.customerName,
          voucherType: "POSInvoice",
          voucherNo: invoice.id,
          debit: line.debit,
          credit: line.credit,
          status: "Posted",
          route: `/app/shoe-company/edit/GLEntry/${id}`,
        };
      });
    });
  data["GLEntry"] = glEntries;

  const cashClosings = posShifts.map((shift, idx) => {
    const shiftId = String(shift.id);
    const cashTotal = posPayments
      .filter((payment) => payment.shiftId === shiftId && payment.tenderType === "Cash")
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const qrisTotal = posPayments
      .filter((payment) => payment.shiftId === shiftId && payment.tenderType === "QRIS")
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    const expectedCash = Number(shift.openingFloat ?? 0) + cashTotal;
    const variance = idx === 1 ? -50000 : 0;
    shift.expectedCash = expectedCash;
    shift.countedCash = expectedCash + variance;
    shift.variance = variance;
    shift.expectedQRIS = qrisTotal;
    shift.countedQRIS = qrisTotal;
    shift.qrisVariance = 0;
    const id = `CLOSE-SHOE-2026-${String(idx + 1).padStart(4, "0")}`;
    return {
      id,
      companyId: "shoe-company",
      shiftId,
      cashier: shift.cashier,
      expectedCash,
      countedCash: expectedCash + variance,
      variance,
      expectedQRIS: qrisTotal,
      countedQRIS: qrisTotal,
      qrisVariance: 0,
      supervisor: idx < 3 ? "Supervisor Retail" : "",
      reason: variance === 0 ? "" : "Selisih kas kecil saat closing shift",
      status: idx < 3 ? "Approved" : "Submitted",
      route: `/app/shoe-company/edit/CashClosing/${id}`,
    };
  });
  data["POSShift"] = posShifts;
  data["CashClosing"] = cashClosings;

  // -------------------------------------------------------------
  // 3. Sekolah ABC (school-abc)
  // -------------------------------------------------------------
  const tuitionFees: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `SPP-2026-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-07-01", DEMO_TODAY);
    const status = prng.choice(["Lunas", "Lunas", "Belum Bayar", "Jatuh Tempo"]);
    const grade = prng.choice(["Kelas 10 IPA 1", "Kelas 10 IPS 2", "Kelas 11 IPA 3", "Kelas 12 IPA 1"]);
    const total = 1500000;

    tuitionFees.push({
      id,
      companyId: "school-abc",
      studentName: `Siswa ${i}`,
      studentId: `NIS-${2024000 + i}`,
      grade,
      month: "Agustus 2026",
      date,
      dueDate: "2026-08-10",
      status,
      total,
      paidAmount: status === "Lunas" ? total : 0,
      outstandingAmount: status === "Lunas" ? 0 : total,
      batchId: "SCH-FEE-BATCH-2026-SEED",
      dunningCount: status === "Jatuh Tempo" ? 1 : 0,
      route: `/app/school-abc/edit/TuitionFee/${id}`,
    });
  }
  data["tuition_fees"] = tuitionFees;
  data["TuitionFee"] = tuitionFees;

  // -------------------------------------------------------------
  // 4. Pabrik ABC (factory-abc)
  // -------------------------------------------------------------
  const workOrders: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `WO-2026-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-06-15", DEMO_TODAY);
    const status = prng.choice(["Draft", "In Progress", "Completed", "Completed", "Quality Check"]);
    const targetQty = prng.nextInt(100, 1000);
    const completedQty = status === "Completed" ? targetQty : prng.nextInt(0, targetQty);
    const plannedMaterialCost = targetQty * prng.nextInt(18000, 24000);
    const plannedLaborCost = targetQty * prng.nextInt(9000, 14000);
    const plannedOverheadCost = targetQty * prng.nextInt(5000, 9000);
    const plannedCost = plannedMaterialCost + plannedLaborCost + plannedOverheadCost;
    const actualCost = status === "Completed" ? Math.round(plannedCost * (0.96 + prng.next() * 0.08)) : 0;

    workOrders.push({
      id,
      companyId: "factory-abc",
      productName: prng.choice(["Bearing Presisi High-Temp", "Shaft Rotor CNC", "Flange Valve Baja"]),
      bomCode: `BOM-${prng.nextInt(101, 108)}`,
      targetQty,
      completedQty,
      rejectedQty: status === "Quality Check" ? prng.nextInt(1, 12) : 0,
      workstation: prng.choice(["Mesin Bubut CNC-1", "Mesin Milling 5-Axis", "Stasiun Assembly A"]),
      startDate: date,
      plannedMaterialCost,
      plannedLaborCost,
      plannedOverheadCost,
      plannedCost,
      actualCost,
      variance: actualCost === 0 ? 0 : actualCost - plannedCost,
      qcStatus: status === "Quality Check" ? "Pending" : status === "Completed" ? "Passed" : "",
      status,
      route: `/app/factory-abc/edit/WorkOrder/${id}`,
    });
  }
  data["work_orders"] = workOrders;
  data["WorkOrder"] = workOrders;

  // -------------------------------------------------------------
  // 5. Food & Coffee Roasters (food-roasters)
  // -------------------------------------------------------------
  const roastingBatches: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `ROAST-${String(i).padStart(4, "0")}`;
    const lot = prng.choice(COFFEE_LOTS);
    const date = prng.dateBetween("2026-06-01", DEMO_TODAY);
    const status = prng.choice(["Scheduled", "Roasting", "Cupping Passed", "Cupping Passed", "Packaged"]);
    const greenWeight = prng.nextInt(10, 30);
    const roastedWeight = Number((greenWeight * (1 - prng.nextInt(13, 16) / 100)).toFixed(2));
    const cuppingScore = Number((82 + prng.next() * 6).toFixed(1));
    const greenCost = greenWeight * prng.nextInt(58000, 105000);
    const energyCost = status === "Scheduled" ? 0 : prng.nextInt(15000, 90000);
    const batchCost = greenCost + energyCost;
    const roastLossPct = Number((((greenWeight - roastedWeight) / greenWeight) * 100).toFixed(1));
    const qcStatus = cuppingScore >= 84 ? "Passed" : "Hold";
    const packagedWeightKg = status === "Packaged" ? Number((Math.floor(roastedWeight * 4) / 4).toFixed(2)) : 0;
    const bagSizeGrams = prng.choice([250, 500, 1000]);
    const bagCount = packagedWeightKg > 0 ? Math.floor((packagedWeightKg * 1000) / bagSizeGrams) : 0;
    const grossMargin = status === "Packaged" ? Math.round(batchCost * (0.32 + prng.next() * 0.24)) : 0;

    roastingBatches.push({
      id,
      companyId: "food-roasters",
      contractId: `GB-CON-2026-${String(prng.nextInt(1, 18)).padStart(4, "0")}`,
      roastDate: date,
      lotCode: lot.lot,
      origin: lot.origin,
      profile: prng.choice(["Medium Filter", "Light Roast Omni", "Medium-Dark Espresso"]),
      greenWeightKg: greenWeight,
      roastedWeightKg: roastedWeight,
      greenCost,
      energyCost,
      batchCost,
      roastLossPct,
      cuppingScore,
      qcStatus,
      moisturePct: Number((10 + prng.next() * 2).toFixed(1)),
      agtron: prng.nextInt(54, 68),
      packagingId: status === "Packaged" ? `ROAST-PACK-2026-${String(i).padStart(4, "0")}` : "",
      sku: status === "Packaged" ? prng.choice(["GAYO-250-BEAN", "TORAJA-250-GRND", "DAMPIT-1000-BEAN"]) : "",
      bagCount,
      bagSizeGrams: status === "Packaged" ? bagSizeGrams : 0,
      packagedWeightKg,
      saleId: grossMargin > 0 ? `ROAST-SALE-2026-${String(i).padStart(4, "0")}` : "",
      grossMargin,
      status,
      roasterOperator: prng.choice(["Budi Roaster", "Eko Q-Grader", "Rian Roaster"]),
      route: `/app/food-roasters/edit/RoastingBatch/${id}`,
    });
  }
  data["roasting_batches"] = roastingBatches;
  data["RoastingBatch"] = roastingBatches;

  // -------------------------------------------------------------
  // 6. EPC Contractor (epc-contractor)
  // -------------------------------------------------------------
  const projectMilestones: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `MLS-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-05-01", DEMO_TODAY);
    const progress = prng.nextInt(20, 100);
    const status =
      progress > 96 ? "Verified BAST" : progress > 88 ? "Billed" : progress > 72 ? "Certified PoC" : progress > 60 ? "On Schedule" : "In Progress";
    const value = prng.nextInt(50, 500) * 1000000;
    const estimatedCost = Math.round(value * (0.72 + prng.next() * 0.14));
    const costIncurred = Math.round(estimatedCost * (progress / 100));
    const certifiedProgress = status === "Certified PoC" || status === "Billed" ? progress : 0;
    const revenueRecognized = Math.round(value * (certifiedProgress / 100));
    const retentionAmount = status === "Billed" ? Math.round(revenueRecognized * 0.05) : 0;

    projectMilestones.push({
      id,
      companyId: "epc-contractor",
      projectCode: `PRJ-EPC-${prng.nextInt(101, 105)}`,
      projectName: prng.choice([
        "Pembangunan Gardu Induk 150kV",
        "Pemasangan Piping Kilang Fase 2",
        "Sistem Pengolahan Air Limbah Pabrik",
      ]),
      milestoneName: `Termin Pembayaran ${prng.nextInt(1, 5)}`,
      weightPercentage: prng.nextInt(10, 30),
      actualProgress: progress,
      certifiedProgress,
      contractValue: value,
      estimatedCost,
      costIncurred,
      revenueRecognized,
      margin: revenueRecognized - costIncurred,
      billingId: status === "Billed" ? `EPC-PB-2026-${String(i).padStart(4, "0")}` : "",
      retentionAmount,
      netBillable: revenueRecognized - retentionAmount,
      bastNo: status === "Verified BAST" ? `BAST-EPC-2026-${String(i).padStart(4, "0")}` : "",
      date,
      status,
      route: `/app/epc-contractor/edit/ProjectMilestone/${id}`,
    });
  }
  data["project_milestones"] = projectMilestones;
  data["ProjectMilestone"] = projectMilestones;

  // -------------------------------------------------------------
  // 7. CRM Pipeline (crm-pipeline)
  // -------------------------------------------------------------
  const opportunities: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `OPP-${String(i).padStart(4, "0")}`;
    const customer = prng.choice(CUSTOMER_NAMES);
    const date = prng.dateBetween("2026-06-01", DEMO_TODAY);
    const stage = prng.choice(["Lead Baru", "Kualifikasi", "Proposal", "Negosiasi", "Won", "Won", "Lost"]);
    const dealValue = prng.nextInt(15, 250) * 1000000;
    const probability = stage === "Won" ? 100 : stage === "Negosiasi" ? 75 : stage === "Proposal" ? 55 : stage === "Kualifikasi" ? 35 : stage === "Lost" ? 0 : 20;

    opportunities.push({
      id,
      companyId: "crm-pipeline",
      title: `Pengadaan Lisensi & Server - ${customer}`,
      customer,
      source: prng.choice(["Inbound Website", "Webinar ERP", "Referral Partner", "Outbound", "Marketplace"]),
      leadScore: prng.nextInt(45, 96),
      owner: prng.choice(["Sarah Sales", "Dimas Account Mgr", "Maya CRM"]),
      stage,
      dealValue,
      probability,
      weightedValue: Math.round(dealValue * (probability / 100)),
      expectedCloseDate: prng.dateBetween(date, "2026-10-31"),
      assignedAgent: prng.choice(["Sarah Sales", "Dimas Account Mgr", "Maya CRM"]),
      qualificationStatus: stage === "Lead Baru" ? "New" : stage === "Lost" ? "Disqualified" : "Qualified",
      forecastCategory: stage === "Won" ? "Closed Won" : stage === "Lost" ? "Omitted" : "Pipeline",
      createdAt: `${date}T09:00:00+07:00`,
      route: `/app/crm-pipeline/edit/Opportunity/${id}`,
    });
  }
  data["crm_opportunities"] = opportunities;
  data["Opportunity"] = opportunities;

  // -------------------------------------------------------------
  // 8. Koperasi & BMT Syariah (koperasi-bmt)
  // -------------------------------------------------------------
  const murabahahAgreements: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `AKAD-MRB-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-05-01", DEMO_TODAY);
    const status = prng.choice(["Pengajuan", "Disetujui", "Aktif", "Aktif", "Lunas"]);
    const principal = prng.nextInt(5, 50) * 1000000;
    const marginRate = 0.12;
    const totalFinancing = Math.round(principal * (1 + marginRate));
    const tenorMonths = prng.choice([12, 24, 36]);
    const paidRatio = status === "Lunas" ? 1 : status === "Aktif" ? prng.next() * 0.55 : 0;
    const paidPrincipal = Math.round(principal * paidRatio);
    const paidMargin = Math.round((totalFinancing - principal) * paidRatio);
    const daysPastDue = status === "Aktif" ? prng.nextInt(0, 70) : 0;
    const collectibilityGrade = daysPastDue === 0 ? "1 - Lancar" : daysPastDue <= 30 ? "1 - Lancar" : "2 - Dalam Perhatian";

    murabahahAgreements.push({
      id,
      companyId: "koperasi-bmt",
      memberId: `ANGGOTA-${prng.nextInt(1001, 1050)}`,
      memberName: prng.choice(CUSTOMER_NAMES),
      goodsDescription: prng.choice(["Kendaraan Operasional Usaha", "Bahan Baku Toko Kelontong", "Alat Produksi Bakery"]),
      principalAmount: principal,
      marginAmount: totalFinancing - principal,
      totalFinancing,
      tenorMonths,
      monthlyInstallment: Math.round(totalFinancing / tenorMonths),
      outstandingPrincipal: principal - paidPrincipal,
      outstandingMargin: totalFinancing - principal - paidMargin,
      paidPrincipal,
      paidMargin,
      collectibilityGrade,
      daysPastDue,
      ckpnReserve: collectibilityGrade.startsWith("2") ? Math.round((principal - paidPrincipal) * 0.05) : Math.round((principal - paidPrincipal) * 0.01),
      startDate: date,
      status,
      route: `/app/koperasi-bmt/edit/MurabahahAgreement/${id}`,
    });
  }
  data["murabahah_financing"] = murabahahAgreements;
  data["MurabahahAgreement"] = murabahahAgreements;
  // Derive a per-installment due/payment ledger for disbursed agreements so
  // collectibility can be assessed from real ageing. No PRNG draws.
  data["MurabahahInstallmentSchedule"] = buildKoperasiInstallmentLedger(murabahahAgreements);

  // -------------------------------------------------------------
  // 9. RS Medika Nusantara (hospital-medika)
  // -------------------------------------------------------------
  const patientAdmissions: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `REG-MED-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-07-01", DEMO_TODAY);
    const status = prng.choice(["Menunggu Dokter", "Pemeriksaan", "Apotek Resep", "Selesai", "Rawat Inap"]);
    const patientName = prng.choice(CUSTOMER_NAMES).replace(/^PT |^CV |^UD /g, "");

    patientAdmissions.push({
      id,
      companyId: "hospital-medika",
      patientName: `Pasien ${patientName}`,
      medicalRecordNo: `RM-${prng.nextInt(100000, 999999)}`,
      queueNo: `${prng.choice(["PD", "AN", "JT"])}-${String(i).padStart(3, "0")}`,
      polyDepartment: prng.choice(["Poli Penyakit Dalam", "Poli Jantung", "Poli Anak", "Poli Bedah", "IGD"]),
      doctorName: prng.choice(["dr. Hendra Sp.PD", "dr. Anita Sp.JP", "dr. Budi Sp.A"]),
      icd10Code: status === "Selesai" ? prng.choice(["E11.9", "I10", "J06.9"]) : "",
      diagnosisText: status === "Selesai" ? "Diagnosis demo fiktif" : "",
      billAmount: status === "Selesai" ? prng.nextInt(250, 1600) * 1000 : 0,
      claimStatus: status === "Selesai" ? prng.choice(["Submitted", "Verified", "Paid"]) : "Pending",
      admissionDate: date,
      insuranceType: prng.choice(["BPJS Kesehatan", "Asuransi Swasta", "Mandiri / Umum"]),
      status,
      route: `/app/hospital-medika/edit/PatientAdmission/${id}`,
    });
  }
  data["patient_admissions"] = patientAdmissions;
  data["PatientAdmission"] = patientAdmissions;
  data["HospitalDrugBatch"] = [
    {
      id: "DRUG-BATCH-0001",
      companyId: "hospital-medika",
      drugCode: "AMOX500",
      drugName: "Amoxicillin 500mg Demo",
      expiryDate: "2026-10-31",
      stockQty: 100,
      unitCost: 15000,
      status: "Available",
    },
    {
      id: "DRUG-BATCH-0002",
      companyId: "hospital-medika",
      drugCode: "AMOX500",
      drugName: "Amoxicillin 500mg Demo",
      expiryDate: "2027-04-30",
      stockQty: 180,
      unitCost: 15000,
      status: "Available",
    },
  ];

  // Claim-cycle documents are derived from the completed admissions above with no
  // extra PRNG draws, so the seed stream for later tenants is unchanged.
  const hospitalClaimCycle = buildHospitalClaimCycle(patientAdmissions);
  data["HospitalPatientBill"] = hospitalClaimCycle.bills;
  data["HospitalInsuranceClaim"] = hospitalClaimCycle.claims;
  data["HospitalClaimPayment"] = hospitalClaimCycle.payments;
  data["HospitalClaimAdjustment"] = hospitalClaimCycle.adjustments;

  // -------------------------------------------------------------
  // 10. PT Medtech Precision (medical-device)
  // -------------------------------------------------------------
  const deviceMasterRecords = [
    {
      id: "DMR-MD-0001",
      companyId: "medical-device",
      deviceName: "Spuit Sekali Pakai 5ml Luer Lock Steril",
      riskClass: "Kelas IIa",
      udiDi: "08994567890123",
      revision: "Rev. 7",
      effectiveDate: "2026-01-15",
      status: "Effective",
    },
    {
      id: "DMR-MD-0002",
      companyId: "medical-device",
      deviceName: "Infusion Set 20 drops",
      riskClass: "Kelas IIb",
      udiDi: "08994567890147",
      revision: "Rev. 4",
      effectiveDate: "2026-02-10",
      status: "Effective",
    },
    {
      id: "DMR-MD-0003",
      companyId: "medical-device",
      deviceName: "Blood Bag Single 350ml",
      riskClass: "Kelas III",
      udiDi: "08994567890161",
      revision: "Rev. 2",
      effectiveDate: "2026-03-20",
      status: "Under Revision",
    },
  ];
  data["DeviceMasterRecord"] = deviceMasterRecords;

  const deviceBatches: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `LOT-MD-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-06-01", DEMO_TODAY);
    const status = prng.choice(["In Assembly", "Cleanroom Passed", "Sterilization Passed", "QA Released", "QA Released"]);
    const dmr = prng.choice(deviceMasterRecords);
    const dhrId = `DHR-MD-2026-${String(i).padStart(4, "0")}`;
    const udiCode = `(01)${dmr.udiDi}(10)${id}`;

    deviceBatches.push({
      id,
      companyId: "medical-device",
      dmrId: dmr.id,
      dhrId,
      deviceName: dmr.deviceName,
      riskClass: dmr.riskClass,
      batchQty: prng.nextInt(500, 5000),
      unitCost: prng.nextInt(6, 14) * 1000,
      udiCode,
      cleanroomClass: "Class 10,000 (ISO 7)",
      sterilizationMethod: "Ethylene Oxide (EtO)",
      cleanroomInspectionId: status !== "In Assembly" ? `CLN-MD-2026-${String(i).padStart(4, "0")}` : "",
      sterilizationCycleId: status === "Sterilization Passed" || status === "QA Released" ? `ETO-MD-2026-${String(i).padStart(4, "0")}` : "",
      qaReleaseId: status === "QA Released" ? `QA-MD-2026-${String(i).padStart(4, "0")}` : "",
      udiTraceId: status === "QA Released" ? `UDI-MD-2026-${String(i).padStart(4, "0")}` : "",
      qaHold: false,
      manufacturingDate: date,
      status,
      dhrApproved: status === "QA Released",
      route: `/app/medical-device/edit/DeviceBatch/${id}`,
    });
  }
  data["medical_device_batches"] = deviceBatches;
  data["DeviceBatch"] = deviceBatches;

  // -------------------------------------------------------------
  // 11. Nusantara Omnichannel (omnichannel-dist)
  // -------------------------------------------------------------
  const fulfillmentOrders: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `FUL-OMNI-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-07-15", DEMO_TODAY);
    const status = prng.choice(["Synced", "Wave Assigned", "Picking", "Packing", "Shipped", "Delivered"]);
    const channel = prng.choice(["TokoPrima Official", "Lapakku Mall", "LiveMarket", "B2B Direct"]);
    const grossAmount = prng.nextInt(125, 2400) * 1000;

    fulfillmentOrders.push({
      id,
      companyId: "omnichannel-dist",
      marketplaceOrderNo: `INV/${channel.slice(0, 3)}/${prng.nextInt(100000, 999999)}`,
      channel,
      customerName: prng.choice(CUSTOMER_NAMES),
      totalItems: prng.nextInt(1, 8),
      grossAmount,
      orderDate: date,
      courier: prng.choice(["KirimCepat", "ExpressOne Cargo", "PosNusa Reguler", "AntarKita"]),
      trackingNo: `RESI${prng.nextInt(100000000, 999999999)}`,
      warehouse: prng.choice(["Hub Jakarta", "Hub Surabaya", "Hub Medan"]),
      stockReserved: status !== "Synced",
      settlementStatus: status === "Delivered" ? "Settled" : "Pending",
      netSettlement: status === "Delivered" ? Math.round(grossAmount * 0.95) : 0,
      status,
      route: `/app/omnichannel-dist/edit/FulfillmentOrder/${id}`,
    });
  }
  data["fulfillment_orders"] = fulfillmentOrders;
  data["FulfillmentOrder"] = fulfillmentOrders;

  // -------------------------------------------------------------
  // 12. CloudDesk Support Center (helpdesk)
  // -------------------------------------------------------------
  const supportTickets: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 65; i++) {
    const id = `HD-TICK-${String(i).padStart(4, "0")}`;
    const date = prng.dateBetween("2026-07-01", DEMO_TODAY);
    const status = prng.choice(["New", "In Progress", "Waiting on Customer", "Resolved", "Resolved", "Closed"]);
    const priority = prng.choice(["Low", "Medium", "High", "Critical P1"]);

    supportTickets.push({
      id,
      companyId: "helpdesk",
      subject: prng.choice([
        "Gagal sinkronisasi data POS offline",
        "Permintaan penambahan user role Akuntan",
        "Pencetakan Faktur Pajak PPN QRIS error",
        "Slow response pada load modul Inventori",
      ]),
      customerName: prng.choice(CUSTOMER_NAMES),
      channel: prng.choice(["WhatsApp", "Portal", "Email", "API Hook"]),
      priority,
      assignedAgent: prng.choice(["Agus Helpdesk", "Rani Support L2", "Bima DevOps"]),
      slaDueMinutes: priority === "Critical P1" ? 60 : priority === "High" ? 240 : 1440,
      createdDate: date,
      createdAt: `${date}T08:00:00+07:00`,
      slaStatus: status === "Closed" || status === "Resolved" ? "Met" : "On Track",
      status,
      route: `/app/helpdesk/edit/SupportTicket/${id}`,
    });
  }
  // Enrich tickets with a deterministic SLA lifecycle timeline (first response,
  // pause windows, escalation, resolution) with no PRNG draws and no new rows.
  const supportTicketsWithSla = enrichHelpdeskSlaTimeline(supportTickets);
  data["support_tickets"] = supportTicketsWithSla;
  data["SupportTicket"] = supportTicketsWithSla;

  // -------------------------------------------------------------
  // Automatic General Ledger Posting Backfill
  // -------------------------------------------------------------
  // Meridian POS shift lifecycle (Meridian parity Slice 2) — deterministic, no PRNG draws.
  const meridianPos = buildMeridianPosShifts();
  data["POSOpeningShift"] = meridianPos.openingShifts;
  data["POSClosingShift"] = meridianPos.closingShifts;
  data["POSSalesInvoice"] = meridianPos.invoices;

  // Meridian payment backfill (Meridian parity Slice 6) — settles the seeded "Paid" invoices
  // so the AR subledger ties out to the ledger control account. No PRNG draws.
  const meridianPayments = buildMeridianInvoicePayments(meridianInvoices);
  data["Payment"] = meridianPayments.payments;

  // Meridian stock ledger + moving-average valuation (Meridian parity Slice 5). No PRNG draws.
  const meridianStock = buildMeridianStockLedger();
  data["MeridianItem"] = meridianStock.items;
  data["MeridianStockLedgerEntry"] = meridianStock.entries;

  // Meridian purchase cycle (Meridian parity — purchase side): Purchase Invoice ↔ GL ↔ AP.
  // "Paid" invoices carry a PurchasePayment relieving AP so payables tie out. No PRNG draws.
  const meridianPurchase = buildMeridianPurchaseCycle();
  data["PurchaseInvoice"] = meridianPurchase.invoices;
  data["PurchasePayment"] = meridianPurchase.payments;
  data["PurchaseReceipt"] = meridianPurchase.receipts;

  // Meridian ad-hoc Journal Entries (manual JE → GL). No PRNG draws.
  const meridianJournal = buildMeridianJournalEntries();
  data["JournalEntry"] = meridianJournal.entries;

  data["GeneralLedger"] = [
    ...backfillLedgerFromInvoices("meridian", meridianInvoices),
    ...backfillLedgerFromInvoices("shoe-company", shoeOrders),
    ...backfillLedgerFromInvoices("school-abc", tuitionFees),
    ...meridianPos.vouchers,
    ...meridianPayments.vouchers,
    ...meridianStock.vouchers,
    ...meridianPurchase.vouchers,
    ...meridianJournal.vouchers,
  ];

  return data;
}

/** Pre-generated default seed singleton */
export const seed: UnifiedSeedData = createSeed(DEMO_DEFAULT_SEED);
