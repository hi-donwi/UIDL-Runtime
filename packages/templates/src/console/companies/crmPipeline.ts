import { OPPORTUNITY_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const weightedForecastRows = [
  { stage: "Lead Baru", deals: 18, pipelineValue: "Rp 285.000.000", probability: "20%", weightedValue: "Rp 57.000.000" },
  { stage: "Kualifikasi", deals: 14, pipelineValue: "Rp 452.000.000", probability: "35%", weightedValue: "Rp 158.200.000" },
  { stage: "Proposal", deals: 12, pipelineValue: "Rp 830.000.000", probability: "55%", weightedValue: "Rp 456.500.000" },
  { stage: "Negosiasi", deals: 8, pipelineValue: "Rp 650.000.000", probability: "75%", weightedValue: "Rp 487.500.000" },
  { stage: "Won", deals: 6, pipelineValue: "Rp 420.000.000", probability: "100%", weightedValue: "Rp 420.000.000" },
];

const salesPipelineModule: ModuleSpec = {
  name: "sales-pipeline",
  label: { id: "Sales Pipeline", en: "Sales Pipeline" },
  iconName: "pipeline",
  doctypes: [OPPORTUNITY_META],
  workspace: {
    name: "sales-pipeline",
    label: { id: "Sales Pipeline", en: "Sales Pipeline" },
    module: "CRM",
    kpis: [
      { label: { id: "Pipeline Value", en: "Pipeline Value" }, value: "Rp 2.637 M" },
      { label: { id: "Weighted Forecast", en: "Weighted Forecast" }, value: "Rp 1.485 M" },
      { label: { id: "Win Rate", en: "Win Rate" }, value: "41.8%" },
      { label: { id: "Avg Deal Cycle", en: "Avg Deal Cycle" }, value: "28 hari" },
    ],
    shortcuts: [
      {
        doctype: "Opportunity",
        label: { id: "Opportunity", en: "Opportunity" },
        description: { id: "Kanban deal stages, owner, score, dan value", en: "Deal stages, owner, score, and value" },
      },
      {
        doctype: "Opportunity",
        route: "/app/crm-pipeline/edit/Opportunity/new",
        label: { id: "Buat Opportunity", en: "Create Opportunity" },
        description: { id: "Input lead/deal lewat generated form", en: "Capture leads and deals through generated form" },
      },
      {
        doctype: "Opportunity",
        route: "/app/crm-pipeline/list/Opportunity?filter_stage=Proposal",
        label: { id: "Proposal Aktif", en: "Active Proposals" },
        description: { id: "Daftar deal yang sudah masuk proposal", en: "Deals currently in proposal" },
      },
      {
        doctype: "Opportunity",
        route: "/app/crm-pipeline/report/WeightedForecast",
        label: { id: "Forecast Tertimbang", en: "Weighted Forecast" },
        description: { id: "Pipeline value dikalikan probabilitas stage", en: "Pipeline value weighted by stage probability" },
      },
    ],
    charts: [
      {
        id: "pipeline-by-stage",
        title: { id: "Pipeline per Tahap", en: "Pipeline by Stage" },
        type: "bar",
        xKey: "stage",
        yKey: "value",
        dataSource: [
          { stage: "Lead", value: 285 },
          { stage: "Kualifikasi", value: 452 },
          { stage: "Proposal", value: 830 },
          { stage: "Negosiasi", value: 650 },
          { stage: "Won", value: 420 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "WeightedForecast",
      label: { id: "Forecast Tertimbang", en: "Weighted Forecast" },
      filters: [
        {
          field: "stage",
          label: { id: "Tahap", en: "Stage" },
          widget: "Select",
          options: [
            { value: "Lead Baru", label: "Lead Baru" },
            { value: "Kualifikasi", label: "Kualifikasi" },
            { value: "Proposal", label: "Proposal" },
            { value: "Negosiasi", label: "Negosiasi" },
            { value: "Won", label: "Won" },
          ],
        },
      ],
      columns: [
        { key: "stage", label: { id: "Tahap", en: "Stage" } },
        { key: "deals", label: { id: "Deal", en: "Deals" }, align: "right" },
        { key: "pipelineValue", label: { id: "Nilai Pipeline", en: "Pipeline Value" }, align: "right" },
        { key: "probability", label: { id: "Probabilitas", en: "Probability" }, align: "right" },
        { key: "weightedValue", label: { id: "Tertimbang", en: "Weighted" }, align: "right" },
      ],
      summaries: [
        { label: { id: "Pipeline", en: "Pipeline" }, value: "Rp 2.637 M" },
        { label: { id: "Tertimbang", en: "Weighted" }, value: "Rp 1.485 M" },
        { label: { id: "Akurasi Forecast", en: "Forecast Accuracy" }, value: "94%" },
      ],
      dataSource: weightedForecastRows,
    },
  ],
};

export const crmPipeline: CompanyDemo = {
  id: "crm-pipeline",
  company: "Pipeline CRM Deal Hub",
  title: "Pipeline CRM Opportunity Hub",
  subtitle: "CRM & Opportunity Pipeline: Kanban deal stages, lead qualification, weighted revenue forecast, dan kuota sales executive.",
  source: "Pipeline CRM Kanban + Deal Flow + Forecast Analytics",
  patterns: ["Kanban Deal Flow", "Weighted Forecast", "Sales Rep Quota", "Win/Loss", "SLA First Response"],
  category: "Jasa, CRM & Koperasi",
  modules: [salesPipelineModule],
  doctypes: [OPPORTUNITY_META],
  reports: salesPipelineModule.reports,
  defaultModule: "sales-pipeline",
  nav: [
    {
      label: "Pipeline",
      items: [
        { label: "Sales Pipeline", page: "dashboard", module: "sales-pipeline" },
        { label: "Opportunity", page: "pipeline", doctype: "Opportunity" },
        { label: "Buat Opportunity", page: "new-opportunity", path: "/app/crm-pipeline/edit/Opportunity/new", doctype: "Opportunity" },
        { label: "Forecast Tertimbang", page: "forecast", report: "WeightedForecast" },
      ],
    },
  ],
  pages: {},
};
