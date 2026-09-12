import { PROJECT_MILESTONE_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const epcProgressRows = [
  { project: "Gardu Induk 150kV", certifiedProgress: "80%", revenueRecognized: "Rp 96.000.000.000", retentionHeld: "Rp 4.800.000.000", status: "Billed" },
  { project: "Piping Kilang Fase 2", certifiedProgress: "64%", revenueRecognized: "Rp 61.440.000.000", retentionHeld: "Rp 3.072.000.000", status: "Certified PoC" },
  { project: "IPAL Pabrik", certifiedProgress: "42%", revenueRecognized: "Rp 18.900.000.000", retentionHeld: "Rp 945.000.000", status: "In Progress" },
];

const projectControlsModule: ModuleSpec = {
  name: "project-controls",
  label: { id: "Project Controls", en: "Project Controls" },
  iconName: "hard-hat",
  doctypes: [PROJECT_MILESTONE_META],
  workspace: {
    name: "project-controls",
    label: { id: "Project Controls", en: "Project Controls" },
    module: "EPC",
    kpis: [
      { label: { id: "Contract Value", en: "Contract Value" }, value: "Rp 120.00 M" },
      { label: { id: "Certified PoC", en: "Certified PoC" }, value: "68.0%" },
      { label: { id: "Cost Incurred", en: "Cost Incurred" }, value: "Rp 71.40 M" },
      { label: { id: "Retention Held", en: "Retention Held" }, value: "Rp 3.60 M" },
    ],
    shortcuts: [
      {
        doctype: "ProjectMilestone",
        label: { id: "WBS & Milestone", en: "WBS & Milestones" },
        description: { id: "Paket WBS, progress, PoC, billing, retensi, dan BAST", en: "WBS package, progress, PoC, billing, retention, and BAST" },
      },
      {
        doctype: "ProjectMilestone",
        route: "/app/epc-contractor/edit/ProjectMilestone/new",
        label: { id: "Tambah Milestone", en: "Create Milestone" },
        description: { id: "Input termin proyek lewat generated form", en: "Capture project milestones through generated form" },
      },
      {
        doctype: "ProjectMilestone",
        route: "/app/epc-contractor/list/ProjectMilestone?filter_status=Certified%20PoC",
        label: { id: "Siap Tagih", en: "Ready to Bill" },
        description: { id: "Milestone dengan PoC tersertifikasi", en: "Milestones with certified PoC" },
      },
      {
        doctype: "ProjectMilestone",
        route: "/app/epc-contractor/report/EPCProgressReport",
        label: { id: "Laporan Kontraktor", en: "Contractor Report" },
        description: { id: "Progress, revenue, retensi, dan margin proyek", en: "Progress, revenue, retention, and project margin" },
      },
    ],
    charts: [
      {
        id: "poc-by-package",
        title: { id: "PoC per Paket", en: "PoC by Package" },
        type: "bar",
        xKey: "package",
        yKey: "progress",
        dataSource: [
          { package: "Civil", progress: 92 },
          { package: "Structural", progress: 65 },
          { package: "Mechanical", progress: 55 },
          { package: "Electrical", progress: 35 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "EPCProgressReport",
      label: { id: "Laporan Kontraktor", en: "EPC Progress Report" },
      columns: [
        { key: "project", label: { id: "Proyek", en: "Project" } },
        { key: "certifiedProgress", label: { id: "PoC", en: "PoC" }, align: "right" },
        { key: "revenueRecognized", label: { id: "Revenue", en: "Revenue" }, align: "right" },
        { key: "retentionHeld", label: { id: "Retensi", en: "Retention" }, align: "right" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "Certified PoC", en: "Certified PoC" }, value: "68.0%" },
        { label: { id: "Revenue Recognized", en: "Revenue Recognized" }, value: "Rp 81.60 M" },
        { label: { id: "Retention Held", en: "Retention Held" }, value: "Rp 3.60 M" },
      ],
      dataSource: epcProgressRows,
    },
  ],
};

export const epcContractor: CompanyDemo = {
  id: "epc-contractor",
  company: "PT Rekayasa Konstruksi Nusantara",
  title: "Rekayasa Konstruksi Nusantara (EPC)",
  subtitle: "Konsol kontraktor & EPC: WBS, percentage of completion, progress billing, retensi 5%, dan BAST.",
  source: "EPC Project Management + WBS + PoC Billing + Retention",
  patterns: ["Tree WBS", "PoC Billing", "Subcontractor Claim", "5% Retention", "Milestone BAST"],
  category: "Jasa, CRM & Koperasi",
  modules: [projectControlsModule],
  doctypes: [PROJECT_MILESTONE_META],
  reports: projectControlsModule.reports,
  defaultModule: "project-controls",
  nav: [
    {
      label: "Project Controls",
      items: [
        { label: "Project Controls", page: "dashboard", module: "project-controls" },
        { label: "WBS & Milestone", page: "wbs", doctype: "ProjectMilestone" },
        { label: "Tambah Milestone", page: "new-milestone", path: "/app/epc-contractor/edit/ProjectMilestone/new", doctype: "ProjectMilestone" },
        {
          label: "Siap Tagih",
          page: "billing",
          path: "/app/epc-contractor/list/ProjectMilestone?filter_status=Certified%20PoC",
          doctype: "ProjectMilestone",
        },
        { label: "Laporan Kontraktor", page: "reports", report: "EPCProgressReport" },
      ],
    },
  ],
  pages: {},
};
