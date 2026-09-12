import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type SchoolRecord = Record<string, unknown>;

interface LoadedTuitionFee {
  record: SchoolRecord;
  meta: RecordMeta;
}

export interface TuitionFeeStudentInput {
  studentId: string;
  studentName: string;
  grade: string;
  total: number;
}

export interface CreateTuitionFeeBatchInput {
  companyId: string;
  month: string;
  postingDate: string;
  dueDate: string;
  students: TuitionFeeStudentInput[];
}

export interface ReceiveTuitionPaymentInput {
  tuitionFeeId: string;
  paidAt: string;
  amount: number;
  method: string;
}

export interface IssueDunningNoticeInput {
  tuitionFeeId: string;
  issuedAt: string;
  channel: string;
}

export interface TeacherPayrollEmployeeInput {
  employeeId: string;
  employeeName: string;
  role: string;
  gross: number;
  deductions: number;
}

export interface RunTeacherPayrollAccrualInput {
  companyId: string;
  period: string;
  postingDate: string;
  employees: TeacherPayrollEmployeeInput[];
}

export interface CreateTuitionFeeBatchResult {
  batch: SchoolRecord;
  invoices: SchoolRecord[];
  glEntries: SchoolRecord[];
}

export interface ReceiveTuitionPaymentResult {
  tuitionFee: SchoolRecord;
  payment: SchoolRecord;
  glEntries: SchoolRecord[];
}

export interface IssueDunningNoticeResult {
  tuitionFee: SchoolRecord;
  notice: SchoolRecord;
}

export interface RunTeacherPayrollAccrualResult {
  run: SchoolRecord;
  glEntries: SchoolRecord[];
  report: SchoolRecord;
}

const SCHOOL_COMPANY_ID = "school-abc";
const STUDENT_AR_ACCOUNT = "1135 - Piutang SPP";
const TUITION_REVENUE_ACCOUNT = "4115 - Pendapatan SPP";
const BANK_ACCOUNT = "1115 - Bank Sekolah";
const SALARY_EXPENSE_ACCOUNT = "5115 - Beban Gaji Guru dan Staf";
const NET_SALARY_PAYABLE_ACCOUNT = "2115 - Hutang Gaji Bersih";
const PAYROLL_DEDUCTION_PAYABLE_ACCOUNT = "2120 - Hutang Pajak dan Potongan Payroll";

export async function createTuitionFeeBatch(
  adapter: DataAdapter,
  input: CreateTuitionFeeBatchInput,
): Promise<CreateTuitionFeeBatchResult> {
  assertSchoolCompany(input.companyId);
  if (input.students.length === 0) throw new DataError("Tuition fee batch requires students", "validation", { students: "Required" });

  const year = input.postingDate.slice(0, 4);
  const batchId = await nextSequentialId(adapter, "SchoolFeeBatch", `SCH-FEE-BATCH-${year}-`, 4);
  const invoices: SchoolRecord[] = [];
  for (const student of input.students) {
    if (!student.studentName.trim()) throw new DataError("Tuition fee requires student name", "validation", { studentName: "Required" });
    assertMoney(student.total, "total");
    const id = await nextSequentialId(adapter, "TuitionFee", `SPP-${year}-`, 4);
    const record: SchoolRecord = {
      id,
      companyId: input.companyId,
      studentName: student.studentName,
      studentId: student.studentId,
      grade: student.grade,
      month: input.month,
      date: input.postingDate,
      dueDate: input.dueDate,
      total: roundMoney(student.total),
      paidAmount: 0,
      outstandingAmount: roundMoney(student.total),
      batchId,
      dunningCount: 0,
      status: "Belum Bayar",
      route: `/app/school-abc/edit/TuitionFee/${id}`,
    };
    const created = await adapter.create<SchoolRecord>({ collection: "TuitionFee", data: record });
    invoices.push(created.record);
  }

  const totalAmount = roundMoney(invoices.reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0));
  const batch: SchoolRecord = {
    id: batchId,
    companyId: input.companyId,
    month: input.month,
    postingDate: input.postingDate,
    dueDate: input.dueDate,
    invoiceCount: invoices.length,
    totalAmount,
    status: "Submitted",
  };
  const createdBatch = await adapter.create<SchoolRecord>({ collection: "SchoolFeeBatch", data: batch });
  const glEntries = await createGLEntries(adapter, {
    companyId: input.companyId,
    postingDate: input.postingDate,
    voucherType: "TuitionFeeBatch",
    voucherNo: batchId,
    party: "Students",
    lines: [
      { account: STUDENT_AR_ACCOUNT, debit: totalAmount, credit: 0 },
      { account: TUITION_REVENUE_ACCOUNT, debit: 0, credit: totalAmount },
    ],
  });

  return { batch: createdBatch.record, invoices, glEntries };
}

