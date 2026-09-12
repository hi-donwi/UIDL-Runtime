/*
 * Label -> icon resolution for the demo chrome.
 *
 * Icons come from the package's own outline set (src/components/icons.tsx, generated from
 * Heroicons v2 outline). Outline only, one stroke weight: an active sidebar row is marked by
 * Meridian's 4px inset bar and a darker label, never by a filled icon.
 *
 * Menus in this demo are authored in Indonesian and English side by side, so the resolver
 * matches on both vocabularies ("Pembiayaan"/"Financing", "Gudang"/"Warehouse").
 */
import { Icon } from "~/components/icons";

export { Icon };

/**
 * Explicit icon per menu group. Group labels are a closed set the demo controls, so they are
 * looked up rather than guessed.
 */
const GROUP_ICONS: Record<string, string> = {
  // Meridian's sidebar groups
  "Get Started": "rocket-launch",
  Dashboard: "squares",
  Modules: "squares",
  Sales: "shopping-cart",
  Purchases: "shopping-bag",
  Common: "duplicate",
  Reports: "chart-bar",
  Inventory: "cube",
  POS: "credit-card",
  GST: "receipt-percent",
  Setup: "cog",
  // Console groups
  Overview: "squares",
  Accounting: "book-open",
  "Accounting & Reports": "book-open",
  Akuntansi: "book-open",
  Controls: "shield-check",
  "Controls & Compliance": "shield-check",
  Kontrol: "shield-check",
  Operations: "briefcase",
  Keuangan: "banknotes",
  "Keuangan Siswa": "academic-cap",
  Kas: "banknotes",
  Pembiayaan: "banknotes",
  Simpanan: "circle-stack",
  Anggota: "user-group",
  Akademik: "academic-cap",
  Kesiswaan: "user-group",
  Kepegawaian: "briefcase",
  Pelayanan: "clipboard-check",
  "Rawat Inap": "home",
  "Tenaga Medis": "user-circle",
  Farmasi: "beaker",
  Produksi: "wrench",
  Mutu: "shield-check",
  Sterilisasi: "beaker",
  Distribusi: "truck",
  Pengadaan: "shopping-bag",
  Gudang: "archive",
  Proyek: "briefcase",
  Kontrak: "document-text",
  Subkontraktor: "wrench",
  Pipeline: "filter",
  Aktivitas: "calendar",
  Akun: "building-office",
  Kinerja: "chart-line",
  Penjualan: "shopping-cart",
  Pembelian: "shopping-bag",
  Pesanan: "shopping-cart",
  Fulfillment: "truck",
  Channel: "globe",
  "Service Desk": "lifebuoy",
  Agen: "user-group",
  "Knowledge Base": "book-open",
  Pelanggan: "users",
  Laporan: "chart-bar",
  Compliance: "shield-check",
  Master: "circle-stack",
  "Master Data": "circle-stack",
  Components: "puzzle-piece",
  Layout: "rectangle-group",
  Base: "cursor-arrow",
  Form: "pencil",
  Data: "table-cells",
  Navigation: "menu",
  Overlay: "window",
  Charts: "chart-line",
  Codes: "qr-code",
  Feedback: "bell",
  Templates: "duplicate",
};

