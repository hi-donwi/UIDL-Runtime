import { DataError, type DataAdapter } from "~/data/types";

/**
 * Koperasi murabahah collectibility assessment.
 *
 * Read-only. Derives days-past-due for every disbursed financing from its earliest
 * unpaid installment due date, maps it to the OJK-style five-tier collectibility
 * grade, and computes the CKPN (impairment) reserve per tier on outstanding
 * principal. Broken schedules fail loudly rather than being smoothed over.
 */

export type CollectibilityTier = 1 | 2 | 3 | 4 | 5;

export interface KoperasiCollectibilityInput {
  companyId: string;
  asOf: string;
}

export interface KoperasiCollectibilityRow {
  agreementId: string;
  memberName: string;
  status: string;
  outstandingPrincipal: number;
  installmentCount: number;
  paidInstallmentCount: number;
  earliestUnpaidDueDate: string | null;
  daysPastDue: number;
  tier: CollectibilityTier;
  grade: string;
  provisionRate: number;
  ckpnReserve: number;
  performing: boolean;
}

export interface CollectibilityTierBucket {
  tier: CollectibilityTier;
  grade: string;
  agreementCount: number;
  outstandingPrincipal: number;
  ckpnReserve: number;
}

export interface KoperasiCollectibilitySummary {
  asOf: string;
  agreementCount: number;
  totalOutstandingPrincipal: number;
  totalCkpnReserve: number;
  performingOutstanding: number;
  nonPerformingOutstanding: number;
  nplRatio: number;
  atRiskOutstanding: number;
  highestDaysPastDue: number;
  tiers: CollectibilityTierBucket[];
}

export interface KoperasiCollectibilityReport {
  summary: KoperasiCollectibilitySummary;
  rows: KoperasiCollectibilityRow[];
  controls: string[];
}

const KOPERASI_COMPANY_ID = "koperasi-bmt";
export const KOPERASI_COLLECTIBILITY_AS_OF = "2026-11-30";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TIER_META: Record<CollectibilityTier, { grade: string; provisionRate: number }> = {
  1: { grade: "1 - Lancar", provisionRate: 0.01 },
  2: { grade: "2 - Dalam Perhatian Khusus", provisionRate: 0.05 },
  3: { grade: "3 - Kurang Lancar", provisionRate: 0.15 },
  4: { grade: "4 - Diragukan", provisionRate: 0.5 },
  5: { grade: "5 - Macet", provisionRate: 1 },
};

export async function buildKoperasiCollectibilityReport(
  adapter: DataAdapter,
  input: KoperasiCollectibilityInput,
): Promise<KoperasiCollectibilityReport> {
  if (input.companyId !== KOPERASI_COMPANY_ID) {
    throw new DataError(`Koperasi collectibility only supports "${KOPERASI_COMPANY_ID}"`, "validation", {
      companyId: "Unsupported company",
    });
  }
  const asOfMs = parseDate(input.asOf, "asOf");

  const [agreementResult, scheduleResult] = await Promise.all([
    adapter.query<Record<string, unknown>>({ collection: "MurabahahAgreement" }),
    adapter.query<Record<string, unknown>>({ collection: "MurabahahInstallmentSchedule" }),
  ]);

  const agreements = agreementResult.rows.filter(
    (row) => row.companyId === input.companyId && (row.status === "Aktif" || row.status === "Lunas"),
  );
  const scheduleByAgreement = new Map<string, Array<Record<string, unknown>>>();
  for (const row of scheduleResult.rows) {
    if (row.companyId !== input.companyId) continue;
    const agreementId = String(row.agreementId ?? "");
    const bucket = scheduleByAgreement.get(agreementId);
    if (bucket) bucket.push(row);
    else scheduleByAgreement.set(agreementId, [row]);
  }

  const rows: KoperasiCollectibilityRow[] = [];
  for (const agreement of agreements) {
    const agreementId = String(agreement.id ?? "");
    const schedule = (scheduleByAgreement.get(agreementId) ?? []).slice().sort(byInstallmentNo);
    if (schedule.length === 0) {
      throw new DataError(`Financing "${agreementId}" is disbursed but has no installment schedule`, "validation", {
        schedule: "Missing",
      });
    }

    const outstandingPrincipal = readMoney(agreement.outstandingPrincipal ?? 0, "outstandingPrincipal", agreementId);
    let paidInstallmentCount = 0;
    let earliestUnpaidDueMs: number | null = null;
    let earliestUnpaidDueDate: string | null = null;

    for (const installment of schedule) {
      const dueDate = String(installment.dueDate ?? "");
      const dueMs = parseDate(dueDate, `dueDate (${agreementId})`);
      const paid = installment.status === "Lunas" || installment.paidAt != null;
      if (paid) {
        paidInstallmentCount += 1;
        continue;
      }
      if (earliestUnpaidDueMs == null || dueMs < earliestUnpaidDueMs) {
        earliestUnpaidDueMs = dueMs;
        earliestUnpaidDueDate = dueDate;
      }
    }

    const daysPastDue =
      earliestUnpaidDueMs != null && earliestUnpaidDueMs < asOfMs
        ? Math.floor((asOfMs - earliestUnpaidDueMs) / MS_PER_DAY)
        : 0;
    const tier = classifyCollectibilityTier(daysPastDue);
    const { grade, provisionRate } = TIER_META[tier];
    const ckpnReserve = roundMoney(outstandingPrincipal * provisionRate);

    rows.push({
      agreementId,
      memberName: String(agreement.memberName ?? ""),
      status: String(agreement.status ?? ""),
      outstandingPrincipal,
      installmentCount: schedule.length,
      paidInstallmentCount,
      earliestUnpaidDueDate: daysPastDue > 0 ? earliestUnpaidDueDate : null,
      daysPastDue,
      tier,
      grade,
      provisionRate,
      ckpnReserve,
      performing: tier <= 2,
    });
  }

  rows.sort((a, b) => b.tier - a.tier || b.daysPastDue - a.daysPastDue || b.outstandingPrincipal - a.outstandingPrincipal);

  return { summary: summarize(rows, input.asOf), rows, controls: buildControls() };
}

