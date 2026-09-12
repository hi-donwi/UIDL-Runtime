import { DataError, type DataAdapter, type RecordMeta } from "~/data/types";

export type KoperasiRecord = Record<string, unknown>;

interface LoadedRecord {
  record: KoperasiRecord;
  meta: RecordMeta;
}

export interface RegisterCooperativeMemberInput {
  companyId: string;
  memberName: string;
  branch: string;
  joinedAt: string;
}

export interface RecordSavingsDepositInput {
  memberId: string;
  savingsType: string;
  amount: number;
  depositedAt: string;
  teller: string;
}

export interface CreateMurabahahApplicationInput {
  companyId: string;
  memberId: string;
  goodsDescription: string;
  principalAmount: number;
  marginAmount: number;
  tenorMonths: number;
  startDate: string;
}

export interface ApproveMurabahahFinancingInput {
  agreementId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface DisburseMurabahahFinancingInput {
  agreementId: string;
  disbursedAt: string;
}

export interface ReceiveInstallmentPaymentInput {
  agreementId: string;
  installmentNo: number;
  paidAt: string;
  amount: number;
  method: string;
}

export interface AssessCollectibilityInput {
  agreementId: string;
  daysPastDue: number;
  assessedAt: string;
}

export interface CalculateSHUAllocationInput {
  companyId: string;
  fiscalYear: string;
  netSurplus: number;
  allocation: { reserve: number; savings: number; transactions: number; governance: number };
  calculatedAt: string;
}

export interface RecordSavingsDepositResult {
  account: KoperasiRecord;
  transaction: KoperasiRecord;
  glEntries: KoperasiRecord[];
}

export interface ApproveMurabahahFinancingResult {
  agreement: KoperasiRecord;
  schedule: KoperasiRecord[];
}

export interface DisburseMurabahahFinancingResult {
  agreement: KoperasiRecord;
  glEntries: KoperasiRecord[];
}

export interface ReceiveInstallmentPaymentResult {
  agreement: KoperasiRecord;
  installment: KoperasiRecord;
  payment: KoperasiRecord;
  glEntries: KoperasiRecord[];
}

export interface AssessCollectibilityResult {
  agreement: KoperasiRecord;
  assessment: KoperasiRecord;
}

export interface CalculateSHUAllocationResult {
  allocation: KoperasiRecord;
  memberDistribution: KoperasiRecord;
  glEntries: KoperasiRecord[];
}

const KOPERASI_COMPANY_ID = "koperasi-bmt";
const CASH_ACCOUNT = "1110 - Kas Teller Koperasi";
const SIMPANAN_POKOK_ACCOUNT = "3101 - Simpanan Pokok Anggota";
const SIMPANAN_WAJIB_ACCOUNT = "3102 - Simpanan Wajib Anggota";
const SIMPANAN_SUKARELA_ACCOUNT = "2107 - Simpanan Sukarela Anggota";
const MURABAHAH_RECEIVABLE_ACCOUNT = "1138 - Piutang Murabahah";
const DEFERRED_MARGIN_ACCOUNT = "2138 - Margin Murabahah Ditangguhkan";
const MARGIN_REVENUE_ACCOUNT = "4118 - Pendapatan Margin Murabahah";
const SHU_CURRENT_YEAR_ACCOUNT = "3300 - SHU Tahun Berjalan";
const RESERVE_ACCOUNT = "3201 - Dana Cadangan";
const MEMBER_SHU_PAYABLE_ACCOUNT = "2130 - Utang SHU Anggota";
const GOVERNANCE_FUND_ACCOUNT = "3208 - Dana Pengurus dan Sosial";

export async function registerCooperativeMember(adapter: DataAdapter, input: RegisterCooperativeMemberInput): Promise<KoperasiRecord> {
  assertKoperasiCompany(input.companyId);
  if (!input.memberName.trim()) throw new DataError("Member registration requires member name", "validation", { memberName: "Required" });
  if (!input.branch.trim()) throw new DataError("Member registration requires branch", "validation", { branch: "Required" });

  const year = input.joinedAt.slice(0, 4);
  const id = await nextSequentialId(adapter, "KoperasiMember", `AGT-${year}-`, 4);
  const record: KoperasiRecord = {
    id,
    companyId: input.companyId,
    memberName: input.memberName,
    branch: input.branch,
    joinedAt: input.joinedAt,
    status: "Aktif",
  };
  const created = await adapter.create<KoperasiRecord>({ collection: "KoperasiMember", data: record });
  return created.record;
}

export async function recordSavingsDeposit(
  adapter: DataAdapter,
  input: RecordSavingsDepositInput,
): Promise<RecordSavingsDepositResult> {
  const member = await loadMember(adapter, input.memberId);
  assertMoney(input.amount, "amount");
  if (!input.teller.trim()) throw new DataError("Savings deposit requires teller", "validation", { teller: "Required" });

  const classification = savingsClassification(input.savingsType);
  const accountId = await nextSequentialId(adapter, "SavingsAccount", `SAV-${input.depositedAt.slice(0, 4)}-`, 4);
  const account: KoperasiRecord = {
    id: accountId,
    companyId: KOPERASI_COMPANY_ID,
    memberId: input.memberId,
    memberName: member.record.memberName,
    savingsType: input.savingsType,
    classification,
    balance: roundMoney(input.amount),
    status: "Active",
  };
  const createdAccount = await adapter.create<KoperasiRecord>({ collection: "SavingsAccount", data: account });

  const transactionId = await nextSequentialId(adapter, "SavingsTransaction", `KOP-SAV-TXN-${input.depositedAt.slice(0, 4)}-`, 4);
  const transaction: KoperasiRecord = {
    id: transactionId,
    companyId: KOPERASI_COMPANY_ID,
    savingsAccountId: accountId,
    memberId: input.memberId,
    savingsType: input.savingsType,
    amount: roundMoney(input.amount),
    depositedAt: input.depositedAt,
    teller: input.teller,
    status: "Submitted",
  };
  const createdTransaction = await adapter.create<KoperasiRecord>({ collection: "SavingsTransaction", data: transaction });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.depositedAt,
    voucherType: "SavingsDeposit",
    voucherNo: transactionId,
    party: String(member.record.memberName ?? ""),
    lines: [
      { account: CASH_ACCOUNT, debit: roundMoney(input.amount), credit: 0 },
      { account: savingsAccount(input.savingsType), debit: 0, credit: roundMoney(input.amount) },
    ],
  });
  return { account: createdAccount.record, transaction: createdTransaction.record, glEntries };
}

