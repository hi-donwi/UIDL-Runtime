import { PATIENT_ADMISSION_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const hospitalRevenueRows = [
  { metric: "Rawat Jalan Umum", amount: "Rp 340.000.000", payer: "Umum", status: "Paid" },
  { metric: "Klaim BPJS", amount: "Rp 1.482.500.000", payer: "BPJS Kesehatan", status: "Submitted" },
  { metric: "Farmasi FEFO", amount: "Rp 214.000.000", payer: "Mixed", status: "Dispensed" },
  { metric: "Piutang Penjamin", amount: "Rp 284.000.000", payer: "Asuransi Swasta", status: "Open" },
];

const clinicalOpsModule: ModuleSpec = {
  name: "clinical-ops",
  label: { id: "Clinical Ops", en: "Clinical Ops" },
  iconName: "stethoscope",
  doctypes: [PATIENT_ADMISSION_META],
  workspace: {
    name: "clinical-ops",
    label: { id: "Clinical Ops", en: "Clinical Ops" },
    module: "Healthcare",
    kpis: [
      { label: { id: "Pasien Hari Ini", en: "Patients Today" }, value: "401" },
      { label: { id: "Bed Occupancy", en: "Bed Occupancy" }, value: "82.4%" },
      { label: { id: "Resep Terlayani", en: "Prescriptions Served" }, value: "318 R/" },
      { label: { id: "Klaim BPJS", en: "BPJS Claims" }, value: "Rp 1.48 M" },
    ],
    shortcuts: [
      {
        doctype: "PatientAdmission",
        label: { id: "Antrean Pasien", en: "Patient Queue" },
        description: { id: "Pendaftaran, antrean poli, EMR, farmasi, billing, dan klaim", en: "Registration, queue, EMR, pharmacy, billing, and claims" },
      },
      {
        doctype: "PatientAdmission",
        route: "/app/hospital-medika/edit/PatientAdmission/new",
        label: { id: "Daftar Pasien", en: "Register Patient" },
        description: { id: "Input pendaftaran pasien demo lewat generated form", en: "Capture demo patient admissions through generated form" },
      },
      {
        doctype: "PatientAdmission",
        route: "/app/hospital-medika/list/PatientAdmission?filter_status=Apotek%20Resep",
        label: { id: "Menunggu Farmasi", en: "Waiting Pharmacy" },
        description: { id: "Pasien yang sudah punya EMR dan menunggu dispensing", en: "Patients with EMR waiting for dispensing" },
      },
      {
        doctype: "PatientAdmission",
        route: "/app/hospital-medika/report/HospitalRevenueReport",
        label: { id: "Laporan RS", en: "Hospital Report" },
        description: { id: "Revenue, farmasi, klaim, dan piutang penjamin", en: "Revenue, pharmacy, claims, and insurance receivables" },
      },
      {
        doctype: "PatientAdmission",
        route: "/app/hospital-medika/report/HospitalClaimReconciliation",
        label: { id: "Rekonsiliasi Klaim", en: "Claim Reconciliation" },
        description: {
          id: "Tagihan vs klaim vs pembayaran vs adjustment, dan saldo outstanding",
          en: "Bill vs claim vs payment vs adjustment, and outstanding balance",
        },
      },
    ],
    charts: [
      {
        id: "visits-by-poly",
        title: { id: "Kunjungan per Poli", en: "Visits by Clinic" },
        type: "bar",
        xKey: "poly",
        yKey: "visits",
        dataSource: [
          { poly: "Penyakit Dalam", visits: 142 },
          { poly: "Anak", visits: 98 },
          { poly: "Jantung", visits: 64 },
          { poly: "Gigi", visits: 45 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "HospitalRevenueReport",
      label: { id: "Laporan Manajemen Rumah Sakit", en: "Hospital Management Report" },
      columns: [
        { key: "metric", label: { id: "Metrik", en: "Metric" } },
        { key: "amount", label: { id: "Nominal", en: "Amount" }, align: "right" },
        { key: "payer", label: { id: "Penjamin", en: "Payer" }, align: "center" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "Claim Verified", en: "Claim Verified" }, value: "98.2%" },
        { label: { id: "EMR Complete", en: "EMR Complete" }, value: "99.4%" },
        { label: { id: "FEFO Dispensed", en: "FEFO Dispensed" }, value: "318 R/" },
      ],
      dataSource: hospitalRevenueRows,
    },
  ],
};

export const hospitalMedika: CompanyDemo = {
  id: "hospital-medika",
  company: "RS Medika Nusantara",
  title: "RS Medika Nusantara",
  subtitle: "Healthcare demo fiktif: antrean poli, EMR ICD-10, farmasi resep FEFO, billing, dan klaim BPJS.",
  source: "Healthcare Information System + EMR + FEFO Pharmacy + Claim Lifecycle",
  patterns: ["Poli Queue", "ICD-10 EMR", "FEFO Pharmacy", "Hospital Billing", "BPJS Claim"],
  category: "Kesehatan & Medtech",
  modules: [clinicalOpsModule],
  doctypes: [PATIENT_ADMISSION_META],
  reports: clinicalOpsModule.reports,
  defaultModule: "clinical-ops",
  nav: [
    {
      label: "Pelayanan RS",
      items: [
        { label: "Clinical Ops", page: "dashboard", module: "clinical-ops" },
        { label: "Antrean Pasien", page: "queue", doctype: "PatientAdmission" },
        { label: "Daftar Pasien", page: "new-admission", path: "/app/hospital-medika/edit/PatientAdmission/new", doctype: "PatientAdmission" },
        {
          label: "Menunggu Farmasi",
          page: "pharmacy",
          path: "/app/hospital-medika/list/PatientAdmission?filter_status=Apotek%20Resep",
          doctype: "PatientAdmission",
        },
        { label: "Laporan RS", page: "reports", report: "HospitalRevenueReport" },
        {
          label: "Rekonsiliasi Klaim",
          page: "reconciliation",
          path: "/app/hospital-medika/report/HospitalClaimReconciliation",
          report: "HospitalClaimReconciliation",
        },
      ],
    },
  ],
  pages: {},
};
