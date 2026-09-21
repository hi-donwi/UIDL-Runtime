import { DataError, type DataAdapter } from "~/data/types";

/**
 * Hospital billing / insurance-claim reconciliation.
 *
 * Read-only. Joins patient bills, insurance claims, payer payments, and claim
 * adjustments, then derives per-bill outstanding balances and a payer-settlement
 * summary. Broken cross-document invariants fail loudly rather than being smoothed
 * over, and contested (disputed) disallowances are held out of expected settlement.
 */

export type ReconciliationStatus =
  | "Under Review"
  | "Awaiting Payment"
  | "Partially Paid"
  | "Disputed"
  | "Overpaid"
  | "Reconciled";

export interface HospitalReconciliationInput {
  companyId: string;
  asOf: string;
  /** Absolute rupiah tolerance for treating a balance as settled. Default 0. */
  tolerance?: number;
}

export interface HospitalReconciliationRow {
  billId: string;
  admissionId: string;
  patientName: string;
  payer: string;
  billedAmount: number;
  claimId: string | null;
  claimedAmount: number;
  approvedAmount: number | null;
  writeOffAmount: number;
  disputedAmount: number;
  paidAmount: number;
  expectedSettlement: number;
  outstandingAmount: number;
  claimVariance: number;
  status: ReconciliationStatus;
}

export interface HospitalReconciliationSummary {
  asOf: string;
  tolerance: number;
  billCount: number;
  reconciledCount: number;
  partiallyPaidCount: number;
  awaitingPaymentCount: number;
  underReviewCount: number;
  disputedCount: number;
  overpaidCount: number;
  totalBilled: number;
  totalClaimed: number;
  totalApproved: number;
  totalWriteOff: number;
  totalDisputed: number;
  totalPaid: number;
  totalOutstanding: number;
  claimApprovalRate: number;
}

export interface HospitalReconciliationReport {
  summary: HospitalReconciliationSummary;
  rows: HospitalReconciliationRow[];
  controls: string[];
}

const HOSPITAL_COMPANY_ID = "hospital-medika";