export async function createMurabahahApplication(
  adapter: DataAdapter,
  input: CreateMurabahahApplicationInput,
): Promise<KoperasiRecord> {
  assertKoperasiCompany(input.companyId);
  const member = await loadMember(adapter, input.memberId);
  if (!input.goodsDescription.trim()) throw new DataError("Murabahah application requires goods description", "validation", { goodsDescription: "Required" });
  assertMoney(input.principalAmount, "principalAmount");
  assertMoney(input.marginAmount, "marginAmount");
  assertPositiveInteger(input.tenorMonths, "tenorMonths");

  const id = await nextSequentialId(adapter, "MurabahahAgreement", "AKAD-MRB-", 4);
  const totalFinancing = roundMoney(input.principalAmount + input.marginAmount);
  const record: KoperasiRecord = {
    id,
    companyId: input.companyId,
    memberId: input.memberId,
    memberName: member.record.memberName,
    goodsDescription: input.goodsDescription,
    principalAmount: roundMoney(input.principalAmount),
    marginAmount: roundMoney(input.marginAmount),
    totalFinancing,
    tenorMonths: input.tenorMonths,
    monthlyInstallment: roundMoney(totalFinancing / input.tenorMonths),
    outstandingPrincipal: 0,
    outstandingMargin: 0,
    paidPrincipal: 0,
    paidMargin: 0,
    collectibilityGrade: "1 - Lancar",
    daysPastDue: 0,
    ckpnReserve: 0,
    startDate: input.startDate,
    status: "Pengajuan",
    route: `/app/koperasi-bmt/edit/MurabahahAgreement/${id}`,
  };
  const created = await adapter.create<KoperasiRecord>({ collection: "MurabahahAgreement", data: record });
  return created.record;
}