export async function receiveTuitionPayment(
  adapter: DataAdapter,
  input: ReceiveTuitionPaymentInput,
): Promise<ReceiveTuitionPaymentResult> {
  const tuitionFee = await loadTuitionFee(adapter, input.tuitionFeeId);
  const outstandingAmount = Number(tuitionFee.record.outstandingAmount ?? tuitionFee.record.total ?? 0);
  assertMoney(input.amount, "amount");
  if (input.amount > outstandingAmount) {
    throw new DataError("Tuition payment exceeds outstanding amount", "validation", { amount: "Exceeds outstanding" });
  }
  const year = input.paidAt.slice(0, 4);
  const paymentId = await nextSequentialId(adapter, "SchoolTuitionPayment", `SCH-PAY-${year}-`, 4);
  const paidAmount = roundMoney(Number(tuitionFee.record.paidAmount ?? 0) + input.amount);
  const newOutstanding = roundMoney(outstandingAmount - input.amount);
  const payment: SchoolRecord = {
    id: paymentId,
    companyId: SCHOOL_COMPANY_ID,
    tuitionFeeId: input.tuitionFeeId,
    studentId: tuitionFee.record.studentId,
    studentName: tuitionFee.record.studentName,
    amount: roundMoney(input.amount),
    method: input.method,
    paidAt: input.paidAt,
    status: "Submitted",
  };
  const createdPayment = await adapter.create<SchoolRecord>({ collection: "SchoolTuitionPayment", data: payment });
  const updatedFee = await adapter.update<SchoolRecord>({
    collection: "TuitionFee",
    id: input.tuitionFeeId,
    version: tuitionFee.meta.version,
    data: {
      paidAmount,
      outstandingAmount: newOutstanding,
      paymentId,
      paidAt: input.paidAt,
      status: newOutstanding === 0 ? "Lunas" : tuitionFee.record.status,
    },
  });
  const glEntries = await createGLEntries(adapter, {
    companyId: SCHOOL_COMPANY_ID,
    postingDate: input.paidAt,
    voucherType: "TuitionPayment",
    voucherNo: paymentId,
    party: String(tuitionFee.record.studentName ?? ""),
    lines: [
      { account: BANK_ACCOUNT, debit: roundMoney(input.amount), credit: 0 },
      { account: STUDENT_AR_ACCOUNT, debit: 0, credit: roundMoney(input.amount) },
    ],
  });
  return { tuitionFee: updatedFee.record, payment: createdPayment.record, glEntries };
}

export async function issueDunningNotice(adapter: DataAdapter, input: IssueDunningNoticeInput): Promise<IssueDunningNoticeResult> {
  const tuitionFee = await loadTuitionFee(adapter, input.tuitionFeeId);
  if (tuitionFee.record.status === "Lunas") {
    throw new DataError(`Tuition fee "${input.tuitionFeeId}" is already paid`, "validation", { status: "Already paid" });
  }
  const year = input.issuedAt.slice(0, 4);
  const noticeId = await nextSequentialId(adapter, "SchoolDunningNotice", `SCH-DUN-${year}-`, 4);
  const notice: SchoolRecord = {
    id: noticeId,
    companyId: SCHOOL_COMPANY_ID,
    tuitionFeeId: input.tuitionFeeId,
    studentId: tuitionFee.record.studentId,
    studentName: tuitionFee.record.studentName,
    channel: input.channel,
    issuedAt: input.issuedAt,
    outstandingAmount: tuitionFee.record.outstandingAmount,
    status: "Sent",
  };
  const createdNotice = await adapter.create<SchoolRecord>({ collection: "SchoolDunningNotice", data: notice });
  const updatedFee = await adapter.update<SchoolRecord>({
    collection: "TuitionFee",
    id: input.tuitionFeeId,
    version: tuitionFee.meta.version,
    data: {
      dunningCount: Number(tuitionFee.record.dunningCount ?? 0) + 1,
      lastDunningAt: input.issuedAt,
      status: "Jatuh Tempo",
    },
  });
  return { tuitionFee: updatedFee.record, notice: createdNotice.record };
}