/** Ordered label matchers. First hit wins, so the specific rules sit above the generic ones. */
const LABEL_RULES: Array<[string[], string]> = [
  // Dashboards & landing
  [["overview", "dashboard", "ringkasan", "get started", "beranda"], "squares"],

  // Education
  [["spp", "tuition", "student fee", "uang sekolah", "biaya"], "academic-cap"],
  [["student", "siswa", "kelas", "class", "teacher", "guru", "alumni"], "user-group"],
  [["kurikulum", "curriculum", "jadwal", "schedule", "timetable"], "calendar"],
  [["absensi", "attendance", "presensi"], "clipboard-check"],

  // Money
  [["bank", "kas", "cash", "treasury", "petty"], "banknotes"],
  [["payroll", "gaji", "salary", "tunjangan"], "wallet"],
  [["pembiayaan", "financing", "murabahah", "ijarah", "mudharabah", "pinjaman", "loan", "kredit"], "banknotes"],
  [["simpanan", "wadiah", "deposit", "tabungan", "savings"], "circle-stack"],
  [["shu", "bagi hasil", "profit share", "dividen"], "chart-pie"],
  [["koperasi", "bmt", "rat", "cabang", "branch"], "building-library"],
  [["budget", "anggaran", "forecast", "proyeksi"], "presentation-chart"],
  [["invoice", "faktur", "tagihan", "billing"], "document-text"],
  [["payment", "pembayaran", "settlement", "pelunasan"], "credit-card"],
  [["piutang", "receivable", "aging", "collection", "penagihan"], "receipt-refund"],
  [["hutang", "utang", "payable"], "receipt-percent"],
  [["pajak", "tax", "gst", "ppn", "pph", "efaktur"], "receipt-percent"],

  // Sales & CRM
  [["quote", "penawaran", "quotation", "rfq"], "document-text"],
  [["sales order", "pesanan", "order", "so "], "shopping-cart"],
  [["delivery", "surat jalan", "shipment", "pengiriman", "dispatch", "kurir", "courier"], "truck"],
  [["lead", "pipeline", "deal", "opportunity", "prospek", "funnel"], "filter"],
  [["customer", "pelanggan", "party", "member", "anggota", "patient", "pasien", "tamu"], "users"],
  [["loyalty", "reward", "poin", "membership"], "star"],
  [["coupon", "voucher", "promo", "kupon"], "ticket"],
  [["pricing", "price list", "harga", "discount", "diskon"], "tag"],
  [["target", "komisi", "commission", "rep ", "salesperson"], "trophy"],

  // Purchasing
  [["material request", "permintaan"], "clipboard-list"],
  [["purchase order", "po ", "pemesanan"], "shopping-bag"],
  [["purchase invoice", "invoice pembelian"], "document-text"],
  [["supplier", "vendor", "pemasok", "subcon", "subkon", "petani"], "storefront"],
  [["purchase receipt", "penerimaan", "goods receipt"], "inbox"],
  [["procurement", "pengadaan"], "shopping-bag"],

  // Inventory & manufacturing
  [["bill of materials", "bom", "resep produksi", "formula"], "cpu-chip"],
  [["work order", "produksi", "production", "roasting", "shop floor", "manufactur"], "wrench"],
  [["job card", "shift", "mesin", "machine", "maintenance", "perawatan"], "clock"],
  [["stock movement", "mutasi", "transfer"], "arrows-right-left"],
  [["opname", "stock take", "recount", "sensus"], "clipboard-check"],
  [["warehouse", "gudang", "bin", "rak", "silo", "stock", "stok", "inventory", "persediaan"], "archive"],
  [["quality", "mutu", "qc", "inspection", "inspeksi", "cleanroom", "steril", "haccp"], "shield-check"],
  [["project", "proyek", "wbs", "epc", "milestone", "termin"], "briefcase"],
  [["item", "produk", "product", "sku", "katalog", "catalog", "menu"], "cube"],
  [["serial", "batch", "lot", "udi", "traceab", "telusur", "dhr", "dmr"], "hashtag"],

  // Accounting & reporting
  [["general ledger", "buku besar", "ledger", "journal", "jurnal", "voucher"], "book-open"],
  [["chart of account", "coa", "akun"], "table-cells"],
  [["profit and loss", "laba rugi", "p&l", "income statement"], "chart-line"],
  [["balance sheet", "neraca", "trial balance", "reconcil", "rekonsil", "tie-out"], "scale"],
  [["cash flow", "arus kas", "cashflow"], "trending-up"],
  [["report", "laporan", "analytics", "analisa", "statistik", "performance", "kinerja"], "chart-bar"],

  // Healthcare
  [["antrean", "queue", "registrasi", "pendaftaran", "admission", "poli"], "clipboard-check"],
  [["rekam medis", "emr", "medical record", "diagnosa", "resep", "prescription"], "document-text"],
  [["farmasi", "pharmacy", "obat", "fefo", "apotek", "dispensing"], "beaker"],
  [["bpjs", "klaim", "claim", "asuransi", "insurance", "inacbg"], "identification"],
  [["dokter", "doctor", "perawat", "nurse", "tenaga medis"], "user-circle"],
  [["rawat", "bed", "kamar", "ward", "igd", "emergency"], "home"],

  // Support desk
  [["ticket", "tiket", "case", "incident", "insiden"], "ticket"],
  [["sla", "escalation", "eskalasi", "backlog", "antrian tiket"], "clock"],
  [["canned", "macro", "template balasan", "knowledge", "artikel", "faq"], "book-open"],
  [["csat", "kepuasan", "survey", "feedback", "nps"], "face-smile"],
  [["agent", "agen", "operator", "staff", "karyawan", "pegawai"], "user-group"],

  // Commerce & channels
  [["marketplace", "channel", "kanal", "lapak", "toko online", "omnichannel", "storefront"], "globe"],
  [["picking", "packing", "wave", "fulfil", "gudang keluar"], "inbox-stack"],
  [["retur", "return", "rma", "refund"], "receipt-refund"],
  [["point of sale", "pos", "kasir", "cashier", "shift kasir", "teller"], "credit-card"],

  // Controls, compliance, setup
  [["audit", "temuan", "finding", "exception"], "document-search"],
  [["closing", "tutup buku", "tutup periode", "lock", "kunci", "period"], "lock-closed"],
  [["control", "kontrol", "compliance", "kepatuhan", "capa", "ncr", "risk", "risiko", "dps", "kars", "cpakb"], "shield-check"],
  [["import", "unggah", "upload"], "upload"],
  [["export", "unduh", "download"], "download"],
  [["print", "cetak", "template cetak"], "printer"],
  [["dimension", "customize", "kustomisasi"], "adjustments"],
  [["setting", "setup", "pengaturan", "konfigurasi", "preferensi"], "cog"],
  [["user", "pengguna", "role", "hak akses", "permission"], "key"],
  [["notification", "notifikasi", "alert", "peringatan", "reminder"], "bell"],
  [["log", "history", "riwayat", "activity", "aktivitas"], "clock"],
];