export async function buildHospitalReconciliationReport(
  adapter: DataAdapter,
  input: HospitalReconciliationInput,
): Promise<HospitalReconciliationReport> {
  if (input.companyId !== HOSPITAL_COMPANY_ID) {
    throw new DataError(`Hospital reconciliation only supports "${HOSPITAL_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
  parseDate(input.asOf, "asOf");
  const tolerance = input.tolerance ?? 0;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new DataError("tolerance must be zero or a positive number", "validation", { tolerance: "Invalid" });
  }

  const [bills, claims, payments, adjustments] = await Promise.all([
    loadCollection(adapter, "HospitalPatientBill", input.companyId),
    loadCollection(adapter, "HospitalInsuranceClaim", input.companyId),
    loadCollection(adapter, "HospitalClaimPayment", input.companyId),
    loadCollection(adapter, "HospitalClaimAdjustment", input.companyId),
  ]);

  const claimByBill = new Map<string, Record<string, unknown>>();
  for (const claim of claims) {
    const billId = String(claim.billId ?? "");
    if (claimByBill.has(billId)) {
      throw new DataError(`Bill "${billId}" has more than one insurance claim`, "validation", { billId: "Duplicate claim" });
    }
    claimByBill.set(billId, claim);
  }

  const paymentsByBill = groupBy(payments, "billId");
  const adjustmentsByClaim = groupBy(adjustments, "claimId");

  const rows: HospitalReconciliationRow[] = [];
  const seenBillIds = new Set<string>();

  for (const bill of bills) {
    const billId = String(bill.id ?? "");
    if (!billId) throw new DataError("Hospital bill is missing an id", "validation");
    if (seenBillIds.has(billId)) throw new DataError(`Duplicate hospital bill "${billId}"`, "validation");
    seenBillIds.add(billId);

    const billedAmount = readMoney(bill.totalAmount, "totalAmount", billId);
    const serviceFee = readMoney(bill.serviceFee ?? 0, "serviceFee", billId);
    const medicationFee = readMoney(bill.medicationFee ?? 0, "medicationFee", billId);
    if (roundMoney(serviceFee + medicationFee) !== billedAmount) {
      throw new DataError(`Hospital bill "${billId}" line fees do not sum to the total`, "validation", {
        totalAmount: "Must equal serviceFee + medicationFee",
      });
    }

    const claim = claimByBill.get(billId) ?? null;
    const claimId = claim ? String(claim.id ?? "") : null;
    const claimedAmount = claim ? readMoney(claim.claimedAmount, "claimedAmount", billId) : 0;
    const approvedAmount =
      claim && claim.approvedAmount != null ? readMoney(claim.approvedAmount, "approvedAmount", billId) : null;

    const claimAdjustments = claimId ? (adjustmentsByClaim.get(claimId) ?? []) : [];
    let writeOffAmount = 0;
    let disputedAmount = 0;
    for (const adjustment of claimAdjustments) {
      const amount = readMoney(adjustment.amount, "amount", String(adjustment.id ?? billId));
      if (adjustment.adjustmentType === "Dispute" && adjustment.status !== "Resolved") {
        disputedAmount = roundMoney(disputedAmount + amount);
      } else {
        writeOffAmount = roundMoney(writeOffAmount + amount);
      }
    }

    if (approvedAmount != null) {
      const totalAdjusted = roundMoney(writeOffAmount + disputedAmount);
      if (roundMoney(approvedAmount + totalAdjusted) !== claimedAmount) {
        throw new DataError(`Claim "${claimId}" approved + adjustments must equal the claimed amount`, "validation", {
          approvedAmount: "INA-CBG identity broken",
        });
      }
    }

    const billPayments = paymentsByBill.get(billId) ?? [];
    const paidAmount = roundMoney(
      billPayments.reduce((sum, payment) => sum + readMoney(payment.amount, "amount", String(payment.id ?? billId)), 0),
    );

    const claimPending = Boolean(claim) && approvedAmount == null;
    const expectedSettlement = claimPending ? billedAmount : roundMoney(billedAmount - writeOffAmount);
    const outstandingAmount = roundMoney(expectedSettlement - paidAmount);
    const claimVariance = claim ? roundMoney(writeOffAmount + disputedAmount) : 0;

    rows.push({
      billId,
      admissionId: String(bill.admissionId ?? ""),
      patientName: String(bill.patientName ?? ""),
      payer: String(bill.payer ?? ""),
      billedAmount,
      claimId,
      claimedAmount,
      approvedAmount,
      writeOffAmount,
      disputedAmount,
      paidAmount,
      expectedSettlement,
      outstandingAmount,
      claimVariance,
      status: classifyStatus({ claimPending, disputedAmount, paidAmount, outstandingAmount, tolerance }),
    });
  }

  rows.sort(
    (a, b) => b.outstandingAmount - a.outstandingAmount || b.billedAmount - a.billedAmount || a.billId.localeCompare(b.billId),
  );

  const summary = summarize(rows, input.asOf, tolerance, claims);
  return { summary, rows, controls: buildControls() };
}

export function classifyStatus(args: {
  claimPending: boolean;
  disputedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  tolerance: number;
}): ReconciliationStatus {
  const { claimPending, disputedAmount, paidAmount, outstandingAmount, tolerance } = args;
  if (claimPending) return "Under Review";
  if (outstandingAmount < -tolerance) return "Overpaid";
  if (Math.abs(outstandingAmount) <= tolerance) return "Reconciled";
  if (disputedAmount > 0) return "Disputed";
  if (paidAmount <= 0) return "Awaiting Payment";
  return "Partially Paid";
}

function summarize(
  rows: HospitalReconciliationRow[],
  asOf: string,
  tolerance: number,
  claims: Array<Record<string, unknown>>,
): HospitalReconciliationSummary {
  const verifiedClaims = claims.filter((claim) => claim.approvedAmount != null);
  const totalClaimedVerified = verifiedClaims.reduce((sum, claim) => sum + Number(claim.claimedAmount ?? 0), 0);
  const totalApprovedVerified = verifiedClaims.reduce((sum, claim) => sum + Number(claim.approvedAmount ?? 0), 0);

  return {
    asOf,
    tolerance,
    billCount: rows.length,
    reconciledCount: rows.filter((row) => row.status === "Reconciled").length,
    partiallyPaidCount: rows.filter((row) => row.status === "Partially Paid").length,
    awaitingPaymentCount: rows.filter((row) => row.status === "Awaiting Payment").length,
    underReviewCount: rows.filter((row) => row.status === "Under Review").length,
    disputedCount: rows.filter((row) => row.status === "Disputed").length,
    overpaidCount: rows.filter((row) => row.status === "Overpaid").length,
    totalBilled: roundMoney(rows.reduce((sum, row) => sum + row.billedAmount, 0)),
    totalClaimed: roundMoney(rows.reduce((sum, row) => sum + row.claimedAmount, 0)),
    totalApproved: roundMoney(rows.reduce((sum, row) => sum + (row.approvedAmount ?? 0), 0)),
    totalWriteOff: roundMoney(rows.reduce((sum, row) => sum + row.writeOffAmount, 0)),
    totalDisputed: roundMoney(rows.reduce((sum, row) => sum + row.disputedAmount, 0)),
    totalPaid: roundMoney(rows.reduce((sum, row) => sum + row.paidAmount, 0)),
    totalOutstanding: roundMoney(rows.reduce((sum, row) => sum + row.outstandingAmount, 0)),
    claimApprovalRate: totalClaimedVerified > 0 ? roundRate(totalApprovedVerified / totalClaimedVerified) : 0,
  };
}

function buildControls(): string[] {
  return [
    "Self-pay (Umum) bills are treated as settled at the point of service through their cash payment record.",
    "Contested (disputed) disallowances stay inside expected settlement until the payer resolves them, so a disputed bill never shows as reconciled.",
    "Claims still awaiting payer verification are reconciled against the full billed amount because no INA-CBG approval exists yet.",
    "Figures are illustrative reference data and require payer statement matching and professional review before operational use.",
  ];
}

async function loadCollection(
  adapter: DataAdapter,
  collection: string,
  companyId: string,
): Promise<Array<Record<string, unknown>>> {
  const result = await adapter.query<Record<string, unknown>>({ collection });
  return result.rows.filter((row) => row.companyId === companyId);
}

function groupBy(rows: Array<Record<string, unknown>>, key: string): Map<string, Array<Record<string, unknown>>> {
  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const value = String(row[key] ?? "");
    if (!value) continue;
    const bucket = map.get(value);
    if (bucket) bucket.push(row);
    else map.set(value, [row]);
  }
  return map;
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

function readMoney(value: unknown, field: string, ref: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`Record "${ref}" has an invalid ${field}`, "validation", { [field]: "Invalid money" });
  }
  return roundMoney(amount);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}
