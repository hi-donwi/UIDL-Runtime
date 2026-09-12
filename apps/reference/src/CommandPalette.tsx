import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, ItemIcon } from "@uidl-runtime/templates/meridian/icons";

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Console" | "Document" | "Print Format" | "Tool";
  path: string;
  keywords?: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Developer & Tools
  { id: "tool-playground", title: "JSON Schema Playground", subtitle: "Live editor, schema validation & JSON UIDL previewer", category: "Tool", path: "/playground", keywords: ["editor", "schema", "json", "uidl", "code", "dev"] },
  { id: "tool-catalog", title: "Console Catalog Landing", subtitle: "Kembali ke katalog 11 konsol industri ERP", category: "Tool", path: "/", keywords: ["home", "landing", "catalog", "beranda"] },

  // Healthcare
  { id: "c-hospital-dash", title: "RS Medika Nusantara - Healthcare Overview", subtitle: "Dashboard rawat inap, okupansi tempat tidur, klaim BPJS", category: "Console", path: "/console/hospital-medika/dashboard", keywords: ["hospital", "medika", "rs", "kesehatan", "bed", "bpjs"] },
  { id: "c-hospital-emr", title: "RS Medika Nusantara - Antrean & Rekam Medis (EMR)", subtitle: "Antrean poliklinik, rekam medis ICD-10, dokter DPJP", category: "Console", path: "/console/hospital-medika/operations", keywords: ["emr", "antrean", "poli", "pasien", "dokter", "icd10"] },
  { id: "c-hospital-pharm", title: "RS Medika Nusantara - Farmasi & FEFO", subtitle: "Dispensing resep obat dan kontrol kedaluwarsa batch FEFO", category: "Console", path: "/console/hospital-medika/inventory", keywords: ["farmasi", "obat", "fefo", "resep", "apotek", "ed"] },

  // Medical Device
  { id: "c-medtech-dash", title: "PT Medtech Precision - Medtech Overview", subtitle: "Dashboard produksi alkes steril ISO 13485 & CE Mark", category: "Console", path: "/console/medical-device/dashboard", keywords: ["medtech", "alkes", "iso13485", "ce", "steril"] },
  { id: "c-medtech-dhr", title: "PT Medtech Precision - Device History Record (DHR)", subtitle: "Pelacakan lot batch DHR, sterilisasi gas EtO, cleanroom", category: "Console", path: "/console/medical-device/operations", keywords: ["dhr", "lot", "eto", "cleanroom", "batch"] },

  // Omnichannel
  { id: "c-omni-dash", title: "Nusantara Omnichannel - Distribution Overview", subtitle: "Integrasi marketplace multi-channel, SLA fulfillment kurir", category: "Console", path: "/console/omnichannel-dist/dashboard", keywords: ["omnichannel", "marketplace", "toko", "channel", "fulfillment"] },
  { id: "c-omni-orders", title: "Nusantara Omnichannel - Antrean Pesanan & Resi", subtitle: "Unified orders queue, kurir resi, status pengiriman", category: "Console", path: "/console/omnichannel-dist/operations", keywords: ["pesanan", "resi", "kurir", "order", "kirim"] },

  // Help Desk
  { id: "c-helpdesk-dash", title: "CloudDesk Support - Support Overview", subtitle: "Customer service tickets, CSAT score, response SLA", category: "Console", path: "/console/helpdesk/dashboard", keywords: ["helpdesk", "support", "tiket", "csat", "sla"] },
  { id: "c-helpdesk-tickets", title: "CloudDesk Support - Antrean Tiket Masuk", subtitle: "Multi-channel tickets (WhatsApp, Email, Web Portal)", category: "Console", path: "/console/helpdesk/operations", keywords: ["tiket", "whatsapp", "email", "eskalasi", "kendala"] },

  // Koperasi & BMT
  { id: "c-koperasi-dash", title: "Koperasi & BMT Syariah - Financial Overview", subtitle: "Dana pihak ketiga simpanan anggota dan NPF pembiayaan", category: "Console", path: "/console/koperasi-bmt/dashboard", keywords: ["koperasi", "bmt", "syariah", "simpanan", "anggota"] },
  { id: "c-koperasi-mrb", title: "Koperasi & BMT Syariah - Akad Pembiayaan Murabahah", subtitle: "Daftar kontrak pembiayaan jual-beli margin bagi hasil", category: "Console", path: "/console/koperasi-bmt/operations", keywords: ["murabahah", "pembiayaan", "margin", "pinjaman", "akad"] },

  // Retail, School, Factory, Coffee, EPC, CRM
  { id: "c-shoe-pos", title: "Toko Sepatu Nusantara - Retail POS", subtitle: "Kasir toko, penjualan tunai/QRIS, dan stok produk", category: "Console", path: "/app/shoe-company/retail-ops", keywords: ["sepatu", "pos", "kasir", "toko", "retail"] },
  { id: "c-school-fees", title: "Sekolah ABC - Student Receivables & SPP", subtitle: "Manajemen piutang SPP, tagihan siswa, dan payroll guru", category: "Console", path: "/console/school-abc/dashboard", keywords: ["sekolah", "spp", "siswa", "piutang", "guru"] },
  { id: "c-factory-mrp", title: "Pabrik ABC - Manufacturing Work Orders", subtitle: "Perintah kerja produksi WO, BOM, dan alokasi bahan baku", category: "Console", path: "/console/factory-abc/dashboard", keywords: ["pabrik", "wo", "bom", "wip", "manufaktur"] },
  { id: "c-coffee-roast", title: "Nusantara Coffee - Batch Roasting & Yield", subtitle: "Batch profile sangrai biji kopi, shrinkage, stok green beans", category: "Console", path: "/console/food-roasters/dashboard", keywords: ["kopi", "coffee", "roasting", "sangrai", "beans"] },
  { id: "c-epc-bast", title: "Rekayasa Konstruksi (EPC) - Progress BAST", subtitle: "Progress billing termin proyek, S-Curve, dan retensi", category: "Console", path: "/console/epc-contractor/dashboard", keywords: ["epc", "konstruksi", "proyek", "bast", "termin", "retensi"] },
  { id: "c-crm-pipeline", title: "Pipeline CRM - Opportunity Pipeline", subtitle: "Kanban deal pipeline, lead scoring, dan komisi sales", category: "Console", path: "/console/crm-pipeline/dashboard", keywords: ["crm", "opportunity", "pipeline", "deal", "sales", "lead"] },

  // Meridian Doctypes
  { id: "d-meridian-dash", title: "Meridian Trading Co. - ERP Dashboard", subtitle: "General ledger overview, P&L, balance sheet, multi-entity", category: "Document", path: "/meridian/dashboard", keywords: ["meridian", "accounting", "dashboard", "akuntansi"] },
  { id: "d-sinv-list", title: "Sales Invoices - Meridian Trading Co.", subtitle: "Daftar faktur penjualan, status pelunasan, piutang", category: "Document", path: "/meridian/list/SalesInvoice", keywords: ["sales", "invoice", "faktur", "jual", "piutang"] },
  { id: "d-quot-list", title: "Quotations - Meridian Trading Co.", subtitle: "Penawaran harga formal ke customer (Quote-to-Cash)", category: "Document", path: "/meridian/list/Quotation", keywords: ["quotation", "penawaran", "quote", "harga"] },
  { id: "d-po-list", title: "Purchase Orders - Meridian Trading Co.", subtitle: "Pesanan pembelian bahan baku ke supplier (Procure-to-Pay)", category: "Document", path: "/meridian/list/PurchaseOrder", keywords: ["purchase", "order", "po", "beli", "supplier"] },
  { id: "d-bom-list", title: "Bill of Materials (BOM) - Meridian Trading Co.", subtitle: "Struktur komposisi bahan baku & biaya operasional produk", category: "Document", path: "/meridian/list/BillOfMaterials", keywords: ["bom", "materials", "formula", "resep"] },
  { id: "d-wo-list", title: "Work Orders - Meridian Trading Co.", subtitle: "Surat perintah produksi di lantai pabrik", category: "Document", path: "/meridian/list/WorkOrder", keywords: ["work", "order", "wo", "produksi"] },
  { id: "d-pos-terminal", title: "Point of Sale (POS Terminal)", subtitle: "Antarmuka kasir cepat barcode, keranjang, dan struk", category: "Document", path: "/meridian/pos", keywords: ["pos", "kasir", "terminal", "struk", "cart"] },

  // Print Formats
  { id: "p-tax-inv", title: "Faktur Pajak PPN 11% (DJP Standard)", subtitle: "Format cetak resmi e-Faktur Pajak Pertambahan Nilai 11%", category: "Print Format", path: "/meridian/print/tax-invoice/SalesInvoice/SINV-2027-00001", keywords: ["faktur", "pajak", "ppn", "tax", "djp", "efaktur"] },
  { id: "p-coa", title: "Certificate of Analysis (CoA ISO 13485)", subtitle: "Sertifikat rilis mutu alkes, UDI DataMatrix, parameter QC", category: "Print Format", path: "/meridian/print/certificate-of-analysis/medical-device/DHR-2027-B091", keywords: ["coa", "certificate", "analysis", "alkes", "qc"] },
  { id: "p-presc", title: "Salinan Resep Dokter & Apotek FEFO", subtitle: "Lembar salinan resep obat poli dengan verifikasi apoteker", category: "Print Format", path: "/meridian/print/medical-prescription/hospital-medika/RM-2027-0412", keywords: ["resep", "dokter", "apotek", "obat", "salinan"] },
  { id: "p-murabahah", title: "Akad Pembiayaan Murabahah Syariah", subtitle: "Surat perjanjian akad jual-beli margin BMT & jadwal angsuran", category: "Print Format", path: "/meridian/print/akad-murabahah/koperasi-bmt/MRB-2027-0104", keywords: ["akad", "murabahah", "syariah", "perjanjian", "bmt"] },
  { id: "p-packing-slip", title: "Shipping Label & Packing Slip", subtitle: "Label resi kurir pengiriman dan lembar kemas marketplace", category: "Print Format", path: "/meridian/print/packing-slip/omnichannel-dist/ORD-SHP-99210", keywords: ["packing", "slip", "resi", "shipping", "label", "kurir"] },
  { id: "p-pos-receipt", title: "Struk Kasir POS & QRIS Nota Penjualan", subtitle: "Bukti struk kasir ritel toko sepatu dengan QRIS payment", category: "Print Format", path: "/meridian/print/pos-receipt/shoe-company/POS-2027-001", keywords: ["struk", "pos", "kasir", "sepatu", "qris", "nota"] },
  { id: "p-tuition-inv", title: "Surat Tagihan SPP & Biaya Pendidikan", subtitle: "Format tagihan uang sekolah bulanan dengan Virtual Account Bank", category: "Print Format", path: "/meridian/print/tuition-invoice/school-abc/NIS-2027-0104", keywords: ["spp", "sekolah", "tagihan", "tuition", "va", "biaya"] },
  { id: "p-work-order", title: "Surat Perintah Kerja (SPK) & BOM Routing", subtitle: "Lembar instruksi kerja manufaktur dan alokasi material gudang", category: "Print Format", path: "/meridian/print/work-order/factory-abc/WO-2027-001", keywords: ["spk", "work", "order", "pabrik", "manufaktur", "bom"] },
  { id: "p-roasting-log", title: "Roasting Profile Log & SCA Cupping Scorecard", subtitle: "Lembar evaluasi sensorik Q-Grader dan profil sangrai kopi", category: "Print Format", path: "/meridian/print/roasting-profile/food-roasters/ROAST-2027-001", keywords: ["roast", "cupping", "kopi", "sca", "gayo", "agtron"] },
  { id: "p-bast-milestone", title: "Berita Acara Serah Terima (BAST Proyek EPC)", subtitle: "BAST progres termin proyek konstruksi dengan potongan retensi", category: "Print Format", path: "/meridian/print/bast-milestone/epc-contractor/BAST-2027-001", keywords: ["bast", "proyek", "epc", "konstruksi", "termin", "retensi"] },
  { id: "p-comm-quote", title: "Surat Penawaran Harga Komersial (Quotation)", subtitle: "Proposal penawaran enterprise CRM dan SLA Gold 24/7", category: "Print Format", path: "/meridian/print/commercial-quotation/crm-pipeline/QUO-2027-001", keywords: ["penawaran", "quotation", "crm", "proposal", "harga"] },
  { id: "p-sla-incident", title: "Laporan Resolusi Tiket & SLA Incident", subtitle: "Sertifikat pemenuhan SLA dan analisis akar masalah insiden P1", category: "Print Format", path: "/meridian/print/sla-incident/helpdesk/TICK-2027-001", keywords: ["sla", "incident", "tiket", "helpdesk", "rca", "mttr"] },
];

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  isDark?: boolean;
}

