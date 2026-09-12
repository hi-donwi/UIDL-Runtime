import { WORK_ORDER_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const manufacturingPerformanceRows = [
  { metric: "WIP Balance", value: "Rp 303.300.000", status: "Tie-out OK" },
  { metric: "Finished Goods", value: "Rp 1.670.000.000", status: "Posted" },
  { metric: "Yield", value: "94.2%", status: "On Target" },
  { metric: "Production Variance", value: "Rp 28.000.000", status: "Review" },
];

const manufacturingOpsModule: ModuleSpec = {
  name: "manufacturing-ops",
  label: { id: "Manufacturing Ops", en: "Manufacturing Ops" },
  iconName: "factory",
  doctypes: [WORK_ORDER_META],
  workspace: {
    name: "manufacturing-ops",
    label: { id: "Manufacturing Ops", en: "Manufacturing Ops" },
    module: "Manufacturing",
    kpis: [
      { label: { id: "WIP Balance", en: "WIP Balance" }, value: "Rp 303.300.000" },
      { label: { id: "Raw Material", en: "Raw Material" }, value: "Rp 2.14 M" },
      { label: { id: "Finished Goods", en: "Finished Goods" }, value: "Rp 1.67 M" },
      { label: { id: "COGS Month", en: "COGS Month" }, value: "Rp 892.000.000" },
    ],
    shortcuts: [
      {
        doctype: "WorkOrder",
        label: { id: "Work Order", en: "Work Order" },
        description: { id: "Plan produksi, material issue, QC, dan finished goods", en: "Production plan, material issue, QC, and finished goods" },
      },
      {
        doctype: "WorkOrder",
        route: "/app/factory-abc/edit/WorkOrder/new",
        label: { id: "Buat Work Order", en: "Create Work Order" },
        description: { id: "Input SPK produksi lewat generated form", en: "Capture production orders through generated form" },
      },
      {
        doctype: "WorkOrder",
        route: "/app/factory-abc/list/WorkOrder?filter_status=Quality%20Check",
        label: { id: "QC Hold", en: "QC Hold" },
        description: { id: "WO yang sedang menunggu rilis mutu", en: "Work orders waiting for quality release" },
      },
      {
        doctype: "WorkOrder",
        route: "/app/factory-abc/report/ManufacturingPerformance",
        label: { id: "Laporan Produksi", en: "Manufacturing Report" },
        description: { id: "Yield, WIP, finished goods, dan variance", en: "Yield, WIP, finished goods, and variance" },
      },
    ],
    charts: [
      {
        id: "production-cost-split",
        title: { id: "Komposisi Biaya Produksi", en: "Production Cost Split" },
        type: "donut",
        xKey: "cost",
        yKey: "amount",
        dataSource: [
          { cost: "Material", amount: 520 },
          { cost: "Labor", amount: 184 },
          { cost: "Overhead", amount: 96 },
          { cost: "Variance", amount: 28 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "ManufacturingPerformance",
      label: { id: "Laporan Produksi", en: "Manufacturing Performance" },
      columns: [
        { key: "metric", label: { id: "Metrik", en: "Metric" } },
        { key: "value", label: { id: "Nilai", en: "Value" }, align: "right" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "Yield", en: "Yield" }, value: "94.2%" },
        { label: { id: "OEE", en: "OEE" }, value: "78%" },
        { label: { id: "On Time", en: "On Time" }, value: "88%" },
      ],
      dataSource: manufacturingPerformanceRows,
    },
  ],
};

export const factoryAbc: CompanyDemo = {
  id: "factory-abc",
  company: "Pabrik ABC",
  title: "Pabrik ABC",
  subtitle: "Manufacturing console: BOM, work order, WIP, raw material, finished goods, COGS, QC, dan cashflow produksi.",
  source: "Meridian Reports + Inventory + manufacturing extension patterns",
  patterns: ["BOM", "Work Order", "Stock Ledger", "WIP", "COGS"],
  category: "Manufaktur",
  modules: [manufacturingOpsModule],
  doctypes: [WORK_ORDER_META],
  reports: manufacturingOpsModule.reports,
  defaultModule: "manufacturing-ops",
  nav: [
    {
      label: "Produksi",
      items: [
        { label: "Manufacturing Ops", page: "dashboard", module: "manufacturing-ops" },
        { label: "Work Order", page: "work-order", doctype: "WorkOrder" },
        { label: "Buat Work Order", page: "new-work-order", path: "/app/factory-abc/edit/WorkOrder/new", doctype: "WorkOrder" },
        { label: "Nilai Persediaan", page: "inventory", report: "ManufacturingPerformance" },
        { label: "Laporan Produksi", page: "reports", report: "ManufacturingPerformance" },
      ],
    },
  ],
  pages: {},
};