export async function approveMurabahahFinancing(
  adapter: DataAdapter,
  input: ApproveMurabahahFinancingInput,
): Promise<ApproveMurabahahFinancingResult> {
  const agreement = await loadAgreement(adapter, input.agreementId);
  if (agreement.record.status !== "Pengajuan") {
    throw new DataError(`Murabahah agreement "${input.agreementId}" must be Pengajuan before approval`, "validation", {
      status: "Expected Pengajuan",
    });
  }
  if (!input.approvedBy.trim()) throw new DataError("Murabahah approval requires approver", "validation", { approvedBy: "Required" });

  const tenorMonths = Number(agreement.record.tenorMonths ?? 0);
  assertPositiveInteger(tenorMonths, "tenorMonths");
  const principalDue = roundMoney(Number(agreement.record.principalAmount ?? 0) / tenorMonths);
  const marginDue = roundMoney(Number(agreement.record.marginAmount ?? 0) / tenorMonths);
  const schedule: KoperasiRecord[] = [];
  const year = input.approvedAt.slice(0, 4);
  for (let installmentNo = 1; installmentNo <= tenorMonths; installmentNo++) {
    const id = await nextSequentialId(adapter, "MurabahahInstallmentSchedule", `KOP-SCH-${year}-`, 4);
    const row: KoperasiRecord = {
      id,
      companyId: KOPERASI_COMPANY_ID,
      agreementId: input.agreementId,
      memberId: agreement.record.memberId,
      installmentNo,
      principalDue,
      marginDue,
      amountDue: roundMoney(principalDue + marginDue),
      status: "Belum Bayar",
    };
    const created = await adapter.create<KoperasiRecord>({ collection: "MurabahahInstallmentSchedule", data: row });
    schedule.push(created.record);
  }

  const updated = await updateAgreement(adapter, agreement, {
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    status: "Disetujui",
  });
  return { agreement: updated, schedule };
}

export async function disburseMurabahahFinancing(
  adapter: DataAdapter,
  input: DisburseMurabahahFinancingInput,
): Promise<DisburseMurabahahFinancingResult> {
  const agreement = await loadAgreement(adapter, input.agreementId);
  if (agreement.record.status !== "Disetujui") {
    throw new DataError(`Murabahah agreement "${input.agreementId}" must be Disetujui before disbursement`, "validation", {
      status: "Expected Disetujui",
    });
  }
  const principalAmount = roundMoney(Number(agreement.record.principalAmount ?? 0));
  const marginAmount = roundMoney(Number(agreement.record.marginAmount ?? 0));
  const totalFinancing = roundMoney(principalAmount + marginAmount);
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.disbursedAt,
    voucherType: "MurabahahDisbursement",
    voucherNo: input.agreementId,
    party: String(agreement.record.memberName ?? ""),
    lines: [
      { account: MURABAHAH_RECEIVABLE_ACCOUNT, debit: totalFinancing, credit: 0 },
      { account: CASH_ACCOUNT, debit: 0, credit: principalAmount },
      { account: DEFERRED_MARGIN_ACCOUNT, debit: 0, credit: marginAmount },
    ],
  });
  const updated = await updateAgreement(adapter, agreement, {
    outstandingPrincipal: principalAmount,
    outstandingMargin: marginAmount,
    disbursedAt: input.disbursedAt,
    status: "Aktif",
  });
  return { agreement: updated, glEntries };
}

