/**
 * Generalizes the Meridian ledger reference's hand-typed `postings()` (built by reading
 * `salesInvoices`/`purchaseInvoices`/`payments`/`journalEntries` arrays directly) into a
 * `DoctypeMeta.posting`-driven engine any doctype can declare, not just the four Meridian ones —
 * see `.notes/PROJECT.md`: 11 console verticals each show
 * a "…GL Preview" table with 2 hard-coded rows instead of a real posting.
 *
 * `DoctypeMetaSchema.superRefine` (doctypes/types.ts) already rejects a `posting` rule with no
 * debit side or no credit side at parse time — the runtime check here catches the case that
 * can't be caught statically: the *evaluated* line amounts for one specific document not
 * actually balancing (e.g. a meta whose `subtotal`/`tax`/`total` fields turn out inconsistent on
 * a particular record).
 */
import type { DataAdapter } from "~/data/types";
import { evaluate, type RenderScope } from "~/expr/evaluate";
import type { DoctypeMeta } from "../doctypes/types";

export interface Posting {
  date: string;
  account: string;
  debit: number;
  credit: number;
  voucher: string;
  doctype: string;
  narration: string;
}

const BALANCE_EPSILON = 0.01; // guards against float rounding, not real imbalance

/**
 * Evaluates `meta.posting.lines` against `record` and returns the resulting posting lines —
 * without writing them anywhere. Throws a plain `Error` (not `DataError`: an unbalanced posting
 * means the meta or the record's own numbers are wrong, not a validation failure a form user
 * caused) if the evaluated lines don't balance.
 */
export function buildPostingLines(meta: DoctypeMeta, record: Record<string, unknown>): Posting[] {
  if (!meta.posting) return [];

  const scope: RenderScope = { state: record };
  const date = typeof record.date === "string" ? record.date : new Date().toISOString().slice(0, 10);
  const voucher = String(record.id ?? "");
  const narration = `${meta.label.id} ${voucher}`;

  const lines: Posting[] = meta.posting.lines.map((line) => {
    const amount = Number(evaluate(line.amount, scope) ?? 0);
    return {
      date,
      account: line.account,
      debit: line.side === "debit" ? amount : 0,
      credit: line.side === "credit" ? amount : 0,
      voucher,
      doctype: meta.name,
      narration,
    };
  });

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > BALANCE_EPSILON) {
    throw new Error(
      `buildPostingLines: unbalanced posting for ${meta.name}/${voucher} — ` +
        `debit ${totalDebit} != credit ${totalCredit} (check meta.posting.lines amounts)`,
    );
  }

  return lines;
}

/** Builds and persists the posting lines for `record` into `collection` (default "Posting").
 *  Intended as a `documentService.runTransition`'s `onPosting` hook. */
export async function postDocument(
  meta: DoctypeMeta,
  record: Record<string, unknown>,
  adapter: DataAdapter,
  collection = "Posting",
): Promise<Posting[]> {
  const lines = buildPostingLines(meta, record);
  for (const line of lines) {
    await adapter.create({ collection, data: { ...line } });
  }
  return lines;
}

export interface TrialBalanceRow {
  account: string;
  debit: number;
  credit: number;
}

/** Aggregates a set of postings (e.g. everything read back from the "Posting" collection) into
 *  one row per account — the same shape `meridian/ledger.ts`'s `trialBalance()` already produces,
 *  generalized to work over any postings, not just the four hard-coded Meridian sources. */
export function trialBalance(postings: Posting[]): TrialBalanceRow[] {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const posting of postings) {
    const entry = totals.get(posting.account) ?? { debit: 0, credit: 0 };
    entry.debit += posting.debit;
    entry.credit += posting.credit;
    totals.set(posting.account, entry);
  }
  return [...totals.entries()]
    .map(([account, { debit, credit }]) => ({ account, debit, credit }))
    .sort((a, b) => a.account.localeCompare(b.account));
}
