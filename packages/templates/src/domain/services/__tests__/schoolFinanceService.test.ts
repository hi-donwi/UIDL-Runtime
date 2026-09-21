import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  createTuitionFeeBatch,
  issueDunningNotice,
  receiveTuitionPayment,
  runTeacherPayrollAccrual,
} from "../schoolFinanceService";

function isBalanced(rows: Array<Record<string, unknown>>): boolean {
  const debit = rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
  const credit = rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  return debit === credit;
}

describe("school finance service workflow", () => {
  it("runs batch SPP -> payment -> dunning -> payroll accrual with balanced GL rows", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const batch = await createTuitionFeeBatch(adapter, {
      companyId: "school-abc",
      month: "September 2026",
      postingDate: "2026-08-24",
      dueDate: "2026-09-10",
      students: [
        { studentId: "NIS-2026001", studentName: "Alya Putri", grade: "Kelas 10 IPA 1", total: 1500000 },
        { studentId: "NIS-2026002", studentName: "Bima Pratama", grade: "Kelas 10 IPA 1", total: 1500000 },
      ],
    });

    expect(batch.batch).toMatchObject({ id: "SCH-FEE-BATCH-2026-0001", invoiceCount: 2, totalAmount: 3000000 });
    expect(batch.invoices.map((row) => row.id)).toEqual(["SPP-2026-0066", "SPP-2026-0067"]);
    expect(isBalanced(batch.glEntries)).toBe(true);

    const payment = await receiveTuitionPayment(adapter, {
      tuitionFeeId: "SPP-2026-0066",
      paidAt: "2026-08-25",
      amount: 1500000,
      method: "Virtual Account Bank",
    });
    expect(payment.tuitionFee).toMatchObject({ status: "Lunas", paidAmount: 1500000, outstandingAmount: 0 });
    expect(payment.payment).toMatchObject({ id: "SCH-PAY-2026-0001", status: "Submitted" });
    expect(isBalanced(payment.glEntries)).toBe(true);

    const dunning = await issueDunningNotice(adapter, {
      tuitionFeeId: "SPP-2026-0067",
      issuedAt: "2026-09-12",
      channel: "WhatsApp",
    });
    expect(dunning.notice).toMatchObject({
      id: "SCH-DUN-2026-0001",
      tuitionFeeId: "SPP-2026-0067",
      status: "Sent",
    });
    expect(dunning.tuitionFee).toMatchObject({ status: "Jatuh Tempo", dunningCount: 1 });

    const payroll = await runTeacherPayrollAccrual(adapter, {
      companyId: "school-abc",
      period: "2026-09",
      postingDate: "2026-09-30",
      employees: [
        { employeeId: "EMP-TCH-001", employeeName: "Dra. Hesti Wulandari", role: "Guru Matematika", gross: 8400000, deductions: 742000 },
        { employeeId: "EMP-ADM-001", employeeName: "Rina Kartika", role: "Staf Tata Usaha", gross: 5100000, deductions: 452000 },
      ],
    });
    expect(payroll.run).toMatchObject({
      id: "SCH-PAYROLL-2026-0001",
      grossPay: 13500000,
      totalDeductions: 1194000,
      netPay: 12306000,
      status: "Submitted",
    });
    expect(payroll.report).toMatchObject({
      id: "SCH-RPT-2026-0001",
      tuitionBilled: 3000000,
      tuitionCollected: 1500000,
      payrollAccrued: 13500000,
    });
    expect(isBalanced(payroll.glEntries)).toBe(true);
  });
});

