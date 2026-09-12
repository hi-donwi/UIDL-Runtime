import { shoeCompanyDoctypes } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const shoeSalesSummaryRows = [
  { outlet: "Jakarta", revenue: "Rp 312.000.000", orders: 421, margin: "44.2%", returnRate: "0.7%" },
  { outlet: "Bandung", revenue: "Rp 218.000.000", orders: 317, margin: "41.8%", returnRate: "1.1%" },
  { outlet: "Surabaya", revenue: "Rp 184.000.000", orders: 281, margin: "40.4%", returnRate: "0.9%" },
  { outlet: "Online", revenue: "Rp 128.000.000", orders: 250, margin: "46.1%", returnRate: "1.4%" },
];

const retailOpsModule: ModuleSpec = {
  name: "retail-ops",
  label: { id: "Operasi Retail Sepatu", en: "Shoe Retail Operations" },
  iconName: "receipt-percent",
  doctypes: shoeCompanyDoctypes,
  workspace: {
    name: "retail-ops",
    label: { id: "Operasi Retail Sepatu", en: "Shoe Retail Operations" },
    module: "Retail",
    kpis: [
      { label: { id: "Net Sales Today", en: "Net Sales Today" }, value: "Rp 126.800.000", change: "+18%" },
      { label: { id: "Pesanan Aktif", en: "Active Orders" }, value: 184, change: "15 overdue" },
      { label: { id: "Nilai Persediaan", en: "Inventory Value" }, value: "Rp 1.48 M" },
      { label: { id: "Margin Kotor", en: "Gross Margin" }, value: "42.8%" },
    ],
    shortcuts: [
      {
        doctype: "POSInvoice",
        label: { id: "Kasir POS", en: "POS Register" },
        route: "/app/shoe-company/pos",
        description: { id: "Buka shift, layani penjualan, dan tutup shift secara langsung", en: "Open a shift, ring up sales, and close out — live" },
      },
      {
        doctype: "POSShift",
        label: { id: "Shift POS", en: "POS Shifts" },
        description: { id: "Buka, pantau, dan closing shift kasir", en: "Open, monitor, and close cashier shifts" },
      },
      {
        doctype: "POSInvoice",
        label: { id: "Invoice POS", en: "POS Invoices" },
        description: { id: "Invoice kasir dengan update stok dan pembayaran", en: "Cashier invoices with stock and payment flow" },
      },
      {
        doctype: "POSPayment",
        label: { id: "Pembayaran POS", en: "POS Payments" },
        description: { id: "Tender tunai, QRIS, kartu, dan e-wallet clearing", en: "Cash, QRIS, card, and e-wallet clearing" },
      },
      {
        doctype: "ShoeOrder",
        label: { id: "Pesanan Sepatu", en: "Shoe Orders" },
        description: { id: "Daftar pesanan dari kasir, online, dan invoice", en: "Orders from POS, online, and invoices" },
      },
      {
        doctype: "ShoeOrder",
        label: { id: "Buat Pesanan Baru", en: "Create Shoe Order" },
        route: "/app/shoe-company/edit/ShoeOrder/new",
        description: { id: "Input pesanan mock lewat generated form", en: "Capture mock orders through a generated form" },
      },
      {
        doctype: "ItemVariant",
        label: { id: "Varian Item", en: "Item Variants" },
        description: { id: "SKU ukuran, warna, barcode, harga jual, dan HPP", en: "SKU size, color, barcode, selling price, and cost" },
      },
      {
        doctype: "CashClosing",
        label: { id: "Closing Kas", en: "Cash Closing" },
        description: { id: "Rekonsiliasi kas fisik vs sistem per shift", en: "Counted cash versus expected cash per shift" },
      },
    ],
    charts: [
      {
        id: "outlet-sales",
        title: { id: "Omzet per Outlet", en: "Revenue by Outlet" },
        type: "bar",
        xKey: "outlet",
        yKey: "amount",
        dataSource: [
          { outlet: "Jakarta", amount: 312 },
          { outlet: "Bandung", amount: 218 },
          { outlet: "Surabaya", amount: 184 },
          { outlet: "Online", amount: 128 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "ShoeSalesSummary",
      label: { id: "Ringkasan Penjualan Sepatu", en: "Shoe Sales Summary" },
      columns: [
        { key: "outlet", label: { id: "Outlet", en: "Outlet" } },
        { key: "revenue", label: { id: "Omzet", en: "Revenue" }, align: "right" },
        { key: "orders", label: { id: "Pesanan", en: "Orders" }, align: "right" },
        { key: "margin", label: { id: "Margin", en: "Margin" }, align: "right" },
        { key: "returnRate", label: { id: "Retur", en: "Returns" }, align: "right" },
      ],
      filters: [
        {
          field: "outlet",
          label: { id: "Outlet", en: "Outlet" },
          widget: "Select",
          options: [
            { value: "Jakarta", label: "Jakarta" },
            { value: "Bandung", label: "Bandung" },
            { value: "Surabaya", label: "Surabaya" },
            { value: "Online", label: "Online" },
          ],
        },
      ],
      summaries: [
        { label: { id: "Omzet Bulan Ini", en: "Monthly Revenue" }, value: "Rp 842.000.000" },
        { label: { id: "Pesanan", en: "Orders" }, value: "1.269" },
        { label: { id: "Margin Rata-rata", en: "Average Margin" }, value: "42.8%" },
      ],
      dataSource: shoeSalesSummaryRows,
    },
  ],
};

/**
 * Toko Sepatu Nusantara — a multi-outlet retailer. The menu follows the way a shop works
 * through its day: sell at the counter, invoice what is not paid at the counter, take back what
 * comes back, then buy, move stock, and only then post and close.
 */
export const shoeCompany: CompanyDemo = {
  id: "shoe-company",
  company: "Toko Sepatu Nusantara",
  title: "Toko Sepatu Nusantara",
  subtitle: "Retail sepatu multi-outlet: POS, pembelian, stok ukuran/warna, AR/AP, PPN, dan rekonsiliasi kas harian.",
  source: "Meridian Desk + Dashboard + POS + ListView patterns",
  patterns: ["POS Closing", "Sales Invoice", "Purchase Invoice", "Stock Ledger", "General Ledger"],
  modules: [retailOpsModule],
  doctypes: shoeCompanyDoctypes,
  reports: retailOpsModule.reports,
  defaultModule: "retail-ops",
  nav: [
    {
      label: "Operasi Retail",
      items: [
        { label: "Workspace Retail", page: "dashboard", module: "retail-ops" },
        { label: "Shift POS", page: "pos-shift", doctype: "POSShift" },
        { label: "Invoice POS", page: "pos-invoice", doctype: "POSInvoice" },
        { label: "Pembayaran POS", page: "pos-payment", doctype: "POSPayment" },
        { label: "Closing Kas", page: "cash-closing", doctype: "CashClosing" },
        { label: "Pesanan Sepatu", page: "sales-invoice", doctype: "ShoeOrder" },
        { label: "Buat Pesanan", page: "new-shoe-order", path: "/app/shoe-company/edit/ShoeOrder/new", doctype: "ShoeOrder" },
        { label: "Varian Item", page: "item-variant", doctype: "ItemVariant" },
        { label: "Customer", page: "customer", doctype: "Customer" },
        { label: "Warehouse", page: "warehouse", doctype: "Warehouse" },
        { label: "Stock Ledger", page: "stock-ledger", doctype: "StockLedgerEntry" },
        { label: "GL Entry", page: "gl-entry", doctype: "GLEntry" },
        { label: "Ringkasan Penjualan", page: "sales-analytics", report: "ShoeSalesSummary" },
      ],
    },
  ],
  pages: {},
};