export async function runTeacherPayrollAccrual(
  adapter: DataAdapter,
  input: RunTeacherPayrollAccrualInput,
): Promise<RunTeacherPayrollAccrualResult> {
  assertSchoolCompany(input.companyId);
  if (input.employees.length === 0) throw new DataError("Payroll run requires employees", "validation", { employees: "Required" });
  const year = input.postingDate.slice(0, 4);
  const runId = await nextSequentialId(adapter, "SchoolPayrollRun", `SCH-PAYROLL-${year}-`, 4);
  const grossPay = roundMoney(input.employees.reduce((sum, employee) => {
    assertMoney(employee.gross, "gross");
    assertMoney(employee.deductions, "deductions");
    return sum + employee.gross;
  }, 0));
  const totalDeductions = roundMoney(input.employees.reduce((sum, employee) => sum + employee.deductions, 0));
  const netPay = roundMoney(grossPay - totalDeductions);
  const run: SchoolRecord = {
    id: runId,
    companyId: input.companyId,
    period: input.period,
    postingDate: input.postingDate,
    employeeCount: input.employees.length,
    grossPay,
    totalDeductions,
    netPay,
    status: "Submitted",
  };
  const createdRun = await adapter.create<SchoolRecord>({ collection: "SchoolPayrollRun", data: run });
  const glEntries = await createGLEntries(adapter, {
    companyId: input.companyId,
    postingDate: input.postingDate,
    voucherType: "SchoolPayrollRun",
    voucherNo: runId,
    party: "Teachers and Staff",
    lines: [
      { account: SALARY_EXPENSE_ACCOUNT, debit: grossPay, credit: 0 },
      { account: NET_SALARY_PAYABLE_ACCOUNT, debit: 0, credit: netPay },
      { account: PAYROLL_DEDUCTION_PAYABLE_ACCOUNT, debit: 0, credit: totalDeductions },
    ],
  });

  const [batchTotals, paymentTotals] = await Promise.all([
    adapter.query<SchoolRecord>({ collection: "SchoolFeeBatch", fields: ["totalAmount"] }),
    adapter.query<SchoolRecord>({ collection: "SchoolTuitionPayment", fields: ["amount"] }),
  ]);
  const tuitionBilled = roundMoney(batchTotals.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.totalAmount ?? 0), 0));
  const tuitionCollected = roundMoney(paymentTotals.rows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.amount ?? 0), 0));
  const reportId = await nextSequentialId(adapter, "SchoolManagementReport", `SCH-RPT-${year}-`, 4);
  const report: SchoolRecord = {
    id: reportId,
    companyId: input.companyId,
    period: input.period,
    tuitionBilled,
    tuitionCollected,
    payrollAccrued: grossPay,
    netPayrollPayable: netPay,
    snapshotAt: input.postingDate,
    status: "Submitted",
  };
  const createdReport = await adapter.create<SchoolRecord>({ collection: "SchoolManagementReport", data: report });
  return { run: createdRun.record, glEntries, report: createdReport.record };
}

async function loadTuitionFee(adapter: DataAdapter, tuitionFeeId: string): Promise<LoadedTuitionFee> {
  const tuitionFee = await adapter.get<SchoolRecord>("TuitionFee", tuitionFeeId);
  if (!tuitionFee) throw new DataError(`Tuition fee "${tuitionFeeId}" was not found`, "not_found");
  if (tuitionFee.record.companyId !== SCHOOL_COMPANY_ID) {
    throw new DataError(`Tuition fee "${tuitionFeeId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return tuitionFee;
}

interface GLVoucherInput {
  companyId: string;
  postingDate: string;
  voucherType: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<SchoolRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (debit !== credit) throw new DataError(`Unbalanced school GL voucher "${input.voucherNo}"`, "validation");

  const entries: SchoolRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "SchoolGLEntry", `SCH-GL-${year}-`, 4);
    const created = await adapter.create<SchoolRecord>({
      collection: "SchoolGLEntry",
      data: {
        id,
        companyId: input.companyId,
        postingDate: input.postingDate,
        account: line.account,
        party: input.party,
        voucherType: input.voucherType,
        voucherNo: input.voucherNo,
        debit: roundMoney(line.debit),
        credit: roundMoney(line.credit),
        status: "Posted",
        route: `/app/school-abc/edit/SchoolGLEntry/${id}`,
      },
    });
    entries.push(created.record);
  }
  return entries;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<SchoolRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function assertSchoolCompany(companyId: string): void {
  if (companyId !== SCHOOL_COMPANY_ID) {
    throw new DataError(`School finance service only supports "${SCHOOL_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`School amount "${field}" must be zero or greater`, "validation", { [field]: "Must be zero or greater" });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