export async function receiveInstallmentPayment(
  adapter: DataAdapter,
  input: ReceiveInstallmentPaymentInput,
): Promise<ReceiveInstallmentPaymentResult> {
  const agreement = await loadAgreement(adapter, input.agreementId);
  if (agreement.record.status !== "Aktif") {
    throw new DataError(`Murabahah agreement "${input.agreementId}" must be Aktif before payment`, "validation", {
      status: "Expected Aktif",
    });
  }
  assertPositiveInteger(input.installmentNo, "installmentNo");
  assertMoney(input.amount, "amount");

  const installment = await loadInstallment(adapter, input.agreementId, input.installmentNo);
  const principalDue = roundMoney(Number(installment.record.principalDue ?? 0));
  const marginDue = roundMoney(Number(installment.record.marginDue ?? 0));
  const amountDue = roundMoney(principalDue + marginDue);
  if (input.amount < amountDue) throw new DataError("Installment payment is below amount due", "validation", { amount: "Below amount due" });

  const year = input.paidAt.slice(0, 4);
  const paymentId = await nextSequentialId(adapter, "MurabahahInstallmentPayment", `KOP-ANG-${year}-`, 4);
  const payment: KoperasiRecord = {
    id: paymentId,
    companyId: KOPERASI_COMPANY_ID,
    agreementId: input.agreementId,
    installmentNo: input.installmentNo,
    amount: amountDue,
    principalPaid: principalDue,
    marginPaid: marginDue,
    method: input.method,
    paidAt: input.paidAt,
    status: "Submitted",
  };
  const createdPayment = await adapter.create<KoperasiRecord>({ collection: "MurabahahInstallmentPayment", data: payment });
  const updatedInstallment = await adapter.update<KoperasiRecord>({
    collection: "MurabahahInstallmentSchedule",
    id: String(installment.record.id),
    version: installment.meta.version,
    data: { paymentId, paidAt: input.paidAt, status: "Lunas" },
  });
  const paidPrincipal = roundMoney(Number(agreement.record.paidPrincipal ?? 0) + principalDue);
  const paidMargin = roundMoney(Number(agreement.record.paidMargin ?? 0) + marginDue);
  const outstandingPrincipal = roundMoney(Number(agreement.record.outstandingPrincipal ?? 0) - principalDue);
  const outstandingMargin = roundMoney(Number(agreement.record.outstandingMargin ?? 0) - marginDue);
  const updatedAgreement = await updateAgreement(adapter, agreement, {
    paidPrincipal,
    paidMargin,
    outstandingPrincipal,
    outstandingMargin,
    status: outstandingPrincipal === 0 && outstandingMargin === 0 ? "Lunas" : "Aktif",
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.paidAt,
    voucherType: "MurabahahInstallment",
    voucherNo: paymentId,
    party: String(agreement.record.memberName ?? ""),
    lines: [
      { account: CASH_ACCOUNT, debit: amountDue, credit: 0 },
      { account: DEFERRED_MARGIN_ACCOUNT, debit: marginDue, credit: 0 },
      { account: MURABAHAH_RECEIVABLE_ACCOUNT, debit: 0, credit: amountDue },
      { account: MARGIN_REVENUE_ACCOUNT, debit: 0, credit: marginDue },
    ],
  });
  return { agreement: updatedAgreement, installment: updatedInstallment.record, payment: createdPayment.record, glEntries };
}

export async function assessCollectibility(adapter: DataAdapter, input: AssessCollectibilityInput): Promise<AssessCollectibilityResult> {
  const agreement = await loadAgreement(adapter, input.agreementId);
  if (input.daysPastDue < 0 || !Number.isInteger(input.daysPastDue)) {
    throw new DataError("Days past due must be zero or greater", "validation", { daysPastDue: "Must be zero or greater" });
  }
  const bucket = input.daysPastDue === 0 ? "Current" : input.daysPastDue <= 30 ? "1-30" : input.daysPastDue <= 60 ? "31-60" : input.daysPastDue <= 90 ? "61-90" : ">90";
  const grade = bucket === "Current" || bucket === "1-30" ? "1 - Lancar" : bucket === "31-60" ? "2 - Dalam Perhatian" : "3 - Kurang Lancar";
  const provisionRate = grade.startsWith("1") ? 0.01 : grade.startsWith("2") ? 0.05 : 0.15;
  const ckpnReserve = roundMoney(Number(agreement.record.outstandingPrincipal ?? 0) * provisionRate);
  const year = input.assessedAt.slice(0, 4);
  const assessmentId = await nextSequentialId(adapter, "KoperasiCollectibilityAssessment", `KOP-COLL-${year}-`, 4);
  const assessment: KoperasiRecord = {
    id: assessmentId,
    companyId: KOPERASI_COMPANY_ID,
    agreementId: input.agreementId,
    daysPastDue: input.daysPastDue,
    bucket,
    grade,
    ckpnReserve,
    assessedAt: input.assessedAt,
    status: "Submitted",
  };
  const createdAssessment = await adapter.create<KoperasiRecord>({ collection: "KoperasiCollectibilityAssessment", data: assessment });
  const updatedAgreement = await updateAgreement(adapter, agreement, {
    collectibilityGrade: grade,
    daysPastDue: input.daysPastDue,
    ckpnReserve,
    collectibilityAssessmentId: assessmentId,
  });
  return { agreement: updatedAgreement, assessment: createdAssessment.record };
}

