import type { DoctypeMeta } from "../../domain/doctypes/types";

export const SHOE_ORDER_META: DoctypeMeta = {
  name: "ShoeOrder",
  label: { id: "Pesanan Sepatu", en: "Shoe Order" },
  module: "Penjualan & Kasir",
  naming: "ORD-SHOE-.YYYY.-.#####",
  titleField: "customerName",
  fields: [
    { key: "id", label: { id: "Nomor Pesanan", en: "Order No" }, widget: "TextField", readOnly: true },
    { key: "customerName", label: { id: "Nama Pelanggan", en: "Customer Name" }, widget: "TextField", required: true, section: "Pelanggan" },
    { key: "productName", label: { id: "Produk Sepatu", en: "Shoe Product" }, widget: "TextField", required: true, section: "Detail Item" },
    { key: "sku", label: { id: "SKU", en: "SKU" }, widget: "TextField", section: "Detail Item" },
    {
      key: "category",
      label: { id: "Kategori", en: "Category" },
      widget: "Select",
      section: "Detail Item",
      options: [
        { value: "Sneakers", label: "Sneakers" },
        { value: "Formal", label: "Formal" },
        { value: "Sport", label: "Sport" },
        { value: "Casual", label: "Casual" },
        { value: "Safety", label: "Safety" },
        { value: "Outdoor", label: "Outdoor" },
        { value: "Kids", label: "Kids" },
      ],
    },
    { key: "quantity", label: { id: "Jumlah Pasang", en: "Quantity" }, widget: "TextField", default: 1, section: "Detail Item" },
    { key: "unitPrice", label: { id: "Harga Satuan", en: "Unit Price" }, widget: "Currency", section: "Finansial" },
    { key: "total", label: { id: "Total Bayar", en: "Total Amount" }, widget: "Currency", required: true, section: "Finansial" },
    { key: "date", label: { id: "Tanggal Pesanan", en: "Order Date" }, widget: "Date", section: "Informasi Utama" },
    {
      key: "status",
      label: { id: "Status", en: "Status" },
      widget: "Select",
      section: "Informasi Utama",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Diproses", label: "Diproses" },
        { value: "Dikirim", label: "Dikirim" },
        { value: "Selesai", label: "Selesai" },
        { value: "Batal", label: "Batal" },
      ],
    },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "customerName" },
      { field: "productName" },
      { field: "quantity", align: "center", width: "w-24" },
      { field: "total", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [
      {
        field: "status",
        label: { id: "Status", en: "Status" },
        widget: "Select",
        options: [
          { value: "Draft", label: "Draft" },
          { value: "Diproses", label: "Diproses" },
          { value: "Dikirim", label: "Dikirim" },
          { value: "Selesai", label: "Selesai" },
          { value: "Batal", label: "Batal" },
        ],
      },
      {
        field: "category",
        label: { id: "Kategori", en: "Category" },
        widget: "Select",
        options: [
          { value: "Sneakers", label: "Sneakers" },
          { value: "Formal", label: "Formal" },
          { value: "Sport", label: "Sport" },
          { value: "Casual", label: "Casual" },
        ],
      },
    ],
    defaultSort: { field: "date", dir: "desc" },
    pageSize: 15,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Diproses", "Dikirim", "Selesai", "Batal"],
    initial: "Draft",
    transitions: [
      { name: "process", label: { id: "Proses Pesanan", en: "Process Order" }, from: ["Draft"], to: "Diproses" },
      { name: "ship", label: { id: "Kirim Sepatu", en: "Ship Order" }, from: ["Diproses"], to: "Dikirim" },
      { name: "complete", label: { id: "Selesaikan", en: "Complete Order" }, from: ["Dikirim"], to: "Selesai", posting: true },
      { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Draft", "Diproses"], to: "Batal" },
    ],
  },
  permissions: {
    "System Manager": { read: true, write: true, submit: true, delete: true },
    "Sales User": { read: true, write: true, submit: true, delete: false },
  },
};

const RETAIL_PERMISSIONS = {
  "System Manager": { read: true, write: true, submit: true, delete: true },
  "POS Manager": { read: true, write: true, submit: true, delete: false },
  "Sales User": { read: true, write: true, submit: true, delete: false },
};

