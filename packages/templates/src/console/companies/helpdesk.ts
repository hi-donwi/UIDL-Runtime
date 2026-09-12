import { SUPPORT_TICKET_META } from "../doctypes";
import { type CompanyDemo, type ModuleSpec } from "../types";

const supportPerformanceRows = [
  { agent: "Rani Support L2", openTickets: 6, resolvedToday: 18, firstResponse: "11 menit", csat: "4.96" },
  { agent: "Dimas Helpdesk", openTickets: 9, resolvedToday: 14, firstResponse: "16 menit", csat: "4.88" },
  { agent: "Bima DevOps", openTickets: 4, resolvedToday: 8, firstResponse: "13 menit", csat: "4.94" },
];

const supportDeskModule: ModuleSpec = {
  name: "support-desk",
  label: { id: "Support Desk", en: "Support Desk" },
  iconName: "headphones",
  doctypes: [SUPPORT_TICKET_META],
  workspace: {
    name: "support-desk",
    label: { id: "Support Desk", en: "Support Desk" },
    module: "Help Desk",
    kpis: [
      { label: { id: "Tiket Aktif", en: "Open Tickets" }, value: 28, change: "4 urgent" },
      { label: { id: "First Response SLA", en: "First Response SLA" }, value: "14 menit", change: "99.4%" },
      { label: { id: "Resolution SLA", en: "Resolution SLA" }, value: "98.2%" },
      { label: { id: "CSAT", en: "CSAT" }, value: "4.92 / 5.0" },
    ],
    shortcuts: [
      {
        doctype: "SupportTicket",
        label: { id: "Antrean Tiket", en: "Ticket Queue" },
        description: { id: "Tiket multi-channel dengan SLA dan eskalasi", en: "Multi-channel tickets with SLA and escalation" },
      },
      {
        doctype: "SupportTicket",
        label: { id: "Buat Tiket Baru", en: "Create Ticket" },
        route: "/app/helpdesk/edit/SupportTicket/new",
        description: { id: "Intake tiket lewat generated form", en: "Capture support tickets through generated form" },
      },
      {
        doctype: "SupportTicket",
        route: "/app/helpdesk/report/SupportPerformance",
        label: { id: "Kinerja Support", en: "Support Performance" },
        description: { id: "SLA, resolusi, dan CSAT per agen", en: "SLA, resolution, and CSAT by agent" },
      },
      {
        doctype: "SupportTicket",
        route: "/app/helpdesk/report/HelpdeskSlaReport",
        label: { id: "SLA & Eskalasi", en: "SLA & Escalation" },
        description: {
          id: "Elapsed time dari timestamp, pause, breach status, dan sinyal eskalasi",
          en: "Elapsed time from timestamps, pauses, breach status, and escalation signal",
        },
      },
    ],
    charts: [
      {
        id: "support-channel-mix",
        title: { id: "Tiket per Channel", en: "Tickets by Channel" },
        type: "bar",
        xKey: "channel",
        yKey: "tickets",
        dataSource: [
          { channel: "WhatsApp", tickets: 64 },
          { channel: "Portal", tickets: 89 },
          { channel: "Email", tickets: 42 },
          { channel: "API Hook", tickets: 16 },
        ],
      },
    ],
  },
  reports: [
    {
      name: "SupportPerformance",
      label: { id: "Kinerja Support", en: "Support Performance" },
      columns: [
        { key: "agent", label: { id: "Agen", en: "Agent" } },
        { key: "openTickets", label: { id: "Tiket Aktif", en: "Open Tickets" }, align: "right" },
        { key: "resolvedToday", label: { id: "Selesai Hari Ini", en: "Resolved Today" }, align: "right" },
        { key: "firstResponse", label: { id: "Respon Pertama", en: "First Response" }, align: "right" },
        { key: "csat", label: { id: "CSAT", en: "CSAT" }, align: "right" },
      ],
      summaries: [
        { label: { id: "First Response SLA", en: "First Response SLA" }, value: "99.4%" },
        { label: { id: "Resolution SLA", en: "Resolution SLA" }, value: "98.2%" },
        { label: { id: "CSAT", en: "CSAT" }, value: "4.92" },
      ],
      dataSource: supportPerformanceRows,
    },
  ],
};

export const helpdesk: CompanyDemo = {
  id: "helpdesk",
  company: "CloudDesk Support Center",
  title: "CloudDesk Support Center",
  subtitle: "Customer support & help desk: tiket multi-channel, matriks eskalasi SLA, canned response, dan survei CSAT.",
  source: "Service Desk + SLA Matrix + CSAT + Canned Responses",
  patterns: ["Multi-channel Intake", "First Response SLA", "Resolution SLA", "CSAT Rating", "Knowledge Base"],
  modules: [supportDeskModule],
  doctypes: [SUPPORT_TICKET_META],
  reports: supportDeskModule.reports,
  defaultModule: "support-desk",
  nav: [
    {
      label: "Service Desk",
      items: [
        { label: "Workspace Support", page: "dashboard", module: "support-desk" },
        { label: "Antrean Tiket", page: "tickets", doctype: "SupportTicket" },
        { label: "Buat Tiket", page: "new-ticket", path: "/app/helpdesk/edit/SupportTicket/new", doctype: "SupportTicket" },
        { label: "Kinerja Support", page: "reports", report: "SupportPerformance" },
        {
          label: "SLA & Eskalasi",
          page: "sla",
          path: "/app/helpdesk/report/HelpdeskSlaReport",
          report: "HelpdeskSlaReport",
        },
      ],
    },
  ],
  pages: {},
};
