export type Language = "id" | "en";

export const DICTIONARY = {
  id: {
    // General Navigation
    dashboard: "Dashboard",
    operations: "Operasional",
    inventory: "Inventori & Stok",
    accounting: "Akuntansi & GL",
    reports: "Laporan Finansial",
    controls: "Kontrol & Audit",
    settings: "Pengaturan",
    playground: "Playground UIDL",
    search: "Cari...",
    openConsole: "Buka Konsol",
    backToCatalog: "Kembali ke Katalog",

    // Actions
    create: "Buat Baru",
    save: "Simpan",
    cancel: "Batal",
    print: "Cetak Dokumen",
    export: "Ekspor Data",
    import: "Impor Data",
    format: "Format Kode",
    copy: "Salin",
    delete: "Hapus",
    edit: "Ubah",
    detail: "Detail Record",
    filter: "Saring",
    downloadPdf: "Download PDF",

    // Financial & ERP Terms
    totalReceivables: "Total Piutang Usaha",
    totalPayables: "Total Hutang Usaha",
    netProfit: "Laba Bersih",
    cashBalance: "Saldo Kas & Bank",
    debit: "Debit",
    credit: "Kredit",
    balance: "Saldo",
    taxInvoice: "Faktur Pajak PPN 11%",
    salesInvoice: "Faktur Penjualan",
    purchaseOrder: "Surat Pesanan Pembelian",
    billOfMaterials: "Struktur Bahan Baku (BOM)",
    workOrder: "Perintah Kerja (WO)",
    deviceHistoryRecord: "Device History Record (DHR)",
    prescription: "Salinan Resep Obat",
    murabahahAgreement: "Akad Pembiayaan Murabahah",
    shippingLabel: "Label Resi Pengiriman",

    // Labels
    customer: "Pelanggan / Klien",
    supplier: "Pemasok / Vendor",
    status: "Status",
    date: "Tanggal",
    dueDate: "Jatuh Tempo",
    amount: "Nominal",
    qty: "Kuantitas",
    price: "Harga Satuan",
    subtotal: "Subtotal",
    tax: "PPN (11%)",
    grandTotal: "Total Keseluruhan",
    terbilang: "Terbilang",
  },
  en: {
    // General Navigation
    dashboard: "Dashboard",
    operations: "Operations",
    inventory: "Inventory & Stock",
    accounting: "Accounting & GL",
    reports: "Financial Reports",
    controls: "Controls & Audit",
    settings: "Settings",
    playground: "UIDL Playground",
    search: "Search...",
    openConsole: "Open Console",
    backToCatalog: "Back to Catalog",

    // Actions
    create: "Create New",
    save: "Save",
    cancel: "Cancel",
    print: "Print Document",
    export: "Export Data",
    import: "Import Data",
    format: "Format Code",
    copy: "Copy",
    delete: "Delete",
    edit: "Edit",
    detail: "Record Detail",
    filter: "Filter",
    downloadPdf: "Download PDF",

    // Financial & ERP Terms
    totalReceivables: "Total Receivables",
    totalPayables: "Total Payables",
    netProfit: "Net Profit",
    cashBalance: "Cash & Bank Balance",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    taxInvoice: "VAT Tax Invoice 11%",
    salesInvoice: "Sales Invoice",
    purchaseOrder: "Purchase Order",
    billOfMaterials: "Bill of Materials (BOM)",
    workOrder: "Work Order (WO)",
    deviceHistoryRecord: "Device History Record (DHR)",
    prescription: "Medical Prescription",
    murabahahAgreement: "Murabahah Financing Contract",
    shippingLabel: "Shipping & Packing Slip",

    // Labels
    customer: "Customer / Client",
    supplier: "Supplier / Vendor",
    status: "Status",
    date: "Date",
    dueDate: "Due Date",
    amount: "Amount",
    qty: "Quantity",
    price: "Unit Price",
    subtotal: "Subtotal",
    tax: "VAT (11%)",
    grandTotal: "Grand Total",
    terbilang: "In Words",
  },
};

export function t(key: keyof typeof DICTIONARY["id"] | string, lang: Language = "id"): string {
  const dict = DICTIONARY[lang] as Record<string, string> | undefined;
  const idDict = DICTIONARY["id"] as Record<string, string>;
  return dict?.[key] ?? idDict[key] ?? key;
}

/**
 * Resolves a bilingual label object ({ id: string, en: string }) or plain string according to active language.
 */
export function localize(label: { id?: string; en?: string } | string | undefined, lang: Language = "id"): string {
  if (!label) return "";
  if (typeof label === "string") return label;
  return (lang === "id" ? label.id ?? label.en : label.en ?? label.id) ?? "";
}

/**
 * Formats a number or numeric string to Indonesian Rupiah currency standard (e.g. Rp 1.500.000).
 */
export function formatRupiah(amount: number | string, includePrefix = true): string {
  const numeric = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0 : amount;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);

  return includePrefix ? `Rp ${formatted}` : formatted;
}

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Formats date string (YYYY-MM-DD or ISO) into formatted Indonesian or English date text.
 */
export function formatIndonesianDate(dateInput: string | Date, lang: Language = "id"): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const day = date.getDate();
  const month = lang === "id" ? MONTH_NAMES_ID[date.getMonth()] : MONTH_NAMES_EN[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Converts Indonesian numeric amount into canonical legal words (Terbilang Rupiah).
 * Example: 1540000 -> "Satu Juta Lima Ratus Empat Puluh Ribu Rupiah"
 */
export function formatTerbilang(amountInput: number | string): string {
  const numeric = Math.floor(
    typeof amountInput === "string" ? parseFloat(amountInput.replace(/[^0-9.-]/g, "")) || 0 : amountInput
  );

  if (numeric === 0) return "Nol Rupiah";
  if (numeric < 0) return `Minus ${formatTerbilang(Math.abs(numeric))}`;

  const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  function bilang(n: number): string {
    if (n < 12) {
      return SATUAN[n];
    } else if (n < 20) {
      return `${SATUAN[n - 10]} Belas`;
    } else if (n < 100) {
      const sisa = n % 10;
      return `${SATUAN[Math.floor(n / 10)]} Puluh ${sisa > 0 ? SATUAN[sisa] : ""}`.trim();
    } else if (n < 200) {
      return `Seratus ${bilang(n - 100)}`.trim();
    } else if (n < 1000) {
      return `${SATUAN[Math.floor(n / 100)]} Ratus ${bilang(n % 100)}`.trim();
    } else if (n < 2000) {
      return `Seribu ${bilang(n - 1000)}`.trim();
    } else if (n < 1000000) {
      return `${bilang(Math.floor(n / 1000))} Ribu ${bilang(n % 1000)}`.trim();
    } else if (n < 1000000000) {
      return `${bilang(Math.floor(n / 1000000))} Juta ${bilang(n % 1000000)}`.trim();
    } else if (n < 1000000000000) {
      return `${bilang(Math.floor(n / 1000000000))} Miliar ${bilang(n % 1000000000)}`.trim();
    } else {
      return `${bilang(Math.floor(n / 1000000000000))} Triliun ${bilang(n % 1000000000000)}`.trim();
    }
  }

  return `${bilang(numeric)} Rupiah`;
}