export function CommandPalette({ open, onClose, onSelect, isDark = false }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setQuery("");
        setSelectedIndex(0);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMAND_ITEMS;

    const scored = COMMAND_ITEMS.map((item) => {
      const titleLower = item.title.toLowerCase();
      const subLower = item.subtitle.toLowerCase();
      let score = 0;

      if (titleLower.startsWith(q)) {
        score += 100;
      } else if (titleLower.includes(q)) {
        score += 80;
      }

      if (subLower.includes(q)) {
        score += 40;
      }

      if (item.category.toLowerCase().includes(q)) {
        score += 30;
      }

      if (item.keywords?.some((k) => k.toLowerCase() === q)) {
        score += 70;
      } else if (item.keywords?.some((k) => k.toLowerCase().includes(q))) {
        score += 20;
      }

      return { item, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex].path);
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div className={`meridian-ui ${isDark ? "dark" : ""} fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28`}>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />

      {/* Modal dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Universal Command Palette"
        className="relative z-10 w-form max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-850 dark:text-gray-25"
      >
        {/* Search input bar */}
        <div className="flex items-center gap-2 p-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari modul, konsol industri, faktur, atau alat developer..."
            className="w-full rounded-md bg-gray-100 p-3 text-2xl text-gray-900 placeholder-gray-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100"
          />
          <kbd className="me-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-890 dark:text-gray-400">
            ESC
          </kbd>
        </div>
        <hr className="border-gray-200 dark:border-gray-800" />

        {/* Results List */}
        <div className="custom-scroll max-h-96 overflow-y-auto p-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-base text-gray-600 italic dark:text-gray-500">
              Tidak ada hasil yang cocok dengan &ldquo;<span className="font-semibold">{query}</span>&rdquo;
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const categoryBadgeColors = {
                  Console: "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
                  Document: "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200",
                  "Print Format": "bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-200",
                  Tool: "bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
                };

                return (
                  <li
                    key={item.id}
                    onClick={() => {
                      onSelect(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2 ${
                      isSelected
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-25"
                        : "text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-890"
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <ItemIcon label={item.title} className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                        <span className="text-base font-medium">{item.title}</span>
                      </div>
                      <p className="mt-0.5 ps-6 line-clamp-1 text-sm text-gray-600 dark:text-gray-500">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`pill font-medium ${categoryBadgeColors[item.category]}`}>{item.category}</span>
                      {isSelected && <Icon name="arrow-turn-down-left" className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Icon name="sort" className="h-3 w-3" /> navigasi
            </span>
            <span className="flex items-center gap-1">
              <Icon name="arrow-turn-down-left" className="h-3 w-3" /> buka
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-890">ESC</kbd> tutup
            </span>
          </div>
          <div>
            <span>{filteredItems.length} opsi tersedia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
