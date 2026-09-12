/**
 * Every list a console page can show.
 *
 * Tables are shared deliberately: two menu items that are two views of the same document set
 * (a dashboard's "Antrean Hari Ini" and the Pelayanan group's "Antrean Poliklinik") show the
 * same rows, the way a real ERP would. A new table is added only when the page shows something
 * the others do not.
 */
import { table, type TableSpec } from "./types";

export function moduleTable(title: string, rows: string[][]): TableSpec {
  return { title, rows: rows.map(([module, document, status, control, amount]) => ({ module, document, status, control, amount })), columns: [{ key: "module", label: "Module" }, { key: "document", label: "Document" }, { key: "status", label: "Status" }, { key: "control", label: "Control" }, { key: "amount", label: "Amount", align: "right" }], rowActions: [{ label: "Open" }, { label: "Reconcile" }] };
}

export function posTable(): TableSpec {
  return moduleTable("POS Shift Documents", [["Cash Drawer", "POS-CLS-0820", "Ready", "Drawer = Deposit", "Rp 38.450.000"], ["Card Settlement", "BNK-SET-0820", "Matched", "Gateway = Bank", "Rp 74.120.000"], ["Return Note", "SRN-2026-018", "Submitted", "Return = COGS reversal", "Rp 2.300.000"]]);
}

export function stockTable(): TableSpec {
  return { title: "Stock Ledger", rows: [{ item: "Sneaker Runner 42 Black", warehouse: "Bandung", qty: "18 pair", value: "Rp 16.200.000", control: "Inventory GL tied" }, { item: "Loafer Classic 40 Tan", warehouse: "Jakarta", qty: "9 pair", value: "Rp 8.550.000", control: "Low stock" }, { item: "Kids Sport 32 White", warehouse: "Online", qty: "64 pair", value: "Rp 38.400.000", control: "OK" }], columns: [{ key: "item", label: "Item" }, { key: "warehouse", label: "Warehouse" }, { key: "qty", label: "Qty", align: "right" }, { key: "value", label: "Value", align: "right" }, { key: "control", label: "Control" }] };
}

export function schoolReceivableTable(): TableSpec {
  return { title: "Student Receivables", rows: [{ student: "Alya Putri", class: "Grade 7A", invoice: "FEE-2026-0821", status: "Overdue", outstanding: "Rp 3.200.000" }, { student: "Bima Pratama", class: "Grade 8B", invoice: "FEE-2026-0822", status: "Partially Paid", outstanding: "Rp 1.750.000" }, { student: "Citra Lestari", class: "Grade 10 Science", invoice: "FEE-2026-0823", status: "Due This Week", outstanding: "Rp 4.500.000" }], columns: [{ key: "student", label: "Student" }, { key: "class", label: "Class" }, { key: "invoice", label: "Invoice" }, { key: "status", label: "Status" }, { key: "outstanding", label: "Outstanding", align: "right" }], rowActions: [{ label: "Open" }, { label: "Send Reminder" }] };
}

export function studentTable(): TableSpec {
  return { title: "Student Master Exceptions", rows: [{ student: "Raka Wijaya", class: "Grade 9A", issue: "Missing guardian billing contact", status: "Needs Review" }, { student: "Dewi Maharani", class: "Grade 11 IPS", issue: "Scholarship approval pending", status: "Pending" }, { student: "Farel Yusuf", class: "Grade 6B", issue: "No fee schedule", status: "Blocked" }], columns: [{ key: "student", label: "Student" }, { key: "class", label: "Class" }, { key: "issue", label: "Issue" }, { key: "status", label: "Status" }], rowActions: [{ label: "Open" }] };
}

export function schoolControlTable(): TableSpec {
  return { title: "Finance Controls", rows: [{ module: "Student Fees", control: "Student AR = Debtors - Tuition", status: "Tied", balance: "Rp 218.450.000" }, { module: "Payroll", control: "Salary Payable = unpaid payslips", status: "Pending Approval", balance: "Rp 167.800.000" }, { module: "Budget", control: "Spend <= approved budget", status: "Warning", balance: "82% used" }], columns: [{ key: "module", label: "Module" }, { key: "control", label: "Control" }, { key: "status", label: "Status" }, { key: "balance", label: "Balance", align: "right" }] };
}

export function workOrderTable(): TableSpec {
  return { title: "Work Orders", rows: [{ wo: "WO-2026-044", item: "Gear Housing A", status: "In Process", wip: "Rp 186.400.000", qty: "420 / 600" }, { wo: "WO-2026-045", item: "Pump Bracket B", status: "QC Hold", wip: "Rp 74.800.000", qty: "180 / 300" }, { wo: "WO-2026-046", item: "Valve Cover C", status: "Material Short", wip: "Rp 42.100.000", qty: "0 / 500" }], columns: [{ key: "wo", label: "WO" }, { key: "item", label: "Item" }, { key: "status", label: "Status" }, { key: "wip", label: "WIP", align: "right" }, { key: "qty", label: "Qty" }], rowActions: [{ label: "Open" }, { label: "Issue Material" }] };
}