export const POS_SHIFT_META: DoctypeMeta = {
  name: "POSShift",
  label: { id: "Shift POS", en: "POS Shift" },
  module: "Operasi Retail Sepatu",
  naming: "SHIFT-SHOE-.YYYY.-.#####",
  titleField: "cashier",
  fields: [
    { key: "id", label: { id: "Nomor Shift", en: "Shift No" }, widget: "TextField", readOnly: true },
    { key: "cashier", label: { id: "Kasir", en: "Cashier" }, widget: "TextField", required: true, section: "Shift" },
    { key: "outlet", label: { id: "Outlet", en: "Outlet" }, widget: "Select", required: true, section: "Shift", options: outletOptions() },
    { key: "openedAt", label: { id: "Dibuka", en: "Opened At" }, widget: "Date", section: "Shift" },
    { key: "closedAt", label: { id: "Ditutup", en: "Closed At" }, widget: "Date", section: "Shift" },
    { key: "openingFloat", label: { id: "Modal Kas", en: "Opening Float" }, widget: "Currency", section: "Kas" },
    { key: "expectedCash", label: { id: "Kas Sistem", en: "Expected Cash" }, widget: "Currency", section: "Kas" },
    { key: "countedCash", label: { id: "Kas Fisik", en: "Counted Cash" }, widget: "Currency", section: "Kas" },
    { key: "variance", label: { id: "Selisih Kas", en: "Cash Variance" }, widget: "Currency", section: "Kas" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Draft", "Open", "Closing", "Closed", "Cancelled"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "cashier" },
      { field: "outlet" },
      { field: "openingFloat", align: "right" },
      { field: "expectedCash", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "status", widget: "Select", options: statusOptions(["Draft", "Open", "Closing", "Closed", "Cancelled"]) }],
    defaultSort: { field: "openedAt", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Open", "Closing", "Closed", "Cancelled"],
    initial: "Draft",
    transitions: [
      { name: "open", label: { id: "Buka Shift", en: "Open Shift" }, from: ["Draft"], to: "Open" },
      { name: "startClose", label: { id: "Mulai Closing", en: "Start Closing" }, from: ["Open"], to: "Closing" },
      { name: "close", label: { id: "Tutup Shift", en: "Close Shift" }, from: ["Closing"], to: "Closed", posting: true },
      { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Draft", "Open"], to: "Cancelled" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const POS_INVOICE_META: DoctypeMeta = {
  name: "POSInvoice",
  label: { id: "Invoice POS", en: "POS Invoice" },
  module: "Operasi Retail Sepatu",
  naming: "POS-INV-.YYYY.-.#####",
  titleField: "customerName",
  fields: [
    { key: "id", label: { id: "Nomor Invoice", en: "Invoice No" }, widget: "TextField", readOnly: true },
    { key: "shiftId", label: { id: "Shift POS", en: "POS Shift" }, widget: "Link", options: { doctype: "POSShift" }, section: "Kasir" },
    { key: "customerName", label: { id: "Pelanggan", en: "Customer" }, widget: "Link", options: { doctype: "Customer" }, section: "Pelanggan" },
    { key: "outlet", label: { id: "Outlet", en: "Outlet" }, widget: "Select", section: "Kasir", options: outletOptions() },
    { key: "postingDate", label: { id: "Tanggal", en: "Posting Date" }, widget: "Date", section: "Kasir" },
    { key: "subtotal", label: { id: "Subtotal", en: "Subtotal" }, widget: "Currency", section: "Nilai" },
    { key: "discount", label: { id: "Diskon", en: "Discount" }, widget: "Currency", section: "Nilai" },
    { key: "tax", label: { id: "PPN", en: "Tax" }, widget: "Currency", section: "Nilai" },
    { key: "grandTotal", label: { id: "Grand Total", en: "Grand Total" }, widget: "Currency", required: true, section: "Nilai" },
    { key: "updateStock", label: { id: "Update Stok", en: "Update Stock" }, widget: "Checkbox", default: true, section: "Inventory" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Draft", "Held", "Submitted", "Paid", "Cancelled"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "customerName" },
      { field: "outlet" },
      { field: "grandTotal", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "status", widget: "Select", options: statusOptions(["Draft", "Held", "Submitted", "Paid", "Cancelled"]) }],
    defaultSort: { field: "postingDate", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Held", "Submitted", "Paid", "Cancelled"],
    initial: "Draft",
    transitions: [
      { name: "hold", label: { id: "Simpan Hold", en: "Hold" }, from: ["Draft"], to: "Held" },
      { name: "submit", label: { id: "Submit Invoice", en: "Submit Invoice" }, from: ["Draft", "Held"], to: "Submitted", posting: true },
      { name: "markPaid", label: { id: "Tandai Lunas", en: "Mark Paid" }, from: ["Submitted"], to: "Paid" },
      { name: "cancel", label: { id: "Batalkan", en: "Cancel" }, from: ["Draft", "Held"], to: "Cancelled" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const POS_PAYMENT_META: DoctypeMeta = {
  name: "POSPayment",
  label: { id: "Pembayaran POS", en: "POS Payment" },
  module: "Operasi Retail Sepatu",
  naming: "PAY-POS-.YYYY.-.#####",
  titleField: "invoiceId",
  fields: [
    { key: "id", label: { id: "Nomor Pembayaran", en: "Payment No" }, widget: "TextField", readOnly: true },
    { key: "invoiceId", label: { id: "Invoice POS", en: "POS Invoice" }, widget: "Link", options: { doctype: "POSInvoice" }, required: true, section: "Referensi" },
    { key: "shiftId", label: { id: "Shift POS", en: "POS Shift" }, widget: "Link", options: { doctype: "POSShift" }, section: "Referensi" },
    { key: "tenderType", label: { id: "Tipe Pembayaran", en: "Tender Type" }, widget: "Select", section: "Pembayaran", options: statusOptions(["Cash", "QRIS", "Card", "E-Wallet"]) },
    { key: "amount", label: { id: "Nilai", en: "Amount" }, widget: "Currency", required: true, section: "Pembayaran" },
    { key: "referenceNo", label: { id: "Referensi", en: "Reference No" }, widget: "TextField", section: "Pembayaran" },
    { key: "clearingAccount", label: { id: "Akun Clearing", en: "Clearing Account" }, widget: "TextField", section: "Akuntansi" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Draft", "Authorized", "Settled", "Voided"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "invoiceId" },
      { field: "tenderType" },
      { field: "amount", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "tenderType", widget: "Select", options: statusOptions(["Cash", "QRIS", "Card", "E-Wallet"]) }],
    defaultSort: { field: "id", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Authorized", "Settled", "Voided"],
    initial: "Draft",
    transitions: [
      { name: "authorize", label: { id: "Otorisasi", en: "Authorize" }, from: ["Draft"], to: "Authorized" },
      { name: "settle", label: { id: "Settle", en: "Settle" }, from: ["Authorized"], to: "Settled", posting: true },
      { name: "void", label: { id: "Void", en: "Void" }, from: ["Draft", "Authorized"], to: "Voided" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const ITEM_VARIANT_META: DoctypeMeta = {
  name: "ItemVariant",
  label: { id: "Varian Item", en: "Item Variant" },
  module: "Master Retail Sepatu",
  naming: "SKU-.#####",
  titleField: "itemName",
  fields: [
    { key: "id", label: { id: "SKU", en: "SKU" }, widget: "TextField", readOnly: true },
    { key: "itemName", label: { id: "Nama Item", en: "Item Name" }, widget: "TextField", required: true, section: "Produk" },
    { key: "category", label: { id: "Kategori", en: "Category" }, widget: "Select", section: "Produk", options: statusOptions(["Sneakers", "Formal", "Sport", "Casual", "Safety", "Outdoor", "Kids"]) },
    { key: "size", label: { id: "Ukuran", en: "Size" }, widget: "TextField", section: "Varian" },
    { key: "color", label: { id: "Warna", en: "Color" }, widget: "TextField", section: "Varian" },
    { key: "barcode", label: { id: "Barcode", en: "Barcode" }, widget: "TextField", section: "Varian" },
    { key: "unitPrice", label: { id: "Harga Jual", en: "Unit Price" }, widget: "Currency", section: "Harga" },
    { key: "standardCost", label: { id: "HPP Standar", en: "Standard Cost" }, widget: "Currency", section: "Harga" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Active", "Inactive"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-32" },
      { field: "itemName" },
      { field: "category" },
      { field: "size", align: "center" },
      { field: "unitPrice", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "category", widget: "Select", options: statusOptions(["Sneakers", "Formal", "Sport", "Casual"]) }],
    defaultSort: { field: "itemName", dir: "asc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Active", "Inactive"],
    initial: "Active",
    transitions: [
      { name: "deactivate", label: { id: "Nonaktifkan", en: "Deactivate" }, from: ["Active"], to: "Inactive" },
      { name: "activate", label: { id: "Aktifkan", en: "Activate" }, from: ["Inactive"], to: "Active" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const CUSTOMER_META: DoctypeMeta = {
  name: "Customer",
  label: { id: "Pelanggan", en: "Customer" },
  module: "Master Retail Sepatu",
  naming: "CUST-SHOE-.#####",
  titleField: "customerName",
  fields: [
    { key: "id", label: { id: "Kode Pelanggan", en: "Customer ID" }, widget: "TextField", readOnly: true },
    { key: "customerName", label: { id: "Nama Pelanggan", en: "Customer Name" }, widget: "TextField", required: true, section: "Profil" },
    { key: "phone", label: { id: "Telepon", en: "Phone" }, widget: "TextField", section: "Profil" },
    { key: "email", label: { id: "Email", en: "Email" }, widget: "TextField", section: "Profil" },
    { key: "segment", label: { id: "Segmen", en: "Segment" }, widget: "Select", section: "Profil", options: statusOptions(["Walk-in", "Member", "Marketplace", "Corporate"]) },
    { key: "creditLimit", label: { id: "Limit Kredit", en: "Credit Limit" }, widget: "Currency", section: "Kredit" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Active", "Blocked", "Inactive"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-32" },
      { field: "customerName" },
      { field: "segment" },
      { field: "creditLimit", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "segment", widget: "Select", options: statusOptions(["Walk-in", "Member", "Marketplace", "Corporate"]) }],
    defaultSort: { field: "customerName", dir: "asc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Active", "Blocked", "Inactive"],
    initial: "Active",
    transitions: [
      { name: "block", label: { id: "Blokir", en: "Block" }, from: ["Active"], to: "Blocked" },
      { name: "reactivate", label: { id: "Aktifkan", en: "Reactivate" }, from: ["Blocked", "Inactive"], to: "Active" },
      { name: "deactivate", label: { id: "Nonaktifkan", en: "Deactivate" }, from: ["Active", "Blocked"], to: "Inactive" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const WAREHOUSE_META: DoctypeMeta = {
  name: "Warehouse",
  label: { id: "Gudang/Outlet", en: "Warehouse" },
  module: "Master Retail Sepatu",
  naming: "WH-SHOE-.#####",
  titleField: "warehouseName",
  fields: [
    { key: "id", label: { id: "Kode Gudang", en: "Warehouse ID" }, widget: "TextField", readOnly: true },
    { key: "warehouseName", label: { id: "Nama Gudang", en: "Warehouse Name" }, widget: "TextField", required: true, section: "Gudang" },
    { key: "outlet", label: { id: "Outlet", en: "Outlet" }, widget: "Select", section: "Gudang", options: outletOptions() },
    { key: "warehouseType", label: { id: "Tipe", en: "Type" }, widget: "Select", section: "Gudang", options: statusOptions(["Store", "Central", "Transit", "Return"]) },
    { key: "isDefault", label: { id: "Default Outlet", en: "Default Outlet" }, widget: "Checkbox", section: "Gudang" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Active", "Inactive"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-32" },
      { field: "warehouseName" },
      { field: "outlet" },
      { field: "warehouseType" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "warehouseType", widget: "Select", options: statusOptions(["Store", "Central", "Transit", "Return"]) }],
    defaultSort: { field: "warehouseName", dir: "asc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Active", "Inactive"],
    initial: "Active",
    transitions: [
      { name: "deactivate", label: { id: "Nonaktifkan", en: "Deactivate" }, from: ["Active"], to: "Inactive" },
      { name: "activate", label: { id: "Aktifkan", en: "Activate" }, from: ["Inactive"], to: "Active" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const STOCK_LEDGER_ENTRY_META: DoctypeMeta = {
  name: "StockLedgerEntry",
  label: { id: "Stock Ledger Entry", en: "Stock Ledger Entry" },
  module: "Inventory Retail Sepatu",
  naming: "SLE-SHOE-.YYYY.-.#####",
  titleField: "voucherNo",
  fields: [
    { key: "id", label: { id: "Nomor SLE", en: "SLE No" }, widget: "TextField", readOnly: true },
    { key: "itemVariant", label: { id: "Varian Item", en: "Item Variant" }, widget: "Link", options: { doctype: "ItemVariant" }, required: true, section: "Referensi" },
    { key: "warehouse", label: { id: "Gudang", en: "Warehouse" }, widget: "Link", options: { doctype: "Warehouse" }, required: true, section: "Referensi" },
    { key: "postingDate", label: { id: "Tanggal Posting", en: "Posting Date" }, widget: "Date", section: "Referensi" },
    { key: "voucherType", label: { id: "Tipe Voucher", en: "Voucher Type" }, widget: "TextField", section: "Voucher" },
    { key: "voucherNo", label: { id: "Nomor Voucher", en: "Voucher No" }, widget: "TextField", section: "Voucher" },
    { key: "actualQty", label: { id: "Qty Mutasi", en: "Actual Qty" }, widget: "TextField", section: "Qty" },
    { key: "qtyAfterTransaction", label: { id: "Qty Akhir", en: "Qty After Transaction" }, widget: "TextField", section: "Qty" },
    { key: "valuationRate", label: { id: "Valuation Rate", en: "Valuation Rate" }, widget: "Currency", section: "Nilai" },
    { key: "stockValue", label: { id: "Stock Value", en: "Stock Value" }, widget: "Currency", section: "Nilai" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Posted", "Reversed"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "itemVariant" },
      { field: "warehouse" },
      { field: "voucherNo" },
      { field: "actualQty", align: "right" },
      { field: "stockValue", align: "right" },
    ],
    filters: [{ field: "warehouse", widget: "TextField" }],
    defaultSort: { field: "postingDate", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Posted", "Reversed"],
    initial: "Posted",
    transitions: [{ name: "reverse", label: { id: "Reverse", en: "Reverse" }, from: ["Posted"], to: "Reversed" }],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const GL_ENTRY_META: DoctypeMeta = {
  name: "GLEntry",
  label: { id: "GL Entry", en: "GL Entry" },
  module: "Akuntansi Retail Sepatu",
  naming: "GLE-SHOE-.YYYY.-.#####",
  titleField: "voucherNo",
  fields: [
    { key: "id", label: { id: "Nomor GL", en: "GL No" }, widget: "TextField", readOnly: true },
    { key: "postingDate", label: { id: "Tanggal Posting", en: "Posting Date" }, widget: "Date", section: "Referensi" },
    { key: "account", label: { id: "Akun", en: "Account" }, widget: "TextField", required: true, section: "Akun" },
    { key: "party", label: { id: "Pihak", en: "Party" }, widget: "TextField", section: "Akun" },
    { key: "voucherType", label: { id: "Tipe Voucher", en: "Voucher Type" }, widget: "TextField", section: "Voucher" },
    { key: "voucherNo", label: { id: "Nomor Voucher", en: "Voucher No" }, widget: "TextField", section: "Voucher" },
    { key: "debit", label: { id: "Debit", en: "Debit" }, widget: "Currency", section: "Nilai" },
    { key: "credit", label: { id: "Credit", en: "Credit" }, widget: "Currency", section: "Nilai" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Posted", "Reversed"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "postingDate" },
      { field: "account" },
      { field: "voucherNo" },
      { field: "debit", align: "right" },
      { field: "credit", align: "right" },
    ],
    filters: [{ field: "account", widget: "TextField" }],
    defaultSort: { field: "postingDate", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Posted", "Reversed"],
    initial: "Posted",
    transitions: [{ name: "reverse", label: { id: "Reverse", en: "Reverse" }, from: ["Posted"], to: "Reversed" }],
  },
  permissions: RETAIL_PERMISSIONS,
};

export const CASH_CLOSING_META: DoctypeMeta = {
  name: "CashClosing",
  label: { id: "Closing Kas", en: "Cash Closing" },
  module: "Operasi Retail Sepatu",
  naming: "CLOSE-SHOE-.YYYY.-.#####",
  titleField: "shiftId",
  fields: [
    { key: "id", label: { id: "Nomor Closing", en: "Closing No" }, widget: "TextField", readOnly: true },
    { key: "shiftId", label: { id: "Shift POS", en: "POS Shift" }, widget: "Link", options: { doctype: "POSShift" }, required: true, section: "Shift" },
    { key: "cashier", label: { id: "Kasir", en: "Cashier" }, widget: "TextField", section: "Shift" },
    { key: "expectedCash", label: { id: "Kas Sistem", en: "Expected Cash" }, widget: "Currency", section: "Kas" },
    { key: "countedCash", label: { id: "Kas Fisik", en: "Counted Cash" }, widget: "Currency", section: "Kas" },
    { key: "variance", label: { id: "Selisih", en: "Variance" }, widget: "Currency", section: "Kas" },
    { key: "expectedQRIS", label: { id: "QRIS Sistem", en: "Expected QRIS" }, widget: "Currency", section: "Non Tunai" },
    { key: "countedQRIS", label: { id: "QRIS Settlement", en: "Counted QRIS" }, widget: "Currency", section: "Non Tunai" },
    { key: "qrisVariance", label: { id: "Selisih QRIS", en: "QRIS Variance" }, widget: "Currency", section: "Non Tunai" },
    { key: "supervisor", label: { id: "Supervisor", en: "Supervisor" }, widget: "TextField", section: "Approval" },
    { key: "reason", label: { id: "Alasan Selisih", en: "Variance Reason" }, widget: "Textarea", section: "Approval" },
    { key: "status", label: { id: "Status", en: "Status" }, widget: "Select", section: "Status", options: statusOptions(["Draft", "Submitted", "Approved", "Rejected"]) },
  ],
  listView: {
    columns: [
      { field: "id", width: "w-36" },
      { field: "shiftId" },
      { field: "cashier" },
      { field: "expectedCash", align: "right" },
      { field: "expectedQRIS", align: "right" },
      { field: "variance", align: "right" },
      { field: "status", align: "center" },
    ],
    filters: [{ field: "status", widget: "Select", options: statusOptions(["Draft", "Submitted", "Approved", "Rejected"]) }],
    defaultSort: { field: "id", dir: "desc" },
    pageSize: 20,
    statusField: "status",
  },
  states: {
    field: "status",
    values: ["Draft", "Submitted", "Approved", "Rejected"],
    initial: "Draft",
    transitions: [
      { name: "submit", label: { id: "Ajukan Closing", en: "Submit Closing" }, from: ["Draft"], to: "Submitted" },
      { name: "approve", label: { id: "Setujui", en: "Approve" }, from: ["Submitted"], to: "Approved", posting: true },
      { name: "reject", label: { id: "Tolak", en: "Reject" }, from: ["Submitted"], to: "Rejected" },
    ],
  },
  permissions: RETAIL_PERMISSIONS,
};

function statusOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

function outletOptions() {
  return statusOptions(["Jakarta", "Bandung", "Surabaya", "Online"]);
}

export const shoeCompanyDoctypes: DoctypeMeta[] = [
  SHOE_ORDER_META,
  POS_SHIFT_META,
  POS_INVOICE_META,
  POS_PAYMENT_META,
  ITEM_VARIANT_META,
  CUSTOMER_META,
  WAREHOUSE_META,
  STOCK_LEDGER_ENTRY_META,
  GL_ENTRY_META,
  CASH_CLOSING_META,
];
