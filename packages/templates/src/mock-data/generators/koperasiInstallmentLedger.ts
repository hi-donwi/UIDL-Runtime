/**
 * Koperasi murabahah installment ledger seed generator.
 *
 * Derives a `MurabahahInstallmentSchedule` row set from the already-seeded
 * `MurabahahAgreement` rows so collectibility can be assessed from real due/payment
 * history instead of a hand-fed days-past-due number. It performs no PRNG draws and
 * adds rows only to a collection the seed does not otherwise populate, so the seed
 * stream and every other tenant stay byte-identical.
 *
 * Only disbursed agreements (Aktif / Lunas) get a schedule. The paid-through point
 * is inferred from `paidPrincipal`, and each installment's due date is its start
 * date plus N months, so the earliest unpaid due date is a genuine ageing anchor.
 */

const KOPERASI_COMPANY_ID = "koperasi-bmt";

export function buildKoperasiInstallmentLedger(
  agreements: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  let seq = 0;

  for (const agreement of agreements) {
    if (agreement.companyId !== KOPERASI_COMPANY_ID) continue;
    const status = String(agreement.status ?? "");
    if (status !== "Aktif" && status !== "Lunas") continue;

    const agreementId = String(agreement.id ?? "");
    const startDate = String(agreement.startDate ?? "");
    const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
    if (!Number.isFinite(startMs)) continue;

    const tenorMonths = Math.max(1, Math.round(Number(agreement.tenorMonths ?? 12)));
    const principalAmount = Math.round(Number(agreement.principalAmount ?? 0));
    const marginAmount = Math.round(Number(agreement.marginAmount ?? 0));
    const principalDue = Math.round(principalAmount / tenorMonths);
    const marginDue = Math.round(marginAmount / tenorMonths);
    const amountDue = principalDue + marginDue;

    const paidPrincipal = Math.round(Number(agreement.paidPrincipal ?? 0));
    const paidCount =
      status === "Lunas"
        ? tenorMonths
        : clamp(Math.round(paidPrincipal / Math.max(1, principalDue)), 0, tenorMonths);

    for (let installmentNo = 1; installmentNo <= tenorMonths; installmentNo++) {
      seq += 1;
      const dueDate = addMonths(startDate, installmentNo);
      const paid = installmentNo <= paidCount;
      rows.push({
        id: `KOP-SCH-SEED-${String(seq).padStart(5, "0")}`,
        companyId: KOPERASI_COMPANY_ID,
        agreementId,
        memberId: agreement.memberId,
        memberName: agreement.memberName,
        installmentNo,
        dueDate,
        principalDue,
        marginDue,
        amountDue,
        paidAt: paid ? dueDate : null,
        status: paid ? "Lunas" : "Belum Bayar",
      });
    }
  }

  return rows;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Adds whole months to an ISO date, clamping the day to the target month's length. */
function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, lastDay));
  return base.toISOString().slice(0, 10);
}
