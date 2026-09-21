import type { UIDLDocument } from "../types";

export interface AIPromptTemplate {
  id: string;
  name: string;
  category: string;
  document: UIDLDocument;
}

/**
 * Service that analyzes natural language prompts and generates schema-compliant UIDL documents.
 */
export function generateUidlFromPrompt(prompt: string): UIDLDocument {
  const q = prompt.toLowerCase();

  if (q.includes("rental") || q.includes("mobil") || q.includes("armada") || q.includes("vehicle")) {
    return {
      version: "1.0.0",
      id: "ai-rental-fleet-console",
      name: "Nusantara Car Rental & Fleet Operations",
      dataSources: {
        fleet: [
          { noPlat: "B 1024 SKA", tipe: "Innova Zenix Hybrid", status: "Disewa (Active)", customer: "PT Karya Abadi", tarifHari: "Rp 850.000", pengembalian: "24 Aug 2026" },
          { noPlat: "B 2488 WZA", tipe: "Avanza Veloz 1.5", status: "Tersedia (Ready)", customer: "-", tarifHari: "Rp 450.000", pengembalian: "-" },
          { noPlat: "B 9912 TYU", tipe: "Fortuner GR Sport", status: "Servis Berkala", customer: "-", tarifHari: "Rp 1.200.000", pengembalian: "22 Aug 2026" },
        ],
        chart: [
          { label: "Senin", value: 85 },
          { label: "Selasa", value: 92 },
          { label: "Rabu", value: 88 },
          { label: "Kamis", value: 94 },
          { label: "Jumat", value: 100 },
          { label: "Sabtu", value: 98 },
          { label: "Minggu", value: 90 },
        ],
      },
      root: {
        id: "root-rental",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "header-card",
            type: "Column",
            style: { padding: "p-4", borderWidth: "border", borderColor: "{primitives.color.border}", borderRadius: "{primitives.radius.md}", background: "{primitives.color.surface}" },
            children: [
              { id: "title", type: "Text", props: { value: "Sistem Manajemen Rental Mobil & Armada", variant: "heading" }, style: { fontSize: "text-xl", fontWeight: "font-bold" } },
              { id: "desc", type: "Text", props: { value: "Monitoring ketersediaan unit armada, jadwal sewa, dan utilisasi pendapatan", variant: "paragraph" }, style: { fontSize: "text-xs", color: "{primitives.color.textSecondary}" } },
            ],
          },
          {
            id: "fleet-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Daftar Armada & Status Booking Aktif",
              dataSource: "fleet",
              columns: [
                { key: "noPlat", label: "No. Polisi" },
                { key: "tipe", label: "Model Kendaraan" },
                { key: "status", label: "Status Unit" },
                { key: "customer", label: "Penyewa" },
                { key: "tarifHari", label: "Tarif / Hari" },
                { key: "pengembalian", label: "Jadwal Kembali" },
              ],
              rowActions: [{ label: "Detail Sewa" }],
            },
          },
        ],
      },
    };
  }

  if (q.includes("payroll") || q.includes("gaji") || q.includes("karyawan") || q.includes("bpjs")) {
    return {
      version: "1.0.0",
      id: "ai-payroll-hr-console",
      name: "Sistem Penggajian & Payroll Karyawan (HRIS)",
      dataSources: {
        payroll: [
          { nik: "EMP-041", nama: "Bambang Sudiro", divisi: "Engineering", gapok: "Rp 14.000.000", tunjangan: "Rp 3.500.000", bpjs: "Rp 700.000", thp: "Rp 16.800.000", status: "Transfer Success" },
          { nik: "EMP-042", nama: "Dewi Lestari", divisi: "Finance & Tax", gapok: "Rp 11.500.000", tunjangan: "Rp 2.800.000", bpjs: "Rp 575.000", thp: "Rp 13.725.000", status: "Transfer Success" },
          { nik: "EMP-043", nama: "Rahmat Hidayat", divisi: "Supply Chain", gapok: "Rp 8.500.000", tunjangan: "Rp 2.000.000", bpjs: "Rp 425.000", thp: "Rp 10.075.000", status: "Pending Approval" },
        ],
      },
      root: {
        id: "root-payroll",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "header-card",
            type: "Column",
            style: { padding: "p-4", borderWidth: "border", borderColor: "{primitives.color.border}", borderRadius: "{primitives.radius.md}", background: "{primitives.color.surface}" },
            children: [
              { id: "title", type: "Text", props: { value: "Slip & Rekapitulasi Gaji Karyawan (Payroll)", variant: "heading" }, style: { fontSize: "text-xl", fontWeight: "font-bold" } },
              { id: "desc", type: "Text", props: { value: "Perhitungan take-home-pay, potongan BPJS Ketenagakerjaan & Kesehatan", variant: "paragraph" }, style: { fontSize: "text-xs", color: "{primitives.color.textSecondary}" } },
            ],
          },
          {
            id: "payroll-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Daftar Payroll Karyawan Periode Aktif",
              dataSource: "payroll",
              columns: [
                { key: "nik", label: "NIK Karyawan" },
                { key: "nama", label: "Nama Lengkap" },
                { key: "divisi", label: "Divisi" },
                { key: "gapok", label: "Gaji Pokok" },
                { key: "bpjs", label: "Potongan BPJS" },
                { key: "thp", label: "Take Home Pay (THP)" },
                { key: "status", label: "Status Slip" },
              ],
              rowActions: [{ label: "Slip PDF" }],
            },
          },
        ],
      },
    };
  }

  if (q.includes("hotel") || q.includes("kamar") || q.includes("penginapan") || q.includes("occupancy")) {
    return {
      version: "1.0.0",
      id: "ai-hotel-room-console",
      name: "Grand Nusantara Hotel - Room Operations",
      dataSources: {
        rooms: [
          { noKamar: "Room 301", tipe: "Deluxe King Bed", status: "Occupied (In-house)", tamu: "Mr. Arthur Pendelton", tarif: "Rp 1.450.000", checkOut: "23 Aug 2026" },
          { noKamar: "Room 302", tipe: "Executive Suite", status: "Clean & Ready", tamu: "-", tarif: "Rp 2.800.000", checkOut: "-" },
          { noKamar: "Room 303", tipe: "Deluxe Twin Bed", status: "Housekeeping", tamu: "-", tarif: "Rp 1.350.000", checkOut: "Today 12:00" },
        ],
      },
      root: {
        id: "root-hotel",
        type: "Column",
        style: { gap: "gap-4", padding: "p-6" },
        children: [
          {
            id: "header-card",
            type: "Column",
            style: { padding: "p-4", borderWidth: "border", borderColor: "{primitives.color.border}", borderRadius: "{primitives.radius.md}", background: "{primitives.color.surface}" },
            children: [
              { id: "title", type: "Text", props: { value: "Front Desk & Room Inventory Management", variant: "heading" }, style: { fontSize: "text-xl", fontWeight: "font-bold" } },
              { id: "desc", type: "Text", props: { value: "Status kamar, reservasi tamu, dan kontrol kebersihan housekeeping", variant: "paragraph" }, style: { fontSize: "text-xs", color: "{primitives.color.textSecondary}" } },
            ],
          },
          {
            id: "room-table",
            type: "DataTable",
            style: { width: "w-full" },
            props: {
              title: "Status Kamar & Tamu Check-in",
              dataSource: "rooms",
              columns: [
                { key: "noKamar", label: "No. Kamar" },
                { key: "tipe", label: "Tipe Room" },
                { key: "status", label: "Status Kamar" },
                { key: "tamu", label: "Nama Tamu" },
                { key: "tarif", label: "Tarif / Malam" },
                { key: "checkOut", label: "Jadwal Check-Out" },
              ],
              rowActions: [{ label: "Key Card" }],
            },
          },
        ],
      },
    };
  }

  // Generic fallback synthesizer based on custom user prompt
  const cleanTitle = prompt.length > 3 ? prompt : "Custom Operational Console";
  return {
    version: "1.0.0",
    id: `ai-custom-${Date.now()}`,
    name: cleanTitle,
    dataSources: {
      items: [
        { id: "REC-001", name: "Operasional Item A", kategori: "Kategori Utama", nilai: "Rp 24.500.000", status: "Active / Verified" },
        { id: "REC-002", name: "Operasional Item B", kategori: "Kategori Sekunder", nilai: "Rp 12.800.000", status: "In Process" },
        { id: "REC-003", name: "Operasional Item C", kategori: "Kategori Penunjang", nilai: "Rp 8.200.000", status: "Pending Review" },
      ],
    },
    root: {
      id: "root-custom",
      type: "Column",
      style: { gap: "gap-4", padding: "p-6" },
      children: [
        {
          id: "header-card",
          type: "Column",
          style: { padding: "p-4", borderWidth: "border", borderColor: "{primitives.color.border}", borderRadius: "{primitives.radius.md}", background: "{primitives.color.surface}" },
          children: [
            { id: "title", type: "Text", props: { value: cleanTitle, variant: "heading" }, style: { fontSize: "text-xl", fontWeight: "font-bold" } },
            { id: "desc", type: "Text", props: { value: "Generated dynamically via AI Natural Language Synthesizer", variant: "paragraph" }, style: { fontSize: "text-xs", color: "{primitives.color.textSecondary}" } },
          ],
        },
        {
          id: "main-table",
          type: "DataTable",
          style: { width: "w-full" },
          props: {
            title: "Data Records & Transaksi",
            dataSource: "items",
            columns: [
              { key: "id", label: "ID Referensi" },
              { key: "name", label: "Nama Transaksi" },
              { key: "kategori", label: "Kategori" },
              { key: "nilai", label: "Nilai Nominal" },
              { key: "status", label: "Status" },
            ],
            rowActions: [{ label: "Detail" }],
          },
        },
      ],
    },
  };
}