export function factoryStockTable(): TableSpec {
  return { title: "Stock Value Tie-Out", rows: [{ item: "Steel Coil SPCC", warehouse: "Raw Material", qty: "12.4 ton", value: "Rp 248.000.000", control: "Inventory GL tied" }, { item: "Gear Housing A", warehouse: "Finished Goods", qty: "380 pcs", value: "Rp 323.000.000", control: "COGS pending delivery" }, { item: "WIP - Assembly", warehouse: "Production Floor", qty: "3 WO", value: "Rp 303.300.000", control: "WIP account tied" }], columns: [{ key: "item", label: "Item" }, { key: "warehouse", label: "Warehouse" }, { key: "qty", label: "Qty", align: "right" }, { key: "value", label: "Value", align: "right" }, { key: "control", label: "Control" }] };
}

export function ledgerTable(title: string): TableSpec {
  return { title, rows: [{ date: "2026-08-20", account: "Bank / WIP / AR", debit: "Rp 112.650.000", credit: "Rp 0", voucher: "Voucher A" }, { date: "2026-08-20", account: "Income / AP / Inventory", debit: "Rp 0", credit: "Rp 112.650.000", voucher: "Voucher A" }], columns: [{ key: "date", label: "Date" }, { key: "account", label: "Account" }, { key: "debit", label: "Debit", align: "right" }, { key: "credit", label: "Credit", align: "right" }, { key: "voucher", label: "Voucher" }] };
}

export function controlTable(): TableSpec {
  return { title: "Ledger Controls", rows: [{ invariant: "Balanced vouchers", status: "OK", evidence: "Debit equals credit" }, { invariant: "Subledger tie-out", status: "OK", evidence: "AR/AP tied to control" }, { invariant: "Closed period", status: "Locked", evidence: "July 2026 closed" }], columns: [{ key: "invariant", label: "Invariant" }, { key: "status", label: "Status" }, { key: "evidence", label: "Evidence" }] };
}

export function statementTable(title: string): TableSpec {
  return { title, rows: [{ line: "Revenue", current: "Rp 842.000.000", previous: "Rp 713.000.000" }, { line: "COGS / Direct Cost", current: "Rp 482.000.000", previous: "Rp 391.000.000" }, { line: "Operating Expense", current: "Rp 174.000.000", previous: "Rp 162.000.000" }, { line: "Net Profit", current: "Rp 186.000.000", previous: "Rp 160.000.000" }], columns: [{ key: "line", label: "Line" }, { key: "current", label: "Current", align: "right" }, { key: "previous", label: "Previous", align: "right" }] };
}

export function auditTable(): TableSpec {
  return { title: "Audit Trail", rows: [{ user: "finance.manager", action: "Submitted voucher", document: "JV-2026-088", time: "09:41" }, { user: "ops.lead", action: "Posted stock entry", document: "STE-2026-144", time: "10:15" }, { user: "system", action: "Period check completed", document: "CLOSE-2026-08", time: "11:00" }], columns: [{ key: "user", label: "User" }, { key: "action", label: "Action" }, { key: "document", label: "Document" }, { key: "time", label: "Time" }] };
}

export function coffeeQcTable(): TableSpec {
  return {
    title: "Roast Batch QC Gates",
    rows: [
      { batch: "ROAST-2027-0801", bean: "Arabica Aceh Gayo", moisture: "10.4%", agtron: "62 (Light-Med)", defects: "0", status: "Released", inspector: "Rian Pratama" },
      { batch: "ROAST-2027-0802", bean: "Toraja Sapan", moisture: "12.8%", agtron: "54 (Medium)", defects: "5", status: "Hold", inspector: "Siti Nurhaliza" },
      { batch: "ROAST-2027-0803", bean: "Robusta Dampit", moisture: "10.1%", agtron: "42 (Dark)", defects: "1", status: "Released", inspector: "Rian Pratama" },
    ],
    columns: [
      { key: "batch", label: "Batch" },
      { key: "bean", label: "Bean Origin" },
      { key: "moisture", label: "Moisture" },
      { key: "agtron", label: "Agtron Score" },
      { key: "defects", label: "Defects", align: "right" },
      { key: "status", label: "Status" },
      { key: "inspector", label: "Q-Grader" },
    ],
    rowActions: [{ label: "Open" }, { label: "Release" }],
  };
}

