import { FULFILLMENT_ORDER_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const fulfillmentPerformanceRows = [
  { channel: "Lapakku Mall", orders: 1420, sameDayDispatch: "99.4%", gmv: "Rp 312.400.000", netSettlement: "Rp 293.656.000" },
  { channel: "TokoPrima Official", orders: 1180, sameDayDispatch: "99.1%", gmv: "Rp 248.200.000", netSettlement: "Rp 235.790.000" },
  { channel: "LiveMarket", orders: 940, sameDayDispatch: "98.8%", gmv: "Rp 184.600.000", netSettlement: "Rp 173.524.000" },
  { channel: "B2B Direct", orders: 620, sameDayDispatch: "99.7%", gmv: "Rp 97.400.000", netSettlement: "Rp 97.400.000" },
];

const fulfillmentOpsModule: ModuleSpec = {
  name: "fulfillment-ops",
  label: { id: "Fulfillment Ops", en: "Fulfillment Ops" },
  iconName: "package-check",
  doctypes: [FULFILLMENT_ORDER_META],
  workspace: {
    name: "fulfillment-ops",
    label: { id: "Fulfillment Ops", en: "Fulfillment Ops" },
    module: "Omnichannel",
    kpis: [
      { label: { id: "Pesanan Hari Ini", en: "Orders Today" }, value: "4.470" },
      { label: { id: "Same-Day Dispatch", en: "Same-Day Dispatch" }, value: "99.2%" },
      { label: { id: "GMV Hari Ini", en: "GMV Today" }, value: "Rp 842.600.000" },
      { label: { id: "RMA Rate", en: "RMA Rate" }, value: "0.34%" },
    ],
    shortcuts: [
      {
        doctype: "FulfillmentOrder",
        label: { id: "Antrean Pesanan", en: "Order Queue" },
        description: { id: "Pesanan marketplace masuk sampai settlement", en: "Marketplace orders through settlement" },
      },
      {
        doctype: "FulfillmentOrder",
        route: "/app/omnichannel-dist/edit/FulfillmentOrder/new",
        label: { id: "Sync Order Baru", en: "Sync New Order" },
        description: { id: "Capture order marketplace lewat generated form", en: "Capture marketplace orders through generated form" },
      },
      {
        doctype: "FulfillmentOrder",
        route: "/app/omnichannel-dist/list/FulfillmentOrder?filter_status=Picking",
        label: { id: "Wave Picking", en: "Wave Picking" },
        description: { id: "Order yang sedang dipick di hub", en: "Orders currently being picked" },
      },
      {
        doctype: "FulfillmentOrder",
        route: "/app/omnichannel-dist/report/FulfillmentPerformance",
        label: { id: "Kinerja Fulfillment", en: "Fulfillment Performance" },
        description: { id: "Dispatch SLA, GMV, dan settlement per channel", en: "Dispatch SLA, GMV, and settlement by channel" },
      },
    ],
    charts: [
      {
        id: "orders-by-channel",
        title: { id: "Pesanan per Channel", en: "Orders by Channel" },
        type: "bar",
        xKey: "channel",
        yKey: "orders",
        dataSource: [
          { channel: "Lapakku", orders: 1420 },
          { channel: "TokoPrima", orders: 1180 },
          { channel: "LiveMarket", orders: 940 },
          { channel: "B2B", orders: 620 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "FulfillmentPerformance",
      label: { id: "Kinerja Fulfillment", en: "Fulfillment Performance" },
      columns: [
        { key: "channel", label: { id: "Channel", en: "Channel" } },
        { key: "orders", label: { id: "Pesanan", en: "Orders" }, align: "right" },
        { key: "sameDayDispatch", label: { id: "Same-Day Dispatch", en: "Same-Day Dispatch" }, align: "right" },
        { key: "gmv", label: { id: "GMV", en: "GMV" }, align: "right" },
        { key: "netSettlement", label: { id: "Dana Cair", en: "Net Settlement" }, align: "right" },
      ],
      summaries: [
        { label: { id: "Pesanan Hari Ini", en: "Orders Today" }, value: "4.470" },
        { label: { id: "Same-Day Dispatch", en: "Same-Day Dispatch" }, value: "99.2%" },
        { label: { id: "GMV", en: "GMV" }, value: "Rp 842.600.000" },
      ],
      dataSource: fulfillmentPerformanceRows,
    },
  ],
};

export const omnichannelDist: CompanyDemo = {
  id: "omnichannel-dist",
  company: "Nusantara Omnichannel Distribution",
  title: "Nusantara Omnichannel Distribution",
  subtitle: "Distribusi e-commerce & fulfillment: antrean TokoPrima/Lapakku/LiveMarket, wave picking, buffer stok multigudang, dan pelacakan resi kurir.",
  source: "Omnichannel E-Commerce + Multi-Marketplace Sync + Wave Picking + Safety Stock",
  patterns: ["Marketplace Sync", "Wave Picking", "Multi-Warehouse Buffers", "Waybill Tracking", "RMA Control"],
  category: "Dagang & Ritel",
  modules: [fulfillmentOpsModule],
  doctypes: [FULFILLMENT_ORDER_META],
  reports: fulfillmentOpsModule.reports,
  defaultModule: "fulfillment-ops",
  nav: [
    {
      label: "Fulfillment",
      items: [
        { label: "Fulfillment Ops", page: "dashboard", module: "fulfillment-ops" },
        { label: "Antrean Pesanan", page: "orders", doctype: "FulfillmentOrder" },
        {
          label: "Sync Order Baru",
          page: "new-order",
          path: "/app/omnichannel-dist/edit/FulfillmentOrder/new",
          doctype: "FulfillmentOrder",
        },
        { label: "Kinerja Fulfillment", page: "reports", report: "FulfillmentPerformance" },
      ],
    },
  ],
  pages: {},
};
