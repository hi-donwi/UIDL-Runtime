import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "~/data/adapters/inMemory";
import { createSeed } from "../../../mock-data/seed";
import {
  approveMurabahahFinancing,
  assessCollectibility,
  calculateSHUAllocation,
  createMurabahahApplication,
  disburseMurabahahFinancing,
  receiveInstallmentPayment,
  recordSavingsDeposit,
  registerCooperativeMember,
} from "../koperasiBmtService";

describe("koperasi bmt service workflow", () => {
  it("runs member -> savings -> murabahah -> installment -> collectibility -> SHU with correct classifications", async () => {
    const adapter = createInMemoryAdapter({ seed: createSeed() });

    const member = await registerCooperativeMember(adapter, {
      companyId: "koperasi-bmt",
      memberName: "Ahmad Fauzi",
      branch: "Pasar Minggu",
      joinedAt: "2026-08-25",
    });
    expect(member).toMatchObject({ id: "AGT-2026-0001", status: "Aktif" });

    const pokok = await recordSavingsDeposit(adapter, {
      memberId: String(member.id),
      savingsType: "Pokok",
      amount: 1000000,
      depositedAt: "2026-08-25T09:00:00+07:00",
      teller: "Nadia P.",
    });
    expect(pokok.account).toMatchObject({ classification: "Equity", balance: 1000000 });

    const sukarela = await recordSavingsDeposit(adapter, {
      memberId: String(member.id),
      savingsType: "Sukarela",
      amount: 500000,
      depositedAt: "2026-08-25T09:05:00+07:00",
      teller: "Nadia P.",
    });
    expect(sukarela.account).toMatchObject({ classification: "Liability", balance: 500000 });

    const application = await createMurabahahApplication(adapter, {
      companyId: "koperasi-bmt",
      memberId: String(member.id),
      goodsDescription: "Gerobak dan perlengkapan usaha makanan",
      principalAmount: 12000000,
      marginAmount: 2400000,
      tenorMonths: 12,
      startDate: "2026-08-25",
    });
    expect(application).toMatchObject({
      id: "AKAD-MRB-0066",
      monthlyInstallment: 1200000,
      totalFinancing: 14400000,
      status: "Pengajuan",
    });

    const approved = await approveMurabahahFinancing(adapter, {
      agreementId: String(application.id),
      approvedBy: "Komite Pembiayaan",
      approvedAt: "2026-08-25T10:00:00+07:00",
    });
    expect(approved.schedule).toHaveLength(12);
    expect(approved.schedule[0]).toMatchObject({
      principalDue: 1000000,
      marginDue: 200000,
      status: "Belum Bayar",
    });

    const disbursed = await disburseMurabahahFinancing(adapter, {
      agreementId: String(application.id),
      disbursedAt: "2026-08-25T11:00:00+07:00",
    });
    expect(disbursed.agreement).toMatchObject({ status: "Aktif", outstandingPrincipal: 12000000, outstandingMargin: 2400000 });

    const payment = await receiveInstallmentPayment(adapter, {
      agreementId: String(application.id),
      installmentNo: 1,
      paidAt: "2026-09-25",
      amount: 1200000,
      method: "Kas Teller",
    });
    expect(payment.agreement).toMatchObject({ paidPrincipal: 1000000, paidMargin: 200000, outstandingPrincipal: 11000000 });
    expect(payment.installment).toMatchObject({ status: "Lunas" });

    const collectibility = await assessCollectibility(adapter, {
      agreementId: String(application.id),
      daysPastDue: 45,
      assessedAt: "2026-10-31",
    });
    expect(collectibility.assessment).toMatchObject({
      grade: "2 - Dalam Perhatian",
      bucket: "31-60",
      ckpnReserve: 550000,
    });

    const shu = await calculateSHUAllocation(adapter, {
      companyId: "koperasi-bmt",
      fiscalYear: "2026",
      netSurplus: 420000000,
      allocation: { reserve: 25, savings: 30, transactions: 30, governance: 15 },
      calculatedAt: "2026-12-31",
    });
    expect(shu.allocation).toMatchObject({
      id: "KOP-SHU-2026-0001",
      reserveAmount: 105000000,
      memberPool: 252000000,
      governanceAmount: 63000000,
      status: "Calculated",
    });
    expect(shu.memberDistribution).toMatchObject({ memberId: member.id, amount: 252000000 });

    const gl = await adapter.query({
      collection: "KoperasiGLEntry",
      filters: [{ field: "voucherNo", op: "in", value: [pokok.transaction.id, sukarela.transaction.id, disbursed.agreement.id, payment.payment.id, shu.allocation.id] }],
    });
    const debit = gl.rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
    const credit = gl.rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
    expect(debit).toBe(credit);
  });
});