export async function calculateSHUAllocation(
  adapter: DataAdapter,
  input: CalculateSHUAllocationInput,
): Promise<CalculateSHUAllocationResult> {
  assertKoperasiCompany(input.companyId);
  assertMoney(input.netSurplus, "netSurplus");
  const allocationTotal = input.allocation.reserve + input.allocation.savings + input.allocation.transactions + input.allocation.governance;
  if (allocationTotal !== 100) throw new DataError("SHU allocation percentages must total 100", "validation", { allocation: "Must total 100" });

  const members = await adapter.query<KoperasiRecord>({ collection: "KoperasiMember" });
  if (members.rows.length === 0) throw new DataError("SHU allocation requires active members", "validation", { members: "Required" });

  const allocationId = await nextSequentialId(adapter, "KoperasiSHUAllocation", `KOP-SHU-${input.fiscalYear}-`, 4);
  const reserveAmount = roundMoney(input.netSurplus * (input.allocation.reserve / 100));
  const savingsPool = roundMoney(input.netSurplus * (input.allocation.savings / 100));
  const transactionPool = roundMoney(input.netSurplus * (input.allocation.transactions / 100));
  const memberPool = roundMoney(savingsPool + transactionPool);
  const governanceAmount = roundMoney(input.netSurplus * (input.allocation.governance / 100));
  const allocation: KoperasiRecord = {
    id: allocationId,
    companyId: input.companyId,
    fiscalYear: input.fiscalYear,
    netSurplus: roundMoney(input.netSurplus),
    reserveAmount,
    savingsPool,
    transactionPool,
    memberPool,
    governanceAmount,
    calculatedAt: input.calculatedAt,
    status: "Calculated",
  };
  const createdAllocation = await adapter.create<KoperasiRecord>({ collection: "KoperasiSHUAllocation", data: allocation });

  const member = members.rows[0];
  const distributionId = await nextSequentialId(adapter, "KoperasiSHUMemberDistribution", `KOP-SHU-MEM-${input.fiscalYear}-`, 4);
  const memberDistribution: KoperasiRecord = {
    id: distributionId,
    companyId: input.companyId,
    allocationId,
    memberId: member.id,
    memberName: member.memberName,
    savingsBasis: 1500000,
    transactionBasis: 12000000,
    amount: memberPool,
    status: "Calculated",
  };
  const createdDistribution = await adapter.create<KoperasiRecord>({
    collection: "KoperasiSHUMemberDistribution",
    data: memberDistribution,
  });
  const glEntries = await createGLEntries(adapter, {
    postingDate: input.calculatedAt,
    voucherType: "SHUAllocation",
    voucherNo: allocationId,
    party: "RAT",
    lines: [
      { account: SHU_CURRENT_YEAR_ACCOUNT, debit: roundMoney(input.netSurplus), credit: 0 },
      { account: RESERVE_ACCOUNT, debit: 0, credit: reserveAmount },
      { account: MEMBER_SHU_PAYABLE_ACCOUNT, debit: 0, credit: memberPool },
      { account: GOVERNANCE_FUND_ACCOUNT, debit: 0, credit: governanceAmount },
    ],
  });
  return { allocation: createdAllocation.record, memberDistribution: createdDistribution.record, glEntries };
}

