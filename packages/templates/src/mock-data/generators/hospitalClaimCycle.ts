/**
 * Hospital claim-cycle seed generator.
 *
 * Derives deterministic billing, insurance-claim, payment, and adjustment documents
 * from the already-seeded `PatientAdmission` rows. It performs no PRNG draws so the
 * shared seed stream for later tenants stays byte-identical.
 *
 * The output is intentionally uneven — full approvals, INA-CBG tariff haircuts,
 * partial payer settlements, and contested disallowances — so the reconciliation
 * report has real variance to disclose.
 */

const HOSPITAL_COMPANY_ID = "hospital-medika";
const SELF_PAY_PAYER = "Mandiri / Umum";
const ADJUSTMENT_REASONS = ["INA-CBG tariff difference", "Non-covered item", "Administrative disallowance"];

export interface HospitalClaimCycleData {
  bills: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  adjustments: Array<Record<string, unknown>>;
}

export function buildHospitalClaimCycle(admissions: Array<Record<string, unknown>>): HospitalClaimCycleData {
  const bills: Array<Record<string, unknown>> = [];
  const claims: Array<Record<string, unknown>> = [];
  const payments: Array<Record<string, unknown>> = [];
  const adjustments: Array<Record<string, unknown>> = [];

  let n = 0;
  for (const admission of admissions) {
    if (admission.companyId !== HOSPITAL_COMPANY_ID) continue;
    if (admission.status !== "Selesai") continue;

    const billAmount = Math.round(Number(admission.billAmount ?? 0));
    if (billAmount <= 0) continue;

    n += 1;
    const seq = String(n).padStart(4, "0");
    const admissionId = String(admission.id ?? "");
    const billedAt = String(admission.admissionDate ?? "2026-08-01");
    const payer = String(admission.insuranceType ?? SELF_PAY_PAYER);
    const insured = payer !== SELF_PAY_PAYER;
    const claimStatus = String(admission.claimStatus ?? "Pending");

    const serviceFee = roundThousand(billAmount * 0.6);
    const medicationFee = billAmount - serviceFee;

    const billId = `RS-BILL-2026-${seq}`;
    bills.push({
      id: billId,
      companyId: HOSPITAL_COMPANY_ID,
      admissionId,
      patientName: admission.patientName,
      payer,
      serviceFee,
      medicationFee,
      totalAmount: billAmount,
      billedAt,
      status: !insured
        ? "Paid"
        : claimStatus === "Paid"
          ? "Claim Settled"
          : claimStatus === "Verified"
            ? "Claim Verified"
            : "Claim Submitted",
    });

    if (!insured) {
      payments.push({
        id: `RS-PAY-2026-${seq}`,
        companyId: HOSPITAL_COMPANY_ID,
        billId,
        admissionId,
        payer,
        amount: billAmount,
        method: "Cash",
        paidAt: billedAt,
        status: "Settled",
      });
      continue;
    }

    const claimId = `RS-CLM-2026-${seq}`;
    const disallowed = disallowedAmount(n, billAmount);
    const verified = claimStatus === "Verified" || claimStatus === "Paid";
    const approvedAmount = verified ? billAmount - disallowed : null;

    claims.push({
      id: claimId,
      companyId: HOSPITAL_COMPANY_ID,
      admissionId,
      billId,
      payer,
      sepNo: `SEP-2026-${seq}`,
      inaCbgCode: inaCbgCode(n),
      claimedAmount: billAmount,
      approvedAmount,
      submittedAt: billedAt,
      verifiedAt: verified ? billedAt : null,
      status: verified ? (claimStatus === "Paid" ? "Paid" : "Verified") : "Submitted",
    });

    if (verified && disallowed > 0) {
      const disputed = n % 4 === 0;
      adjustments.push({
        id: `RS-ADJ-2026-${seq}`,
        companyId: HOSPITAL_COMPANY_ID,
        claimId,
        billId,
        admissionId,
        amount: disallowed,
        adjustmentType: disputed ? "Dispute" : "Write-off",
        reason: ADJUSTMENT_REASONS[n % ADJUSTMENT_REASONS.length],
        status: disputed ? "Open" : "Posted",
        recordedAt: billedAt,
      });
    }

    if (claimStatus === "Paid" && approvedAmount != null) {
      // One deterministic partial payer settlement so the reference exhibits the
      // "Partially Paid" reconciliation status against real seed data.
      const partial = n % 24 === 7;
      payments.push({
        id: `RS-PAY-2026-${seq}`,
        companyId: HOSPITAL_COMPANY_ID,
        billId,
        admissionId,
        claimId,
        payer,
        amount: partial ? roundThousand(approvedAmount * 0.6) : approvedAmount,
        method: payer.includes("BPJS") ? "BPJS Transfer" : "Insurance Transfer",
        paidAt: addDays(billedAt, 14),
        status: partial ? "Partial" : "Settled",
      });
    }
  }

  return { bills, claims, payments, adjustments };
}

/** Deterministic INA-CBG haircut buckets driven by the completed-admission index. */
function disallowedAmount(index: number, billAmount: number): number {
  switch (index % 5) {
    case 0:
      return 0;
    case 1:
      return roundThousand(billAmount * 0.1);
    case 2:
      return Math.min(150_000, roundThousand(billAmount * 0.3));
    case 3:
      return roundThousand(billAmount * 0.2);
    default:
      return roundThousand(billAmount * 0.05);
  }
}

function inaCbgCode(index: number): string {
  const groups = ["A-4-10-I", "K-4-17-II", "M-2-16-III", "N-1-01-I"];
  return groups[index % groups.length];
}

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
