import { MURABAHAH_FINANCING_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const koperasiMemberRows = [
  { metric: "Simpanan Pokok + Wajib", amount: "Rp 2.892.000.000", classification: "Equity", status: "Tie-out OK" },
  { metric: "Simpanan Sukarela", amount: "Rp 1.928.000.000", classification: "Liability", status: "Tie-out OK" },
  { metric: "Pembiayaan Murabahah", amount: "Rp 6.450.000.000", classification: "Receivable", status: "NPF 1.42%" },
  { metric: "SHU Anggota", amount: "Rp 252.000.000", classification: "Payable", status: "Draft RAT" },
];

const memberFinanceModule: ModuleSpec = {
  name: "member-finance",
  label: { id: "Member Finance", en: "Member Finance" },
  iconName: "landmark",
  doctypes: [MURABAHAH_FINANCING_META],
  workspace: {
    name: "member-finance",
    label: { id: "Member Finance", en: "Member Finance" },
    module: "Koperasi & BMT",
    kpis: [
      { label: { id: "Total Simpanan", en: "Total Savings" }, value: "Rp 4.82 M" },
      { label: { id: "Pembiayaan Aktif", en: "Active Financing" }, value: "Rp 6.45 M" },
      { label: { id: "NPF Gross", en: "Gross NPF" }, value: "1.42%" },
      { label: { id: "Estimasi SHU", en: "Estimated SHU" }, value: "Rp 420.000.000" },
    ],
    shortcuts: [
      {
        doctype: "MurabahahAgreement",
        label: { id: "Akad Murabahah", en: "Murabahah Agreements" },
        description: { id: "Akad, jadwal angsuran, kolektibilitas, dan SHU anggota", en: "Agreements, installment schedule, collectibility, and member SHU" },
      },
      {
        doctype: "MurabahahAgreement",
        route: "/app/koperasi-bmt/edit/MurabahahAgreement/new",
        label: { id: "Buat Akad", en: "Create Agreement" },
        description: { id: "Input pembiayaan lewat generated form", en: "Capture financing agreements through generated form" },
      },
      {
        doctype: "MurabahahAgreement",
        route: "/app/koperasi-bmt/list/MurabahahAgreement?filter_status=Aktif",
        label: { id: "Pembiayaan Aktif", en: "Active Financing" },
        description: { id: "Akad aktif dan outstanding pokok/margin", en: "Active agreements and outstanding principal/margin" },
      },
      {
        doctype: "MurabahahAgreement",
        route: "/app/koperasi-bmt/report/KoperasiMemberReport",
        label: { id: "Laporan RAT", en: "Member Report" },
        description: { id: "Simpanan, pembiayaan, CKPN, dan SHU", en: "Savings, financing, provision, and SHU" },
      },
      {
        doctype: "MurabahahAgreement",
        route: "/app/koperasi-bmt/report/KoperasiCollectibilityReport",
        label: { id: "Kolektibilitas OJK", en: "OJK Collectibility" },
        description: {
          id: "Kolektibilitas 5 tier dari jatuh tempo angsuran, DPD, dan CKPN",
          en: "Five-tier collectibility from installment due dates, DPD, and CKPN",
        },
      },
    ],
    charts: [
      {
        id: "savings-classification",
        title: { id: "Klasifikasi Simpanan", en: "Savings Classification" },
        type: "donut",
        xKey: "type",
        yKey: "amount",
        dataSource: [
          { type: "Pokok", amount: 723 },
          { type: "Wajib", amount: 2169 },
          { type: "Sukarela", amount: 1928 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "KoperasiMemberReport",
      label: { id: "Laporan RAT Anggota", en: "Member RAT Report" },
      columns: [
        { key: "metric", label: { id: "Metrik", en: "Metric" } },
        { key: "amount", label: { id: "Nominal", en: "Amount" }, align: "right" },
        { key: "classification", label: { id: "Klasifikasi", en: "Classification" }, align: "center" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "Equity Savings", en: "Equity Savings" }, value: "Rp 2.89 M" },
        { label: { id: "Liability Savings", en: "Liability Savings" }, value: "Rp 1.93 M" },
        { label: { id: "Member SHU Pool", en: "Member SHU Pool" }, value: "Rp 252.000.000" },
      ],
      dataSource: koperasiMemberRows,
    },
  ],
};

export const koperasiBmt: CompanyDemo = {
  id: "koperasi-bmt",
  company: "Koperasi & BMT Syariah Mandiri",
  title: "Koperasi & BMT Syariah Mandiri",
  subtitle: "Simpan pinjam syariah: simpanan pokok/wajib/sukarela, akad murabahah, angsuran, kolektibilitas, CKPN, dan SHU.",
  source: "Koperasi & BMT ERP + Member Savings + Murabahah + SHU RAT",
  patterns: ["Murabahah Financing", "Simpanan Pokok & Wajib", "Simpanan Sukarela", "Kolektibilitas", "SHU RAT"],
  category: "Jasa, CRM & Koperasi",
  modules: [memberFinanceModule],
  doctypes: [MURABAHAH_FINANCING_META],
  reports: memberFinanceModule.reports,
  defaultModule: "member-finance",
  nav: [
    {
      label: "Koperasi & BMT",
      items: [
        { label: "Member Finance", page: "dashboard", module: "member-finance" },
        { label: "Akad Murabahah", page: "financing", doctype: "MurabahahAgreement" },
        { label: "Buat Akad", page: "new-financing", path: "/app/koperasi-bmt/edit/MurabahahAgreement/new", doctype: "MurabahahAgreement" },
        { label: "Pembiayaan Aktif", page: "installments", path: "/app/koperasi-bmt/list/MurabahahAgreement?filter_status=Aktif", doctype: "MurabahahAgreement" },
        { label: "Laporan RAT", page: "reports", report: "KoperasiMemberReport" },
        {
          label: "Kolektibilitas OJK",
          page: "collectibility",
          path: "/app/koperasi-bmt/report/KoperasiCollectibilityReport",
          report: "KoperasiCollectibilityReport",
        },
      ],
    },
  ],
  pages: {},
};
