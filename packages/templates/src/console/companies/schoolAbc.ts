import { TUITION_FEE_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const schoolManagementRows = [
  { metric: "SPP Ditagih", period: "Agustus 2026", amount: "Rp 438.000.000", status: "Aktif" },
  { metric: "SPP Tertagih", period: "Agustus 2026", amount: "Rp 386.200.000", status: "91%" },
  { metric: "Tunggakan", period: "Agustus 2026", amount: "Rp 52.800.000", status: "37 siswa" },
  { metric: "Payroll Accrued", period: "Agustus 2026", amount: "Rp 167.800.000", status: "Submitted" },
];

const schoolFinanceModule: ModuleSpec = {
  name: "school-finance",
  label: { id: "School Finance", en: "School Finance" },
  iconName: "graduation-cap",
  doctypes: [TUITION_FEE_META],
  workspace: {
    name: "school-finance",
    label: { id: "School Finance", en: "School Finance" },
    module: "Education",
    kpis: [
      { label: { id: "Fees Collected", en: "Fees Collected" }, value: "Rp 438.000.000" },
      { label: { id: "Student AR", en: "Student AR" }, value: "Rp 218.450.000" },
      { label: { id: "Payroll Payable", en: "Payroll Payable" }, value: "Rp 167.800.000" },
      { label: { id: "Bank Balance", en: "Bank Balance" }, value: "Rp 1.12 M" },
    ],
    shortcuts: [
      {
        doctype: "TuitionFee",
        label: { id: "Tagihan SPP", en: "Tuition Fees" },
        description: { id: "Batch SPP, status pembayaran, dan outstanding siswa", en: "Tuition billing, payment status, and outstanding AR" },
      },
      {
        doctype: "TuitionFee",
        route: "/app/school-abc/edit/TuitionFee/new",
        label: { id: "Buat Tagihan", en: "Create Fee" },
        description: { id: "Input tagihan SPP lewat generated form", en: "Capture tuition fees through generated form" },
      },
      {
        doctype: "TuitionFee",
        route: "/app/school-abc/list/TuitionFee?filter_status=Jatuh%20Tempo",
        label: { id: "Tunggakan", en: "Arrears" },
        description: { id: "Daftar tagihan lewat jatuh tempo", en: "Overdue tuition invoices" },
      },
      {
        doctype: "TuitionFee",
        route: "/app/school-abc/report/SchoolManagementReport",
        label: { id: "Laporan Manajemen", en: "Management Report" },
        description: { id: "SPP, payroll, dan kontrol piutang sekolah", en: "Tuition, payroll, and receivable controls" },
      },
      {
        doctype: "TuitionFee",
        route: "/app/school-abc/report/SchoolDunningReport",
        label: { id: "Laporan Tunggakan", en: "Dunning Report" },
        description: { id: "Aging tagihan dari due date, pembayaran, dan saldo aktual", en: "Invoice aging from due dates, payments, and actual balances" },
      },
    ],
    charts: [
      {
        id: "fee-collection-trend",
        title: { id: "Tren Penerimaan SPP", en: "Fee Collection Trend" },
        type: "bar",
        xKey: "week",
        yKey: "amount",
        dataSource: [
          { week: "W1", amount: 412 },
          { week: "W2", amount: 438 },
          { week: "W3", amount: 421 },
          { week: "W4", amount: 452 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "SchoolManagementReport",
      label: { id: "Laporan Manajemen Sekolah", en: "School Management Report" },
      columns: [
        { key: "metric", label: { id: "Metrik", en: "Metric" } },
        { key: "period", label: { id: "Periode", en: "Period" } },
        { key: "amount", label: { id: "Nominal", en: "Amount" }, align: "right" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "Collection Rate", en: "Collection Rate" }, value: "91%" },
        { label: { id: "Budget Used", en: "Budget Used" }, value: "82%" },
        { label: { id: "Cash Runway", en: "Cash Runway" }, value: "141 hari" },
      ],
      dataSource: schoolManagementRows,
    },
  ],
};

export const schoolAbc: CompanyDemo = {
  id: "school-abc",
  company: "Sekolah ABC",
  title: "Sekolah ABC",
  subtitle: "ERP sekolah: invoice SPP, tunggakan siswa, kas bank, payroll guru, budget program, dan laporan piutang.",
  source: "Meridian Dashboard + AR + Payroll + Reports patterns",
  patterns: ["Student Fees", "Receivables", "Payroll", "Bank", "Budget"],
  category: "Jasa, CRM & Koperasi",
  modules: [schoolFinanceModule],
  doctypes: [TUITION_FEE_META],
  reports: schoolFinanceModule.reports,
  defaultModule: "school-finance",
  nav: [
    {
      label: "Keuangan Sekolah",
      items: [
        { label: "School Finance", page: "dashboard", module: "school-finance" },
        { label: "Tagihan SPP", page: "fees", doctype: "TuitionFee" },
        { label: "Buat Tagihan", page: "new-fee", path: "/app/school-abc/edit/TuitionFee/new", doctype: "TuitionFee" },
        { label: "Laporan Tunggakan", page: "dunning", path: "/app/school-abc/report/SchoolDunningReport", report: "SchoolDunningReport" },
        { label: "Laporan Manajemen", page: "reports", report: "SchoolManagementReport" },
      ],
    },
  ],
  pages: {},
};
