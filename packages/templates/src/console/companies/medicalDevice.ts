import { DEVICE_BATCH_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const complianceRows = [
  { metric: "DHR QA Released", value: "45.000 pcs", control: "DHR signed", status: "Released" },
  { metric: "UDI Traceability", value: "100%", control: "GS1 lot trace", status: "Traceable" },
  { metric: "EtO Sterilization", value: "100% BI pass", control: "ISO 11135", status: "Passed" },
  { metric: "CAPA Effectiveness", value: "2 open", control: "ISO 13485 CAPA", status: "Monitored" },
];

const qualityManufacturingModule: ModuleSpec = {
  name: "quality-manufacturing",
  label: { id: "Quality Manufacturing", en: "Quality Manufacturing" },
  iconName: "shield-check",
  doctypes: [DEVICE_BATCH_META],
  workspace: {
    name: "quality-manufacturing",
    label: { id: "Quality Manufacturing", en: "Quality Manufacturing" },
    module: "Medical Device",
    kpis: [
      { label: { id: "Batch QA Released", en: "QA Released Batches" }, value: "45.000 pcs" },
      { label: { id: "UDI Traceable", en: "UDI Traceable" }, value: "100%" },
      { label: { id: "Cleanroom", en: "Cleanroom" }, value: "ISO 7" },
      { label: { id: "CAPA Open", en: "Open CAPA" }, value: "2" },
    ],
    shortcuts: [
      {
        doctype: "DeviceBatch",
        label: { id: "Device Batches", en: "Device Batches" },
        description: {
          id: "DMR, DHR, cleanroom, sterilisasi, QA release, dan UDI trace",
          en: "DMR, DHR, cleanroom, sterilization, QA release, and UDI trace",
        },
      },
      {
        doctype: "DeviceBatch",
        route: "/app/medical-device/edit/DeviceBatch/new",
        label: { id: "Buat DHR", en: "Create DHR" },
        description: { id: "Input batch alat kesehatan lewat generated form", en: "Capture regulated device batches through generated form" },
      },
      {
        doctype: "DeviceBatch",
        route: "/app/medical-device/list/DeviceBatch?filter_status=Sterilization%20Passed",
        label: { id: "Menunggu QA Release", en: "Waiting QA Release" },
        description: {
          id: "Batch steril yang menunggu QA release dan UDI trace",
          en: "Sterilized batches waiting for QA release and UDI trace",
        },
      },
      {
        doctype: "DeviceBatch",
        route: "/app/medical-device/report/MedicalDeviceComplianceReport",
        label: { id: "Laporan ISO 13485", en: "ISO 13485 Report" },
        description: { id: "DHR, sterilisasi, CAPA, dan UDI traceability", en: "DHR, sterilization, CAPA, and UDI traceability" },
      },
    ],
    charts: [
      {
        id: "device-batch-status",
        title: { id: "Status Batch Alkes", en: "Device Batch Status" },
        type: "bar",
        xKey: "status",
        yKey: "count",
        dataSource: [
          { status: "In Assembly", count: 12 },
          { status: "Cleanroom Passed", count: 8 },
          { status: "Sterilization Passed", count: 2 },
          { status: "QA Released", count: 45 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "MedicalDeviceComplianceReport",
      label: { id: "Laporan Kepatuhan ISO 13485 & UDI", en: "ISO 13485 & UDI Compliance Report" },
      columns: [
        { key: "metric", label: { id: "Metrik", en: "Metric" } },
        { key: "value", label: { id: "Nilai", en: "Value" }, align: "right" },
        { key: "control", label: { id: "Kontrol", en: "Control" }, align: "center" },
        { key: "status", label: { id: "Status", en: "Status" }, align: "center" },
      ],
      summaries: [
        { label: { id: "DHR Complete", en: "DHR Complete" }, value: "99.8%" },
        { label: { id: "UDI Traceable", en: "UDI Traceable" }, value: "100%" },
        { label: { id: "BI Pass", en: "BI Pass" }, value: "100%" },
      ],
      dataSource: complianceRows,
    },
  ],
};

export const medicalDevice: CompanyDemo = {
  id: "medical-device",
  company: "PT Medtech Precision Indonesia",
  title: "PT Medtech Precision Indonesia",
  subtitle:
    "High-compliance alat kesehatan: Device Master Record, Device History Record, sterilisasi EtO, QA release, CAPA, dan GS1 UDI traceability.",
  source: "Medical Device Manufacturing + DMR/DHR + ISO 13485 + GS1 UDI",
  patterns: ["DMR & DHR", "EtO Sterilization", "ISO 7 Cleanroom", "CAPA Block", "GS1 UDI"],
  category: "Kesehatan & Medtech",
  modules: [qualityManufacturingModule],
  doctypes: [DEVICE_BATCH_META],
  reports: qualityManufacturingModule.reports,
  defaultModule: "quality-manufacturing",
  nav: [
    {
      label: "Quality Manufacturing",
      items: [
        { label: "Quality Manufacturing", page: "dashboard", module: "quality-manufacturing" },
        { label: "Device Batches", page: "dhr", doctype: "DeviceBatch" },
        { label: "Buat DHR", page: "new-dhr", path: "/app/medical-device/edit/DeviceBatch/new", doctype: "DeviceBatch" },
        {
          label: "Menunggu QA Release",
          page: "sterilization",
          path: "/app/medical-device/list/DeviceBatch?filter_status=Sterilization%20Passed",
          doctype: "DeviceBatch",
        },
        { label: "Laporan ISO 13485", page: "reports", report: "MedicalDeviceComplianceReport" },
      ],
    },
  ],
  pages: {},
};