export function coffeeBOMTable(): TableSpec {
  return {
    title: "Roasting Bill of Materials (BOM)",
    rows: [
      { item: "Green Bean Arabica Gayo (300g)", type: "Raw Material", rate: "Rp 42.000", cost: "Rp 42.000" },
      { item: "Roasting Machine & Energy", type: "Operation", rate: "Rp 12.000 / batch", cost: "Rp 12.000" },
      { item: "Degassing Pouch & Valve", type: "Packaging", rate: "Rp 6.500 / pc", cost: "Rp 6.500" },
      { item: "Nitrogen Flush & Seal", type: "Operation", rate: "Rp 7.500 / pc", cost: "Rp 7.500" },
    ],
    columns: [
      { key: "item", label: "Material / Operation" },
      { key: "type", label: "Component Type" },
      { key: "rate", label: "Rate", align: "right" },
      { key: "cost", label: "Cost Allocation", align: "right" },
    ],
  };
}

export function coffeeInventoryTable(): TableSpec {
  return {
    title: "Green Bean Silo Stock",
    rows: [
      { silo: "Silo Raw A", bean: "Arabica Aceh Gayo", stock: "1.250 kg", valuation: "Rp 175.000.000", reorder: "500 kg" },
      { silo: "Silo Raw B", bean: "Toraja Sapan", stock: "820 kg", valuation: "Rp 123.000.000", reorder: "400 kg" },
      { silo: "Silo Raw C", bean: "Robusta Dampit", stock: "2.400 kg", valuation: "Rp 168.000.000", reorder: "800 kg" },
    ],
    columns: [
      { key: "silo", label: "Silo Location" },
      { key: "bean", label: "Bean Variety" },
      { key: "stock", label: "Available Stock", align: "right" },
      { key: "valuation", label: "Stock Valuation", align: "right" },
      { key: "reorder", label: "Reorder Point", align: "right" },
    ],
  };
}

export function epcSubconTable(): TableSpec {
  return {
    title: "Subcontractor Retention & Guarantees",
    rows: [
      { subcon: "PT Pancang Nusantara", scope: "Pondasi Spun Pile", contract: "Rp 8.500.000.000", billed: "Rp 8.500.000.000", retention: "Rp 425.000.000", status: "Warranty" },
      { subcon: "CV Baja Mandiri", scope: "Struktur Baja Utama", contract: "Rp 14.200.000.000", billed: "Rp 11.360.000.000", retention: "Rp 710.000.000", status: "In Progress (80%)" },
      { subcon: "PT Otomasi Presisi", scope: "Panel SCADA", contract: "Rp 9.800.000.000", billed: "Rp 2.940.000.000", retention: "Rp 490.000.000", status: "In Progress (30%)" },
    ],
    columns: [
      { key: "subcon", label: "Subcontractor" },
      { key: "scope", label: "Scope of Work" },
      { key: "contract", label: "Contract Value", align: "right" },
      { key: "billed", label: "Approved Billing", align: "right" },
      { key: "retention", label: "5% Retention", align: "right" },
      { key: "status", label: "Status" },
    ],
    rowActions: [{ label: "Open" }, { label: "Certify" }],
  };
}

