import { DataError, type DataAdapter } from "~/data/types";

export type DunningStage = "Not Due" | "First Reminder" | "Second Reminder" | "Final Notice";

export interface SchoolDunningReportInput {
  companyId: string;
  asOf: string;
}

export interface SchoolDunningRow {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  dunningCount: number;
  status: string;
  stage: DunningStage;
}

export interface SchoolDunningSummary {
  asOf: string;
  invoiceCount: number;
  exposedInvoiceCount: number;
  overdueInvoiceCount: number;
  totalOutstanding: number;
  overdueOutstanding: number;
  highestDaysOverdue: number;
  paidInvoiceCount: number;
  currentInvoiceCount: number;
}

export interface SchoolDunningReport {
  summary: SchoolDunningSummary;
  rows: SchoolDunningRow[];
}

const SCHOOL_COMPANY_ID = "school-abc";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function buildSchoolDunningReport(adapter: DataAdapter, input: SchoolDunningReportInput): Promise<SchoolDunningReport> {
  if (input.companyId !== SCHOOL_COMPANY_ID) {
    throw new DataError(`School dunning only supports "${SCHOOL_COMPANY_ID}"`, "validation", { companyId: "Unsupported company" });
  }

  const asOf = parseDate(input.asOf, "asOf");
  const result = await adapter.query<Record<string, unknown>>({ collection: "TuitionFee" });
  const invoices = result.rows.filter((row) => row.companyId === input.companyId);
  const rows: SchoolDunningRow[] = [];
  let paidInvoiceCount = 0;

  for (const invoice of invoices) {
    const total = readMoney(invoice.total, "total", invoice.id);
    const paidAmount = readMoney(invoice.paidAmount ?? 0, "paidAmount", invoice.id);
    const outstandingAmount = roundMoney(Math.max(0, total - paidAmount));
    const persistedOutstanding = invoice.outstandingAmount == null ? outstandingAmount : readMoney(invoice.outstandingAmount, "outstandingAmount", invoice.id);
    if (persistedOutstanding !== outstandingAmount) {
      throw new DataError(`Tuition fee "${String(invoice.id)}" has inconsistent outstanding amount`, "validation", {
        outstandingAmount: "Must equal total minus paidAmount",
      });
    }

    if (outstandingAmount === 0 || invoice.status === "Lunas") {
      paidInvoiceCount += 1;
      continue;
    }

    const dueDate = String(invoice.dueDate ?? "");
    const daysOverdue = Math.max(0, Math.floor((asOf.getTime() - parseDate(dueDate, "dueDate").getTime()) / MS_PER_DAY));
    rows.push({
      id: String(invoice.id ?? ""),
      studentId: String(invoice.studentId ?? ""),
      studentName: String(invoice.studentName ?? ""),
      grade: String(invoice.grade ?? ""),
      dueDate,
      total,
      paidAmount,
      outstandingAmount,
      daysOverdue,
      dunningCount: readCount(invoice.dunningCount ?? 0, "dunningCount", invoice.id),
      status: String(invoice.status ?? ""),
      stage: classifyDunningStage(daysOverdue),
    });
  }

  rows.sort((a, b) => b.daysOverdue - a.daysOverdue || b.outstandingAmount - a.outstandingAmount || a.id.localeCompare(b.id));

  const totalOutstanding = roundMoney(rows.reduce((sum, row) => sum + row.outstandingAmount, 0));
  const overdueRows = rows.filter((row) => row.daysOverdue > 0);

  return {
    summary: {
      asOf: input.asOf,
      invoiceCount: invoices.length,
      exposedInvoiceCount: rows.length,
      overdueInvoiceCount: overdueRows.length,
      totalOutstanding,
      overdueOutstanding: roundMoney(overdueRows.reduce((sum, row) => sum + row.outstandingAmount, 0)),
      highestDaysOverdue: overdueRows[0]?.daysOverdue ?? 0,
      paidInvoiceCount,
      currentInvoiceCount: rows.length - overdueRows.length,
    },
    rows,
  };
}

export function classifyDunningStage(daysOverdue: number): DunningStage {
  if (!Number.isInteger(daysOverdue) || daysOverdue < 0) {
    throw new DataError("daysOverdue must be a non-negative integer", "validation", { daysOverdue: "Invalid" });
  }
  if (daysOverdue === 0) return "Not Due";
  if (daysOverdue <= 14) return "First Reminder";
  if (daysOverdue <= 29) return "Second Reminder";
  return "Final Notice";
}

function parseDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DataError(`${field} must be an ISO date`, "validation", { [field]: "Invalid date" });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new DataError(`${field} must be a valid calendar date`, "validation", { [field]: "Invalid date" });
  }
  return date;
}

function readMoney(value: unknown, field: string, invoiceId: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`Tuition fee "${String(invoiceId)}" has invalid ${field}`, "validation", { [field]: "Invalid money" });
  }
  return roundMoney(amount);
}

function readCount(value: unknown, field: string, invoiceId: unknown): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new DataError(`Tuition fee "${String(invoiceId)}" has invalid ${field}`, "validation", { [field]: "Invalid count" });
  }
  return count;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