/** The icon a menu label should carry. Groups look up an explicit map; items fall through the rules. */
export function resolveIconName(label: string, isGroup = false): string {
  if (isGroup && GROUP_ICONS[label]) return GROUP_ICONS[label];

  const text = label.toLowerCase();
  for (const [needles, icon] of LABEL_RULES) {
    if (needles.some((needle) => text.includes(needle))) return icon;
  }
  return isGroup ? "squares" : "document-text";
}

/**
 * Icons for *action* labels (page-header buttons, row actions). These are verbs, not nouns, so
 * they get their own rules — "Print" is a printer, "Run Checks" is a shield, and anything that
 * starts a new document is a plus.
 */
const ACTION_RULES: Array<[string[], string]> = [
  [["+ ", "tambah", "buat ", "new ", "daftar", "input", "registrasi", "panggil"], "plus"],
  [["print", "cetak"], "printer"],
  [["export", "unduh"], "download"],
  [["import", "unggah", "upload"], "upload"],
  [["sync", "sinkron", "repost", "hitung ulang", "refresh"], "refresh"],
  [["run checks", "validasi", "verifikasi", "audit", "inspeksi", "review"], "shield-check"],
  [["lock", "kunci", "tutup", "close", "closing"], "lock-closed"],
  [["approve", "setujui", "certify", "release", "rilis", "submit"], "check-circle"],
  [["kirim", "send", "reminder", "pengingat", "notifikasi"], "send"],
  [["pay", "bayar", "collect", "terima pembayaran", "settlement", "tarik", "setor"], "banknotes"],
  [["reconcile", "rekonsil", "tie-out", "match"], "scale"],
  [["transfer", "pindah", "mutasi"], "arrows-right-left"],
  [["stock", "opname", "recount", "hitung"], "clipboard-check"],
  [["assign", "alih", "atur", "jadwal", "schedule"], "calendar"],
  [["filter", "pilih"], "filter"],
  [["log", "catat", "record"], "pencil"],
  [["copy", "salin"], "clipboard-copy"],
  [["format"], "bolt"],
  [["save", "simpan"], "check"],
  [["escalat", "eskalasi"], "trending-up"],
  [["telusur", "trace", "lacak", "track", "search", "cari"], "search"],
];

export function resolveActionIcon(label: string): string {
  const text = label.toLowerCase();
  for (const [needles, icon] of ACTION_RULES) {
    if (needles.some((needle) => text.includes(needle))) return icon;
  }
  return "bolt";
}

export function GroupIcon({ label, className }: { label: string; className?: string }) {
  return <Icon name={resolveIconName(label, true)} className={className ?? "h-4 w-4 flex-shrink-0"} />;
}

export function ItemIcon({ label, className }: { label: string; className?: string }) {
  return <Icon name={resolveIconName(label, false)} className={className ?? "h-4 w-4 flex-shrink-0"} />;
}

/** Chrome icons referenced by name so call sites read as intent, not as glyph names. */
export const IconSearch = chrome("search");
export const IconClose = chrome("close");
export const IconPlus = chrome("plus");
export const IconHome = chrome("home");
export const IconMenu = chrome("menu");
export const IconChevronLeft = chrome("chevron-left");
export const IconChevronRight = chrome("chevron-right");
export const IconChevronsLeft = chrome("chevrons-left");
export const IconChevronsRight = chrome("chevrons-right");
export const IconSun = chrome("sun");
export const IconMoon = chrome("moon");
export const IconLanguage = chrome("language");
export const IconEnter = chrome("arrow-turn-down-left");
export const IconArrowUpDown = chrome("sort");
export const IconPrinter = chrome("printer");
export const IconSparkles = chrome("sparkles");
export const IconBolt = chrome("bolt");
export const IconWrench = chrome("wrench");
export const IconBeaker = chrome("beaker");
export const IconCheckCircle = chrome("check-circle");
export const IconXCircle = chrome("x-circle");
export const IconClipboardCopy = chrome("clipboard-copy");
export const IconDownload = chrome("download");
export const IconUpload = chrome("upload");
export const IconCode = chrome("code");
export const IconPuzzle = chrome("puzzle-piece");
export const IconWindow = chrome("window");
export const IconArrowLeft = chrome("arrow-left");
export const IconExclamation = chrome("exclamation-triangle");
export const IconRefresh = chrome("refresh");
export const IconCog = chrome("cog");
export const IconAdjustments = chrome("adjustments-horizontal");
export const IconTable = chrome("table-cells");

function chrome(name: string) {
  return function ChromeIcon({ className }: { className?: string }) {
    return <Icon name={name} className={className ?? "h-4 w-4"} />;
  };
}