export function epcMilestoneTable(): TableSpec {
  return {
    title: "Owner Progress Billing & PoC",
    rows: [
      { milestone: "DP Uang Muka (20%)", invoice: "EPC-INV-001", amount: "Rp 24.000.000.000", status: "Paid" },
      { milestone: "Termin 1 (PoC 30%)", invoice: "EPC-INV-002", amount: "Rp 12.000.000.000", status: "Paid" },
      { milestone: "Termin 2 (PoC 60%)", invoice: "EPC-INV-003", amount: "Rp 36.000.000.000", status: "Paid" },
      { milestone: "Termin 3 (PoC 80%)", invoice: "EPC-INV-004", amount: "Rp 24.000.000.000", status: "Submitted" },
    ],
    columns: [
      { key: "milestone", label: "Progress Milestone" },
      { key: "invoice", label: "Invoice No" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Payment Status" },
    ],
  };
}

export function crmDealTable(): TableSpec {
  return {
    title: "Active Opportunities by Stage",
    rows: [
      { deal: "PT Samudera Logistik", stage: "Lead Qualification", rep: "Aditya Pratama", value: "Rp 240.000.000", prob: "20%" },
      { deal: "PT Manufaktur Maju", stage: "Demo & Scoping", rep: "Siti Rahmawati", value: "Rp 380.000.000", prob: "40%" },
      { deal: "PT Retail Mega Indo", stage: "Proposal Sent", rep: "Aditya Pratama", value: "Rp 520.000.000", prob: "60%" },
      { deal: "PT Finansial Mitra", stage: "Commercial Negotiation", rep: "Siti Rahmawati", value: "Rp 650.000.000", prob: "80%" },
      { deal: "PT Megah Jaya", stage: "Closed Won", rep: "Aditya Pratama", value: "Rp 420.000.000", prob: "100%" },
    ],
    columns: [
      { key: "deal", label: "Opportunity Account" },
      { key: "stage", label: "Pipeline Stage" },
      { key: "rep", label: "Sales Owner" },
      { key: "value", label: "Deal Value", align: "right" },
      { key: "prob", label: "Probability", align: "right" },
    ],
    rowActions: [{ label: "Open" }, { label: "Move Stage" }],
  };
}

export function crmRepTable(): TableSpec {
  return {
    title: "Sales Rep Quota Performance",
    rows: [
      { rep: "Aditya Pratama", calls: "24", demos: "6", proposals: "3", won: "Rp 420.000.000", quota: "Rp 600.000.000", attainment: "70.0%" },
      { rep: "Siti Rahmawati", calls: "38", demos: "8", proposals: "5", won: "Rp 350.000.000", quota: "Rp 500.000.000", attainment: "70.0%" },
      { rep: "Budi Hermawan", calls: "19", demos: "4", proposals: "2", won: "Rp 180.000.000", quota: "Rp 400.000.000", attainment: "45.0%" },
    ],
    columns: [
      { key: "rep", label: "Sales Executive" },
      { key: "calls", label: "Calls", align: "right" },
      { key: "demos", label: "Demos", align: "right" },
      { key: "proposals", label: "Proposals", align: "right" },
      { key: "won", label: "Closed Won", align: "right" },
      { key: "quota", label: "Quota Target", align: "right" },
      { key: "attainment", label: "Attainment", align: "right" },
    ],
  };
}

export function koperasiFinancingTable(): TableSpec {
  return {
    title: "Akad Pembiayaan Anggota Aktif",
    rows: [
      { account: "MRB-2027-0104", member: "Hj. Siti Rohmah", akad: "Murabahah Sembako", plafond: "Rp 75.000.000", installment: "Rp 3.500.000 / bln", status: "Lancar (Kol 1)" },
      { account: "IJR-2027-0052", member: "Ahmad Fauzi", akad: "Ijarah Pendidikan", plafond: "Rp 25.000.000", installment: "Rp 2.291.000 / bln", status: "Lancar (Kol 1)" },
      { account: "MRB-2027-0089", member: "Bambang Triyono", akad: "Murabahah Mesin Padi", plafond: "Rp 120.000.000", installment: "Rp 3.800.000 / bln", status: "Dalam Perhatian (Kol 2)" },
    ],
    columns: [
      { key: "account", label: "No Akad" },
      { key: "member", label: "Anggota" },
      { key: "akad", label: "Jenis Akad" },
      { key: "plafond", label: "Plafond", align: "right" },
      { key: "installment", label: "Angsuran", align: "right" },
      { key: "status", label: "Kolektibilitas" },
    ],
    rowActions: [{ label: "Open" }, { label: "Angsuran" }],
  };
}

export function koperasiSavingsTable(): TableSpec {
  return {
    title: "Daftar Simpanan Anggota",
    rows: [
      { member: "Hj. Siti Rohmah", id: "ANGG-00142", pokok: "Rp 500.000", wajib: "Rp 3.600.000", sukarela: "Rp 42.500.000", total: "Rp 46.600.000" },
      { member: "Ahmad Fauzi", id: "ANGG-00188", pokok: "Rp 500.000", wajib: "Rp 2.400.000", sukarela: "Rp 14.200.000", total: "Rp 17.100.000" },
      { member: "Bambang Triyono", id: "ANGG-00205", pokok: "Rp 500.000", wajib: "Rp 4.800.000", sukarela: "Rp 8.900.000", total: "Rp 14.200.000" },
    ],
    columns: [
      { key: "member", label: "Anggota" },
      { key: "id", label: "No Anggota" },
      { key: "pokok", label: "Pokok", align: "right" },
      { key: "wajib", label: "Wajib", align: "right" },
      { key: "sukarela", label: "Sukarela", align: "right" },
      { key: "total", label: "Total Saldo", align: "right" },
    ],
  };
}

export function koperasiTaxTable(): TableSpec {
  return {
    title: "Kepatuhan Pajak DJP & BPJS Ketenagakerjaan",
    rows: [
      { item: "e-Faktur PPN Keluaran 11%", basis: "Rp 842.000.000", amount: "Rp 92.620.000", status: "Siap Upload DJP CSV", due: "Akhir Bulan Depan" },
      { item: "PPh 21 Pegawai (TER PMK 168)", basis: "Rp 68.500.000 (14 Staf)", amount: "Rp 3.425.000", status: "EBilling Terbit", due: "Tgl 10 Bulan Depan" },
      { item: "BPJS Ketenagakerjaan (JKK, JKM, JHT, JP)", basis: "Rp 68.500.000", amount: "Rp 6.329.400", status: "Autodebet Berhasil", due: "Tgl 15 Tiap Bulan" },
      { item: "BPJS Kesehatan (4% + 1%)", basis: "Rp 68.500.000", amount: "Rp 3.425.000", status: "Autodebet Berhasil", due: "Tgl 10 Tiap Bulan" },
    ],
    columns: [
      { key: "item", label: "Kewajiban Perpajakan / BPJS" },
      { key: "basis", label: "Dasar Pengenaan / DPP" },
      { key: "amount", label: "Nilai", align: "right" },
      { key: "status", label: "Status Pelaporan" },
      { key: "due", label: "Jatuh Tempo" },
    ],
  };
}

export function hospitalQueueTable(): TableSpec {
  return {
    title: "Antrean Pasien Poliklinik & Rekam Medis (EMR)",
    rows: [
      { noAntrean: "A-012", norm: "RM-2027-0412", nama: "Budi Santoso", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "BPJS Kesehatan", status: "Sedang Diperiksa" },
      { noAntrean: "A-013", norm: "RM-2027-0891", nama: "Siti Rahmawati", poli: "Penyakit Dalam", dokter: "dr. Hendra, Sp.PD", jaminan: "Asuransi Mandiri", status: "Menunggu Antrean" },
      { noAntrean: "B-005", norm: "RM-2027-1102", nama: "Ananda Kevin", poli: "Poli Anak", dokter: "dr. Ratna, Sp.A", jaminan: "Umum / Mandiri", status: "Menunggu Resep" },
      { noAntrean: "C-008", norm: "RM-2027-0331", nama: "Drs. Ahmad Fauzi", poli: "Jantung", dokter: "dr. Faisal, Sp.JP", jaminan: "BPJS Kesehatan", status: "Pemeriksaan Lab" },
    ],
    columns: [
      { key: "noAntrean", label: "No. Antrean" },
      { key: "norm", label: "No. RM" },
      { key: "nama", label: "Nama Pasien" },
      { key: "poli", label: "Poliklinik Tujuan" },
      { key: "dokter", label: "Dokter Penanggung Jawab" },
      { key: "jaminan", label: "Penjamin / Asuransi" },
      { key: "status", label: "Status Pelayanan" },
    ],
    rowActions: [{ label: "EMR" }, { label: "Resep" }],
  };
}

export function hospitalPharmacyTable(): TableSpec {
  return {
    title: "Farmasi & Kontrol Kedaluwarsa Obat (FEFO)",
    rows: [
      { kodeObat: "MED-AMX-500", namaObat: "Amoxicillin 500mg Kapsul", noBatch: "BATCH-2026-X09", tglKedaluwarsa: "2027-08-15", stok: "1.250 strip", aturanPakai: "FEFO Priority 1", status: "Aman" },
      { kodeObat: "MED-PAR-SYR", "namaObat": "Paracetamol Sirup 120mg/5ml", noBatch: "BATCH-2026-P44", tglKedaluwarsa: "2027-04-30", stok: "340 botol", aturanPakai: "FEFO Priority (Segera Habiskan)", status: "Perhatian ED" },
      { kodeObat: "MED-INS-GLA", "namaObat": "Insulin Glargine Pen 100IU/ml", noBatch: "BATCH-2027-IN01", tglKedaluwarsa: "2028-01-20", stok: "180 pen", aturanPakai: "Cold Chain 2-8°C", status: "Aman" },
    ],
    columns: [
      { key: "kodeObat", label: "Kode Obat" },
      { key: "namaObat", label: "Nama Obat" },
      { key: "noBatch", label: "No. Batch" },
      { key: "tglKedaluwarsa", label: "Expired Date" },
      { key: "stok", label: "Stok", align: "right" },
      { key: "aturanPakai", label: "Aturan Dispensing" },
      { key: "status", label: "Status Mutu" },
    ],
  };
}

export function hospitalBpjsTable(): TableSpec {
  return {
    title: "Verifikasi Klaim BPJS Kesehatan (INA-CBGs)",
    rows: [
      { noSep: "0301R0010227V000124", pasien: "Budi Santoso", diagnosa: "I10 - Essential hypertension", tarifInacbg: "Rp 4.850.000", statusVerifikasi: "Layak Klaim (Verified)", tglPengajuan: "2027-02-14" },
      { noSep: "0301R0010227V000125", pasien: "Drs. Ahmad Fauzi", diagnosa: "I20.0 - Unstable angina", tarifInacbg: "Rp 12.400.000", statusVerifikasi: "Kelengkapan Berkas", tglPengajuan: "2027-02-14" },
      { noSep: "0301R0010227V000126", pasien: "Hj. Mariam", diagnosa: "E11.9 - Type 2 diabetes", tarifInacbg: "Rp 3.920.000", statusVerifikasi: "Layak Klaim (Verified)", tglPengajuan: "2027-02-13" },
    ],
    columns: [
      { key: "noSep", label: "No. SEP" },
      { key: "pasien", label: "Nama Pasien" },
      { key: "diagnosa", label: "Diagnosa ICD-10" },
      { key: "tarifInacbg", label: "Tarif INA-CBG", align: "right" },
      { key: "statusVerifikasi", label: "Status Verifikasi" },
      { key: "tglPengajuan", label: "Tgl Pengajuan" },
    ],
  };
}

export function medtechDhrTable(): TableSpec {
  return {
    title: "Device History Record (DHR) & Sterilisasi Lot",
    rows: [
      { noDhr: "DHR-2027-B091", produk: "Spuit 5ml Luer Lock Steril", batchSteril: "ETO-LOT-2027-44", qtyProduksi: "20.000 Pcs", cleanroom: "Class 10k (ISO 7)", udi: "08991234500123", statusQc: "Released for Sale" },
      { noDhr: "DHR-2027-B092", produk: "Infusion Set Dewasa Standar", batchSteril: "ETO-LOT-2027-45", qtyProduksi: "10.000 Pcs", cleanroom: "Class 10k (ISO 7)", udi: "08991234500124", statusQc: "Quarantine - Testing" },
      { noDhr: "DHR-2027-B093", produk: "IV Cannula 20G Pink", batchSteril: "ETO-LOT-2027-46", qtyProduksi: "15.000 Pcs", cleanroom: "Class 10k (ISO 7)", udi: "08991234500125", statusQc: "Released for Sale" },
    ],
    columns: [
      { key: "noDhr", label: "No. DHR" },
      { key: "produk", label: "Nama Produk Alkes" },
      { key: "batchSteril", label: "Lot Steril" },
      { key: "qtyProduksi", label: "Qty Produksi", align: "right" },
      { key: "cleanroom", label: "Ruang Bersih" },
      { key: "udi", label: "GS1 UDI Code" },
      { key: "statusQc", label: "Status QA" },
    ],
    rowActions: [{ label: "DHR" }, { label: "CoA" }],
  };
}

export function medtechCleanroomTable(): TableSpec {
  return {
    title: "Log Ruang Bersih Cleanroom ISO 14644",
    rows: [
      { zona: "Cleanroom Room A (Injeksi)", partikel05: "85.200 / m³", suhu: "21.4 °C", kelembaban: "48% RH", tekanan: "+18 Pa", status: "Compliant (ISO 7)" },
      { zona: "Cleanroom Room B (Perakitan)", partikel05: "62.400 / m³", suhu: "20.8 °C", kelembaban: "46% RH", tekanan: "+22 Pa", status: "Compliant (ISO 7)" },
      { zona: "Chamber Sterilisasi EtO", partikel05: "N/A (Sealed)", suhu: "54.2 °C", kelembaban: "65% RH", tekanan: "-5 kPa", status: "Cycle Active" },
    ],
    columns: [
      { key: "zona", label: "Zona / Ruangan" },
      { key: "partikel05", label: "Partikel ≥0.5µm", align: "right" },
      { key: "suhu", label: "Suhu", align: "right" },
      { key: "kelembaban", label: "Kelembaban", align: "right" },
      { key: "tekanan", label: "Tekanan Positif", align: "right" },
      { key: "status", label: "Kepatuhan ISO" },
    ],
  };
}

export function omniOrderQueueTable(): TableSpec {
  return {
    title: "Antrean Pesanan Masuk (Unified Marketplace Queue)",
    rows: [
      { noPesanan: "ORD-SHP-99210", channel: "Lapakku Mall", pembeli: "Andi Saputra", total: "Rp 850.000", kurir: "KirimCepat", resi: "JT992108821", status: "Siap Pick & Pack" },
      { noPesanan: "ORD-TKP-44012", channel: "TokoPrima", pembeli: "PT Cipta Kreasi", total: "Rp 12.450.000", kurir: "ExpressOne Cargo", resi: "00291044012", status: "Dalam Pengiriman" },
      { noPesanan: "ORD-TTS-11982", channel: "LiveMarket", pembeli: "Mega Lestari", total: "Rp 420.000", kurir: "AntarKita", resi: "ANT11982001", status: "Siap Pick & Pack" },
      { noPesanan: "ORD-B2B-00814", channel: "Direct B2B", pembeli: "CV Maju Bersama", total: "Rp 48.000.000", kurir: "Armada Truk Sendiri", resi: "TRK-JKT-091", status: "Terkirim - POD" },
    ],
    columns: [
      { key: "noPesanan", label: "No. Pesanan" },
      { key: "channel", label: "Channel" },
      { key: "pembeli", label: "Nama Pembeli" },
      { key: "total", label: "Total Nilai", align: "right" },
      { key: "kurir", label: "Ekspedisi" },
      { key: "resi", label: "No. Resi" },
      { key: "status", label: "Status Dispatch" },
    ],
    rowActions: [{ label: "Pick" }, { label: "Resi" }],
  };
}

export function omniStockTable(): TableSpec {
  return {
    title: "Keseimbangan Stok Multigudang & Safety Buffers",
    rows: [
      { sku: "SKU-ELEK-001", namaProduk: "Wireless ANC Headphone V5", hubJkt: "420 unit", hubSby: "180 unit", hubMdn: "65 unit", totalBuffer: "665 unit", statusReorder: "Aman" },
      { sku: "SKU-ELEK-002", namaProduk: "Fast Charger GaN 65W Dual Port", hubJkt: "1.200 unit", hubSby: "540 unit", hubMdn: "120 unit", totalBuffer: "1.860 unit", statusReorder: "Aman" },
      { sku: "SKU-ELEK-003", namaProduk: "Smartwatch AMOLED IP68", hubJkt: "45 unit", hubSby: "20 unit", hubMdn: "10 unit", totalBuffer: "75 unit", statusReorder: "Peringatan Menipis" },
    ],
    columns: [
      { key: "sku", label: "Kode SKU" },
      { key: "namaProduk", label: "Nama Produk" },
      { key: "hubJkt", label: "Hub Jakarta", align: "right" },
      { key: "hubSby", label: "Hub Surabaya", align: "right" },
      { key: "hubMdn", label: "Hub Medan", align: "right" },
      { key: "totalBuffer", label: "Total Stock", align: "right" },
      { key: "statusReorder", label: "Status Reorder" },
    ],
  };
}

export function helpdeskTicketTable(): TableSpec {
  return {
    title: "Antrean Tiket Aktif & SLA Countdown",
    rows: [
      { ticketId: "TCK-2027-0104", customer: "PT Digital Solusi Nusantara", subject: "Gagal export CSV e-Faktur PPN 11% masa Februari", priority: "Urgent", channel: "WhatsApp", slaCountdown: "24 Menit Tersisa", assignee: "Rian (Senior L2)", status: "In Progress" },
      { ticketId: "TCK-2027-0105", customer: "Koperasi Mandiri Syariah", subject: "Permintaan panduan distribusi SHU RAT tahunan", priority: "Medium", channel: "Web Portal", slaCountdown: "3.5 Jam Tersisa", assignee: "Siti (Support L1)", status: "Pending Customer" },
      { ticketId: "TCK-2027-0106", customer: "PT Rekayasa Konstruksi", subject: "Sinkronisasi progress billing BAP subkontraktor", priority: "High", channel: "Email", slaCountdown: "1.2 Jam Tersisa", assignee: "Budi (Tech Support)", status: "In Progress" },
      { ticketId: "TCK-2027-0107", customer: "Nusantara Coffee Roasters", subject: "Integrasi timbangan bluetooth ke modul roasting", priority: "Low", channel: "Web Portal", slaCountdown: "7.0 Jam Tersisa", assignee: "Siti (Support L1)", status: "Open" },
    ],
    columns: [
      { key: "ticketId", label: "No. Tiket" },
      { key: "customer", label: "Perusahaan / Klien" },
      { key: "subject", label: "Subjek Kendala" },
      { key: "priority", label: "Prioritas" },
      { key: "channel", label: "Channel" },
      { key: "slaCountdown", label: "SLA Countdown" },
      { key: "assignee", label: "Agent" },
      { key: "status", label: "Status" },
    ],
    rowActions: [{ label: "Buka" }, { label: "Balas" }],
  };
}

export function helpdeskCannedTable(): TableSpec {
  return {
    title: "Knowledge Base & Canned Responses Terpopuler",
    rows: [
      { kode: "KB-EFAKTUR-01", judul: "Langkah Ekspor CSV e-Faktur Format Terbaru DJP", kategori: "Tax & Accounting", penggunaan: "142 kali", rating: "98%" },
      { kode: "KB-BOM-ROUTING", judul: "Cara Konfigurasi Multi-level BOM & Stasiun Kerja", kategori: "Manufacturing", penggunaan: "89 kali", rating: "95%" },
      { kode: "KB-RESET-PASS", judul: "Prosedur Reset Password & Autentikasi 2FA Akun", kategori: "Account Security", penggunaan: "210 kali", rating: "99%" },
    ],
    columns: [
      { key: "kode", label: "Kode" },
      { key: "judul", label: "Judul Panduan" },
      { key: "kategori", label: "Kategori" },
      { key: "penggunaan", label: "Penggunaan", align: "right" },
      { key: "rating", label: "Rating Efektivitas", align: "right" },
    ],
  };
}

/* -------------------------------------------------------------------------------------------
 * Shared ERP documents.
 *
 * A bank reconciliation, an aging bucket list and a purchase order look the same in a shoe
 * shop and in a hospital — only the parties and the amounts differ. These take a title (and,
 * where it matters, the rows) so a console can name the document the way its users do.
 * ---------------------------------------------------------------------------------------- */

export function bankTable(title = "Rekonsiliasi Bank"): TableSpec {
  return table(
    title,
    [["date", "Tanggal"], ["ref", "Referensi"], ["description", "Keterangan"], ["amount", "Nilai", "right"], ["status", "Status"]],
    [
      { date: "2026-08-20", ref: "TRF-88214", description: "Setoran tunai outlet", amount: "Rp 38.450.000", status: "Matched" },
      { date: "2026-08-20", ref: "SET-BANK-0820", description: "Settlement kartu debit/kredit", amount: "Rp 74.120.000", status: "Matched" },
      { date: "2026-08-19", ref: "ADM-0819", description: "Biaya administrasi bank", amount: "Rp 185.000", status: "Unmatched" },
      { date: "2026-08-19", ref: "QRIS-0819", description: "Settlement QRIS T+1", amount: "Rp 21.340.000", status: "Pending" },
    ],
    ["Open", "Match"],
  );
}

export function agingTable(title = "Umur Piutang", subject = "Pelanggan"): TableSpec {
  return table(
    title,
    [["party", subject], ["current", "Belum Jatuh Tempo", "right"], ["b30", "1-30 Hari", "right"], ["b60", "31-60 Hari", "right"], ["b90", "> 60 Hari", "right"], ["total", "Total", "right"]],
    [
      { party: "PT Andalan Sejahtera", current: "Rp 42.000.000", b30: "Rp 12.400.000", b60: "Rp 0", b90: "Rp 0", total: "Rp 54.400.000" },
      { party: "CV Mitra Abadi", current: "Rp 18.500.000", b30: "Rp 6.200.000", b60: "Rp 4.100.000", b90: "Rp 0", total: "Rp 28.800.000" },
      { party: "Toko Sinar Jaya", current: "Rp 0", b30: "Rp 2.900.000", b60: "Rp 1.400.000", b90: "Rp 3.800.000", total: "Rp 8.100.000" },
    ],
    ["Open", "Kirim Pengingat"],
  );
}

export function purchaseOrderTable(title = "Purchase Order"): TableSpec {
  return table(
    title,
    [["po", "No. PO"], ["supplier", "Supplier"], ["eta", "ETA"], ["status", "Status"], ["amount", "Nilai", "right"]],
    [
      { po: "PO-2026-0318", supplier: "PT Kulit Nusantara", eta: "2026-08-26", status: "Dikirim Sebagian", amount: "Rp 74.200.000" },
      { po: "PO-2026-0319", supplier: "CV Sol Mandiri", eta: "2026-08-29", status: "Menunggu Konfirmasi", amount: "Rp 32.400.000" },
      { po: "PO-2026-0320", supplier: "PT Kemasan Prima", eta: "2026-09-02", status: "Disetujui", amount: "Rp 12.850.000" },
    ],
    ["Open", "Terima Barang"],
  );
}

export function supplierTable(title = "Supplier & Harga Beli"): TableSpec {
  return table(
    title,
    [["supplier", "Supplier"], ["category", "Kategori"], ["terms", "Termin"], ["rating", "Skor"], ["outstanding", "Hutang", "right"]],
    [
      { supplier: "PT Kulit Nusantara", category: "Bahan Baku", terms: "Net 30", rating: "A (96%)", outstanding: "Rp 74.200.000" },
      { supplier: "CV Sol Mandiri", category: "Komponen", terms: "Net 14", rating: "B (88%)", outstanding: "Rp 32.400.000" },
      { supplier: "PT Kemasan Prima", category: "Kemasan", terms: "Tunai", rating: "A (94%)", outstanding: "Rp 0" },
    ],
    ["Open", "Buat PO"],
  );
}

export function periodCloseTable(title = "Checklist Tutup Periode"): TableSpec {
  return table(
    title,
    [["step", "Langkah"], ["owner", "Penanggung Jawab"], ["due", "Batas"], ["status", "Status"]],
    [
      { step: "Rekonsiliasi bank & kas", owner: "finance.manager", due: "2026-09-03", status: "Selesai" },
      { step: "Tie-out subledger AR/AP", owner: "finance.manager", due: "2026-09-04", status: "Selesai" },
      { step: "Penilaian persediaan akhir", owner: "ops.lead", due: "2026-09-05", status: "Berjalan" },
      { step: "Kunci periode & posting penyesuaian", owner: "controller", due: "2026-09-06", status: "Belum Mulai" },
    ],
    ["Open", "Tandai Selesai"],
  );
}

export function masterItemTable(title = "Master Item"): TableSpec {
  return table(
    title,
    [["sku", "SKU"], ["name", "Nama"], ["group", "Grup"], ["uom", "Satuan"], ["price", "Harga Jual", "right"]],
    [
      { sku: "SNK-RUN-42-BLK", name: "Sneaker Runner 42 Black", group: "Sneaker", uom: "Pasang", price: "Rp 899.000" },
      { sku: "LFR-CLS-40-TAN", name: "Loafer Classic 40 Tan", group: "Formal", uom: "Pasang", price: "Rp 1.150.000" },
      { sku: "KID-SPT-32-WHT", name: "Kids Sport 32 White", group: "Anak", uom: "Pasang", price: "Rp 599.000" },
    ],
    ["Open", "Ubah Harga"],
  );
}
