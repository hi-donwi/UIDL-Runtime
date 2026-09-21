import { ROASTING_BATCH_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const roasteryMarginRows = [
  { origin: "Aceh Gayo", batches: 18, yieldRate: "83.5%", greenCost: "Rp 420.000.000", grossMargin: "Rp 186.000.000" },
  { origin: "Toraja Sapan", batches: 11, yieldRate: "82.8%", greenCost: "Rp 284.000.000", grossMargin: "Rp 112.400.000" },
  { origin: "Kintamani", batches: 9, yieldRate: "84.1%", greenCost: "Rp 198.000.000", grossMargin: "Rp 86.500.000" },
  { origin: "Dampit Robusta", batches: 14, yieldRate: "85.0%", greenCost: "Rp 174.000.000", grossMargin: "Rp 74.800.000" },
];

const roasteryOpsModule: ModuleSpec = {
  name: "roastery-ops",
  label: { id: "Roastery Ops", en: "Roastery Ops" },
  iconName: "coffee",
  doctypes: [ROASTING_BATCH_META],
  workspace: {
    name: "roastery-ops",
    label: { id: "Roastery Ops", en: "Roastery Ops" },
    module: "Roastery",
    kpis: [
      { label: { id: "Output Hari Ini", en: "Daily Output" }, value: "420 kg" },
      { label: { id: "QC Pass Rate", en: "QC Pass Rate" }, value: "98.2%" },
      { label: { id: "Roast Yield", en: "Roast Yield" }, value: "83.5%" },
      { label: { id: "Green Bean Stock", en: "Green Bean Stock" }, value: "4.47 Ton" },
    ],
    shortcuts: [
      {
        doctype: "RoastingBatch",
        label: { id: "Batch Roasting", en: "Roasting Batches" },
        description: {
          id: "Kontrak green bean, roast loss, cupping, packaging, dan sale margin",
          en: "Green bean contract, roast loss, cupping, packaging, and sale margin",
        },
      },
      {
        doctype: "RoastingBatch",
        route: "/app/food-roasters/edit/RoastingBatch/new",
        label: { id: "Buat Batch", en: "Create Batch" },
        description: { id: "Input lot green bean lewat generated form", en: "Capture green bean lots through generated form" },
      },
      {
        doctype: "RoastingBatch",
        route: "/app/food-roasters/list/RoastingBatch?filter_status=Cupping%20Passed",
        label: { id: "Siap Packaging", en: "Ready for Packaging" },
        description: { id: "Batch yang sudah lolos cupping dan siap dikemas", en: "Batches that passed cupping and are ready to pack" },
      },
      {
        doctype: "RoastingBatch",
        route: "/app/food-roasters/report/RoasteryMarginReport",
        label: { id: "Margin Roastery", en: "Roastery Margin" },
        description: {
          id: "Yield, batch cost, COGS, dan gross margin per origin",
          en: "Yield, batch cost, COGS, and gross margin by origin",
        },
      },
    ],
    charts: [
      {
        id: "yield-by-origin",
        title: { id: "Yield per Origin", en: "Yield by Origin" },
        type: "bar",
        xKey: "origin",
        yKey: "yieldRate",
        dataSource: [
          { origin: "Gayo", yieldRate: 83.5 },
          { origin: "Toraja", yieldRate: 82.8 },
          { origin: "Kintamani", yieldRate: 84.1 },
          { origin: "Dampit", yieldRate: 85.0 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "RoasteryMarginReport",
      label: { id: "Analitik Margin Roastery", en: "Roastery Margin Analytics" },
      columns: [
        { key: "origin", label: { id: "Origin", en: "Origin" } },
        { key: "batches", label: { id: "Batch", en: "Batches" }, align: "right" },
        { key: "yieldRate", label: { id: "Yield", en: "Yield" }, align: "right" },
        { key: "greenCost", label: { id: "Biaya Green Bean", en: "Green Bean Cost" }, align: "right" },
        { key: "grossMargin", label: { id: "Gross Margin", en: "Gross Margin" }, align: "right" },
      ],
      summaries: [
        { label: { id: "Average Yield", en: "Average Yield" }, value: "83.5%" },
        { label: { id: "Gross Margin", en: "Gross Margin" }, value: "46.2%" },
        { label: { id: "QC Pass Rate", en: "QC Pass Rate" }, value: "98.2%" },
      ],
      dataSource: roasteryMarginRows,
    },
  ],
};

export const foodRoasters: CompanyDemo = {
  id: "food-roasters",
  company: "Nusantara Coffee Roasters",
  title: "Nusantara Coffee Roasters",
  subtitle: "Pabrik roasting kopi: kontrak green bean, roast loss, cupping, packaging, stock ledger, COGS, dan wholesale margin.",
  source: "Food & Beverage Roasting ERP + QC Gate + Stock Valuation",
  patterns: ["Green Bean Contract", "Roast Loss", "Cupping Gate", "Stock Ledger", "COGS Margin"],
  category: "Manufaktur",
  modules: [roasteryOpsModule],
  doctypes: [ROASTING_BATCH_META],
  reports: roasteryOpsModule.reports,
  defaultModule: "roastery-ops",
  nav: [
    {
      label: "Roastery",
      items: [
        { label: "Roastery Ops", page: "dashboard", module: "roastery-ops" },
        { label: "Batch Roasting", page: "roasting", doctype: "RoastingBatch" },
        { label: "Buat Batch", page: "new-batch", path: "/app/food-roasters/edit/RoastingBatch/new", doctype: "RoastingBatch" },
        {
          label: "QC Lulus",
          page: "quality",
          path: "/app/food-roasters/list/RoastingBatch?filter_status=Cupping%20Passed",
          doctype: "RoastingBatch",
        },
        { label: "Analitik Margin", page: "reports", report: "RoasteryMarginReport" },
      ],
    },
  ],
  pages: {},
};
