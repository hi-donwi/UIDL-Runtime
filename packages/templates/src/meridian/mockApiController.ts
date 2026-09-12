/**
 * In-Memory Interactive Mock API Controller & Data Store
 * Provides rich query, mutation, status transition, search, and persistence capabilities
 * for all 11 industry vertical consoles in the uidl-runtime demo.
 */

export interface MockRecord {
  id: string;
  [key: string]: unknown;
}

const STORAGE_KEY = "uidl-runtime-mock-db";

class MockApiController {
  private stores: Map<string, MockRecord[]> = new Map();

  constructor() {
    this.loadFromStorage();
    if (this.stores.size === 0) {
      this.seedInitialData();
    }
  }

  public seedInitialData() {
    // 1. Retail & Footwear (shoe-company)
    this.stores.set("shoesInventory", [
      { id: "POS-2026-0841", invoice: "SINV-2026-0841", customer: "PT Andalan Sejahtera", outlet: "Jakarta", item: "Sneakers Prime Classic", size: "42", color: "Black White", due: "2026-08-12", status: "Overdue", amount: "Rp 12.900.000", total: 12900000 },
      { id: "POS-2026-0842", invoice: "SINV-2026-0842", customer: "Toko Sinar Jaya", outlet: "Bandung", item: "Running Air Zoom 3", size: "41", color: "Navy Blue", due: "2026-08-28", status: "Unpaid", amount: "Rp 8.400.000", total: 8400000 },
      { id: "POS-2026-0843", invoice: "SINV-2026-0843", customer: "Walk-in Customer", outlet: "Surabaya", item: "Slip-On Casual Leather", size: "43", color: "Tan Brown", due: "2026-08-20", status: "Paid", amount: "Rp 2.697.000", total: 2697000 },
      { id: "SRN-2026-018", doc: "SRN-2026-018", item: "Sneaker Runner 42 Black", customer: "Budi Santoso", reason: "Ukuran kekecilan", outlet: "Jakarta", status: "Ditukar", amount: "Rp 899.000", total: 899000 },
    ]);

    // 2. Education ERP (school-abc)
    this.stores.set("schoolSpp", [
      { id: "SPP-2027-089", nis: "2024-0012", namaSiswa: "Ahmad Rizky", kelas: "XI MIPA 1", bulan: "Agustus 2026", nominal: "Rp 1.250.000", total: 1250000, metode: "Virtual Account Bank", status: "Lunas" },
      { id: "SPP-2027-090", nis: "2024-0045", namaSiswa: "Zahra Aulia", kelas: "X IPS 2", bulan: "Agustus 2026", nominal: "Rp 1.250.000", total: 1250000, metode: "Transfer Manual", status: "Tunggakan" },
      { id: "SPP-2027-091", nis: "2024-0078", namaSiswa: "Dimas Pratama", kelas: "XII MIPA 3", bulan: "Agustus 2026", nominal: "Rp 1.500.000", total: 1500000, metode: "Virtual Account", status: "Lunas" },
      { id: "SPP-2027-092", nis: "2024-0102", namaSiswa: "Nadia Safira", kelas: "XI IPS 1", bulan: "Agustus 2026", nominal: "Rp 1.250.000", total: 1250000, metode: "Tunai Kasir", status: "Menunggu Verifikasi" },
    ]);

    // 3. Discrete Manufacturing (factory-abc)
    this.stores.set("manufacturingWO", [
      { id: "WO-2026-044", wo: "WO-2026-044", item: "Gear Housing A", status: "In Process", wip: "Rp 186.400.000", total: 186400000, qty: "420 / 600", workstation: "CNC Milling 01" },
      { id: "WO-2026-045", wo: "WO-2026-045", item: "Pump Bracket B", status: "QC Hold", wip: "Rp 74.800.000", total: 74800000, qty: "180 / 300", workstation: "Lathe Machine 03" },
      { id: "WO-2026-046", wo: "WO-2026-046", item: "Valve Cover C", status: "Material Short", wip: "Rp 42.100.000", total: 42100000, qty: "0 / 500", workstation: "Press Stamping 02" },
      { id: "WO-2026-047", wo: "WO-2026-047", item: "Shaft Pinion 18T", status: "Completed", wip: "Rp 98.200.000", total: 98200000, qty: "250 / 250", workstation: "Grinding Station" },
    ]);

    // 4. Batch Food Manufacturing & Roastery (food-roasters)
    this.stores.set("roastBatches", [
      { id: "RB-2027-0104", profile: "PRF-LIGHT-01", bean: "Arabica Aceh Gayo", charge: "196 °C", drop: "204 °C", time: "9:40", dtr: "18.2%", batchQty: "30 kg", yieldQty: "25.2 kg", shrinkage: "16.0%", status: "QC Passed" },
      { id: "RB-2027-0105", profile: "PRF-MED-03", bean: "Toraja Sapan", charge: "192 °C", drop: "211 °C", time: "11:05", dtr: "21.4%", batchQty: "60 kg", yieldQty: "50.1 kg", shrinkage: "16.5%", status: "Roasting Active" },
      { id: "RB-2027-0106", profile: "PRF-DARK-02", bean: "Robusta Dampit", charge: "188 °C", drop: "224 °C", time: "12:50", dtr: "24.8%", batchQty: "120 kg", yieldQty: "97.2 kg", shrinkage: "19.0%", status: "Cooling & De-stoning" },
      { id: "RB-2027-0107", profile: "PRF-MED-01", bean: "Bali Kintamani Anaerobic", charge: "194 °C", drop: "208 °C", time: "10:15", dtr: "19.8%", batchQty: "25 kg", yieldQty: "21.0 kg", shrinkage: "16.0%", status: "Cupping Review" },
    ]);

    // 5. EPC Contractor (epc-contractor)
    this.stores.set("epcMilestones", [
      { id: "WBS-1.2.1", wbs: "Piping Fabrication Area 1", bobot: "18.5%", progressPlan: "85%", progressActual: "82%", status: "In Progress", nilai: "Rp 450.000.000", total: 450000000 },
      { id: "WBS-1.2.2", wbs: "Hydrotest Piping Loop 01-04", bobot: "6.0%", progressPlan: "40%", progressActual: "40%", status: "Ready for Test", nilai: "Rp 180.000.000", total: 180000000 },
      { id: "WBS-1.3.1", wbs: "Transformer 150kV Foundation", bobot: "12.0%", progressPlan: "100%", progressActual: "100%", status: "BAST 1 Signed", nilai: "Rp 620.000.000", total: 620000000 },
      { id: "VO-2027-003", wbs: "Variation Order Cable Tray Reroute", bobot: "3.5%", progressPlan: "25%", progressActual: "20%", status: "Pending Approval", nilai: "Rp 95.000.000", total: 95000000 },
    ]);

    // 6. B2B Sales CRM (crm-pipeline)
    this.stores.set("crmDeals", [
      { id: "DEAL-042", org: "PT Digital Solusi Nusantara", contact: "Bambang Wijaya (CTO)", dealValue: "Rp 450.000.000", total: 450000000, stage: "proposal", winProbability: 60, weightedValue: "Rp 270.000.000", assignee: "Aditya Pratama", status: "Proposal Sent" },
      { id: "DEAL-043", org: "RS Medika Utama", contact: "dr. Hendra Sp.PD", dealValue: "Rp 820.000.000", total: 820000000, stage: "negotiation", winProbability: 80, weightedValue: "Rp 656.000.000", assignee: "Siti Rahma", status: "Contract Review" },
      { id: "DEAL-044", org: "PT Agro Makmur Abadi", contact: "Ir. Handoko", dealValue: "Rp 280.000.000", total: 280000000, stage: "qualified", winProbability: 40, weightedValue: "Rp 112.000.000", assignee: "Budi Santoso", status: "Demo Scheduled" },
      { id: "DEAL-045", org: "Koperasi Syariah Sejahtera", contact: "H. Abdullah", dealValue: "Rp 175.000.000", total: 175000000, stage: "won", winProbability: 100, weightedValue: "Rp 175.000.000", assignee: "Aditya Pratama", status: "Closed Won" },
    ]);

    // 7. Islamic Microfinance & Cooperative (koperasi-bmt)
    this.stores.set("murabahahContracts", [
      { id: "MRB-2027-0104", account: "MRB-2027-0104", member: "H. Abdullah", noAnggota: "ANG-0042", produk: "Modal Kerja Warung Sembako", pokok: "Rp 45.000.000", total: 45000000, margin: "Rp 6.750.000", tenor: "24 Bulan", angsuranBulan: "Rp 2.156.250", status: "Aktif Lancar" },
      { id: "MRB-2027-0105", account: "MRB-2027-0105", member: "Hj. Siti Nurjanah", noAnggota: "ANG-0089", produk: "Pembiayaan Alat Konveksi", pokok: "Rp 25.000.000", total: 25000000, margin: "Rp 3.250.000", tenor: "12 Bulan", angsuranBulan: "Rp 2.354.166", status: "Aktif Lancar" },
      { id: "MRB-2027-0106", account: "MRB-2027-0106", member: "Ahmad Fauzi", noAnggota: "ANG-0124", produk: "Pengadaan Bahan Baku Sablon", pokok: "Rp 15.000.000", total: 15000000, margin: "Rp 1.800.000", tenor: "10 Bulan", angsuranBulan: "Rp 1.680.000", status: "Menunggu Akad" },
      { id: "MRB-2027-0107", account: "MRB-2027-0107", member: "Rahmat Hidayat", noAnggota: "ANG-0205", produk: "Renovasi Kios Pasar", pokok: "Rp 30.000.000", total: 30000000, margin: "Rp 4.500.000", tenor: "18 Bulan", angsuranBulan: "Rp 1.916.666", status: "Dalam Perhatian Khusus" },
    ]);

    // 8. Healthcare / EMR Patient Queue (hospital-medika)
    this.stores.set("patients", [
      { id: "RM-2027-0412", noAntrean: "A-012", norm: "RM-2027-0412", nama: "Budi Santoso", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "BPJS Kesehatan", status: "Sedang Diperiksa", diagnosa: "I10 - Hipertensi Primer", obat: "Amoxicillin 500mg, Captopril 25mg" },
      { id: "RM-2027-0891", noAntrean: "A-013", norm: "RM-2027-0891", nama: "Siti Rahmawati", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "Asuransi Mandiri", status: "Menunggu Antrean", diagnosa: "K30 - Dispepsia Fungsional", obat: "Omeprazole 20mg, Antasida" },
      { id: "RM-2027-1102", noAntrean: "B-005", norm: "RM-2027-1102", nama: "Ananda Kevin", poli: "Poli Anak", dokter: "dr. Ratna, Sp.A", jaminan: "Umum / Mandiri", status: "Menunggu Resep", diagnosa: "J06.9 - ISPA Akut", obat: "Paracetamol Sirup 120mg/5ml" },
      { id: "RM-2027-0331", noAntrean: "C-008", norm: "RM-2027-0331", nama: "Drs. Ahmad Fauzi", poli: "Jantung", dokter: "dr. Faisal, Sp.JP", jaminan: "BPJS Kesehatan", status: "Pemeriksaan Lab", diagnosa: "I20.0 - Unstable Angina", obat: "ISDN 5mg, Clopidogrel 75mg" },
    ]);

    // 9. High-Compliance Medical Device / DHR (medical-device)
    this.stores.set("medicalDevices", [
      { id: "DHR-2027-B091", noDhr: "DHR-2027-B091", produk: "Spuit 5ml Luer Lock Steril", lotNo: "LOT-2027-08A", batchSteril: "ETO-LOT-2027-44", qty: "20.000 Pcs", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", udi: "08991234500123", status: "Released for Sale" },
      { id: "DHR-2027-B092", noDhr: "DHR-2027-B092", produk: "Infusion Set Dewasa Standar", lotNo: "LOT-2027-08B", batchSteril: "ETO-LOT-2027-45", qty: "10.000 Pcs", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", udi: "08991234500124", status: "Quarantine - Testing" },
      { id: "DHR-2027-B093", noDhr: "DHR-2027-B093", produk: "IV Cannula 20G Pink", lotNo: "LOT-2027-08C", batchSteril: "ETO-LOT-2027-46", qty: "15.000 Pcs", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", udi: "08991234500125", status: "Released for Sale" },
      { id: "DHR-2027-B094", noDhr: "DHR-2027-B094", produk: "Blood Transfusion Set 15 Drop", lotNo: "LOT-2027-09A", batchSteril: "ETO-LOT-2027-47", qty: "8.000 Pcs", cleanroom: "ISO Class 7", sterilisasi: "Gas EtO 100%", udi: "08991234500126", status: "Bioburden Testing" },
    ]);

    // 10. Omnichannel E-Commerce Orders (omnichannel-dist)
    this.stores.set("omniOrders", [
      { id: "ORD-SHP-99210", noPesanan: "ORD-SHP-99210", channel: "Lapakku Mall", customer: "Andi Saputra", pembeli: "Andi Saputra", item: "Sneakers Prime Classic 42", total: 850000, kurir: "KirimCepat", resi: "JT992108821", gudang: "Fulfillment Hub Jakarta", status: "Siap Pick & Pack" },
      { id: "ORD-TKP-44012", noPesanan: "ORD-TKP-44012", channel: "TokoPrima", customer: "PT Cipta Kreasi", pembeli: "PT Cipta Kreasi", item: "Fast Charger GaN 65W (10 Pcs)", total: 12450000, kurir: "ExpressOne Cargo", resi: "00291044012", gudang: "Gudang Utama Surabaya", status: "Dalam Pengiriman" },
      { id: "ORD-TTS-11982", noPesanan: "ORD-TTS-11982", channel: "LiveMarket", customer: "Mega Lestari", pembeli: "Mega Lestari", item: "Running Air Zoom 3 Navy", total: 420000, kurir: "AntarKita", resi: "ANT11982001", gudang: "Fulfillment Hub Jakarta", status: "Siap Pick & Pack" },
      { id: "ORD-B2B-00814", noPesanan: "ORD-B2B-00814", channel: "Direct B2B", customer: "CV Maju Bersama", pembeli: "CV Maju Bersama", item: "Wireless ANC Headphone (50 Pcs)", total: 48000000, kurir: "Armada Truk Sendiri", resi: "TRK-JKT-091", gudang: "Gudang Pusat Cikarang", status: "Terkirim - Menunggu POD" },
    ]);

    // 11. Help Desk Support Tickets (helpdesk)
    this.stores.set("helpdeskTickets", [
      { id: "TCK-2027-0104", ticketId: "TCK-2027-0104", customer: "PT Digital Solusi Nusantara", subject: "Gagal export CSV e-Faktur PPN 11% masa Februari", priority: "Urgent", channel: "WhatsApp", slaCountdown: "24 Menit Tersisa", assignee: "Rian (Senior L2)", status: "In Progress" },
      { id: "TCK-2027-0105", ticketId: "TCK-2027-0105", customer: "Koperasi Mandiri Syariah", subject: "Permintaan panduan distribusi SHU RAT tahunan", priority: "Medium", channel: "Web Portal", slaCountdown: "3.5 Jam Tersisa", assignee: "Siti (Support L1)", status: "Pending Customer" },
      { id: "TCK-2027-0106", ticketId: "TCK-2027-0106", customer: "PT Rekayasa Konstruksi", subject: "Sinkronisasi progress billing BAP subkontraktor", priority: "High", channel: "Email", slaCountdown: "1.2 Jam Tersisa", assignee: "Budi (Tech Support)", status: "In Progress" },
      { id: "TCK-2027-0107", ticketId: "TCK-2027-0107", customer: "Nusantara Coffee Roasters", subject: "Integrasi timbangan bluetooth ke modul roasting", priority: "Low", channel: "Web Portal", slaCountdown: "7.0 Jam Tersisa", assignee: "Siti (Support L1)", status: "Open" },
    ]);

    this.saveToStorage();
  }

  public list<T extends MockRecord>(collection: string, filter?: (item: T) => boolean): T[] {
    const list = (this.stores.get(collection) || []) as T[];
    return filter ? list.filter(filter) : [...list];
  }

  public get<T extends MockRecord>(collection: string, id: string): T | undefined {
    const list = (this.stores.get(collection) || []) as T[];
    return list.find((item) => item.id === id);
  }

  public create<T extends MockRecord>(collection: string, record: Omit<T, "id"> & { id?: string }): T {
    const list = (this.stores.get(collection) || []) as T[];
    const id = record.id || `${collection.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`;
    const newRecord = { ...record, id } as T;
    list.unshift(newRecord);
    this.stores.set(collection, list as MockRecord[]);
    this.saveToStorage();
    return newRecord;
  }

  public update<T extends MockRecord>(collection: string, id: string, patch: Partial<T>): T | undefined {
    const list = (this.stores.get(collection) || []) as T[];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const updated = { ...list[index], ...patch } as T;
    list[index] = updated;
    this.stores.set(collection, list as MockRecord[]);
    this.saveToStorage();
    return updated;
  }

  public delete(collection: string, id: string): boolean {
    const list = this.stores.get(collection) || [];
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length === list.length) return false;
    this.stores.set(collection, filtered);
    this.saveToStorage();
    return true;
  }

  public transitionStatus(collection: string, id: string, newStatus: string): MockRecord | undefined {
    return this.update(collection, id, { status: newStatus });
  }

  public search(collection: string, query: string): MockRecord[] {
    const list = this.stores.get(collection) || [];
    const q = query.toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) =>
      Object.values(item).some((val) => typeof val === "string" && val.toLowerCase().includes(q))
    );
  }

  public resetAll() {
    this.stores.clear();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    this.seedInitialData();
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        const obj: Record<string, MockRecord[]> = {};
        for (const [k, v] of this.stores.entries()) {
          obj[k] = v;
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      } catch {
        /* storage may be quota exceeded or unavailable */
      }
    }
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const key of Object.keys(parsed)) {
            if (Array.isArray(parsed[key])) {
              this.stores.set(key, parsed[key]);
            }
          }
        }
      } catch {
        /* fallback to seed */
      }
    }
  }
}

export const mockApi = new MockApiController();

