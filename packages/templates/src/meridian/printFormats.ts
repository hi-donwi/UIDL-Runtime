import type { UIDLDocument } from "~/types";
import { formatIDR, text, button } from "./buildDocument";
import { formatTerbilang } from "~/utils/i18n";
import {
  customers,
  deliveryNotes,
  purchaseInvoices,
  purchaseOrders,
  salesInvoices,
  suppliers,
} from "./mockData";

export function buildTaxInvoicePrintDocument(invoiceId: string): UIDLDocument | undefined {
  const inv = salesInvoices.find((i) => i.id === invoiceId) ?? purchaseInvoices.find((i) => i.id === invoiceId);
  if (!inv) return undefined;

  const partyName = "customer" in inv
    ? (customers.find((c) => c.id === inv.customer)?.name ?? inv.customer)
    : (suppliers.find((s) => s.id === inv.supplier)?.name ?? inv.supplier);

  const invoiceLines = inv.lines.map((line, index) => ({
    no: `${index + 1}`,
    name: line.item,
    description: line.description,
    qty: `${line.quantity}`,
    rate: formatIDR(line.rate),
    amount: formatIDR(line.amount),
  }));

  return {
    version: "1.0.0",
    id: `print-tax-invoice-${inv.id}`,
    name: `Faktur Pajak - ${inv.id}`,
    dataSources: {
      items: invoiceLines,
    },
    root: {
      id: "tax-invoice-page",
      type: "Column",
      style: {
        gap: "gap-4",
        padding: "p-6",
        maxWidth: "max-w-4xl",
        margin: "mx-auto",
        background: "#ffffff",
        borderWidth: "border",
        borderColor: "#d1d5db",
        borderRadius: "rounded-lg",
        shadow: "shadow-md",
      },
      children: [
        // Navigation bar
        {
          id: "nav-bar",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn", "← Kembali ke Invoice", `/meridian/edit/SalesInvoice/${inv.id}`),
            {
              id: "print-actions",
              type: "Row",
              style: { gap: "gap-2" },
              children: [
                button("print-btn", "Cetak Dokumen (PDF)", `/meridian/print/tax-invoice/SalesInvoice/${inv.id}`, "primary", "printer"),
              ],
            },
          ],
        },
        // Faktur Header
        {
          id: "faktur-header",
          type: "Column",
          style: { alignItems: "center", textAlign: "center", gap: "gap-1", borderWidth: "border-b", padding: "pb-4" },
          children: [
            text("fp-title", "FAKTUR PAJAK", { fontSize: "text-2xl", fontWeight: 700, letterSpacing: "tracking-wide" }),
            text("fp-serial", `Kode dan Nomor Seri Faktur Pajak : 010.027-27.${inv.id.replace(/\D/g, "").padStart(8, "0")}`, { fontSize: "text-sm", fontWeight: 600, color: "{primitives.color.text-primary}" }),
          ],
        },
        // PKP Penjual Box
        {
          id: "pkp-penjual",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", borderColor: "#e5e7eb", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            text("penjual-title", "PENGUSAHA KENA PAJAK (PENJUAL)", { fontSize: "text-xs", fontWeight: 700, color: "{primitives.color.text-secondary}" }),
            text("penjual-nama", "Nama : PT Meridian Trading Nusantara", { fontSize: "text-sm", fontWeight: 600 }),
            text("penjual-alamat", "Alamat : Wisma Antigravity Lt. 18, Jl. Sudirman Kav. 52-53, Jakarta Selatan 12190", { fontSize: "text-xs" }),
            text("penjual-npwp", "NPWP : 01.345.678.9-012.000", { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
        // Pembeli Box
        {
          id: "pkp-pembeli",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", borderColor: "#e5e7eb", padding: "p-3", borderRadius: "rounded-md" },
          children: [
            text("pembeli-title", "PEMBELI BARANG KENA PAJAK / PENERIMA JASA KENA PAJAK", { fontSize: "text-xs", fontWeight: 700, color: "{primitives.color.text-secondary}" }),
            text("pembeli-nama", `Nama : ${partyName}`, { fontSize: "text-sm", fontWeight: 600 }),
            text("pembeli-alamat", "Alamat : Kawasan Industri Modern Cikande Kav. 24, Banten", { fontSize: "text-xs" }),
            text("pembeli-npwp", "NPWP : 02.456.789.1-401.000", { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
        // Line items table
        {
          id: "faktur-items-table",
          type: "DataTable",
          props: {
            title: "Barang Kena Pajak / Jasa Kena Pajak",
            dataSource: "items",
            columns: [
              { key: "no", label: "No", align: "center" },
              { key: "name", label: "Nama Barang / Jasa Kena Pajak" },
              { key: "description", label: "Spesifikasi" },
              { key: "qty", label: "Qty", align: "right" },
              { key: "rate", label: "Harga Satuan (Rp)", align: "right" },
              { key: "amount", label: "Harga Jual (Rp)", align: "right" },
            ],
          },
        },
        // Totals & Tax Calculation
        {
          id: "faktur-totals",
          type: "Column",
          style: { gap: "gap-2", borderWidth: "border", borderColor: "#e5e7eb", padding: "p-4", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "row-dpp",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [
                text("lbl-dpp", "Dasar Pengenaan Pajak (DPP) :", { fontSize: "text-sm", fontWeight: 600 }),
                text("val-dpp", formatIDR(inv.subtotal), { fontSize: "text-sm", fontWeight: 600 }),
              ],
            },
            {
              id: "row-ppn",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [
                text("lbl-ppn", "PPN yang Terutang = 11% x Dasar Pengenaan Pajak :", { fontSize: "text-sm", fontWeight: 600 }),
                text("val-ppn", formatIDR(inv.tax), { fontSize: "text-sm", fontWeight: 600, color: "{primitives.color.accent}" }),
              ],
            },
            {
              id: "row-grand",
              type: "Row",
              style: { justifyContent: "space-between", borderWidth: "border-t", borderColor: "#d1d5db", padding: "pt-2" },
              children: [
                text("lbl-grand", "Total Nilai Transaksi Termasuk PPN :", { fontSize: "text-base", fontWeight: 700 }),
                text("val-grand", formatIDR(inv.total), { fontSize: "text-base", fontWeight: 700 }),
              ],
            },
          ],
        },
        // Signature Block
        {
          id: "signature-block",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "flex-end", padding: "pt-6" },
          children: [
            {
              id: "qr-info",
              type: "Column",
              style: { gap: "gap-2" },
              children: [
                {
                  id: "djp-qr",
                  type: "QRCode",
                  props: {
                    value: `https://efaktur.pajak.go.id/validate?doc=${inv.id}&ppn=${inv.tax}`,
                    size: 80,
                  },
                },
                text("terbilang-text", `Terbilang: ${formatTerbilang(inv.total)}`, { fontSize: "text-xs", fontWeight: 600, fontStyle: "italic" }),
                text("qr-note", "Sesuai dengan ketentuan perpajakan Republik Indonesia (UU HPP & PMK No. 65/2022).", { fontSize: "text-xs", color: "{primitives.color.text-muted}" }),
                text("qr-valid", "Faktur Pajak ini sah dan telah teregistrasi di DJP e-Faktur.", { fontSize: "text-xs", color: "#10b981", fontWeight: 600 }),
              ],
            },
            {
              id: "sign-penjual",
              type: "Column",
              style: { alignItems: "center", textAlign: "center", gap: "gap-1" },
              children: [
                text("sign-loc", `Jakarta, ${inv.date}`, { fontSize: "text-xs" }),
                text("sign-company", "PT Meridian Trading Nusantara", { fontSize: "text-xs", fontWeight: 600 }),
                { id: "sign-space", type: "Spacer", style: { height: "h-14" } },
                text("sign-name", "HENDRA WIJAYA, S.E.", { fontSize: "text-xs", fontWeight: 700, textDecoration: "underline" }),
                text("sign-title", "Kuasa Direksi / Tax Manager", { fontSize: "text-[10px]", color: "{primitives.color.text-secondary}" }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildDeliveryNotePrintDocument(dnId: string): UIDLDocument | undefined {
  const dn = deliveryNotes.find((d) => d.id === dnId);
  if (!dn) return undefined;

  return {
    version: "1.0.0",
    id: `print-delivery-note-${dn.id}`,
    name: `Surat Jalan - ${dn.id}`,
    root: {
      id: "delivery-note-page",
      type: "Column",
      style: {
        gap: "gap-4",
        padding: "p-6",
        maxWidth: "max-w-4xl",
        margin: "mx-auto",
        background: "#ffffff",
        borderWidth: "border",
        borderColor: "#d1d5db",
        borderRadius: "rounded-lg",
        shadow: "shadow-md",
      },
      children: [
        {
          id: "dn-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-dn-btn", "← Kembali ke Delivery Note", `/meridian/edit/DeliveryNote/${dn.id}`),
            button("print-dn-btn", "Cetak Surat Jalan", `/meridian/print/delivery-note/DeliveryNote/${dn.id}`, "primary", "truck"),
          ],
        },
        {
          id: "dn-header",
          type: "Column",
          style: { alignItems: "center", textAlign: "center", gap: "gap-1", borderWidth: "border-b", padding: "pb-4" },
          children: [
            text("dn-title", "SURAT JALAN & PENGANTAR BARANG", { fontSize: "text-2xl", fontWeight: 700 }),
            text("dn-number", `Nomor Surat Jalan : ${dn.id} | Resi: ${dn.trackingNo}`, { fontSize: "text-sm", fontWeight: 600 }),
          ],
        },
        {
          id: "dn-info-grid",
          type: "GridView",
          style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "gap-4" },
          children: [
            {
              id: "dn-sender",
              type: "Column",
              style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md" },
              children: [
                text("lbl-sender", "PENGIRIM (GUDANG ASAL)", { fontSize: "text-xs", fontWeight: 700 }),
                text("sender-name", "PT Meridian Trading Nusantara", { fontSize: "text-sm", fontWeight: 600 }),
                text("sender-wh", "Main Logistics Hub - Cengkareng", { fontSize: "text-xs" }),
                text("sender-so", `Referensi SO: ${dn.salesOrder}`, { fontSize: "text-xs", color: "{primitives.color.accent}" }),
              ],
            },
            {
              id: "dn-receiver",
              type: "Column",
              style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md" },
              children: [
                text("lbl-recv", "PENERIMA (TUJUAN KIRIM)", { fontSize: "text-xs", fontWeight: 700 }),
                text("recv-name", dn.customer, { fontSize: "text-sm", fontWeight: 600 }),
                text("recv-date", `Tanggal Kirim: ${dn.date}`, { fontSize: "text-xs" }),
                text("recv-channel", `Notifikasi Status: ${dn.reminderChannel}`, { fontSize: "text-xs" }),
              ],
            },
          ],
        },
        // 3 Signatures
        {
          id: "dn-signs",
          type: "GridView",
          style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "gap-4", padding: "pt-8", textAlign: "center" },
          children: [
            {
              id: "sign-gudang",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-gudang", "Diserahkan Oleh (Gudang)", { fontSize: "text-xs", fontWeight: 600 }),
                { id: "sp-1", type: "Spacer", style: { height: "h-14" } },
                text("name-gudang", "( Slamet Riyadi )", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "sign-driver",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-driver", "Pengemudi / Ekspedisi", { fontSize: "text-xs", fontWeight: 600 }),
                { id: "sp-2", type: "Spacer", style: { height: "h-14" } },
                text("name-driver", "( Driver Ekspedisi )", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "sign-cust",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-cust", "Diterima Dengan Baik Oleh", { fontSize: "text-xs", fontWeight: 600 }),
                { id: "sp-3", type: "Spacer", style: { height: "h-14" } },
                text("name-cust", "( .................................... )", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildPurchaseOrderPrintDocument(poId: string): UIDLDocument | undefined {
  const po = purchaseOrders.find((p) => p.id === poId);
  if (!po) return undefined;

  const poLines = po.lines.map((line, index) => ({
    no: `${index + 1}`,
    item: line.item,
    description: line.description,
    qty: `${line.quantity}`,
    rate: formatIDR(line.rate),
    amount: formatIDR(line.amount),
  }));

  return {
    version: "1.0.0",
    id: `print-purchase-order-${po.id}`,
    name: `Purchase Order - ${po.id}`,
    dataSources: {
      items: poLines,
    },
    root: {
      id: "po-print-page",
      type: "Column",
      style: {
        gap: "gap-4",
        padding: "p-6",
        maxWidth: "max-w-4xl",
        margin: "mx-auto",
        background: "#ffffff",
        borderWidth: "border",
        borderColor: "#d1d5db",
        borderRadius: "rounded-lg",
        shadow: "shadow-md",
      },
      children: [
        {
          id: "po-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-po-btn", "← Kembali ke PO", `/meridian/edit/PurchaseOrder/${po.id}`),
            button("print-po-btn", "Cetak Slip PO", `/meridian/print/purchase-order/PurchaseOrder/${po.id}`, "primary", "printer"),
          ],
        },
        {
          id: "po-header",
          type: "Column",
          style: { alignItems: "center", textAlign: "center", gap: "gap-1", borderWidth: "border-b", padding: "pb-4" },
          children: [
            text("po-title", "PURCHASE ORDER (PO)", { fontSize: "text-2xl", fontWeight: 700 }),
            text("po-no", `Nomor PO : ${po.id} | Tanggal: ${po.date} | Kirim: ${po.deliveryDate}`, { fontSize: "text-sm", fontWeight: 600 }),
          ],
        },
        {
          id: "po-vendor-box",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            text("lbl-vendor", "VENDOR / SUPPLIER :", { fontSize: "text-xs", fontWeight: 700 }),
            text("vendor-name", po.supplier, { fontSize: "text-sm", fontWeight: 600 }),
            text("vendor-ref", `Ref Penawaran: ${po.quotationRef ?? "-"}`, { fontSize: "text-xs" }),
            text("vendor-terms", "Syarat Pembayaran : Net 30 Days (Transfer Bank)", { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
        {
          id: "po-table",
          type: "DataTable",
          props: {
            title: "Daftar Barang yang Dipesan",
            dataSource: "items",
            columns: [
              { key: "no", label: "No", align: "center" },
              { key: "item", label: "Item Pesanan" },
              { key: "description", label: "Spesifikasi" },
              { key: "qty", label: "Qty", align: "right" },
              { key: "rate", label: "Harga Satuan", align: "right" },
              { key: "amount", label: "Subtotal", align: "right" },
            ],
          },
        },
        {
          id: "po-totals",
          type: "Column",
          style: { gap: "gap-1", alignItems: "flex-end", padding: "p-3" },
          children: [
            text("po-sub", `Subtotal: ${formatIDR(po.subtotal)}`, { fontSize: "text-sm" }),
            text("po-tax", `PPN 11%: ${formatIDR(po.tax)}`, { fontSize: "text-sm" }),
            text("po-grand", `Total PO: ${formatIDR(po.total)}`, { fontSize: "text-lg", fontWeight: 700 }),
          ],
        },
        // Authorization Signatures
        {
          id: "po-auth-signs",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-8", textAlign: "center" },
          children: [
            {
              id: "po-maker",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-maker", "Dibuat Oleh (Purchasing Officer)", { fontSize: "text-xs" }),
                { id: "po-sp-1", type: "Spacer", style: { height: "h-14" } },
                text("maker-name", "Budi Santoso", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "po-approver",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-approver", "Disetujui Oleh (Direktur Keuangan)", { fontSize: "text-xs" }),
                { id: "po-sp-2", type: "Spacer", style: { height: "h-14" } },
                text("approver-name", "Hendra Wijaya, S.E.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildCertificateOfAnalysisPrintDocument(id: string): UIDLDocument {
  const dhrId = id.startsWith("DHR") ? id : `DHR-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-coa-${dhrId}`,
    name: `Certificate of Analysis - ${dhrId}`,
    dataSources: {
      params: [
        { test: "Sterility Test (Bioburden)", spec: "0 CFU / 100ml (<10 CFU)", result: "0 CFU (Sterile)", status: "PASSED" },
        { test: "Ethylene Oxide (EtO) Residual", spec: "< 4.0 mg / device (ISO 10993-7)", result: "0.82 mg / device", status: "PASSED" },
        { test: "Particulate Matter (Cleanroom)", spec: "Class 10.000 (ISO 7)", result: "62.400 / m³", status: "PASSED" },
        { test: "Luer Lock Joint Tensile", spec: "> 25.0 N (ISO 80369-7)", result: "38.4 N", status: "PASSED" },
        { test: "Endotoxin (LAL Test)", spec: "< 0.25 EU / ml", result: "< 0.05 EU / ml", status: "PASSED" },
      ],
    },
    root: {
      id: "coa-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "coa-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-coa", "← Kembali ke Console", "/console/medical-device/dashboard"),
            { id: "coa-badge-iso", type: "Text", props: { text: "ISO 13485 & CE Mark Class IIa Certified" }, style: { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" } },
          ],
        },
        {
          id: "coa-header",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", gap: "gap-4", padding: "py-2" },
          children: [
            {
              id: "coa-title-col",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("coa-company", "PT MEDTECH PRECISION INDONESIA", { fontSize: "text-xl", fontWeight: 700 }),
                text("coa-sub", "Kawasan Industri MM2100 Blok B-12, Cikarang Barat | Telp: (021) 8984-2100", { fontSize: "text-xs" }),
                text("coa-title", "CERTIFICATE OF ANALYSIS (CoA)", { fontSize: "text-2xl", fontWeight: 700, textColor: "#111827" }),
                text("coa-no", `Doc No: CoA-${dhrId} | UDI-DI: 08991234500123`, { fontSize: "text-xs", fontWeight: 600 }),
              ],
            },
            {
              id: "coa-datamatrix-box",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                {
                  id: "udi-matrix",
                  type: "DataMatrix",
                  props: {
                    value: `(01)08991234500123(17)300209(10)LOT-2027-44`,
                    size: 64,
                  },
                },
                text("lbl-udi-txt", "UDI DataMatrix ISO 13485", { fontSize: "text-[10px]", fontWeight: 600 }),
              ],
            },
          ],
        },
        {
          id: "coa-info-box",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            text("lbl-coa-prod", "Product Name: Infusion Administration Set Sterile Class IIa", { fontSize: "text-sm", fontWeight: 700 }),
            text("coa-lot", `Lot / Batch Steril: ETO-LOT-2027-44 | Production Date: 2027-02-10 | Expiry Date: 2030-02-09`, { fontSize: "text-xs" }),
            text("coa-std", "Sterilization Method: 100% Ethylene Oxide (EtO) Cycle Validated per ISO 11135", { fontSize: "text-xs" }),
          ],
        },
        {
          id: "coa-table",
          type: "DataTable",
          props: {
            title: "Hasil Pengujian Parameter Mutu Fisik & Mikrobiologi",
            dataSource: "params",
            columns: [
              { key: "test", label: "Parameter Uji" },
              { key: "spec", label: "Spesifikasi Standar" },
              { key: "result", label: "Hasil Pengujian Lab" },
              { key: "status", label: "Status Kelayakan" },
            ],
          },
        },
        {
          id: "coa-conclusion",
          type: "Column",
          style: { padding: "p-3", borderWidth: "border", borderRadius: "rounded-md", background: "#f0fdf4" },
          children: [
            text("coa-conc-title", "KESIMPULAN QA (QUALITY ASSURANCE CONCLUSION):", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
            text("coa-conc-text", "Seluruh parameter uji memenuhi standar Cara Pembuatan Alat Kesehatan yang Baik (CPAKB) Kemenkes RI dan ISO 13485:2016. Produk dinyatakan LOLOS UJI dan AMAN UNTUK DIDISTRIBUSIKAN.", { fontSize: "text-xs", textColor: "#065f46" }),
          ],
        },
        {
          id: "coa-signs",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-6", textAlign: "center" },
          children: [
            {
              id: "coa-sign-1",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-analyst", "Analis Laboratorium QC", { fontSize: "text-xs" }),
                { id: "coa-sp-1", type: "Spacer", style: { height: "h-12" } },
                text("name-analyst", "apt. Rian Pratama, S.Farm.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "coa-sign-2",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-qa-head", "Head of Quality Assurance", { fontSize: "text-xs" }),
                { id: "coa-sp-2", type: "Spacer", style: { height: "h-12" } },
                text("name-qa", "dr. Maya Santika, M.Biomed", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildMedicalPrescriptionPrintDocument(id: string): UIDLDocument {
  const norm = id.startsWith("RM") ? id : `RM-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-prescription-${norm}`,
    name: `Resep Dokter - ${norm}`,
    dataSources: {
      medicines: [
        { no: "1", r: "R /", nama: "Amoxicillin 500mg Kapsul", dosis: "No. XV", signa: "S 3 dd 1 tab p.c. (Habiskan)", batch: "BATCH-2026-X09" },
        { no: "2", r: "R /", nama: "Paracetamol 500mg Tablet", dosis: "No. X", signa: "S 3 dd 1 tab p.r.n. (Demam/Nyeri)", batch: "BATCH-2026-P44" },
        { no: "3", r: "R /", nama: "Vitamin B Kompleks", dosis: "No. X", signa: "S 1 dd 1 tab p.c.", batch: "BATCH-2027-V02" },
      ],
    },
    root: {
      id: "presc-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "presc-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-presc", "← Kembali ke Console", "/console/hospital-medika/dashboard"),
            text("presc-inst", "Instalasi Farmasi RS Medika Nusantara", { fontSize: "text-xs", fontWeight: 700 }),
          ],
        },
        {
          id: "presc-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("rs-name", "RS MEDIKA NUSANTARA", { fontSize: "text-xl", fontWeight: 700 }),
            text("rs-addr", "Jl. Kesehatan No. 45 Jakarta Selatan | Telp: (021) 7890-1234", { fontSize: "text-xs" }),
            text("presc-title", "SALINAN RESEP DOKTER (APOTEK)", { fontSize: "text-lg", fontWeight: 700 }),
          ],
        },
        {
          id: "presc-patient-box",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "p-col-1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("p-norm", `No. Rekam Medis: ${norm}`, { fontSize: "text-xs", fontWeight: 700 }),
                text("p-name", "Nama Pasien: Budi Santoso (L / 48 Th)", { fontSize: "text-sm", fontWeight: 600 }),
                text("p-diag", "Diagnosa ICD-10: I10 - Hipertensi Primer", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "p-col-2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right", alignItems: "flex-end" },
              children: [
                {
                  id: "rm-barcode",
                  type: "Barcode",
                  props: {
                    value: norm,
                    width: 150,
                    height: 38,
                    showText: false,
                  },
                },
                text("p-doc", "Dokter: dr. Hendra Wijaya, Sp.PD", { fontSize: "text-xs", fontWeight: 700 }),
                text("p-sip", "SIP: 446/102/SIP/2026", { fontSize: "text-xs" }),
                text("p-date", "Tanggal: 14 Februari 2027", { fontSize: "text-xs" }),
              ],
            },
          ],
        },
        {
          id: "presc-table",
          type: "DataTable",
          props: {
            title: "Daftar Resep & Obat yang Dikeluarkan (FEFO Batch)",
            dataSource: "medicines",
            columns: [
              { key: "no", label: "No", align: "center" },
              { key: "r", label: "R/" },
              { key: "nama", label: "Nama Obat & Dosis" },
              { key: "dosis", label: "Jumlah" },
              { key: "signa", label: "Aturan Pakai" },
              { key: "batch", label: "No. Batch FEFO" },
            ],
          },
        },
        {
          id: "presc-signs",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-6", textAlign: "center" },
          children: [
            {
              id: "doc-sign",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-doc", "Tanda Tangan Dokter", { fontSize: "text-xs" }),
                { id: "sp-doc", type: "Spacer", style: { height: "h-12" } },
                text("name-doc", "dr. Hendra Wijaya, Sp.PD", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "pharm-sign",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-pharm", "Petugas Dispensing Apoteker", { fontSize: "text-xs" }),
                { id: "sp-pharm", type: "Spacer", style: { height: "h-12" } },
                text("name-pharm", "apt. Siti Rahmawati, S.Farm. (SIPA: 1988/02/2026)", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildAkadMurabahahPrintDocument(id: string): UIDLDocument {
  const akadId = id.startsWith("MRB") ? id : `MRB-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-akad-${akadId}`,
    name: `Akad Murabahah - ${akadId}`,
    dataSources: {
      installments: [
        { bln: "Bulan 1", pokok: "Rp 2.916.667", margin: "Rp 583.333", total: "Rp 3.500.000", sisa: "Rp 38.500.000" },
        { bln: "Bulan 2", pokok: "Rp 2.916.667", margin: "Rp 583.333", total: "Rp 3.500.000", sisa: "Rp 35.000.000" },
        { bln: "Bulan 3", pokok: "Rp 2.916.667", margin: "Rp 583.333", total: "Rp 3.500.000", sisa: "Rp 31.500.000" },
      ],
    },
    root: {
      id: "akad-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "akad-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-akad", "← Kembali ke Console", "/console/koperasi-bmt/dashboard"),
            text("akad-dps", "Dewan Pengawas Syariah (DPS) Terakreditasi DSN-MUI", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "akad-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("bmt-title", "KOPERASI & BMT SYARIAH MANDIRI", { fontSize: "text-xl", fontWeight: 700 }),
            text("bmt-sub", "SK Kemenkop & UKM No. 518/BH/MENKOP/2020 | Jakarta Selatan", { fontSize: "text-xs" }),
            text("akad-title-main", "SURAT PERJANJIAN AKAD PEMBIAYAAN MURABAHAH (JUAL-BELI)", { fontSize: "text-base", fontWeight: 700, textColor: "#111827" }),
            text("akad-no", `Nomor Akad: ${akadId} | Tanggal: 14 Februari 2027`, { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
        {
          id: "akad-clause",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            text("clause-1", "PIHAK PERTAMA (BMT Mandiri Syariah) sepakat menjual kepada PIHAK KEDUA (Anggota: Ahmad Fauzi, S.T., No. AGT-2024-00892) barang berupa 1 Unit Mesin CNC Router Industri Woodworking.", { fontSize: "text-xs" }),
            text("clause-2", "• Harga Beli Pokok BMT: Rp 35.000.000 (Tiga Puluh Lima Juta Rupiah)", { fontSize: "text-xs", fontWeight: 600 }),
            text("clause-3", "• Margin Keuntungan Disepakati: Rp 7.000.000 (Tujuh Juta Rupiah / Tenor 12 Bulan)", { fontSize: "text-xs", fontWeight: 600 }),
            text("clause-4", "• Total Harga Jual Murabahah: Rp 42.000.000 (Angsuran Rp 3.500.000 / Bulan)", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "install-table",
          type: "DataTable",
          props: {
            title: "Jadwal Angsuran Bulanan Murabahah",
            dataSource: "installments",
            columns: [
              { key: "bln", label: "Periode Angsuran" },
              { key: "pokok", label: "Angsuran Pokok", align: "right" },
              { key: "margin", label: "Margin Bagi Hasil", align: "right" },
              { key: "total", label: "Total Angsuran / Bln", align: "right" },
              { key: "sisa", label: "Sisa Kewajiban", align: "right" },
            ],
          },
        },
        {
          id: "akad-signs",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "flex-end", padding: "pt-6", textAlign: "center" },
          children: [
            {
              id: "sign-p1",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-p1", "Pihak Pertama (BMT)", { fontSize: "text-xs" }),
                { id: "sp-p1", type: "Spacer", style: { height: "h-12" } },
                text("name-p1", "Ust. Muhammad Ridwan, M.E.I.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "akad-qr-box",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                {
                  id: "dps-qr",
                  type: "QRCode",
                  props: {
                    value: `https://bmt-syariah.id/akad/${akadId}`,
                    size: 68,
                  },
                },
                text("lbl-dps-txt", "Verifikasi DPS DSN-MUI", { fontSize: "text-[10px]", fontWeight: 600 }),
              ],
            },
            {
              id: "sign-p2",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-p2", "Pihak Kedua (Anggota)", { fontSize: "text-xs" }),
                { id: "sp-p2", type: "Spacer", style: { height: "h-12" } },
                text("name-p2", "Ahmad Fauzi, S.T.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildPackingSlipPrintDocument(id: string): UIDLDocument {
  const ordId = id.startsWith("ORD") ? id : `ORD-SHP-${id}`;
  return {
    version: "1.0.0",
    id: `print-packing-${ordId}`,
    name: `Packing Slip - ${ordId}`,
    dataSources: {
      items: [
        { sku: "SKU-ELEK-001", nama: "Wireless ANC Headphone V5 Black", qty: "2 Pcs", loc: "Bin A-04-12", check: "[ OK ]" },
        { sku: "SKU-ELEK-002", nama: "Fast Charger GaN 65W Dual Port", qty: "1 Pc", loc: "Bin B-01-08", check: "[ OK ]" },
      ],
    },
    root: {
      id: "packing-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "packing-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-pack", "← Kembali ke Console", "/console/omnichannel-dist/dashboard"),
            text("pack-status", "Status: Ready to Ship (Pick & Pack Done)", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "packing-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("omni-co", "NUSANTARA OMNICHANNEL DISTRIBUTION", { fontSize: "text-xl", fontWeight: 700 }),
            text("omni-addr", "Fulfillment Hub Jakarta Barat, Kawasan Pergudangan Daan Mogot KM 12", { fontSize: "text-xs" }),
            text("pack-title", "SHIPPING LABEL & PACKING SLIP", { fontSize: "text-lg", fontWeight: 700 }),
          ],
        },
        {
          id: "pack-meta",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "pack-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("ord-no", `No Pesanan Marketplace: ${ordId}`, { fontSize: "text-sm", fontWeight: 700 }),
                text("ord-chan", "Sales Channel: Lapakku Official Store", { fontSize: "text-xs", fontWeight: 600 }),
                text("ord-buy", "Penerima: Andi Saputra | Telp: 0812-9876-5432", { fontSize: "text-xs" }),
                text("ord-dest", "Alamat: Jl. Anggrek Cendrawasih No. 18, Kemanggisan, Palmerah, Jakarta Barat 11480", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "pack-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right", alignItems: "flex-end" },
              children: [
                {
                  id: "resi-barcode",
                  type: "Barcode",
                  props: {
                    value: "JT992108821",
                    width: 170,
                    height: 42,
                    showText: true,
                  },
                },
                text("ord-courier", "Ekspedisi: KirimCepat (Reguler)", { fontSize: "text-xs", fontWeight: 700 }),
                text("ord-hub", "Fulfillment Hub: Jakarta Barat", { fontSize: "text-xs" }),
              ],
            },
          ],
        },
        {
          id: "pack-table",
          type: "DataTable",
          props: {
            title: "Daftar Item Barang dalam Paket",
            dataSource: "items",
            columns: [
              { key: "sku", label: "SKU" },
              { key: "nama", label: "Nama Produk" },
              { key: "qty", label: "Kuantitas", align: "right" },
              { key: "loc", label: "Bin Lokasi Gudang" },
              { key: "check", label: "Verifikasi QC Barcode" },
            ],
          },
        },
        {
          id: "pack-footer",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-4", textAlign: "center" },
          children: [
            text("pack-officer", "Picker & Packer: Budi S. (ID #14)", { fontSize: "text-xs" }),
            text("pack-time", "Packed Time: 2027-02-14 11:20:45", { fontSize: "text-xs" }),
          ],
        },
      ],
    },
  };
}

export function buildPosReceiptPrintDocument(id: string): UIDLDocument {
  const receiptId = id.startsWith("POS") ? id : `POS-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-pos-${receiptId}`,
    name: `Struk Kasir POS - ${receiptId}`,
    dataSources: {
      items: [
        { nama: "Sneakers Alpha High (Size 42)", qty: "1 Pasang", rate: "Rp 450.000", amount: "Rp 450.000" },
        { nama: "Kaos Kaki Bamboo Fiber", qty: "2 Pasang", rate: "Rp 35.000", amount: "Rp 70.000" },
      ],
    },
    root: {
      id: "pos-page",
      type: "Column",
      style: { gap: "gap-3", padding: "p-6", maxWidth: "max-w-md", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "pos-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-3" },
          children: [
            button("back-btn-pos", "← Kembali ke Console", "/console/shoe-company/dashboard"),
            text("pos-paid-badge", "PAID (LUNAS)", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "pos-head",
          type: "Column",
          style: { textAlign: "center", gap: "gap-0.5", alignItems: "center" },
          children: [
            text("pos-co", "TOKO SEPATU NUSANTARA", { fontSize: "text-lg", fontWeight: 700 }),
            text("pos-addr", "Grand Indonesia Mall Lt. 3 Unit 12, Jakarta", { fontSize: "text-xs" }),
            text("pos-title", "STRUK KASIR & BUKTI TRANSAKSI POS", { fontSize: "text-xs", fontWeight: 700 }),
            text("pos-no", `No Transaksi: ${receiptId}`, { fontSize: "text-xs", fontWeight: 600 }),
            text("pos-date", "14 Feb 2027 15:42 WIB | Kasir: Cindy P.", { fontSize: "text-[11px]" }),
          ],
        },
        {
          id: "pos-items",
          type: "DataTable",
          props: {
            title: "Rincian Pembelian",
            dataSource: "items",
            columns: [
              { key: "nama", label: "Item Barang" },
              { key: "qty", label: "Qty", align: "center" },
              { key: "amount", label: "Subtotal", align: "right" },
            ],
          },
        },
        {
          id: "pos-calc",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border-t", padding: "pt-2", fontSize: "text-xs" },
          children: [
            {
              id: "row-sub",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("lbl-sub", "Subtotal"), text("val-sub", "Rp 520.000", { fontWeight: 600 })],
            },
            {
              id: "row-disc",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("lbl-disc", "Diskon Member (10%)"), text("val-disc", "-Rp 52.000", { fontWeight: 600, textColor: "#059669" })],
            },
            {
              id: "row-ppn",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("lbl-ppn", "PPN 11% (Sudah Termasuk)"), text("val-ppn", "Rp 46.378")],
            },
            {
              id: "row-tot",
              type: "Row",
              style: { justifyContent: "space-between", borderWidth: "border-t", padding: "pt-1" },
              children: [text("lbl-tot", "TOTAL PEMBAYARAN", { fontWeight: 700 }), text("val-tot", "Rp 468.000", { fontWeight: 700, fontSize: "text-sm" })],
            },
          ],
        },
        {
          id: "pos-qr-center",
          type: "Column",
          style: { alignItems: "center", gap: "gap-1", padding: "pt-2" },
          children: [
            {
              id: "pos-qris",
              type: "QRCode",
              props: {
                value: `https://qris.id/pay/tsn/${receiptId}`,
                size: 72,
              },
            },
            text("pos-qris-txt", "Pembayaran: QRIS (Sukses)", { fontSize: "text-[10px]", fontWeight: 600 }),
            text("pos-thanks", "Terima kasih telah berbelanja di Toko Sepatu Nusantara", { fontSize: "text-[11px]", textAlign: "center" }),
          ],
        },
      ],
    },
  };
}

export function buildTuitionInvoicePrintDocument(id: string): UIDLDocument {
  const nisId = id.startsWith("NIS") ? id : `NIS-${id}`;
  return {
    version: "1.0.0",
    id: `print-tuition-${nisId}`,
    name: `Tagihan SPP - ${nisId}`,
    dataSources: {
      fees: [
        { no: "1", kom: "SPP Bulanan (Februari 2027)", nom: "Rp 650.000", ket: "Wajib" },
        { no: "2", kom: "Iuran Praktikum Komputer & Sains", nom: "Rp 150.000", ket: "Reguler" },
        { no: "3", kom: "Kegiatan Ekstrakurikuler Robotik", nom: "Rp 100.000", ket: "Pilihan" },
      ],
    },
    root: {
      id: "tuition-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "tui-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-tui", "← Kembali ke Console", "/console/school-abc/dashboard"),
            text("tui-badge", "Status Tagihan: Terbit (Active Bill)", { fontSize: "text-xs", fontWeight: 700, textColor: "#0284c7" }),
          ],
        },
        {
          id: "tui-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("sch-name", "SEKOLAH ISLAM TERPADU ABC", { fontSize: "text-xl", fontWeight: 700 }),
            text("sch-addr", "Jl. Pendidikan No. 45, Cibubur, Jakarta Timur | Telp. (021) 8775-9920", { fontSize: "text-xs" }),
            text("tui-title", "SURAT TAGIHAN SPP & BIAYA PENDIDIKAN", { fontSize: "text-base", fontWeight: 700 }),
          ],
        },
        {
          id: "tui-student-info",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "tui-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("stu-nis", `Nomor Induk Siswa (NIS): ${nisId}`, { fontSize: "text-xs", fontWeight: 700 }),
                text("stu-nama", "Nama Siswa: Muhammad Farhan Al-Ghifari", { fontSize: "text-xs", fontWeight: 600 }),
                text("stu-kelas", "Kelas / Program: 8-A (Tahfidz & Sains)", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "tui-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right" },
              children: [
                text("stu-wali", "Wali Murid: Bpk. Hendra Gunawan", { fontSize: "text-xs" }),
                text("stu-va", "Virtual Account: 88029-2027010412", { fontSize: "text-xs", fontWeight: 700, textColor: "#0284c7" }),
                text("stu-due", "Jatuh Tempo: 10 Maret 2027", { fontSize: "text-xs", textColor: "#dc2626", fontWeight: 600 }),
              ],
            },
          ],
        },
        {
          id: "tui-table",
          type: "DataTable",
          props: {
            title: "Rincian Komponen Biaya Pendidikan",
            dataSource: "fees",
            columns: [
              { key: "no", label: "No", align: "center" },
              { key: "kom", label: "Komponen Biaya" },
              { key: "nom", label: "Nominal", align: "right" },
              { key: "ket", label: "Keterangan" },
            ],
          },
        },
        {
          id: "tui-total-box",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "#f0fdf4" },
          children: [
            text("tui-terbilang", "Terbilang: Sembilan Ratus Ribu Rupiah", { fontSize: "text-xs", italic: true }),
            text("tui-total-nom", "TOTAL TAGIHAN: Rp 900.000", { fontSize: "text-base", fontWeight: 700, textColor: "#15803d" }),
          ],
        },
        {
          id: "tui-signs",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "flex-end", padding: "pt-6", textAlign: "center" },
          children: [
            {
              id: "tui-bendahara",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("tui-lbl-b", "Bagian Keuangan & SPP", { fontSize: "text-xs" }),
                { id: "sp-tb", type: "Spacer", style: { height: "h-12" } },
                text("tui-name-b", "Umi Salmah, S.E.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
            {
              id: "tui-qris-box",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                {
                  id: "tui-qr",
                  type: "QRCode",
                  props: {
                    value: `https://sekolah-abc.sch.id/pay/${nisId}`,
                    size: 64,
                  },
                },
                text("tui-qr-lbl", "Scan QRIS Pembayaran", { fontSize: "text-[10px]", fontWeight: 600 }),
              ],
            },
            {
              id: "tui-kepsek",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("tui-lbl-k", "Kepala Sekolah", { fontSize: "text-xs" }),
                { id: "sp-tk", type: "Spacer", style: { height: "h-12" } },
                text("tui-name-k", "Drs. H. Ahmad Dahlan, M.Pd.", { fontSize: "text-xs", fontWeight: 700 }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildWorkOrderPrintDocument(id: string): UIDLDocument {
  const woId = id.startsWith("WO") ? id : `WO-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-wo-${woId}`,
    name: `Surat Perintah Kerja (SPK) - ${woId}`,
    dataSources: {
      materials: [
        { sku: "MAT-RAW-001", nama: "Kulit Sapi Samak Grade A (Black)", qty: "120 Lembar", loc: "Gudang A1" },
        { sku: "MAT-RAW-002", nama: "Outsole TPR Injection Mold (Size 42)", qty: "500 Pasang", loc: "Gudang B2" },
        { sku: "MAT-RAW-003", nama: "Insole Memory Foam Ortholite", qty: "500 Pasang", loc: "Gudang B1" },
      ],
      routing: [
        { op: "10-CUT", step: "Pola & Cutting Upper Kulit", ws: "Cutting Area 01", lead: "Joko W.", stat: "DONE" },
        { op: "20-SEW", step: "Stitching & Sewing Upper", ws: "Sewing Line 04", lead: "Rina M.", stat: "IN PROGRESS" },
        { op: "30-ASM", step: "Sole Injection & Lasting", ws: "Assembly 02", lead: "Dedi S.", stat: "QUEUED" },
        { op: "40-QC", step: "Final Inspection & Packing", ws: "QC Release 01", lead: "Sari A.", stat: "QUEUED" },
      ],
    },
    root: {
      id: "wo-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "wo-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-wo", "← Kembali ke Console", "/console/factory-abc/dashboard"),
            text("wo-stat-badge", "Status: Released to Production (WIP)", { fontSize: "text-xs", fontWeight: 700, textColor: "#d97706" }),
          ],
        },
        {
          id: "wo-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("mfg-co", "PT PABRIK NUSANTARA MANUFAKTUR", { fontSize: "text-xl", fontWeight: 700 }),
            text("mfg-addr", "Kawasan Industri MM2100 Blok C-12, Cikarang Barat, Bekasi", { fontSize: "text-xs" }),
            text("wo-title", "SURAT PERINTAH KERJA (SPK) & ROUTING PRODUKSI", { fontSize: "text-base", fontWeight: 700 }),
          ],
        },
        {
          id: "wo-meta",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "wo-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("wo-no-txt", `Nomor SPK / WO: ${woId}`, { fontSize: "text-sm", fontWeight: 700 }),
                text("wo-item", "Item Produk: Leather Sneaker Pro Series", { fontSize: "text-xs", fontWeight: 600 }),
                text("wo-batch", "Rencana Batch: 500 Pasang", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "wo-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right", alignItems: "flex-end" },
              children: [
                {
                  id: "wo-barcode",
                  type: "Barcode",
                  props: {
                    value: woId,
                    width: 160,
                    height: 38,
                    showText: true,
                  },
                },
                text("wo-deadline", "Target Selesai: 24 Februari 2027", { fontSize: "text-xs", fontWeight: 600 }),
              ],
            },
          ],
        },
        {
          id: "wo-mat-table",
          type: "DataTable",
          props: {
            title: "Alokasi Bill of Materials (BOM) & Kebutuhan Bahan",
            dataSource: "materials",
            columns: [
              { key: "sku", label: "Kode Material" },
              { key: "nama", label: "Deskripsi Bahan Baku" },
              { key: "qty", label: "Qty Alokasi", align: "right" },
              { key: "loc", label: "Lokasi Gudang" },
            ],
          },
        },
        {
          id: "wo-rout-table",
          type: "DataTable",
          props: {
            title: "Tahapan Workstation Routing & Pengawasan",
            dataSource: "routing",
            columns: [
              { key: "op", label: "Kode Op", align: "center" },
              { key: "step", label: "Tahapan Pengerjaan" },
              { key: "ws", label: "Workstation / Mesin" },
              { key: "lead", label: "Kepala Regu" },
              { key: "stat", label: "Progress Status" },
            ],
          },
        },
        {
          id: "wo-footer",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-4", textAlign: "center" },
          children: [
            text("wo-ppic", "Disetujui PPIC: Ir. Agus Setiawan", { fontSize: "text-xs", fontWeight: 600 }),
            text("wo-mgr", "Manajer Produksi: Bambang Haryadi, S.T.", { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
      ],
    },
  };
}

export function buildRoastingProfilePrintDocument(id: string): UIDLDocument {
  const batchId = id.startsWith("ROAST") ? id : `ROAST-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-roast-${batchId}`,
    name: `Roasting Log - ${batchId}`,
    dataSources: {
      cupping: [
        { atribut: "Fragrance / Aroma", score: "8.75", notes: "Jasmine Blossom, Ripe Bergamot, Black Currant" },
        { atribut: "Flavor", score: "8.75", notes: "Dark Cherry Jam, Brown Sugar, Orange Peel" },
        { atribut: "Aftertaste", score: "8.50", notes: "Lingering Cacao Nibs, Sweet Clean Finish" },
        { atribut: "Acidity", score: "8.75", notes: "Bright Malic & Tartaric Wine Acidity" },
        { atribut: "Body", score: "8.50", notes: "Silky, Round, Medium-Heavy Coating" },
        { atribut: "Clean Cup & Balance", score: "9.00", notes: "Flawless uniformity across 5 test cups" },
      ],
    },
    root: {
      id: "roast-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "roast-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-roast", "← Kembali ke Console", "/console/food-roasters/dashboard"),
            text("roast-grade-badge", "SCA SPECIALTY GRADE 1 (SCORE: 88.25)", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "roast-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("roast-co", "NUSANTARA SPECIALTY COFFEE ROASTERS", { fontSize: "text-xl", fontWeight: 700 }),
            text("roast-sub", "Roastery & SCA Certified Lab | Jl. Senopati No. 88, Jakarta Selatan", { fontSize: "text-xs" }),
            text("roast-title", "BATCH ROASTING LOG & SENSORY CUPPING SCORECARD", { fontSize: "text-base", fontWeight: 700 }),
          ],
        },
        {
          id: "roast-meta",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "roast-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("r-batch", `Nomor Batch: ${batchId}`, { fontSize: "text-sm", fontWeight: 700 }),
                text("r-origin", "Origin: Arabica Gayo Anaerobic Wine Process", { fontSize: "text-xs", fontWeight: 600 }),
                text("r-alt", "Ketinggian: 1.550 - 1.700 MDPL | Varietas: Typica, Catimor", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "roast-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right" },
              children: [
                text("r-machine", "Mesin Roasting: Giesen W6A (Batch 5.0 Kg)", { fontSize: "text-xs", fontWeight: 600 }),
                text("r-agtron", "Agtron Gourmet: 62 / 78 (Medium Light Filter)", { fontSize: "text-xs", fontWeight: 700, textColor: "#d97706" }),
                text("r-drop", "First Crack: 8:45 (198°C) | Drop Time: 10:30 (208°C)", { fontSize: "text-xs" }),
              ],
            },
          ],
        },
        {
          id: "roast-table",
          type: "DataTable",
          props: {
            title: "SCA Sensory Cupping Evaluation (Q-Grader Protocol)",
            dataSource: "cupping",
            columns: [
              { key: "atribut", label: "Atribut Sensorik" },
              { key: "score", label: "Skor (Max 10)", align: "center" },
              { key: "notes", label: "Deskriptor Cita Rasa & Tasting Notes" },
            ],
          },
        },
        {
          id: "roast-signs",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", padding: "pt-4", textAlign: "center" },
          children: [
            text("r-roaster", "Head Roaster: Dimas Anggoro (ID #R04)", { fontSize: "text-xs", fontWeight: 600 }),
            text("r-qgrader", "Certified Q-Arabica Grader: Lisa Permata (CQI #40921)", { fontSize: "text-xs", fontWeight: 700 }),
          ],
        },
      ],
    },
  };
}

export function buildBastPrintDocument(id: string): UIDLDocument {
  const bastId = id.startsWith("BAST") ? id : `BAST-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-bast-${bastId}`,
    name: `BAST Proyek - ${bastId}`,
    dataSources: {
      wbs: [
        { wbs: "1.0", desc: "Pekerjaan Pondasi Deep Bored Pile & Struktur Baja", bobot: "35.0%", prog: "35.0%", stat: "100% Selesai" },
        { wbs: "2.0", desc: "Instalasi Boiler & Sterilizer Vessel 45 TPH", bobot: "30.0%", prog: "28.5%", stat: "95% Selesai" },
        { wbs: "3.0", desc: "Piping & Electrical Instrumentation PLC", bobot: "25.0%", prog: "20.0%", stat: "80% Selesai" },
        { wbs: "4.0", desc: "Commissioning & Test Run Dry-Load", bobot: "10.0%", prog: "0.0%", stat: "Persiapan" },
      ],
    },
    root: {
      id: "bast-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "bast-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-bast", "← Kembali ke Console", "/console/epc-contractor/dashboard"),
            text("bast-appr-badge", "STATUS BAST: APPROVED & VERIFIED", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "bast-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("epc-co", "PT MAHAKARYA KONSTRUKSI EPC INDONESIA", { fontSize: "text-xl", fontWeight: 700 }),
            text("epc-sub", "General Contractor, Engineering & Industrial Plant Construction", { fontSize: "text-xs" }),
            text("bast-title", "BERITA ACARA SERAH TERIMA (BAST) & PROGRES TERMIN PROYEK", { fontSize: "text-base", fontWeight: 700 }),
            text("bast-no-txt", `Nomor Dokumen: ${bastId} | Tanggal: 14 Februari 2027`, { fontSize: "text-xs", fontWeight: 600 }),
          ],
        },
        {
          id: "bast-proj-info",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "bast-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("p-title", "Nama Proyek: Pembangunan Pabrik Kelapa Sawit (PKS) 45 TPH", { fontSize: "text-xs", fontWeight: 700 }),
                text("p-owner", "Pemilik Proyek: PT Sawit Nusantara Gemilang Tbk", { fontSize: "text-xs" }),
                text("p-loc", "Lokasi: Kotawaringin Timur, Kalimantan Tengah", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "bast-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right" },
              children: [
                text("p-contract", "No Kontrak: EPC-2026-CTR-088", { fontSize: "text-xs", fontWeight: 600 }),
                text("p-val", "Nilai Kontrak Total: Rp 45.000.000.000", { fontSize: "text-xs", fontWeight: 700 }),
                text("p-prog", "Progres Kumulatif: 83.50% (Termin Ke-3)", { fontSize: "text-xs", textColor: "#059669", fontWeight: 700 }),
              ],
            },
          ],
        },
        {
          id: "bast-table",
          type: "DataTable",
          props: {
            title: "Rincian Capaian Work Breakdown Structure (WBS)",
            dataSource: "wbs",
            columns: [
              { key: "wbs", label: "WBS", align: "center" },
              { key: "desc", label: "Uraian Lingkup Pekerjaan" },
              { key: "bobot", label: "Bobot (%)", align: "right" },
              { key: "prog", label: "Capaian (%)", align: "right" },
              { key: "stat", label: "Status Lapangan" },
            ],
          },
        },
        {
          id: "bast-fin",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", fontSize: "text-xs" },
          children: [
            text("fin-title", "Rincian Finansial Pembayaran Termin:", { fontWeight: 700 }),
            text("fin-1", "• Nilai Klaim Termin 3 (Progres 83.5%): Rp 12.500.000.000", { fontWeight: 600 }),
            text("fin-2", "• Potongan Retensi Pemeliharaan (5%): -Rp 625.000.000", { textColor: "#6b7280" }),
            text("fin-3", "• Potongan PPh Final Jasa Konstruksi (2.65%): -Rp 314.687.500", { textColor: "#6b7280" }),
            text("fin-4", "• Jumlah Bersih Pembayaran (Net Payable): Rp 11.560.312.500", { fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "bast-signs",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-6", textAlign: "center" },
          children: [
            {
              id: "sign-kontraktor",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-k", "Pihak Kontraktor (EPC)", { fontSize: "text-xs" }),
                { id: "sp-k", type: "Spacer", style: { height: "h-12" } },
                text("nm-k", "Ir. Hartono Wibowo", { fontSize: "text-xs", fontWeight: 700 }),
                text("pos-k", "Project Director", { fontSize: "text-[11px]" }),
              ],
            },
            {
              id: "sign-konsultan",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-ks", "Konsultan Pengawas", { fontSize: "text-xs" }),
                { id: "sp-ks", type: "Spacer", style: { height: "h-12" } },
                text("nm-ks", "Ir. Dani Santoso, IPM", { fontSize: "text-xs", fontWeight: 700 }),
                text("pos-ks", "Lead Supervision Eng.", { fontSize: "text-[11px]" }),
              ],
            },
            {
              id: "sign-owner",
              type: "Column",
              style: { alignItems: "center", gap: "gap-1" },
              children: [
                text("lbl-o", "Pemilik Proyek (Owner)", { fontSize: "text-xs" }),
                { id: "sp-o", type: "Spacer", style: { height: "h-12" } },
                text("nm-o", "Drs. Hendri Tanjung", { fontSize: "text-xs", fontWeight: 700 }),
                text("pos-o", "VP Engineering & Ops", { fontSize: "text-[11px]" }),
              ],
            },
          ],
        },
      ],
    },
  };
}

export function buildCommercialQuotationPrintDocument(id: string): UIDLDocument {
  const quoteId = id.startsWith("QUO") ? id : `QUO-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-quotation-${quoteId}`,
    name: `Penawaran Komersial - ${quoteId}`,
    dataSources: {
      items: [
        { sku: "CRM-ENT-100", nama: "Enterprise CRM Platform License (100 User Seats)", qty: "1 Thn", amount: "Rp 120.000.000" },
        { sku: "CRM-AI-ORCH", nama: "Multi-Channel AI Agent Orchestrator Add-on", qty: "1 Thn", amount: "Rp 36.000.000" },
        { sku: "CRM-DEPLOY-HYB", nama: "On-Premise & Cloud Hybrid Dedicated Deployment", qty: "1 Lot", amount: "Rp 45.000.000" },
        { sku: "CRM-SLA-GOLD", nama: "Enterprise SLA Gold 24/7 (99.9% Uptime Support)", qty: "1 Thn", amount: "Rp 24.000.000" },
      ],
    },
    root: {
      id: "quote-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "quote-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-quo", "← Kembali ke Console", "/console/crm-pipeline/dashboard"),
            text("quo-valid-badge", "Proposal Valid s/d 15 Maret 2027", { fontSize: "text-xs", fontWeight: 700, textColor: "#0284c7" }),
          ],
        },
        {
          id: "quote-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("crm-co", "ENTERPRISE CRM PIPELINE & CLOUD SOLUTIONS", { fontSize: "text-xl", fontWeight: 700 }),
            text("crm-sub", "Pacific Century Place Lt. 29, SCBD Lot 10, Jl. Jend. Sudirman, Jakarta", { fontSize: "text-xs" }),
            text("quote-title", "SURAT PENAWARAN HARGA KOMERSIAL (COMMERCIAL QUOTATION)", { fontSize: "text-base", fontWeight: 700 }),
          ],
        },
        {
          id: "quote-meta",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "q-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("q-no", `Nomor Penawaran: ${quoteId}`, { fontSize: "text-sm", fontWeight: 700 }),
                text("q-client", "Kepada: PT Dirgantara Digital Nusantara", { fontSize: "text-xs", fontWeight: 600 }),
                text("q-attn", "Attn: Bpk. Kevin Pratama (VP Technology)", { fontSize: "text-xs" }),
              ],
            },
            {
              id: "q-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right" },
              children: [
                text("q-ae", "Account Exec: Maya Kusuma, S.Kom.", { fontSize: "text-xs", fontWeight: 600 }),
                text("q-email", "Email: enterprise-sales@crmpipeline.io", { fontSize: "text-xs" }),
                text("q-term", "Syarat Pembayaran: Net 30 Days", { fontSize: "text-xs", fontWeight: 600 }),
              ],
            },
          ],
        },
        {
          id: "quote-table",
          type: "DataTable",
          props: {
            title: "Rincian Lisensi & Layanan Implementasi",
            dataSource: "items",
            columns: [
              { key: "sku", label: "Kode Layanan" },
              { key: "nama", label: "Deskripsi Produk & SLA" },
              { key: "qty", label: "Durasi / Satuan", align: "center" },
              { key: "amount", label: "Harga Penawaran", align: "right" },
            ],
          },
        },
        {
          id: "quote-total-box",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border-t", padding: "pt-2", fontSize: "text-xs" },
          children: [
            {
              id: "q-r1",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("ql-sub", "Subtotal Bruto"), text("qv-sub", "Rp 225.000.000", { fontWeight: 600 })],
            },
            {
              id: "q-r2",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("ql-disc", "Diskon Multi-Year Contract (15%)"), text("qv-disc", "-Rp 33.750.000", { fontWeight: 600, textColor: "#059669" })],
            },
            {
              id: "q-r3",
              type: "Row",
              style: { justifyContent: "space-between" },
              children: [text("ql-ppn", "PPN 11%"), text("qv-ppn", "Rp 21.037.500")],
            },
            {
              id: "q-r4",
              type: "Row",
              style: { justifyContent: "space-between", borderWidth: "border-t", padding: "pt-1" },
              children: [text("ql-tot", "TOTAL NILAI KONTRAK", { fontWeight: 700 }), text("qv-tot", "Rp 212.287.500", { fontWeight: 700, fontSize: "text-sm", textColor: "#059669" })],
            },
          ],
        },
        {
          id: "quote-signs",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", padding: "pt-4", textAlign: "center" },
          children: [
            text("q-rep", "Sales Director: Randy Gunawan", { fontSize: "text-xs", fontWeight: 700 }),
            {
              id: "q-qr",
              type: "QRCode",
              props: {
                value: `https://crmpipeline.io/accept/${quoteId}`,
                size: 64,
              },
            },
            text("q-acc", "Persetujuan Klien (Sign & Stamp)", { fontSize: "text-xs", fontWeight: 700 }),
          ],
        },
      ],
    },
  };
}

export function buildSlaIncidentReportPrintDocument(id: string): UIDLDocument {
  const ticketId = id.startsWith("TICK") ? id : `TICK-2027-${id}`;
  return {
    version: "1.0.0",
    id: `print-incident-${ticketId}`,
    name: `Laporan SLA - ${ticketId}`,
    dataSources: {
      timeline: [
        { jam: "08:14 WIB", event: "Automated alert triggered: Database pool latency spike > 2500ms" },
        { jam: "08:18 WIB", event: "Tier-3 On-Call SRE acknowledged incident (First Response: 4 mins, SLA: <15 mins)" },
        { jam: "08:35 WIB", event: "Root cause identified: Webhook surge from batch payment settlement" },
        { jam: "08:50 WIB", event: "Fix deployed: Scaled DB pool to 500 & enabled Redis backpressure limiter" },
        { jam: "09:02 WIB", event: "Traffic normalized, error rate 0.00%, all customer APIs operational" },
      ],
    },
    root: {
      id: "incident-page",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6", maxWidth: "max-w-4xl", margin: "mx-auto", background: "#ffffff", borderWidth: "border", borderColor: "#d1d5db", borderRadius: "rounded-lg", shadow: "shadow-md" },
      children: [
        {
          id: "inc-nav",
          type: "Row",
          style: { justifyContent: "space-between", alignItems: "center", borderWidth: "border-b", padding: "pb-4" },
          children: [
            button("back-btn-inc", "← Kembali ke Console", "/console/helpdesk/dashboard"),
            text("inc-sla-badge", "SLA COMPLIANCE: 100% (MTTR 48 MINS < 60 MINS)", { fontSize: "text-xs", fontWeight: 700, textColor: "#059669" }),
          ],
        },
        {
          id: "inc-header",
          type: "Column",
          style: { textAlign: "center", gap: "gap-1" },
          children: [
            text("help-co", "CLOUDDESK GLOBAL SUPPORT CENTER", { fontSize: "text-xl", fontWeight: 700 }),
            text("help-sub", "24/7 Enterprise Tier-3 Support Operations | ISO 20000 / ITIL Certified", { fontSize: "text-xs" }),
            text("inc-title", "INCIDENT POST-MORTEM & SLA RESOLUTION CERTIFICATE", { fontSize: "text-base", fontWeight: 700 }),
          ],
        },
        {
          id: "inc-meta",
          type: "Row",
          style: { justifyContent: "space-between", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", background: "{primitives.color.surface}" },
          children: [
            {
              id: "i-c1",
              type: "Column",
              style: { gap: "gap-1" },
              children: [
                text("i-no", `Nomor Tiket: ${ticketId}`, { fontSize: "text-sm", fontWeight: 700 }),
                text("i-cust", "Klien / Pelanggan: FinTech Nusantara Corp", { fontSize: "text-xs", fontWeight: 600 }),
                text("i-sev", "Tingkat Keparahan: P1 - Critical Service Degraded", { fontSize: "text-xs", textColor: "#dc2626", fontWeight: 700 }),
              ],
            },
            {
              id: "i-c2",
              type: "Column",
              style: { gap: "gap-1", textAlign: "right" },
              children: [
                text("i-lead", "Incident Commander: Fahmi Aziz (Lead SRE)", { fontSize: "text-xs", fontWeight: 600 }),
                text("i-csat", "Customer CSAT Score: ★★★★★ 5.0 / 5.0", { fontSize: "text-xs", fontWeight: 700, textColor: "#d97706" }),
                text("i-res", "Status Resolusi: Closed & Permanently Mitigated", { fontSize: "text-xs", textColor: "#059669", fontWeight: 600 }),
              ],
            },
          ],
        },
        {
          id: "inc-table",
          type: "DataTable",
          props: {
            title: "Kronologi & Timeline Penanganan Insiden",
            dataSource: "timeline",
            columns: [
              { key: "jam", label: "Waktu (WIB)", align: "center" },
              { key: "event", label: "Aktivitas Mitigasi & Langkah Penanganan" },
            ],
          },
        },
        {
          id: "inc-rca",
          type: "Column",
          style: { gap: "gap-1", borderWidth: "border", padding: "p-3", borderRadius: "rounded-md", fontSize: "text-xs" },
          children: [
            text("rca-t", "Root-Cause Analysis & Tindakan Pencegahan:", { fontWeight: 700 }),
            text("rca-1", "• Akar Masalah: Lonjakan webhook batch settlement menyebabkan koneksi database pool jenuh.", { fontWeight: 600 }),
            text("rca-2", "• Mitigasi Permanen: Penambahan auto-scaling pool 500 koneksi + Redis token-bucket rate limiter."),
            text("rca-3", "• Audit Kepuasan: Pelanggan mengonfirmasi SLA response dan recovery tercapai sesuai target kontrak Gold.", { textColor: "#059669", fontWeight: 600 }),
          ],
        },
        {
          id: "inc-footer",
          type: "Row",
          style: { justifyContent: "space-between", padding: "pt-4", textAlign: "center" },
          children: [
            text("inc-sre", "Lead SRE: Fahmi Aziz", { fontSize: "text-xs", fontWeight: 600 }),
            text("inc-vp", "VP of Engineering Support: Ir. Gunawan Pratama", { fontSize: "text-xs", fontWeight: 700 }),
          ],
        },
      ],
    },
  };
}