export function classifyCollectibilityTier(daysPastDue: number): CollectibilityTier {
  if (!Number.isInteger(daysPastDue) || daysPastDue < 0) {
    throw new DataError("daysPastDue must be a non-negative integer", "validation", { daysPastDue: "Invalid" });
  }
  if (daysPastDue === 0) return 1;
  if (daysPastDue <= 90) return 2;
  if (daysPastDue <= 120) return 3;
  if (daysPastDue <= 180) return 4;
  return 5;
}

function summarize(rows: KoperasiCollectibilityRow[], asOf: string): KoperasiCollectibilitySummary {
  const totalOutstandingPrincipal = roundMoney(rows.reduce((sum, row) => sum + row.outstandingPrincipal, 0));
  const nonPerformingOutstanding = roundMoney(
    rows.filter((row) => row.tier >= 3).reduce((sum, row) => sum + row.outstandingPrincipal, 0),
  );
  const performingOutstanding = roundMoney(totalOutstandingPrincipal - nonPerformingOutstanding);
  const atRiskOutstanding = roundMoney(
    rows.filter((row) => row.tier >= 2).reduce((sum, row) => sum + row.outstandingPrincipal, 0),
  );

  const tiers: CollectibilityTierBucket[] = ([1, 2, 3, 4, 5] as CollectibilityTier[]).map((tier) => {
    const tierRows = rows.filter((row) => row.tier === tier);
    return {
      tier,
      grade: TIER_META[tier].grade,
      agreementCount: tierRows.length,
      outstandingPrincipal: roundMoney(tierRows.reduce((sum, row) => sum + row.outstandingPrincipal, 0)),
      ckpnReserve: roundMoney(tierRows.reduce((sum, row) => sum + row.ckpnReserve, 0)),
    };
  });

  return {
    asOf,
    agreementCount: rows.length,
    totalOutstandingPrincipal,
    totalCkpnReserve: roundMoney(rows.reduce((sum, row) => sum + row.ckpnReserve, 0)),
    performingOutstanding,
    nonPerformingOutstanding,
    nplRatio: totalOutstandingPrincipal > 0 ? roundRate(nonPerformingOutstanding / totalOutstandingPrincipal) : 0,
    atRiskOutstanding,
    highestDaysPastDue: rows.reduce((max, row) => Math.max(max, row.daysPastDue), 0),
    tiers,
  };
}

function buildControls(): string[] {
  return [
    "Days past due is measured from the earliest unpaid installment whose due date precedes the as-of date; grace periods and restructuring are not modeled.",
    "Tier thresholds follow the OJK-style 0 / 1-90 / 91-120 / 121-180 / >180 day bands; CKPN rates are 1% / 5% / 15% / 50% / 100% of outstanding principal.",
    "Fully settled (Lunas) financings are included at tier 1 with zero outstanding; undisbursed applications are excluded.",
    "Illustrative reference data — provisioning and classification require cooperative-supervisor rules and professional review before regulatory use.",
  ];
}

function byInstallmentNo(a: Record<string, unknown>, b: Record<string, unknown>): number {
  return Number(a.installmentNo ?? 0) - Number(b.installmentNo ?? 0);
}

function parseDate(value: string, field: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DataError(`${field} must be an ISO date`, "validation", { [field]: "Invalid date" });
  }
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) throw new DataError(`${field} must be a valid calendar date`, "validation", { [field]: "Invalid date" });
  return ms;
}

function readMoney(value: unknown, field: string, ref: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DataError(`Financing "${ref}" has an invalid ${field}`, "validation", { [field]: "Invalid money" });
  }
  return roundMoney(amount);
}

function roundMoney(value: number): number {
  return Math.round(value);
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}