async function loadMember(adapter: DataAdapter, memberId: string): Promise<LoadedRecord> {
  const member = await adapter.get<KoperasiRecord>("KoperasiMember", memberId);
  if (!member) throw new DataError(`Member "${memberId}" was not found`, "not_found");
  if (member.record.companyId !== KOPERASI_COMPANY_ID) {
    throw new DataError(`Member "${memberId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return member;
}

async function loadAgreement(adapter: DataAdapter, agreementId: string): Promise<LoadedRecord> {
  const agreement = await adapter.get<KoperasiRecord>("MurabahahAgreement", agreementId);
  if (!agreement) throw new DataError(`Murabahah agreement "${agreementId}" was not found`, "not_found");
  if (agreement.record.companyId !== KOPERASI_COMPANY_ID) {
    throw new DataError(`Murabahah agreement "${agreementId}" belongs to another company`, "validation", { companyId: "Wrong company" });
  }
  return agreement;
}

async function loadInstallment(adapter: DataAdapter, agreementId: string, installmentNo: number): Promise<LoadedRecord> {
  const result = await adapter.query<KoperasiRecord>({
    collection: "MurabahahInstallmentSchedule",
    filters: [
      { field: "agreementId", op: "eq", value: agreementId },
      { field: "installmentNo", op: "eq", value: installmentNo },
    ],
  });
  const row = result.rows[0];
  if (!row?.id) throw new DataError(`Installment ${installmentNo} for "${agreementId}" was not found`, "not_found");
  const installment = await adapter.get<KoperasiRecord>("MurabahahInstallmentSchedule", String(row.id));
  if (!installment) throw new DataError(`Installment "${row.id}" was not found`, "not_found");
  return installment;
}

async function updateAgreement(adapter: DataAdapter, agreement: LoadedRecord, data: KoperasiRecord): Promise<KoperasiRecord> {
  const updated = await adapter.update<KoperasiRecord>({
    collection: "MurabahahAgreement",
    id: String(agreement.record.id),
    version: agreement.meta.version,
    data,
  });
  return updated.record;
}

interface GLVoucherInput {
  postingDate: string;
  voucherType: string;
  voucherNo: string;
  party: string;
  lines: Array<{ account: string; debit: number; credit: number }>;
}

async function createGLEntries(adapter: DataAdapter, input: GLVoucherInput): Promise<KoperasiRecord[]> {
  const debit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (roundMoney(debit) !== roundMoney(credit)) throw new DataError(`Unbalanced Koperasi GL voucher "${input.voucherNo}"`, "validation");

  const entries: KoperasiRecord[] = [];
  const year = input.postingDate.slice(0, 4);
  for (const line of input.lines) {
    const id = await nextSequentialId(adapter, "KoperasiGLEntry", `KOP-GL-${year}-`, 4);
    const created = await adapter.create<KoperasiRecord>({
      collection: "KoperasiGLEntry",
      data: {
        id,
        companyId: KOPERASI_COMPANY_ID,
        postingDate: input.postingDate,
        account: line.account,
        party: input.party,
        voucherType: input.voucherType,
        voucherNo: input.voucherNo,
        debit: roundMoney(line.debit),
        credit: roundMoney(line.credit),
        status: "Posted",
      },
    });
    entries.push(created.record);
  }
  return entries;
}

async function nextSequentialId(adapter: DataAdapter, collection: string, prefix: string, width: number): Promise<string> {
  const result = await adapter.query<KoperasiRecord>({ collection, fields: ["id"] });
  const max = result.rows.reduce((value: number, row: Record<string, unknown>) => {
    const id = String(row.id ?? "");
    if (!id.startsWith(prefix)) return value;
    const counter = Number(id.slice(prefix.length));
    return Number.isFinite(counter) ? Math.max(value, counter) : value;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

function savingsClassification(savingsType: string): "Equity" | "Liability" {
  return savingsType === "Sukarela" || savingsType === "Wadiah" ? "Liability" : "Equity";
}

function savingsAccount(savingsType: string): string {
  if (savingsType === "Wajib") return SIMPANAN_WAJIB_ACCOUNT;
  if (savingsType === "Sukarela" || savingsType === "Wadiah") return SIMPANAN_SUKARELA_ACCOUNT;
  return SIMPANAN_POKOK_ACCOUNT;
}

function assertKoperasiCompany(companyId: string): void {
  if (companyId !== KOPERASI_COMPANY_ID) {
    throw new DataError(`Koperasi service only supports "${KOPERASI_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new DataError(`Koperasi amount "${field}" must be zero or greater`, "validation", { [field]: "Must be zero or greater" });
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DataError(`Koperasi field "${field}" must be a positive integer`, "validation", { [field]: "Must be a positive integer" });
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount);
}
